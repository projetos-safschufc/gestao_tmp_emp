const BaseModel = require('../../models/BaseModel');
const { extractMasterCode } = require('./extractMasterCode');
const { resolveDwTableRelation } = require('./dwTableResolver');

function buildWhereDW({ filters, requireDocumentoSiafi = false, applyStatusPedidoFilter = true }) {
  // filtros: fornecedor, codigo_material, empenho, status_pedido
  const clauses = [
    "e.fl_evento = 'Empenho'",
    "e.status_item <> 'Atendido'",
    "e.status_pedido <> 'Gerado'",
  ];
  
  // Adiciona filtro de documento SIAFI quando necessário
  if (requireDocumentoSiafi) {
    clauses.push("e.nu_documento_siafi IS NOT NULL");
  }
  const params = [];
  let idx = 1;

  const addLike = (col, value) => {
    if (!value) return;
    clauses.push(`${col} ILIKE $${idx}`);
    params.push(`%${value}%`);
    idx += 1;
  };

  const addEq = (col, value) => {
    if (value === undefined || value === null || value === '') return;
    clauses.push(`${col} = $${idx}`);
    params.push(value);
    idx += 1;
  };

  const addEmpenho = (value) => {
    if (!value) return;
    // PDF: empenho como nu_processo ou nu_documento_siafi.
    clauses.push(`(e.nu_processo::text = $${idx} OR e.nu_documento_siafi::text = $${idx})`);
    params.push(value);
    idx += 1;
  };

  const addMaterialFilter = (value) => {
    if (!value) return;
    clauses.push(`(e.material ILIKE $${idx} OR e.cd_material ILIKE $${idx})`);
    params.push(`%${value}%`);
    idx += 1;
  };

  addLike('e.nm_fornecedor', filters.fornecedor);
  addMaterialFilter(filters.codigo_material);
  addEmpenho(filters.empenho);
  if (applyStatusPedidoFilter) {
    addEq('e.status_pedido', filters.status_pedido);
  }

  return { whereSql: clauses.join(' AND '), params };
}

function buildKeyFilterOrSql({ keys, startIndex }) {
  // keys: array de { nu_documento_siafi, cd_material, nu_processo, item }
  // Monta "(e.nu_documento_siafi=$1 AND e.cd_material=$2 AND e.nu_processo=$3 AND e.item::int=$4) OR ..."
  if (!keys.length) return { sql: 'FALSE', params: [], nextIndex: startIndex };

  const clauses = [];
  const params = [];
  let idx = startIndex;

  for (const k of keys) {
    clauses.push(
      `(e.nu_documento_siafi::text = $${idx} AND e.cd_material::text = $${idx + 1} AND e.nu_processo::text = $${idx + 2} AND e.item::int = $${idx + 3})`,
    );
    params.push(String(k.nu_documento_siafi), String(k.cd_material), String(k.nu_processo), Number(k.item));
    idx += 4;
  }

  return { sql: clauses.join(' OR '), params, nextIndex: idx };
}

function compositeKey(k) {
  return `${k.nu_documento_siafi}|${k.cd_material}|${k.nu_processo}|${k.item}`;
}

function compositeKeyFallback(k) {
  // Usado somente quando nu_documento_siafi vier ausente (fallback de merge).
  return `${k.cd_material}|${k.nu_processo}|${k.item}`;
}

function daysFromISO(dateValue) {
  // dateValue: ISO date (YYYY-MM-DD) ou TIMESTAMP do Postgres (Date)
  if (!dateValue) return null;
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  // Normaliza para UTC/00:00 local aproximado
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function tempoEnvioDiasFromP(p) {
  // Preferência: dt_confirmacao_recebimento; fallback: dt_cadastro
  if (p.dt_confirmacao_recebimento) {
    const d = new Date(p.dt_confirmacao_recebimento);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) * -1;
  }
  if (p.dt_cadastro) {
    const d = new Date(p.dt_cadastro);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) * -1;
  }
  return null;
}

async function pickEmpenhoSourcePool({ pools }) {
  // O código assume que existe uma relação "public.empenho" com colunas como "fl_evento".
  // Em alguns cenários (ex.: DW com outra modelagem), isso não existe em pools.dw,
  // mas existe em pools.safs. Para não quebrar o endpoint, fazemos fallback.
  const expectedColumn = 'fl_evento';

  const checkSql = `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'empenho'
      AND column_name = $1
    LIMIT 1
  `;

  const dwHasTable = await pools.dw.query(checkSql, [expectedColumn]);
  const has = dwHasTable.rows && dwHasTable.rows[0];
  return has ? pools.dw : pools.safs;
}

