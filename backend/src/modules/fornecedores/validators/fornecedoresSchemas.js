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

function splitEmails(value) {
  return String(value || '')
    .split(';')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEmailList(value) {
  const emails = splitEmails(value);
  return emails.length ? emails.join('; ') : undefined;
}

function isValidEmailList(value) {
  const emails = splitEmails(value);
  if (emails.length === 0) return true;
  return emails.every((email) => z.string().email().safeParse(email).success);
}

const fornecedorSchemaBase = z.object({
  nm_fornecedor: z.string().trim().min(2).max(200),
  cnpj: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const trimmed = String(v).trim();
      if (!trimmed) return undefined;
      return normalizeCnpj(trimmed);
    })
    .refine((v) => v === undefined || (v !== null && validateCnpj(v)), { message: 'CNPJ inválido' }),
  uf: ufSchema,
  tel: z
    .string()
    .trim()
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const digits = v.replace(/\D/g, '');
      return digits.length ? digits : undefined;
    })
    .refine((v) => v === undefined || (v.length >= 10 && v.length <= 11), {
      message: 'Telefone inválido (use 10 ou 11 dígitos)',
    }),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => normalizeEmailList(v))
    .refine((v) => v === undefined || isValidEmailList(v), {
      message: 'Email inválido',
    }),
});

const createFornecedorSchema = fornecedorSchemaBase;

const updateFornecedorSchema = fornecedorSchemaBase.partial().extend({
  nm_fornecedor: fornecedorSchemaBase.shape.nm_fornecedor.optional(),
  cnpj: fornecedorSchemaBase.shape.cnpj.optional(),
  uf: fornecedorSchemaBase.shape.uf.optional(),
  tel: fornecedorSchemaBase.shape.tel.optional(),
  email: fornecedorSchemaBase.shape.email.optional(),
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

const nomesOptionsQuerySchema = z.object({});

const cnpjsOptionsQuerySchema = z.object({
  nm_fornecedor: z.string().trim().min(1).max(200),
});

module.exports = {
  createFornecedorSchema,
  updateFornecedorSchema,
  listQuerySchema,
  nomesOptionsQuerySchema,
  cnpjsOptionsQuerySchema,
};

