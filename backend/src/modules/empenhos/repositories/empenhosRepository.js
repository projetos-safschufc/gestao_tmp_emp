const BaseModel = require('../../../models/BaseModel');

function buildModel({ pools }) {
  return new BaseModel({ pool: pools.safs });
}

function buildWhere({ filters }) {
  // filtros: fornecedor, codigo_material, empenho, responsavel, setor, status_pedido
  const clauses = [
    "e.fl_evento = 'Empenho'",
    "e.status_item <> 'Atendido'",
    "e.status_pedido <> 'Gerado'",
  ];
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
    // PDF trata "Empenho" como um identificador: tentamos nu_processo e nu_documento_siafi.
    clauses.push(`(e.nu_processo::text = $${idx} OR e.nu_documento_siafi::text = $${idx})`);
    params.push(value);
    idx += 1;
  };

  addLike('e.nm_fornecedor', filters.fornecedor);
  addLike('e.cd_material', filters.codigo_material);
  addEmpenho(filters.empenho);
  addLike('p.setor_responsavel', filters.responsavel);
  addLike('p.setor_responsavel', filters.setor);
  addEq('e.status_pedido', filters.status_pedido);

  return { whereSql: clauses.join(' AND '), params };
}

async function listEmpenhosPendentes({ pools, filters, limit, offset }) {
  const model = buildModel({ pools });

  const { whereSql, params } = buildWhere({ filters });

  // Atenção: alias "saldo_calc" é usado somente na expressão percentual,
  // então mantemos a lógica explicitamente.
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
      CASE
        WHEN e.qt_saldo_item IS NULL THEN e.qt_de_embalagem
        ELSE e.qt_de_embalagem - e.qt_saldo_item
      END AS saldo,

      -- Status do item/pedido (origem DW)
      e.status_item AS status_item,
      e.status_pedido AS status_pedido,
      e.nu_documento_siafi AS nu_documento_siafi,

      -- Empenho pendente (SAFS ctrl_emp)
      COALESCE(p.status_entrega, 'PENDENTE') AS status_entrega,
      p.dt_confirmacao_recebimento AS data_envio_email,
      p.setor_responsavel AS setor_responsavel,

      -- Percentual entregue (calculado a partir de saldo/quantidade)
      CASE
        WHEN COALESCE(e.qt_de_embalagem, 0) = 0 THEN NULL
        ELSE (
          (COALESCE(e.qt_saldo_item, 0)::numeric / e.qt_de_embalagem::numeric) * 100
        )
      END AS percentual_entregue,

      -- Valor pendente (regra: valor_unitario * saldo)
      CASE
        WHEN e.vl_unidade IS NULL THEN NULL
        WHEN e.qt_de_embalagem IS NULL THEN NULL
        ELSE e.vl_unidade * (
          CASE
            WHEN e.qt_saldo_item IS NULL THEN e.qt_de_embalagem
            ELSE e.qt_de_embalagem - e.qt_saldo_item
          END
        )
      END AS valor_pendente,
      e.vl_unidade AS valor_unidade,

      -- Tempo envio (dias)
      CASE
        WHEN p.dt_confirmacao_recebimento IS NOT NULL THEN (CURRENT_DATE - p.dt_confirmacao_recebimento::date)
        WHEN p.dt_cadastro IS NOT NULL THEN (CURRENT_DATE - p.dt_cadastro::date)
        ELSE NULL
      END AS tempo_envio_dias
    FROM public.empenho e
    LEFT JOIN public.outlook o
      ON o.empenho = e.nu_documento_siafi
    LEFT JOIN ctrl.safs_catalogo c
      ON c.master = e.cd_material
    LEFT JOIN ctrl_emp.emp_pend p
      ON p.nu_documento_siafi = e.nu_documento_siafi
      AND p.cd_material = e.cd_material
      AND p.nu_processo = e.nu_processo
      AND p.item = e.item::int
    WHERE ${whereSql}
    ORDER BY e.nu_processo, e.item
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

  const finalParams = [...params, limit, offset];
  const result = await model.query(query, finalParams);
  return result.rows;
}

async function countEmpenhosPendentes({ pools, filters }) {
  const model = buildModel({ pools });
  const { whereSql, params } = buildWhere({ filters });

  const query = `
    SELECT COUNT(*)::int AS total
    FROM public.empenho e
    LEFT JOIN public.outlook o
      ON o.empenho = e.nu_documento_siafi
    LEFT JOIN ctrl.safs_catalogo c
      ON c.master = e.cd_material
    LEFT JOIN ctrl_emp.emp_pend p
      ON p.nu_documento_siafi = e.nu_documento_siafi
      AND p.cd_material = e.cd_material
      AND p.nu_processo = e.nu_processo
      AND p.item = e.item::int
    WHERE ${whereSql}
  `;

  const result = await model.query(query, params);
  return result.rows[0] ? result.rows[0].total : 0;
}

module.exports = {
  listEmpenhosPendentes,
  countEmpenhosPendentes,
};