async function listEmpenhosPendentesDW({ pools, filters, limit, offset, keyFilterKeys }) {
  // Plano: o merge de empenho + outlook ocorre em safs.public.
  const sourcePool = pools.safs;
  const modelDW = new BaseModel({ pool: sourcePool });

  const { whereSql, params } = buildWhereDW({ filters, requireDocumentoSiafi: true });

  const empenhoRelation = await resolveDwTableRelation(sourcePool, {
    tableName: 'empenho',
    preferredSchema: process.env.DW_EMPENHO_SCHEMA || 'public',
    matchMode: 'ilike',
    tableNameLikePattern: '%empenho%',
  });

  // outlook é usado apenas para garantir que nu_documento_siafi seja resolvido,
  // caso o DW não retorne o valor em e.nu_documento_siafi.
  let outlookRelation = null;
  try {
    outlookRelation = await resolveDwTableRelation(sourcePool, {
      tableName: 'outlook',
      preferredSchema: process.env.DW_OUTLOOK_SCHEMA || 'public',
      matchMode: 'ilike',
      tableNameLikePattern: '%outlook%',
    });
  } catch {
    // Se não existir outlook no schema conectado, mantemos comportamento antigo.
    outlookRelation = null;
  }

  // safs_catalogo é usado para buscar setor_controle e resp_controle
  let safsCatalogoRelation = null;
  try {
    safsCatalogoRelation = await resolveDwTableRelation(sourcePool, {
      tableName: 'safs_catalogo',
      preferredSchema: process.env.DW_SAFS_CATALOGO_SCHEMA || 'ctrl',
      matchMode: 'ilike',
      tableNameLikePattern: '%safs_catalogo%',
    });
  } catch {
    // Se não existir safs_catalogo no schema conectado, mantemos comportamento antigo.
    safsCatalogoRelation = null;
  }

  let keySql = null;
  let keyParams = [];
  if (keyFilterKeys && keyFilterKeys.length > 0) {
    const { sql, params: p2, nextIndex } = buildKeyFilterOrSql({
      keys: keyFilterKeys.map((k) => ({
        ...k,
        cd_material: extractMasterCode(k.cd_material),
      })),
      startIndex: params.length + 1,
    });
    keySql = sql;
    keyParams = p2;
    // nextIndex não é necessário porque usamos somente parâmetros no final com LIMIT/OFFSET
  }

  const query = `
    SELECT
      e.nm_fornecedor AS nm_fornecedor,
      e.cd_cgc AS cd_cgc,
      e.nu_processo AS nu_processo,
      e.nu_registro_licitacao AS nu_registro_licitacao,
      e.item AS item,
      e.material AS material,
      e.cd_material AS cd_material,
      e.qt_de_embalagem AS qt_de_embalagem,
      e.qt_saldo_item AS qt_saldo_item,
      (e.qt_saldo_item_emp * (-1)) AS saldo,
      e.status_item AS status_item,
      e.status_pedido AS status_pedido,
      ${outlookRelation ? 'COALESCE(e.nu_documento_siafi, o.empenho) AS nu_documento_siafi' : 'e.nu_documento_siafi AS nu_documento_siafi'},
      ${outlookRelation ? 'o.data_emp::date AS data_envio_email' : 'NULL::date AS data_envio_email'},
      ${outlookRelation ? 'o.destinatario AS setor_responsavel_outlook' : 'NULL::text AS setor_responsavel_outlook'},
      ${safsCatalogoRelation ? 's.setor_controle AS setor_controle_catalogo' : 'NULL::text AS setor_controle_catalogo'},
      ${safsCatalogoRelation ? 's.resp_controle AS resp_controle_catalogo' : 'NULL::text AS resp_controle_catalogo'},

      e.perc_entregue AS percentual_entregue,

      CASE
        WHEN e.vl_unidade IS NULL THEN NULL
        ELSE e.vl_unidade * (e.qt_saldo_item_emp * (-1))
      END AS valor_pendente,
      e.vl_unidade AS valor_unidade
    FROM ${empenhoRelation} e
    ${outlookRelation ? `LEFT JOIN ${outlookRelation} o ON o.empenho = e.nu_documento_siafi` : ''}
    ${safsCatalogoRelation ? `LEFT JOIN ${safsCatalogoRelation} s ON s.master = e.cd_material` : ''}
    WHERE ${whereSql}
      ${keySql ? ` AND (${keySql})` : ''}
    ORDER BY e.nu_documento_siafi DESC, e.nu_processo, e.item
    LIMIT $${params.length + keyParams.length + 1}
    OFFSET $${params.length + keyParams.length + 2}
  `;

  const finalParams = [...params, ...keyParams, limit, offset];
  const result = await modelDW.query(query, finalParams);
  return result.rows;
}

