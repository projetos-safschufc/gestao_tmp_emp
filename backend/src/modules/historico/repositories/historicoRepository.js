const BaseModel = require('../../../models/BaseModel');

function buildModel({ pools }) {
  return new BaseModel({ pool: pools.safs });
}

function buildHistoricoWhere({ query, params }) {
  const clauses = [];

  if (query.empenho) {
    // PDF: empenho pode ser nu_processo ou nu_documento_siafi.
    clauses.push('(p.nu_processo::text = $' + (params.length + 1) + ' OR p.nu_documento_siafi::text = $' + (params.length + 1) + ')');
    params.push(query.empenho);
  }

  if (query.material) {
    clauses.push(`(p.cd_material ILIKE $${params.length + 1} OR e.material ILIKE $${params.length + 1})`);
    params.push(`%${query.material}%`);
  }

  if (query.fornecedor) {
    clauses.push(`p.nm_fornecedor ILIKE $${params.length + 1}`);
    params.push(`%${query.fornecedor}%`);
  }

  if (query.responsavel) {
    clauses.push(`p.setor_responsavel ILIKE $${params.length + 1}`);
    params.push(`%${query.responsavel}%`);
  }

  if (query.status_entrega) {
    clauses.push(`p.status_entrega = $${params.length + 1}`);
    params.push(query.status_entrega);
  }

  return clauses.length ? clauses.join(' AND ') : 'TRUE';
}

function getHistoricoOrderBy({ sortBy, sortDir }) {
  const direction = String(sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const allowed = {
    nu_documento_siafi: 'p.nu_documento_siafi',
    nm_fornecedor: 'p.nm_fornecedor',
    material: 'e.material',
    dt_confirmacao_recebimento: 'p.dt_confirmacao_recebimento',
    prazo_entrega_dias: 'p.prazo_entrega_dias',
    previsao_entrega_calc: '(CASE WHEN p.dt_confirmacao_recebimento IS NOT NULL THEN p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0) ELSE NULL END)',
    atraso_dias: '(CASE WHEN p.dt_confirmacao_recebimento IS NOT NULL AND CURRENT_DATE > (p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0)) THEN (CURRENT_DATE - (p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0)))::integer ELSE NULL END)',
    apuracao_irregularidade: 'p.apuracao_irregularidade',
    troca_marca: 'p.troca_marca',
    aplicacao_imr: 'p.aplicacao_imr',
    status_entrega: 'p.status_entrega',
    responsavel: 'p.setor_responsavel',
    notificacao_codigo: 'p.notificacao_codigo',
    observacao: 'p.observacao',
    dt_liquidado: 'nf_liq.dt_liquidado',
    dt_atualiz: 'p.dt_atualiz',
  };
  const expr = allowed[sortBy] || 'p.dt_atualiz';
  return `${expr} ${direction} NULLS LAST, p.dt_atualiz DESC`;
}

async function listHistorico({ pools, query, limit, offset }) {
  const model = buildModel({ pools });
  const params = [];
  const whereSql = buildHistoricoWhere({ query, params });
  const orderBySql = getHistoricoOrderBy({ sortBy: query?.sort_by, sortDir: query?.sort_dir });

  const sql = `
    SELECT
      p.item,
      p.cd_material,
      COALESCE(e.material, p.cd_material) AS material,
      p.nu_documento_siafi,
      p.nm_fornecedor,
      p.dt_confirmacao_recebimento,
      p.prazo_entrega_dias,
      CASE
        WHEN p.dt_confirmacao_recebimento IS NOT NULL
        THEN p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0)
        ELSE NULL
      END AS previsao_entrega_calc,
      CASE
        WHEN p.dt_confirmacao_recebimento IS NOT NULL
          AND CURRENT_DATE > (p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0))
        THEN (CURRENT_DATE - (p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0)))::integer
        ELSE NULL
      END AS atraso_dias,
      p.apuracao_irregularidade,
      p.troca_marca,
      p.aplicacao_imr,
      p.status_entrega,
      p.notificacao_codigo,
      p.dt_atualiz,
      nf_liq.dt_liquidado,
      p.observacao,
      p.resp_cadastro,
      p.setor_responsavel AS responsavel
    FROM ctrl_emp.emp_pend p
    LEFT JOIN public.empenho e
      ON e.nu_documento_siafi = p.nu_documento_siafi
      AND e.cd_material = p.cd_material
      AND e.nu_processo = p.nu_processo
      AND e.item::int = p.item::int
    LEFT JOIN (
      SELECT
        BTRIM(empenho) AS empenho_key,
        MAX("data") AS dt_liquidado
      FROM public.nf_empenho
      WHERE situacao = 'Liquidado'
      GROUP BY BTRIM(empenho)
    ) nf_liq
      ON nf_liq.empenho_key = BTRIM(p.nu_documento_siafi::text)
    WHERE ${whereSql}
    ORDER BY ${orderBySql}
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const finalParams = [...params, limit, offset];
  const result = await model.query(sql, finalParams);
  return result.rows;
}

async function countHistorico({ pools, query }) {
  const model = buildModel({ pools });
  const params = [];
  const whereSql = buildHistoricoWhere({ query, params });

  const sql = `
    SELECT COUNT(*)::int AS total
    FROM ctrl_emp.emp_pend p
    LEFT JOIN public.empenho e
      ON e.nu_documento_siafi = p.nu_documento_siafi
      AND e.cd_material = p.cd_material
      AND e.nu_processo = p.nu_processo
      AND e.item::int = p.item::int
    WHERE ${whereSql}
  `;

  const result = await model.query(sql, params);
  return result.rows[0]?.total || 0;
}

async function listHistoricoResponsaveisOptions({ pools }) {
  const model = buildModel({ pools });
  const sql = `
    SELECT DISTINCT setor_responsavel AS responsavel
    FROM ctrl_emp.emp_pend
    WHERE setor_responsavel IS NOT NULL
      AND BTRIM(setor_responsavel) <> ''
    ORDER BY setor_responsavel
    LIMIT 500
  `;

  const result = await model.query(sql, []);
  return result.rows.map((r) => r.responsavel).filter(Boolean);
}

module.exports = { listHistorico, countHistorico, listHistoricoResponsaveisOptions };

