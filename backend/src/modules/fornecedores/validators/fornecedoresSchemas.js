const { z } = require('zod');
const { normalizeCnpj, validateCnpj } = require('./cnpj');

const ufSchema = z.enum([
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
]);

const fornecedorSchemaBase = z.object({
  nm_fornecedor: z.string().trim().min(2).max(200),
  cnpj: z
    .string()
    .min(11)
    .max(18)
    .transform((v) => normalizeCnpj(v))
    .refine((v) => v !== null && validateCnpj(v), { message: 'CNPJ inválido' }),
  uf: ufSchema,
});

const createFornecedorSchema = fornecedorSchemaBase;

const updateFornecedorSchema = fornecedorSchemaBase.partial().extend({
  nm_fornecedor: fornecedorSchemaBase.shape.nm_fornecedor.optional(),
  cnpj: fornecedorSchemaBase.shape.cnpj.optional(),
  uf: fornecedorSchemaBase.shape.uf.optional(),
});

const listQuerySchema = z.object({
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
  createFornecedorSchema,
  updateFornecedorSchema,
  listQuerySchema,
};