async function countEmpenhosPendentesDW({ pools, filters, keyFilterKeys }) {
  // Plano: o merge de empenho + outlook ocorre em safs.public.
  const sourcePool = pools.safs;
  const modelDW = new BaseModel({ pool: sourcePool });
  const { whereSql, params } = buildWhereDW({ filters, requireDocumentoSiafi: true });

  const empenhoRelation = await resolveDwTableRelation(sourcePool, {
    tableName: 'empenho',
    preferredSchema: process.env.DW_EMPENHO_SCHEMA || 'public',
    matchMode: 'ilike',
    tableNameLikePattern: '%empenho%',
  });

  // Incluir safs_catalogo também no count para manter consistência
  let safsCatalogoRelation = null;
  try {
    safsCatalogoRelation = await resolveDwTableRelation(sourcePool, {
      tableName: 'safs_catalogo',
      preferredSchema: process.env.DW_SAFS_CATALOGO_SCHEMA || 'ctrl',
      matchMode: 'ilike',
      tableNameLikePattern: '%safs_catalogo%',
    });
  } catch {
    safsCatalogoRelation = null;
  }

  let keySql = null;
  let keyParams = [];
  if (keyFilterKeys && keyFilterKeys.length > 0) {
    const { sql, params: p2 } = buildKeyFilterOrSql({
      keys: keyFilterKeys.map((k) => ({
        ...k,
        cd_material: extractMasterCode(k.cd_material),
      })),
      startIndex: params.length + 1,
    });
    keySql = sql;
    keyParams = p2;
  }

  const query = `
    SELECT COUNT(*)::int AS total
    FROM ${empenhoRelation} e
    ${safsCatalogoRelation ? `LEFT JOIN ${safsCatalogoRelation} s ON s.master = e.cd_material` : ''}
    WHERE ${whereSql}
      ${keySql ? ` AND (${keySql})` : ''}
  `;

  const result = await modelDW.query(query, [...params, ...keyParams]);
  return result.rows[0] ? result.rows[0].total : 0;
}

async function fetchEmpPendForPageKeys({ pools, keys }) {
  const modelSAFS = new BaseModel({ pool: pools.safs });
  if (!keys.length) return [];

  const clauses = [];
  const params = [];
  let idx = 1;

  for (const k of keys) {
    // Se nu_documento_siafi estiver ausente, fazemos fallback usando a chave lógica de
    // nu_processo + item + cd_material. Isso permite popular data_envio_email e setor_responsavel
    // mesmo quando o DW não retorna nu_documento_siafi.
    if (k.nu_documento_siafi) {
      clauses.push(
        `(p.nu_documento_siafi::text = $${idx} AND p.cd_material::text = $${idx + 1} AND p.nu_processo::text = $${idx + 2} AND p.item::int = $${idx + 3})`,
      );
      params.push(String(k.nu_documento_siafi), String(k.cd_material), String(k.nu_processo), Number(k.item));
      idx += 4;
    } else {
      clauses.push(
        `(p.cd_material::text = $${idx} AND p.nu_processo::text = $${idx + 1} AND p.item::int = $${idx + 2})`,
      );
      params.push(String(k.cd_material), String(k.nu_processo), Number(k.item));
      idx += 3;
    }
  }

  const query = `
    SELECT
      p.nu_documento_siafi,
      p.cd_material,
      p.nu_processo,
      p.item,
      p.status_entrega,
      p.dt_confirmacao_recebimento,
      p.dt_cadastro,
      p.setor_responsavel
    FROM ctrl_emp.emp_pend p
    WHERE ${clauses.join(' OR ')}
  `;

  const result = await modelSAFS.query(query, params);
  return result.rows.map((r) => ({
    ...r,
    cd_material: extractMasterCode(r.cd_material),
  }));
}

