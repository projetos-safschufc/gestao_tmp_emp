const express = require('express');
const authJwt = require('../../../middlewares/authJwt');
const { requireAnyRole } = require('../../../middlewares/rbac');
const { historicoQuerySchema } = require('../validators/historicoSchemas');
const { historicoService } = require('../services/historicoService');

function buildHistoricoRouter({ pools }) {
  const router = express.Router();

  router.use(authJwt);

  const requireRead = requireAnyRole(['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']);

  router.get('/', requireRead, async (req, res, next) => {
    try {
      const parsed = historicoQuerySchema.safeParse(req.query || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Query inválida',
          details: parsed.error.flatten(),
        });
      }

      const result = await historicoService({ pools, query: parsed.data });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { buildHistoricoRouter };

