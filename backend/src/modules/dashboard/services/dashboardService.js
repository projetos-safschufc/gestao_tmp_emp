const { getDashboardMetrics } = require('../repositories/dashboardRepository');
const { buildDashboardAlerts } = require('./dashboardInsights');

async function metricsService({ pools, query }) {
  const metrics = await getDashboardMetrics({ pools, query });
  const alerts = buildDashboardAlerts(metrics);
  const { alertContext: _ac, ...rest } = metrics;
  return { ...rest, alerts };
}

module.exports = { metricsService };

