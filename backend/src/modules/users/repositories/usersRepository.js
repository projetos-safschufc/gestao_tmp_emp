const BaseModel = require('../../../models/BaseModel');

function buildModel({ pools }) {
  // Tabelas de controle/CRUD em SAFS
  return new BaseModel({ pool: pools.safs });
}

async function listUsers({ pools, limit, offset }) {
  const model = buildModel({ pools });

  const query = `
    SELECT
      id,
      nome,
      email,
      perfil,
      status,
      created_at,
      updated_at
    FROM ctrl_emp.usuarios
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await model.query(query, [limit, offset]);
  return result.rows;
}

async function getUserById({ pools, id }) {
  const model = buildModel({ pools });
  const query = `
    SELECT
      id,
      nome,
      email,
      perfil,
      status,
      created_at,
      updated_at
    FROM ctrl_emp.usuarios
    WHERE id = $1
    LIMIT 1
  `;
  const result = await model.query(query, [id]);
  return result.rows[0] || null;
}

async function findUserByEmail({ pools, email }) {
  const model = buildModel({ pools });
  const query = `
    SELECT
      id,
      nome,
      email,
      perfil,
      status,
      senha_hash
    FROM ctrl_emp.usuarios
    WHERE email = $1
    LIMIT 1
  `;
  const result = await model.query(query, [email]);
  return result.rows[0] || null;
}

async function createUser({ pools, nome, email, senha_hash, perfil, status }) {
  const model = buildModel({ pools });

  const query = `
    INSERT INTO ctrl_emp.usuarios (nome, email, senha_hash, perfil, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      nome,
      email,
      perfil,
      status,
      created_at,
      updated_at
  `;

  const result = await model.query(query, [nome, email, senha_hash, perfil, status]);
  return result.rows[0];
}

async function updateUser({ pools, id, nome, email, perfil, status }) {
  const model = buildModel({ pools });

  const query = `
    UPDATE ctrl_emp.usuarios
    SET
      nome = COALESCE($2, nome),
      email = COALESCE($3, email),
      perfil = COALESCE($4, perfil),
      status = COALESCE($5, status),
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      nome,
      email,
      perfil,
      status,
      created_at,
      updated_at
  `;

  const result = await model.query(query, [id, nome, email, perfil, status]);
  return result.rows[0] || null;
}

async function softDeleteUser({ pools, id }) {
  const model = buildModel({ pools });
  const query = `
    UPDATE ctrl_emp.usuarios
    SET status = 'inativo', updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `;
  const result = await model.query(query, [id]);
  return result.rows[0] ? true : false;
}

async function resetPassword({ pools, id, senha_hash }) {
  const model = buildModel({ pools });
  const query = `
    UPDATE ctrl_emp.usuarios
    SET senha_hash = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `;
  const result = await model.query(query, [id, senha_hash]);
  return result.rows[0] ? true : false;
}

module.exports = {
  listUsers,
  getUserById,
  findUserByEmail,
  createUser,
  updateUser,
  softDeleteUser,
  resetPassword,
};

