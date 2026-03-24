const bcrypt = require('bcrypt');
const { getPagination } = require('../../../db/dbHelpers');
const {
  createUser,
  updateUser,
  softDeleteUser,
  resetPassword,
  listUsers,
  getUserById,
  findUserByEmail,
} = require('../repositories/usersRepository');

async function listUsersService({ pools, query }) {
  const { limit, offset } = getPagination(query || {});
  const rows = await listUsers({ pools, limit, offset });
  return { rows, limit, offset };
}

async function getUserService({ pools, id }) {
  const user = await getUserById({ pools, id });
  return user;
}

async function createUserService({ pools, input }) {
  const exists = await findUserByEmail({ pools, email: input.email });
  if (exists && exists.status === 'ativo') {
    const err = new Error('Email já cadastrado');
    err.statusCode = 409;
    throw err;
  }

  const senha_hash = await bcrypt.hash(input.senha, 10);

  return createUser({
    pools,
    nome: input.nome,
    email: input.email,
    senha_hash,
    perfil: input.perfil,
    status: input.status,
  });
}

async function updateUserService({ pools, id, input }) {
  const exists = input.email ? await findUserByEmail({ pools, email: input.email }) : null;
  if (exists && Number(exists.id) !== Number(id)) {
    const err = new Error('Email já cadastrado');
    err.statusCode = 409;
    throw err;
  }

  let senha_hash = null;
  if (input.senha) {
    senha_hash = await bcrypt.hash(input.senha, 10);
  }

  // update de campos principais
  const updated = await updateUser({
    pools,
    id,
    nome: input.nome,
    email: input.email,
    perfil: input.perfil,
    status: input.status,
  });

  // Se senha foi enviada, atualiza separadamente para manter validação simples.
  if (senha_hash) {
    await resetPassword({ pools, id, senha_hash });
  }

  return updated;
}

async function deleteUserService({ pools, id }) {
  return softDeleteUser({ pools, id });
}

async function resetPasswordService({ pools, id, senha }) {
  const senha_hash = await bcrypt.hash(senha, 10);
  return resetPassword({ pools, id, senha_hash });
}

module.exports = {
  listUsersService,
  getUserService,
  createUserService,
  updateUserService,
  deleteUserService,
  resetPasswordService,
};

