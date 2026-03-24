const { verifyAccessToken } = require('../config/jwt');

function authJwt(req, res, next) {
  try {
    const header = req.header('Authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token ausente' });
    }

    const decoded = verifyAccessToken(token);

    // jsonwebtoken retorna payload original; subject é userId
    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      nome: decoded.nome,
      perfil: decoded.perfil,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Token inválido' });
  }
}

module.exports = authJwt;

