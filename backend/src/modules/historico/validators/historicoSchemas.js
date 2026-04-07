const { z } = require('zod');

const optionalString = z.string().trim().optional();

const statusEntregaEnum = z.enum(['PENDENTE', 'ATEND. PARCIAL', 'ENTREGUE', 'CANCELADO']).optional();
const sortByEnum = z
  .enum([
    'nu_documento_siafi',
    'nm_fornecedor',
    'material',
    'dt_confirmacao_recebimento',
    'prazo_entrega_dias',
    'previsao_entrega_calc',
    'atraso_dias',
    'apuracao_irregularidade',
    'troca_marca',
    'aplicacao_imr',
    'status_entrega',
    'responsavel',
    'notificacao_codigo',
    'observacao',
    'dt_liquidado',
    'dt_atualiz',
  ])
  .optional();
const sortDirEnum = z.enum(['asc', 'desc']).optional();

const historicoQuerySchema = z.object({
  empenho: optionalString,
  material: optionalString,
  fornecedor: optionalString,
  responsavel: optionalString,
  status_entrega: statusEntregaEnum,
  sort_by: sortByEnum,
  sort_dir: sortDirEnum,
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

