const { z } = require('zod');

/**
 * Query params do dashboard analítico.
 * - trendDays: janela em dias para a série temporal semanal (novos cadastros em emp_pend).
 */
const metricsQuerySchema = z.object({
  trendDays: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : Number(v)))
    .refine((n) => n === undefined || (Number.isFinite(n) && n >= 7 && n <= 365), {
      message: 'trendDays deve estar entre 7 e 365',
    }),
});

module.exports = { metricsQuerySchema };
