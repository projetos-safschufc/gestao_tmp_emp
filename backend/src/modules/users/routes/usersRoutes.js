const express = require('express');
const authJwt = require('../../../middlewares/authJwt');
const { requireAnyRole } = require('../../../middlewares/rbac');
const {
  createUserSchema,
  updateUserSchema,
  updateUserAccessSchema,
  resetPasswordSchema,
  listUsersQuerySchema,
} = require('../validators/userSchemas');
const {
  listUsersService,
  getUserService,
  createUserService,
  updateUserService,
  deleteUserService,
  resetPasswordService,
} = require('../services/usersService');

function buildUsersRouter({ pools }) {
  const router = express.Router();

  // Rota pública para registro de novos usuários
  router.post('/register', async (req, res, next) => {
    try {
      const parsed = createUserSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const user = await createUserService({ pools, input: parsed.data });
      return res.status(201).json({ user });
    } catch (err) {
      return next(err);
    }
  });

  // PDF: gestão de usuários para Gestor/Admin
  const requireGestorAdmin = requireAnyRole(['gestor', 'administrador']);
  const requireAdmin = requireAnyRole(['administrador']);

  router.use(authJwt);
  router.use(requireGestorAdmin);

  router.get('/', async (req, res, next) => {
    try {
      const parsed = listUsersQuerySchema.safeParse(req.query || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Query inválida',
          details: parsed.error.flatten(),
        });
      }

      const result = await listUsersService({ pools, query: parsed.data });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'id inválido' });
      }

      const user = await getUserService({ pools, id });
      if (!user) return res.status(404).json({ error: 'NotFound', message: 'Usuário não encontrado' });
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const parsed = createUserSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const user = await createUserService({ pools, input: parsed.data });
      return res.status(201).json({ user });
    } catch (err) {
      return next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'id inválido' });
      }

      const parsed = updateUserSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      if (Object.keys(parsed.data).length === 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'Nenhum campo para atualizar' });
      }

      const updated = await updateUserService({ pools, id, input: parsed.data });
      if (!updated) return res.status(404).json({ error: 'NotFound', message: 'Usuário não encontrado' });
      return res.json({ user: updated });
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'id inválido' });
      }

      const deleted = await deleteUserService({ pools, id });
      if (!deleted) return res.status(404).json({ error: 'NotFound', message: 'Usuário não encontrado' });
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:id/reset-password', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'id inválido' });
      }

      const parsed = resetPasswordSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const ok = await resetPasswordService({ pools, id, senha: parsed.data.senha });
      if (!ok) return res.status(404).json({ error: 'NotFound', message: 'Usuário não encontrado' });
      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  });

  router.patch('/:id/access', requireAdmin, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'id inválido' });
      }

      if (Number(req.user?.userId) === id) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Não é permitido alterar perfil/status do próprio usuário nesta ação',
        });
      }

      const parsed = updateUserAccessSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const updated = await updateUserService({
        pools,
        id,
        input: { perfil: parsed.data.perfil, status: parsed.data.status },
      });
      if (!updated) return res.status(404).json({ error: 'NotFound', message: 'Usuário não encontrado' });
      return res.json({ user: updated });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { buildUsersRouter };

