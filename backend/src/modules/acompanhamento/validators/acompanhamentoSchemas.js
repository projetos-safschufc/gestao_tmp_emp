const { z } = require('zod');

const statusEntregaSchema = z.enum(['PENDENTE', 'ATEND. PARCIAL', 'ENTREGUE', 'CANCELADO']);

const optionalString = z
  .string()
  .trim()
  .min(0)
  .max(2000)
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalDateLike = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .optional();

const upsertItemSchema = z.object({
  nu_processo: z.string().trim().min(1).max(100),
  item: z.number().int().min(0).max(999999),
  cd_material: z.string().trim().min(1).max(200),
  nu_documento_siafi: z.string().trim().min(1).max(100),
  nm_fornecedor: z.string().trim().min(1).max(200),
  cd_cgc: optionalString,

  prazo_entrega_dias: z.number().int().min(0).max(3650).optional().default(0),
  dt_confirmacao_recebimento: optionalDateLike,
  status_entrega: statusEntregaSchema.optional().default('PENDENTE'),
  notificacao_codigo: optionalString,

  apuracao_irregularidade: z.boolean().optional().default(false),
  processo_apuracao: optionalString,

  troca_marca: z.boolean().optional().default(false),
  processo_troca_marca: optionalString,

  reequilibrio_financeiro: z.boolean().optional().default(false),
  processo_reequilibrio_financeiro: optionalString,

  aplicacao_imr: z.boolean().optional().default(false),
  valor_imr: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v))
    .nullable()
    .optional(),

  observacao: optionalString,
  setor_responsavel: optionalString,
  resp_controle: optionalString,
});

const upsertPayloadSchema = z.object({
  items: z.array(upsertItemSchema).min(1).max(500),
  mode: z.enum(['novo', 'historico']).optional().default('novo'),
});

const listItensQuerySchema = z.object({
  empenho: z.string().trim().min(1).max(100),
  mode: z.enum(['novo', 'historico']).optional().default('novo'),
});

module.exports = {
  upsertPayloadSchema,
  listItensQuerySchema,
  statusEntregaSchema,
};

