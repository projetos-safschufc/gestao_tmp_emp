/**
 * Regras determinísticas e explicáveis para alertas e recomendações (sem ML).
 */

function formatBRL(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

/**
 * @param {object} metrics - Resposta de getDashboardMetrics (inclui alertContext).
 * @returns {Array<{ severity: string, code: string, title: string, message: string, hint?: string }>}
 */
function buildDashboardAlerts(metrics) {
  const alerts = [];
  const ctx = metrics.alertContext || {};
  const sla = metrics.sla || {};
  const pipeline = metrics.pipelineStages || {};

  if (ctx.atrasosCriticos > 0) {
    alerts.push({
      severity: 'high',
      code: 'ATRASOS_CRITICOS',
      title: 'Atrasos críticos',
      message: `${ctx.atrasosCriticos} item(ns) com mais de 60 dias de atraso após a data prevista de entrega.`,
      hint: 'Priorize contato com o fornecedor, notificação formal e registro de acompanhamento.',
    });
  }

  if (ctx.itensSemAtualizacao20d > 0) {
    alerts.push({
      severity: 'medium',
      code: 'ITENS_SEM_ATUALIZACAO',
      message: `${ctx.itensSemAtualizacao20d} pendência(s) sem atualização de cadastro há mais de 20 dias.`,
      hint: 'Revise responsáveis e atualize o status na tela de Acompanhamento.',
    });
  }

  if (ctx.topRiscoFornecedor && ctx.topRiscoFornecedor.nivelRisco === 'ALTO') {
    const s = ctx.topRiscoFornecedor;
    alerts.push({
      severity: 'high',
      code: 'FORNECEDOR_ALTO_RISCO',
      title: 'Fornecedor em alto risco',
      message: `${s.nmFornecedor} — score ${s.scoreRisco} (${s.pctAtraso}% dos itens em atraso, média ${s.mediaAtrasoDias} dias).`,
      hint: 'Avalie bloqueio parcial, reforço de SLA ou substituição conforme política institucional.',
    });
  }

  if (ctx.valorEmRisco > 500000) {
    alerts.push({
      severity: 'medium',
      code: 'VALOR_EM_RISCO_ELEVADO',
      title: 'Valor financeiro em risco elevado',
      message: `Valor pendente em situação de atraso: ${formatBRL(ctx.valorEmRisco)}.`,
      hint: 'Use o ranking por fornecedor e o Pareto para focar os maiores impactos.',
    });
  }

  if (sla.pctAtrasado !== null && sla.pctAtrasado >= 35 && sla.baseItensComPrevisao >= 10) {
    alerts.push({
      severity: 'medium',
      code: 'SLA_ELEVADO',
      title: 'SLA de entrega pressionado',
      message: `${sla.pctAtrasado}% das pendências com previsão estão em atraso (base: ${sla.baseItensComPrevisao} itens).`,
      hint: 'Reforce acompanhamento semanal e trate os maiores atrasos primeiro.',
    });
  }

  if (
    pipeline.emAtraso > 5 &&
    pipeline.comProcessoApuracao < Math.min(3, Math.ceil(pipeline.emAtraso * 0.1))
  ) {
    alerts.push({
      severity: 'low',
      code: 'PROCESSO_APURACAO_SUBUTILIZADO',
      title: 'Processos de apuração',
      message: `Há ${pipeline.emAtraso} itens em atraso, mas poucos com processo de apuração registrado.`,
      hint: 'Quando aplicável, registre o processo de apuração para rastreabilidade.',
    });
  }

  return alerts.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });
}

module.exports = { buildDashboardAlerts };
