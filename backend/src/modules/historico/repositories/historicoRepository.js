const BaseModel = require('../../../models/BaseModel');

function buildModel({ pools }) {
  return new BaseModel({ pool: pools.safs });
}

function buildHistoricoWhere({ query, params }) {
  const clauses = [];

  if (query.empenho) {
    // PDF: empenho pode ser nu_processo ou nu_documento_siafi.
    clauses.push('(nu_processo::text = $' + (params.length + 1) + ' OR nu_documento_siafi::text = $' + (params.length + 1) + ')');
    params.push(query.empenho);
  }

  if (query.material) {
    clauses.push(`cd_material ILIKE $${params.length + 1}`);
    params.push(`%${query.material}%`);
  }

  if (query.fornecedor) {
    clauses.push(`nm_fornecedor ILIKE $${params.length + 1}`);
    params.push(`%${query.fornecedor}%`);
  }

  if (query.status_entrega) {
    clauses.push(`status_entrega = $${params.length + 1}`);
    params.push(query.status_entrega);
  }

  return clauses.length ? clauses.join(' AND ') : 'TRUE';
}

async function listHistorico({ pools, query, limit, offset }) {
  const model = buildModel({ pools });
  const params = [];
  const whereSql = buildHistoricoWhere({ query, params });

  const sql = `
    SELECT      
      item,
      cd_material,
      nu_documento_siafi,
      nm_fornecedor,
      dt_confirmacao_recebimento,
      apuracao_irregularidade,
      troca_marca,
      aplicacao_imr,
      status_entrega,
      dt_atualiz,
      observacao
    FROM ctrl_emp.emp_pend
    WHERE ${whereSql}
    ORDER BY dt_atualiz DESC
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
    FROM ctrl_emp.emp_pend
    WHERE ${whereSql}
  `;

  const result = await model.query(sql, params);
  return result.rows[0]?.total || 0;
}

module.exports = { listHistorico, countHistorico };

