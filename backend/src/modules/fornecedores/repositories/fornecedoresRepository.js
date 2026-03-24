const BaseModel = require('../../../models/BaseModel');

function buildModel({ pools }) {
  return new BaseModel({ pool: pools.safs });
}

async function listFornecedores({ pools, limit, offset }) {
  const model = buildModel({ pools });
  const query = `
    SELECT
      id_forn,
      nm_fornecedor,
      cnpj,
      uf,
      created_at,
      updated_at
    FROM ctrl_emp.fornecedores
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await model.query(query, [limit, offset]);
  return result.rows;
}

async function getFornecedorById({ pools, id }) {
  const model = buildModel({ pools });
  const query = `
    SELECT
      id_forn,
      nm_fornecedor,
      cnpj,
      uf,
      created_at,
      updated_at
    FROM ctrl_emp.fornecedores
    WHERE id_forn = $1
    LIMIT 1
  `;
  const result = await model.query(query, [id]);
  return result.rows[0] || null;
}

async function findFornecedorByCnpj({ pools, cnpj }) {
  const model = buildModel({ pools });
  const query = `
    SELECT
      id_forn,
      nm_fornecedor,
      cnpj,
      uf
    FROM ctrl_emp.fornecedores
    WHERE cnpj = $1
    LIMIT 1
  `;
  const result = await model.query(query, [cnpj]);
  return result.rows[0] || null;
}

async function createFornecedor({ pools, input }) {
  const model = buildModel({ pools });
  const { nm_fornecedor, cnpj, uf } = input;
  const query = `
    INSERT INTO ctrl_emp.fornecedores (nm_fornecedor, cnpj, uf)
    VALUES ($1, $2, $3)
    RETURNING
      id_forn,
      nm_fornecedor,
      cnpj,
      uf,
      created_at,
      updated_at
  `;
  const result = await model.query(query, [nm_fornecedor, cnpj, uf]);
  return result.rows[0];
}

async function updateFornecedor({ pools, id, input }) {
  const model = buildModel({ pools });
  const { nm_fornecedor, cnpj, uf } = input;

  const query = `
    UPDATE ctrl_emp.fornecedores
    SET
      nm_fornecedor = COALESCE($2, nm_fornecedor),
      cnpj = COALESCE($3, cnpj),
      uf = COALESCE($4, uf),
      updated_at = NOW()
    WHERE id_forn = $1
    RETURNING
      id_forn,
      nm_fornecedor,
      cnpj,
      uf,
      created_at,
      updated_at
  `;
  const result = await model.query(query, [id, nm_fornecedor, cnpj, uf]);
  return result.rows[0] || null;
}

async function deleteFornecedor({ pools, id }) {
  const model = buildModel({ pools });
  const query = `
    DELETE FROM ctrl_emp.fornecedores
    WHERE id_forn = $1
    RETURNING id_forn
  `;
  const result = await model.query(query, [id]);
  return result.rows[0] ? true : false;
}

module.exports = {
  listFornecedores,
  getFornecedorById,
  findFornecedorByCnpj,
  createFornecedor,
  updateFornecedor,
  deleteFornecedor,
};

