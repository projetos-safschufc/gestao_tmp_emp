const { getPagination } = require('../../../db/dbHelpers');
const { getDashboardMetrics } = require('../repositories/dashboardRepository');

async function metricsService({ pools }) {
  // Sem paginação: métricas agregadas
  return getDashboardMetrics({ pools });
}

module.exports = { metricsService };

