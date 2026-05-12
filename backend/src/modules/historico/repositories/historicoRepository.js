const BaseModel = require('../../../models/BaseModel');

function buildModel({ pools }) {
  return new BaseModel({ pool: pools.safs });
}

/**
 * Expressão de status_entrega sem depender de alias externo;
 * usa subselect correlacionado para ser seguro tanto no SELECT quanto no WHERE/COUNT.
 */
const STATUS_ENTREGA_EXPR = `
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.nf_empenho nf
      WHERE BTRIM(nf.empenho) = BTRIM(p.nu_documento_siafi::text)
        AND nf.situacao = 'Liquidado'
    ) THEN 'ENTREGUE'
    ELSE p.status_entrega
  END
`;

function buildHistoricoWhere({ query, params }) {
  const clauses = [];

  if (query.empenho) {
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
    clauses.push(`p.resp_controle ILIKE $${params.length + 1}`);
    params.push(`%${query.responsavel}%`);
  }

  if (query.status_entrega) {
    clauses.push(`(${STATUS_ENTREGA_EXPR}) = $${params.length + 1}`);
    params.push(query.status_entrega);
  }

  return clauses.length ? clauses.join(' AND ') : 'TRUE';
}

function getHistoricoOrderBy({ sortBy, sortDir }) {
  const direction = String(sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const statusEntregaExpr = `(${STATUS_ENTREGA_EXPR})`;
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
    status_entrega: statusEntregaExpr,
    responsavel: 'p.resp_controle',
    notificacao_codigo: 'p.notificacao_codigo',
    observacao: 'p.observacao',
    dt_liquidado: `(SELECT MAX(nf."data") FROM public.nf_empenho nf WHERE BTRIM(nf.empenho) = BTRIM(p.nu_documento_siafi::text) AND nf.situacao = 'Liquidado')`,
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
      (${STATUS_ENTREGA_EXPR}) AS status_entrega,
      p.notificacao_codigo,
      p.dt_atualiz,
      (
        SELECT MAX(nf."data")
        FROM public.nf_empenho nf
        WHERE BTRIM(nf.empenho) = BTRIM(p.nu_documento_siafi::text)
          AND nf.situacao = 'Liquidado'
      ) AS dt_liquidado,
      p.observacao,
      p.resp_cadastro,
      p.resp_controle AS responsavel
    FROM ctrl_emp.emp_pend p
    LEFT JOIN public.empenho e
      ON e.nu_documento_siafi = p.nu_documento_siafi
      AND e.cd_material = p.cd_material
      AND e.nu_processo = p.nu_processo
      AND e.item::int = p.item::int
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
  /* Nota: o filtro status_entrega usa EXISTS correlacionado (STATUS_ENTREGA_EXPR),
     portanto não depende de JOIN externo em nf_empenho neste contexto. */

  const result = await model.query(sql, params);
  return result.rows[0]?.total || 0;
}

async function listHistoricoResponsaveisOptions({ pools }) {
  const model = buildModel({ pools });
  const sql = `
    SELECT DISTINCT resp_controle AS responsavel
    FROM ctrl_emp.emp_pend
    WHERE resp_controle IS NOT NULL
      AND BTRIM(resp_controle) <> ''
    ORDER BY resp_controle
    LIMIT 500
  `;

  const result = await model.query(sql, []);
  return result.rows.map((r) => r.responsavel).filter(Boolean);
}

module.exports = { listHistorico, countHistorico, listHistoricoResponsaveisOptions };