async function getEmpenhosPendentes({ pools, filters, limit, offset }) {
  // Para cumprir "sem JOIN entre bancos", filtramos considerando todas as fontes de setor/responsável.
  // Busca em: emp_pend e safs_catalogo
  const hasResponsavelSetor = Boolean(filters.responsavel || filters.setor);
  

  let keyFilterKeys = [];
  if (hasResponsavelSetor) {
    const modelSAFS = new BaseModel({ pool: pools.safs });
    
    // Buscar chaves que atendem aos filtros de responsável/setor em todas as fontes
    const keyFilterSets = [];

    // 1. Buscar em emp_pend.setor_responsavel (para ambos os filtros)
    if (filters.responsavel || filters.setor) {
      const likeValue = filters.responsavel || filters.setor;
      const empPendQuery = `
        SELECT DISTINCT
          p.nu_documento_siafi,
          p.cd_material,
          p.nu_processo,
          p.item
        FROM ctrl_emp.emp_pend p
        WHERE p.setor_responsavel ILIKE $1
        LIMIT 2000
      `;
      const empPendResult = await modelSAFS.query(empPendQuery, [`%${likeValue}%`]);
      keyFilterSets.push(empPendResult.rows);
    }

    // 2. Buscar em safs_catalogo - SEPARANDO filtros de setor e responsável
    
    // 2a. Filtro específico para SETOR (setor_controle)
    if (filters.setor) {
      try {
        const setorQuery = `
          SELECT DISTINCT
            e.nu_documento_siafi,
            e.cd_material,
            e.nu_processo,
            e.item
          FROM "ctrl"."safs_catalogo" s
          INNER JOIN "public"."empenho" e ON (
            s.master = e.cd_material OR 
            s.master = SUBSTRING(e.cd_material FROM 1 FOR 6)
          )
          WHERE s.setor_controle ILIKE $1
            AND e.fl_evento = 'Empenho'
            AND e.status_item <> 'Atendido'
            AND e.status_pedido <> 'Gerado'
          LIMIT 2000
        `;
        const setorResult = await modelSAFS.query(setorQuery, [`%${filters.setor}%`]);
        keyFilterSets.push(setorResult.rows);
      } catch (err) {
        console.warn('Safs_catalogo table not found for setor filter:', err.message);
      }
    }

    // 2b. Filtro específico para RESPONSÁVEL (resp_controle)
    if (filters.responsavel) {
      try {
        const responsavelQuery = `
          SELECT DISTINCT
            e.nu_documento_siafi,
            e.cd_material,
            e.nu_processo,
            e.item
          FROM "ctrl"."safs_catalogo" s
          INNER JOIN "public"."empenho" e ON (
            s.master = e.cd_material OR 
            s.master = SUBSTRING(e.cd_material FROM 1 FOR 6)
          )
          WHERE s.resp_controle ILIKE $1
            AND e.fl_evento = 'Empenho'
            AND e.status_item <> 'Atendido'
            AND e.status_pedido <> 'Gerado'
          LIMIT 2000
        `;
        const responsavelResult = await modelSAFS.query(responsavelQuery, [`%${filters.responsavel}%`]);
        keyFilterSets.push(responsavelResult.rows);
      } catch (err) {
        console.warn('Safs_catalogo table not found for responsavel filter:', err.message);
      }
    }

    // Combinar todas as chaves encontradas (união)
    const allKeys = new Map();
    for (const keySet of keyFilterSets) {
      for (const key of keySet) {
        // Tratar valores nulos para evitar problemas na chave
        const docSiafi = key.nu_documento_siafi || 'NULL';
        const material = key.cd_material || 'NULL';
        const processo = key.nu_processo || 'NULL';
        const item = key.item || 'NULL';
        
        const keyId = `${docSiafi}|${material}|${processo}|${item}`;
        allKeys.set(keyId, {
          nu_documento_siafi: key.nu_documento_siafi,
          cd_material: extractMasterCode(key.cd_material),
          nu_processo: key.nu_processo,
          item: key.item,
        });
      }
    }
    
    keyFilterKeys = Array.from(allKeys.values());
    
    
    // Limitar para evitar queries muito grandes (máximo 3000 chaves)
    if (keyFilterKeys.length > 3000) {
      keyFilterKeys = keyFilterKeys.slice(0, 3000);
      console.warn(`Filtro responsavel/setor retornou ${allKeys.size} registros, limitado a 3000 para performance`);
    }
  }

  const [dwRows, total] = await Promise.all([
    listEmpenhosPendentesDW({ pools, filters, limit, offset, keyFilterKeys }),
    countEmpenhosPendentesDW({ pools, filters, keyFilterKeys }),
  ]);

  const pageKeys = dwRows.map((r) => ({
    nu_documento_siafi: r.nu_documento_siafi,
    cd_material: extractMasterCode(r.cd_material),
    nu_processo: r.nu_processo,
    item: r.item,
  }));

  const empPendRows = await fetchEmpPendForPageKeys({ pools, keys: pageKeys });
  const empPendMapFull = new Map(empPendRows.map((p) => [compositeKey(p), p]));
  const empPendMapFallback = new Map(empPendRows.map((p) => [compositeKeyFallback(p), p]));

  const merged = dwRows.map((row) => {
    const cd_material = extractMasterCode(row.cd_material);
    const fullKey = compositeKey({
      nu_documento_siafi: row.nu_documento_siafi,
      cd_material,
      nu_processo: row.nu_processo,
      item: row.item,
    });
    let p = empPendMapFull.get(fullKey);
    if (!p && !row.nu_documento_siafi) {
      const fallbackKey = compositeKeyFallback({
        cd_material,
        nu_processo: row.nu_processo,
        item: row.item,
      });
      p = empPendMapFallback.get(fallbackKey);
    }

    const status_entrega = p?.status_entrega || 'PENDENTE';
    // dt_confirmacao_recebimento (emp_pend) tem prioridade; caso não exista,
    // usamos a data vinda do outlook (data_envio_email) conforme plano.
    const data_envio_email = p?.dt_confirmacao_recebimento || row.data_envio_email || null;
    
    // Lógica para setor_responsavel - APENAS dados do catálogo (safs_catalogo):
    // 1º: valor salvo pelo usuário em emp_pend (p.setor_responsavel) - mantém override do usuário
    // 2º: dados do catálogo combinados (setor_controle + resp_controle)
    // 3º: null
    let setor_responsavel = p?.setor_responsavel || null;
    
    // Se não há override do usuário, usar APENAS dados do catálogo
    if (!setor_responsavel && (row.setor_controle_catalogo || row.resp_controle_catalogo)) {
      const setor = row.setor_controle_catalogo || '';
      const resp = row.resp_controle_catalogo || '';
      if (setor && resp) {
        setor_responsavel = `${setor} / ${resp}`;
      } else if (setor) {
        setor_responsavel = setor;
      } else if (resp) {
        setor_responsavel = resp;
      }
    }

    let tempo_envio_dias = null;
    const baseDate = p?.dt_confirmacao_recebimento || row.data_envio_email || p?.dt_cadastro || null;
    if (baseDate) {
      const d = new Date(baseDate);
      if (!Number.isNaN(d.getTime())) {
        const today = new Date();
        const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        tempo_envio_dias = Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
      }
    }

    return {
      nm_fornecedor: row.nm_fornecedor,
      cd_cgc: row.cd_cgc,
      nu_processo: row.nu_processo,
      nu_registro_licitacao: row.nu_registro_licitacao,
      item: row.item,
      material: row.material,
      cd_material: row.cd_material,
      qt_de_embalagem: row.qt_de_embalagem,
      qt_saldo_item: row.qt_saldo_item,
      saldo: row.saldo,
      status_item: row.status_item,
      status_pedido: row.status_pedido,
      // Exibir documento SIAFI apenas quando não for null
      nu_documento_siafi: row.nu_documento_siafi || null,

      status_entrega,
      dt_confirmacao_recebimento: p?.dt_confirmacao_recebimento || null,
      data_envio_email,
      setor_responsavel,
      tempo_envio_dias,

      percentual_entregue: row.percentual_entregue,
      valor_pendente: row.valor_pendente,
      valor_unidade: row.valor_unidade,
    };
  });

  return { rows: merged, total, limit, offset };
}

