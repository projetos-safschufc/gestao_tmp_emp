const { z } = require('zod');

const perfilSchema = z.enum(['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']);

const statusSchema = z.enum(['ativo', 'inativo']).default('ativo');

const emailSchema = z.string().email().max(255);

const createUserSchema = z.object({
  nome: z.string().trim().min(2).max(200),
  email: emailSchema,
  senha: z.string().min(6).max(100),
  perfil: perfilSchema,
  status: statusSchema.optional(),
});

const updateUserSchema = z.object({
  nome: z.string().trim().min(2).max(200).optional(),
  email: emailSchema.optional(),
  perfil: perfilSchema.optional(),
  status: statusSchema.optional(),
  senha: z.string().min(6).max(100).optional(),
});

const resetPasswordSchema = z.object({
  senha: z.string().min(6).max(100),
});

const listUsersQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : Number(v)))
    .refine((n) => n === undefined || (Number.isFinite(n) && n >= 1 && n <= 100), {
      message: 'limit inválido',
    }),
  offset: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : Number(v)))
    .refine((n) => n === undefined || (Number.isFinite(n) && n >= 0 && n <= 1000000), {
      message: 'offset inválido',
    }),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  listUsersQuerySchema,
};

