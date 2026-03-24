const express = require('express');
const authJwt = require('../../../middlewares/authJwt');
const { requireAnyRole } = require('../../../middlewares/rbac');
const {
  createFornecedorSchema,
  updateFornecedorSchema,
  listQuerySchema,
} = require('../validators/fornecedoresSchemas');
const {
  listFornecedoresService,
  getFornecedorService,
  createFornecedorService,
  updateFornecedorService,
  deleteFornecedorService,
} = require('../services/fornecedoresService');

function buildFornecedoresRouter({ pools }) {
  const router = express.Router();

  router.use(authJwt);

  const requireRead = requireAnyRole(['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']);
  const requireWrite = requireAnyRole(['usuario_editor', 'gestor', 'administrador']);

  router.get('/', requireRead, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Query inválida',
          details: parsed.error.flatten(),
        });
      }

      const result = await listFornecedoresService({ pools, query: parsed.data });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/:id', requireRead, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'id inválido' });
      }

      const fornecedor = await getFornecedorService({ pools, id });
      if (!fornecedor) return res.status(404).json({ error: 'NotFound', message: 'Fornecedor não encontrado' });
      return res.json({ fornecedor });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/', requireWrite, async (req, res, next) => {
    try {
      const parsed = createFornecedorSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const fornecedor = await createFornecedorService({ pools, input: parsed.data });
      return res.status(201).json({ fornecedor });
    } catch (err) {
      return next(err);
    }
  });

  router.put('/:id', requireWrite, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'id inválido' });
      }

      const parsed = updateFornecedorSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const input = parsed.data;
      const hasAny = ['nm_fornecedor', 'cnpj', 'uf'].some((k) => input[k] !== undefined);
      if (!hasAny) {
        return res.status(400).json({ error: 'BadRequest', message: 'Nenhum campo para atualizar' });
      }

      const updated = await updateFornecedorService({ pools, id, input });
      if (!updated) return res.status(404).json({ error: 'NotFound', message: 'Fornecedor não encontrado' });
      return res.json({ fornecedor: updated });
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/:id', requireWrite, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'id inválido' });
      }

      const ok = await deleteFornecedorService({ pools, id });
      if (!ok) return res.status(404).json({ error: 'NotFound', message: 'Fornecedor não encontrado' });
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { buildFornecedoresRouter };

