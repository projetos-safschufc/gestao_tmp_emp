const { z } = require('zod');

const stringOpt = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

const statusPedidoSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .optional();

const listEmpenhosPendentesQuerySchema = z.object({
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

  fornecedor: stringOpt,
  codigo_material: stringOpt,
  empenho: stringOpt,
  responsavel: stringOpt,
  setor: stringOpt,
  status_pedido: statusPedidoSchema,
});

module.exports = { listEmpenhosPendentesQuerySchema };

