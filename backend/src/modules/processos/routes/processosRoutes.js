const express = require('express');
const multer = require('multer');
const path = require('path');
const authJwt = require('../../../middlewares/authJwt');
const { requireAnyRole } = require('../../../middlewares/rbac');

const {
  createProcessoSchema,
  updateProcessoSchema,
  listProcessosQuerySchema,
} = require('../validators/processosSchemas');
const {
  listProcessosService,
  createProcessoService,
  updateProcessoService,
  deleteProcessoService,
} = require('../services/processosService');

function buildProcessosRouter({ pools }) {
  const router = express.Router();

  router.use(authJwt);

  const requireRead = requireAnyRole(['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']);
  const requireWrite = requireAnyRole(['usuario_editor', 'gestor', 'administrador']);

  const uploadDir = path.join(process.cwd(), 'uploads', 'proc_fornecedores');
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const safeName = String(file.originalname).replace(/[^a-z0-9._-]/gi, '_');
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}-${safeName}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 },
  });

  const conditionalUploadAnexo = (req, res, next) => {
    if (!req.is('multipart/form-data')) return next();
    return upload.array('anexo', 20)(req, res, next);
  };

  router.get('/', requireRead, async (req, res, next) => {
    try {
      const parsed = listProcessosQuerySchema.safeParse(req.query || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Query inválida',
          details: parsed.error.flatten(),
        });
      }

      const { limit, offset, tipo_processo, nm_fornecedor, edital, empenho, uf } = parsed.data;
      const result = await listProcessosService({
        pools,
        query: { tipo_processo, nm_fornecedor, edital, empenho, uf },
        limit: limit ?? 20,
        offset: offset ?? 0,
      });

      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/', requireWrite, conditionalUploadAnexo, async (req, res, next) => {
    try {
      const raw = { ...req.body };

      // Se vier multipart com arquivos, transforma em metadata para JSONB.
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        raw.anexo = req.files.map((f) => ({
          originalname: f.originalname,
          filename: f.filename,
          mimetype: f.mimetype,
          size: f.size,
          path: f.path,
        }));
      }

      // Se for multipart mas o campo anexo vier como string JSON.
      if (raw.anexo && typeof raw.anexo === 'string') {
        try {
          if (raw.anexo.trim().startsWith('[')) raw.anexo = JSON.parse(raw.anexo);
        } catch {
          // Mantém string; o service/repository pode tratar.
        }
      }

      const parsed = createProcessoSchema.safeParse(raw);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const processo = await createProcessoService({ pools, input: parsed.data, user: req.user });
      return res.status(201).json({ processo });
    } catch (err) {
      return next(err);
    }
  });

  router.put('/:id', requireWrite, conditionalUploadAnexo, async (req, res, next) => {
    try {
      const id_proc = Number(req.params.id);
      if (!Number.isFinite(id_proc) || id_proc <= 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'id inválido' });
      }

      const raw = { ...req.body };
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        raw.anexo = req.files.map((f) => ({
          originalname: f.originalname,
          filename: f.filename,
          mimetype: f.mimetype,
          size: f.size,
          path: f.path,
        }));
      }

      const parsed = updateProcessoSchema.safeParse(raw);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const payload = parsed.data;
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'Nenhum campo para atualizar' });
      }

      const ok = await updateProcessoService({ pools, id_proc, input: payload, user: req.user });
      if (!ok) return res.status(404).json({ error: 'NotFound', message: 'Processo não encontrado' });

      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/:id', requireWrite, async (req, res, next) => {
    try {
      const id_proc = Number(req.params.id);
      if (!Number.isFinite(id_proc) || id_proc <= 0) {
        return res.status(400).json({ error: 'BadRequest', message: 'id inválido' });
      }

      const ok = await deleteProcessoService({ pools, id_proc });
      if (!ok) return res.status(404).json({ error: 'NotFound', message: 'Processo não encontrado' });

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { buildProcessosRouter };

