const express = require('express');
const authJwt = require('../../../middlewares/authJwt');
const { requireAnyRole } = require('../../../middlewares/rbac');
const { metricsQuerySchema } = require('../validators/dashboardSchemas');
const { metricsService } = require('../services/dashboardService');

function buildDashboardRouter({ pools }) {
  const router = express.Router();

  router.use(authJwt);

  const requireRead = requireAnyRole(['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']);

  router.get('/metrics', requireRead, async (req, res, next) => {
    try {
      const parsed = metricsQuerySchema.safeParse(req.query || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Query inválida',
          details: parsed.error.flatten(),
        });
      }

      const metrics = await metricsService({ pools, query: parsed.data });
      return res.json(metrics);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { buildDashboardRouter };