async function getStatusPedidoOptions({ pools, filters }) {
  const sourcePool = pools.safs;
  const modelDW = new BaseModel({ pool: sourcePool });

  // Não aplicamos o próprio filtro de status_pedido para montar as opções do select.
  const { whereSql, params } = buildWhereDW({
    filters,
    requireDocumentoSiafi: true,
    applyStatusPedidoFilter: false,
  });

  const empenhoRelation = await resolveDwTableRelation(sourcePool, {
    tableName: 'empenho',
    preferredSchema: process.env.DW_EMPENHO_SCHEMA || 'public',
    matchMode: 'ilike',
    tableNameLikePattern: '%empenho%',
  });

  let keyFilterKeys = [];
  const hasResponsavelSetor = Boolean(filters.responsavel || filters.setor);

  if (hasResponsavelSetor) {
    const modelSAFS = new BaseModel({ pool: pools.safs });
    const keyFilterSets = [];

    if (filters.responsavel || filters.setor) {
      const likeValue = filters.responsavel || filters.setor;
      const empPendQuery = `
        SELECT DISTINCT
          p.nu_documento_siafi,
          p.cd_material,
          p.nu_processo,
          p.item
        FROM ctrl_emp.emp_pend p
        WHERE p.setor_responsavel ILIKE $1
        LIMIT 2000
      `;
      const empPendResult = await modelSAFS.query(empPendQuery, [`%${likeValue}%`]);
      keyFilterSets.push(empPendResult.rows);
    }

    if (filters.setor) {
      try {
        const setorQuery = `
          SELECT DISTINCT
            e.nu_documento_siafi,
            e.cd_material,
            e.nu_processo,
            e.item
          FROM "ctrl"."safs_catalogo" s
          INNER JOIN "public"."empenho" e ON (
            s.master = e.cd_material OR 
            s.master = SUBSTRING(e.cd_material FROM 1 FOR 6)
          )
          WHERE s.setor_controle ILIKE $1
            AND e.fl_evento = 'Empenho'
            AND e.status_item <> 'Atendido'
            AND e.status_pedido <> 'Gerado'
          LIMIT 2000
        `;
        const setorResult = await modelSAFS.query(setorQuery, [`%${filters.setor}%`]);
        keyFilterSets.push(setorResult.rows);
      } catch {
        // ignore when catalog is unavailable
      }
    }

    if (filters.responsavel) {
      try {
        const responsavelQuery = `
          SELECT DISTINCT
            e.nu_documento_siafi,
            e.cd_material,
            e.nu_processo,
            e.item
          FROM "ctrl"."safs_catalogo" s
          INNER JOIN "public"."empenho" e ON (
            s.master = e.cd_material OR 
            s.master = SUBSTRING(e.cd_material FROM 1 FOR 6)
          )
          WHERE s.resp_controle ILIKE $1
            AND e.fl_evento = 'Empenho'
            AND e.status_item <> 'Atendido'
            AND e.status_pedido <> 'Gerado'
          LIMIT 2000
        `;
        const responsavelResult = await modelSAFS.query(responsavelQuery, [`%${filters.responsavel}%`]);
        keyFilterSets.push(responsavelResult.rows);
      } catch {
        // ignore when catalog is unavailable
      }
    }

    const allKeys = new Map();
    for (const keySet of keyFilterSets) {
      for (const key of keySet) {
        const docSiafi = key.nu_documento_siafi || 'NULL';
        const material = key.cd_material || 'NULL';
        const processo = key.nu_processo || 'NULL';
        const item = key.item || 'NULL';
        const keyId = `${docSiafi}|${material}|${processo}|${item}`;
        allKeys.set(keyId, {
          nu_documento_siafi: key.nu_documento_siafi,
          cd_material: extractMasterCode(key.cd_material),
          nu_processo: key.nu_processo,
          item: key.item,
        });
      }
    }

    keyFilterKeys = Array.from(allKeys.values()).slice(0, 3000);
  }

  let keySql = null;
  let keyParams = [];
  if (keyFilterKeys.length > 0) {
    const { sql, params: p2 } = buildKeyFilterOrSql({
      keys: keyFilterKeys.map((k) => ({
        ...k,
        cd_material: extractMasterCode(k.cd_material),
      })),
      startIndex: params.length + 1,
    });
    keySql = sql;
    keyParams = p2;
  }

  const query = `
    SELECT DISTINCT e.status_pedido
    FROM ${empenhoRelation} e
    WHERE ${whereSql}
      ${keySql ? ` AND (${keySql})` : ''}
      AND e.status_pedido IS NOT NULL
      AND e.status_pedido <> ''
    ORDER BY e.status_pedido
    LIMIT 100
  `;

  const result = await modelDW.query(query, [...params, ...keyParams]);
  return result.rows.map((r) => r.status_pedido).filter(Boolean);
}

module.exports = { getEmpenhosPendentes, getStatusPedidoOptions };

