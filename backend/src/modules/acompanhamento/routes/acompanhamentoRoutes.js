const express = require('express');
const authJwt = require('../../../middlewares/authJwt');
const { requireAnyRole } = require('../../../middlewares/rbac');
const {
  upsertPayloadSchema,
  listItensQuerySchema,
} = require('../validators/acompanhamentoSchemas');
const {
  listItensByEmpenhoService,
  upsertItensService,
} = require('../services/acompanhamentoService');

function buildAcompanhamentoRouter({ pools }) {
  const router = express.Router();

  router.use(authJwt);

  const requireRead = requireAnyRole(['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']);
  const requireWrite = requireAnyRole(['usuario_editor', 'gestor', 'administrador']);

  router.get('/itens', requireRead, async (req, res, next) => {
    try {
      const parsed = listItensQuerySchema.safeParse(req.query || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Query inválida',
          details: parsed.error.flatten(),
        });
      }

      const result = await listItensByEmpenhoService({
        pools,
        empenho: parsed.data.empenho,
        mode: parsed.data.mode,
      });

      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/upsert', requireWrite, async (req, res, next) => {
    try {
      const parsed = upsertPayloadSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const result = await upsertItensService({
        pools,
        items: parsed.data.items,
        mode: parsed.data.mode,
        user: req.user,
      });

      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { buildAcompanhamentoRouter };

