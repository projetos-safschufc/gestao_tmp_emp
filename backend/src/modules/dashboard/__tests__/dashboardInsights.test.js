const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDashboardAlerts } = require('../services/dashboardInsights');

test('buildDashboardAlerts retorna alerta de atrasos críticos', () => {
  const alerts = buildDashboardAlerts({
    alertContext: { atrasosCriticos: 3 },
    sla: { baseItensComPrevisao: 10, pctAtrasado: 10, pctNoPrazo: 90 },
    pipelineStages: { emAtraso: 3, comProcessoApuracao: 0 },
  });
  assert.ok(alerts.some((a) => a.code === 'ATRASOS_CRITICOS'));
});

test('buildDashboardAlerts ordena severidade (high antes de low)', () => {
  const alerts = buildDashboardAlerts({
    alertContext: {
      atrasosCriticos: 1,
      itensSemAtualizacao20d: 5,
      valorEmRisco: 600000,
      topRiscoFornecedor: {
        nmFornecedor: 'X',
        nivelRisco: 'ALTO',
        scoreRisco: 80,
        pctAtraso: 50,
        mediaAtrasoDias: 20,
      },
    },
    sla: { baseItensComPrevisao: 20, pctAtrasado: 40, pctNoPrazo: 60 },
    pipelineStages: { emAtraso: 10, comProcessoApuracao: 0 },
  });
  assert.ok(alerts.length > 0);
  assert.equal(alerts[0].severity, 'high');
});
