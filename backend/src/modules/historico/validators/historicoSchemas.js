const { z } = require('zod');

const optionalString = z.string().trim().optional();

const statusEntregaEnum = z.enum(['PENDENTE', 'ATEND. PARCIAL', 'ENTREGUE', 'CANCELADO']).optional();

const historicoQuerySchema = z.object({
  empenho: optionalString,
  material: optionalString,
  fornecedor: optionalString,
  status_entrega: statusEntregaEnum,
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

module.exports = { historicoQuerySchema };

