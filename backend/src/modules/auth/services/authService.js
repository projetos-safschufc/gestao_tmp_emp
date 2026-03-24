const bcrypt = require('bcrypt');
const { signAccessToken } = require('../../../config/jwt');
const { findByEmailDb, getDevFallbackUser } = require('../repositories/userRepository');

async function login({ pools, email, password }) {
  // Tenta autenticar no banco primeiro; se tabelas ainda não existirem, usa fallback em dev.
  let user = null;
  let dbErrored = false;

  try {
    user = await findByEmailDb({ pools, email });
  } catch (err) {
    dbErrored = true;

    // FALLBACK DEV apenas quando não for produção.
    user = getDevFallbackUser();
  }

  if (!user) {
    return { ok: false, message: 'Credenciais inválidas' };
  }

  let passwordOk = false;

  if (user.devPasswordPlain) {
    passwordOk = password === user.devPasswordPlain;
  } else {
    passwordOk = await bcrypt.compare(password, user.senha_hash);
  }

  if (!passwordOk) {
    return { ok: false, message: 'Credenciais inválidas' };
  }

  const token = signAccessToken({
    userId: user.id,
    email: user.email,
    nome: user.nome,
    perfil: user.perfil,
  });

  return {
    ok: true,
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
    },
    // útil para depuração local (não expor em produção via controller)
    dbUsed: !dbErrored ? true : false,
  };
}

function meFromUser(req) {
  return {
    id: Number(req.user.userId),
    nome: req.user.nome,
    email: req.user.email,
    perfil: req.user.perfil,
  };
}

module.exports = { login, meFromUser };

