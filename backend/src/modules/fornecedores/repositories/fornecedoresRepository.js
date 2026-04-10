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
      tel,
      email,
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
      tel,
      email,
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
  if (!cnpj) return null;
  const model = buildModel({ pools });
  const query = `
    SELECT
      id_forn,
      nm_fornecedor,
      cnpj,
      uf,
      tel,
      email
    FROM ctrl_emp.fornecedores
    WHERE cnpj = $1
    LIMIT 1
  `;
  const result = await model.query(query, [cnpj]);
  return result.rows[0] || null;
}

async function findFornecedorByUniqueFieldsNoCnpj({ pools, input }) {
  const model = buildModel({ pools });
  const query = `
    SELECT
      id_forn,
      nm_fornecedor,
      cnpj,
      uf,
      tel,
      email
    FROM ctrl_emp.fornecedores
    WHERE BTRIM(LOWER(nm_fornecedor)) = BTRIM(LOWER($1))
      AND uf = $2
      AND COALESCE(BTRIM(tel), '') = COALESCE(BTRIM($3), '')
      AND COALESCE(BTRIM(LOWER(email)), '') = COALESCE(BTRIM(LOWER($4)), '')
      AND (cnpj IS NULL OR BTRIM(cnpj) = '')
    LIMIT 1
  `;
  const result = await model.query(query, [
    input.nm_fornecedor,
    input.uf,
    input.tel ?? null,
    input.email ?? null,
  ]);
  return result.rows[0] || null;
}

async function listFornecedorNomesFromEmpenho({ pools }) {
  const model = buildModel({ pools });
  const query = `
    SELECT DISTINCT BTRIM(e.nm_fornecedor) AS nm_fornecedor
    FROM public.empenho e
    WHERE e.nm_fornecedor IS NOT NULL
      AND BTRIM(e.nm_fornecedor) <> ''
    ORDER BY BTRIM(e.nm_fornecedor)
    LIMIT 2000
  `;
  const result = await model.query(query, []);
  return result.rows.map((r) => r.nm_fornecedor).filter(Boolean);
}

async function listFornecedorCnpjsFromEmpenho({ pools, nmFornecedor }) {
  const model = buildModel({ pools });
  const query = `
    SELECT DISTINCT BTRIM(e.cd_cgc) AS cnpj
    FROM public.empenho e
    WHERE BTRIM(e.nm_fornecedor) = BTRIM($1)
      AND e.cd_cgc IS NOT NULL
      AND BTRIM(e.cd_cgc) <> ''
    ORDER BY BTRIM(e.cd_cgc)
    LIMIT 200
  `;
  const result = await model.query(query, [nmFornecedor]);
  return result.rows.map((r) => r.cnpj).filter(Boolean);
}

async function createFornecedor({ pools, input }) {
  const model = buildModel({ pools });
  const { nm_fornecedor, cnpj, uf, tel, email } = input;
  const query = `
    INSERT INTO ctrl_emp.fornecedores (nm_fornecedor, cnpj, uf, tel, email)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id_forn,
      nm_fornecedor,
      cnpj,
      uf,
      tel,
      email,
      created_at,
      updated_at
  `;
  const result = await model.query(query, [nm_fornecedor, cnpj, uf, tel ?? null, email ?? null]);
  return result.rows[0];
}

async function updateFornecedor({ pools, id, input }) {
  const model = buildModel({ pools });
  const { nm_fornecedor, cnpj, uf, tel, email } = input;

  const query = `
    UPDATE ctrl_emp.fornecedores
    SET
      nm_fornecedor = COALESCE($2, nm_fornecedor),
      cnpj = COALESCE($3, cnpj),
      uf = COALESCE($4, uf),
      tel = COALESCE($5, tel),
      email = COALESCE($6, email),
      updated_at = NOW()
    WHERE id_forn = $1
    RETURNING
      id_forn,
      nm_fornecedor,
      cnpj,
      uf,
      tel,
      email,
      created_at,
      updated_at
  `;
  const result = await model.query(query, [id, nm_fornecedor, cnpj, uf, tel, email]);
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
  findFornecedorByUniqueFieldsNoCnpj,
  listFornecedorNomesFromEmpenho,
  listFornecedorCnpjsFromEmpenho,
  createFornecedor,
  updateFornecedor,
  deleteFornecedor,
};

