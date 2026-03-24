const jwt = require('jsonwebtoken');

function getEnv(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return v;
}

function signAccessToken({ userId, email, nome, perfil }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado');

  const expiresIn = getEnv('JWT_EXPIRES_IN', '8h');

  return jwt.sign(
    { email, nome, perfil },
    secret,
    {
      expiresIn,
      subject: String(userId),
      // issuer/audience podem ser adicionados depois
    },
  );
}

function verifyAccessToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado');

  return jwt.verify(token, secret);
}

module.exports = { signAccessToken, verifyAccessToken };

