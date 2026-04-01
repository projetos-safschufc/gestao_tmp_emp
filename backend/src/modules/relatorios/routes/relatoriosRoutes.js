const express = require('express');
const authJwt = require('../../../middlewares/authJwt');
const { requireAnyRole } = require('../../../middlewares/rbac');
const { relatorioConsolidadoQuerySchema } = require('../validators/relatoriosSchemas');
const { getRelatorioConsolidadoService, getRelatorioDiagnosticoService } = require('../services/relatoriosService');

function buildRelatoriosRouter({ pools }) {
  const router = express.Router();

  router.use(authJwt);
  const requireRead = requireAnyRole(['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']);

  router.get('/consolidado', requireRead, async (req, res, next) => {
    try {
      const parsed = relatorioConsolidadoQuerySchema.safeParse(req.query || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Query inválida',
          details: parsed.error.flatten(),
        });
      }

      const result = await getRelatorioConsolidadoService({ pools, query: parsed.data });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/diagnostico', requireRead, async (req, res, next) => {
    try {
      const parsed = relatorioConsolidadoQuerySchema.safeParse(req.query || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Query inválida',
          details: parsed.error.flatten(),
        });
      }

      const result = await getRelatorioDiagnosticoService({ pools, query: parsed.data });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { buildRelatoriosRouter };

