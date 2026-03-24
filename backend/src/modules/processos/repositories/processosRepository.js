const BaseModel = require('../../../models/BaseModel');

function buildModel({ pools }) {
  return new BaseModel({ pool: pools.safs });
}

function normalizeAnexoToJson(input) {
  if (input === undefined || input === null) return '[]';
  if (typeof input === 'string') return input;
  return JSON.stringify(input);
}

function buildWhere({ query }) {
  const clauses = [];
  const params = [];
  let idx = 1;

  const addILike = (col, value) => {
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

  addEq('tipo_processo', query.tipo_processo);
  addILike('nm_fornecedor', query.nm_fornecedor);
  addILike('cnpj', query.cnpj);
  addILike('edital', query.edital);
  addILike('empenho', query.empenho);
  addILike('uf', query.uf);

  return {
    whereSql: clauses.length ? clauses.join(' AND ') : 'TRUE',
    params,
  };
}

async function listProcessos({ pools, query, limit, offset }) {
  const model = buildModel({ pools });
  const { whereSql, params } = buildWhere({ query });

  const sql = `
    SELECT
      id_proc,
      tipo_processo,
      dt_processo,
      nm_fornecedor,
      cnpj,
      uf,
      processo_acao,
      processo_origem,
      item_pregao,
      edital,
      empenho,
      dt_ufac,
      status,
      dt_conclusao,
      tmp_processo,
      sancao_aplicada,
      valor_multa,
      observacao,
      anexo,
      resp_cadastro,
      dt_cadastro,
      dt_atualiz
    FROM ctrl_emp.proc_fornecedores
    WHERE ${whereSql}
    ORDER BY dt_atualiz DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const finalParams = [...params, limit, offset];
  const result = await model.query(sql, finalParams);
  return result.rows;
}

async function countProcessos({ pools, query }) {
  const model = buildModel({ pools });
  const { whereSql, params } = buildWhere({ query });

  const sql = `
    SELECT COUNT(*)::int AS total
    FROM ctrl_emp.proc_fornecedores
    WHERE ${whereSql}
  `;

  const result = await model.query(sql, params);
  return result.rows[0] ? result.rows[0].total : 0;
}

async function createProcesso({ pools, input }) {
  const model = buildModel({ pools });
  const anexoJson = normalizeAnexoToJson(input.anexo);

  const sql = `
    INSERT INTO ctrl_emp.proc_fornecedores (
      tipo_processo,
      dt_processo,
      nm_fornecedor,
      cnpj,
      uf,
      processo_acao,
      processo_origem,
      item_pregao,
      edital,
      empenho,
      dt_ufac,
      status,
      dt_conclusao,
      tmp_processo,
      sancao_aplicada,
      valor_multa,
      observacao,
      anexo,
      resp_cadastro
    )
    VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,
      $16,$17,$18,$19
    )
    RETURNING
      id_proc,
      tipo_processo,
      dt_processo,
      nm_fornecedor,
      cnpj,
      uf,
      status,
      dt_conclusao,
      tmp_processo,
      resp_cadastro,
      dt_cadastro,
      dt_atualiz
  `;

  const params = [
    input.tipo_processo,
    input.dt_processo,
    input.nm_fornecedor,
    input.cnpj ?? null,
    input.uf,
    input.processo_acao ?? null,
    input.processo_origem ?? null,
    input.item_pregao ?? null,
    input.edital ?? null,
    input.empenho ?? null,
    input.dt_ufac ?? null,
    input.status,
    input.dt_conclusao ?? null,
    input.tmp_processo ?? null,
    input.sancao_aplicada ?? null,
    input.valor_multa ?? null,
    input.observacao ?? null,
    anexoJson,
    input.resp_cadastro ?? null,
  ];

  const result = await model.query(sql, params);
  return result.rows[0];
}

async function updateProcesso({ pools, id_proc, input }) {
  const model = buildModel({ pools });
  const anexoJson = input.anexo === undefined ? undefined : normalizeAnexoToJson(input.anexo);

  const sql = `
    UPDATE ctrl_emp.proc_fornecedores
    SET
      tipo_processo = COALESCE($1, tipo_processo),
      dt_processo = COALESCE($2, dt_processo),
      nm_fornecedor = COALESCE($3, nm_fornecedor),
      cnpj = COALESCE($4, cnpj),
      uf = COALESCE($5, uf),
      processo_acao = COALESCE($6, processo_acao),
      processo_origem = COALESCE($7, processo_origem),
      item_pregao = COALESCE($8, item_pregao),
      edital = COALESCE($9, edital),
      empenho = COALESCE($10, empenho),
      dt_ufac = COALESCE($11, dt_ufac),
      status = COALESCE($12, status),
      dt_conclusao = COALESCE($13, dt_conclusao),
      tmp_processo = COALESCE($14, tmp_processo),
      sancao_aplicada = COALESCE($15, sancao_aplicada),
      valor_multa = COALESCE($16, valor_multa),
      observacao = COALESCE($17, observacao),
      anexo = COALESCE($18, anexo),
      resp_cadastro = COALESCE($19, resp_cadastro),
      dt_atualiz = NOW()
    WHERE id_proc = $20
    RETURNING id_proc
  `;

  const params = [
    input.tipo_processo ?? null,
    input.dt_processo ?? null,
    input.nm_fornecedor ?? null,
    input.cnpj ?? null,
    input.uf ?? null,
    input.processo_acao ?? null,
    input.processo_origem ?? null,
    input.item_pregao ?? null,
    input.edital ?? null,
    input.empenho ?? null,
    input.dt_ufac ?? null,
    input.status ?? null,
    input.dt_conclusao ?? null,
    input.tmp_processo ?? null,
    input.sancao_aplicada ?? null,
    input.valor_multa ?? null,
    input.observacao ?? null,
    anexoJson ?? null,
    input.resp_cadastro ?? null,
    id_proc,
  ];

  const result = await model.query(sql, params);
  return result.rows[0] ? true : false;
}

async function deleteProcesso({ pools, id_proc }) {
  const model = buildModel({ pools });
  const sql = `
    DELETE FROM ctrl_emp.proc_fornecedores
    WHERE id_proc = $1
    RETURNING id_proc
  `;
  const result = await model.query(sql, [id_proc]);
  return result.rows[0] ? true : false;
}

module.exports = {
  listProcessos,
  countProcessos,
  createProcesso,
  updateProcesso,
  deleteProcesso,
};

