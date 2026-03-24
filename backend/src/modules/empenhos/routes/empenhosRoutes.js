const express = require('express');
const authJwt = require('../../../middlewares/authJwt');
const { requireAnyRole } = require('../../../middlewares/rbac');
const { listEmpenhosPendentesQuerySchema } = require('../validators/empenhosSchemas');
const { listEmpenhosPendentesService, getResponsaveisOptionsService, getStatusPedidoOptionsService } = require('../services/empenhosService');

function buildEmpenhosRouter({ pools }) {
  const router = express.Router();

  router.use(authJwt);

  const requireRead = requireAnyRole(['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']);

  router.get('/pendentes', requireRead, async (req, res, next) => {
    try {
      const parsed = listEmpenhosPendentesQuerySchema.safeParse(req.query || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Query inválida',
          details: parsed.error.flatten(),
        });
      }

      const result = await listEmpenhosPendentesService({ pools, query: parsed.data });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/responsaveis-options', requireRead, async (req, res, next) => {
    try {
      const result = await getResponsaveisOptionsService({ pools });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/status-pedido-options', requireRead, async (req, res, next) => {
    try {
      const parsed = listEmpenhosPendentesQuerySchema.safeParse(req.query || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Query inválida',
          details: parsed.error.flatten(),
        });
      }

      const result = await getStatusPedidoOptionsService({ pools, query: parsed.data });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { buildEmpenhosRouter };

