const express = require('express');
const { loginSchema } = require('../validators/loginSchema');
const authJwt = require('../../../middlewares/authJwt');
const { login } = require('../services/authService');

function buildAuthRouter({ pools }) {
  const router = express.Router();

  router.post('/login', async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const { email, password } = parsed.data;
      const result = await login({ pools, email, password });

      if (!result.ok) {
        return res.status(401).json({ error: 'Unauthorized', message: result.message });
      }

      return res.json({
        token: result.token,
        user: result.user,
      });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/me', authJwt, async (req, res) => {
    // Lê o perfil/usuário do JWT sem bater no banco (otimiza e simplifica fase atual)
    return res.json({
      id: Number(req.user.userId),
      nome: req.user.nome,
      email: req.user.email,
      perfil: req.user.perfil,
    });
  });

  return router;
}

module.exports = { buildAuthRouter };

