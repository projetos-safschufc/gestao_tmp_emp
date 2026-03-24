const BaseModel = require('../../../models/BaseModel');

function getEnvOrThrow(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

async function findByEmailDb({ pools, email }) {
  const { safs } = pools;
  const model = new BaseModel({ pool: safs });

  // Schema (conforme PDF): safs.ctrl_emp.usuarios
  const query = `
    SELECT
      id,
      nome,
      email,
      senha_hash,
      perfil,
      status,
      created_at,
      updated_at
    FROM ctrl_emp.usuarios
    WHERE email = $1
    AND status = 'ativo'
    LIMIT 1
  `;

  const result = await model.query(query, [email]);
  return result.rows[0] || null;
}

function getDevFallbackUser() {
  if (process.env.NODE_ENV === 'production') return null;

  const email = process.env.AUTH_DEV_USER_EMAIL;
  const password = process.env.AUTH_DEV_USER_PASSWORD;
  const perfil = process.env.AUTH_DEV_USER_PROFILE || 'administrador';

  if (!email || !password) return null;

  return {
    id: 0,
    nome: 'Usuário DEV',
    email,
    perfil,
    status: 'ativo',
    // password será comparada via bcrypt no service
    devPasswordPlain: password,
  };
}

module.exports = {
  findByEmailDb,
  getDevFallbackUser,
  getEnvOrThrow,
};

