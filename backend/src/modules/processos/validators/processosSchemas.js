const { z } = require('zod');

function stripDiacritics(str) {
  // Remove acentos/diacríticos (Unicode NFD)
  return String(str)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function normalizeForFuzzy(value) {
  // Remove acentos, ? e tudo que não seja letra/número/espaço.
  return stripDiacritics(value)
    .replace(/[?]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, ' ');
}

function canonicalizeTipoProcesso(value) {
  const norm = normalizeForFuzzy(value);
  if (norm.includes('irregular')) return 'Apuração de irregularidade';
  if (norm.includes('marca')) return 'Troca de marca';
  if (norm.includes('preco')) return 'Reequilíbrio de preço';
  return null;
}

const tipoProcessoSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .transform((v) => canonicalizeTipoProcesso(v))
  .refine((v) => v !== null, { message: 'tipo_processo inválido' });

const statusEnumSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .transform((v) => {
    const norm = normalizeForFuzzy(v);
    if (norm.includes('em andamento')) return 'Em andamento';
    if (norm.includes('reaberto')) return 'Reaberto';
    if (norm.includes('concluido') && norm.includes('deferimento')) return 'concluído c/ Deferimento';
    if (norm.includes('concluido') && norm.includes('indeferimento')) return 'Concluído c/ Indeferimento';
    return null;
  })
  .refine((v) => v !== null, { message: 'status inválido' });

const sancaoEnumSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .transform((v) => {
    const norm = normalizeForFuzzy(v);
    if (norm.includes('advert')) return 'advertência';
    if (norm.includes('arquivamento') && norm.includes('sanc')) return 'arquivamento sem sanção';
    if (norm.includes('multa')) return 'multa';
    if (norm.includes('sanc') && norm.includes('pendente')) return 'sanção pendente';
    return null;
  })
  .refine((v) => v !== null, { message: 'sancao_aplicada inválida' });

function optionalDateBROrISO() {
  // Recebe string; valida via regex nos formatos comuns.
  return z
    .string()
    .trim()
    .min(1)
    .max(30)
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const t = String(v).trim();
      if (!t) return undefined;
      return t;
    });
}

const createProcessoSchema = z.object({
  tipo_processo: tipoProcessoSchema,
  dt_processo: z.string().trim().min(1).max(30),

  nm_fornecedor: z.string().trim().min(1).max(200),
  cnpj: z.string().trim().max(18).optional().nullable(),
  uf: z.enum([
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ]),

  processo_acao: z.string().trim().max(2000).optional().nullable(),
  processo_origem: z.string().trim().max(2000).optional().nullable(),
  item_pregao: z.string().trim().max(2000).optional().nullable(),
  edital: z.string().trim().max(2000).optional().nullable(),
  empenho: z.string().trim().max(2000).optional().nullable(),
  dt_ufac: z.string().trim().max(30).optional().nullable(),

  status: statusEnumSchema,
  dt_conclusao: z.string().trim().max(30).optional().nullable(),

  sancao_aplicada: sancaoEnumSchema.optional().nullable(),
  valor_multa: z.string().optional().nullable(),

  observacao: z.string().trim().max(4000).optional().nullable(),
  anexo: z.any().optional(), // JSON body pode enviar metadados; multipart será tratado na rota.
});

const updateProcessoSchema = createProcessoSchema.partial();

const listProcessosQuerySchema = z.object({
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

  tipo_processo: z.string().trim().max(200).optional(),
  nm_fornecedor: z.string().trim().max(200).optional(),
  cnpj: z.string().trim().max(18).optional(),
  edital: z.string().trim().max(200).optional(),
  empenho: z.string().trim().max(200).optional(),
  uf: z.string().trim().max(2).optional(),
});

module.exports = {
  createProcessoSchema,
  updateProcessoSchema,
  listProcessosQuerySchema,
};

