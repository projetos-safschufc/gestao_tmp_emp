const { z } = require('zod');

const metricsQuerySchema = z.object({
  // Permite futura filtragem; por enquanto opcional
  // Ex.: status: 'PENDENTE' | ...
});

module.exports = { metricsQuerySchema };

