/**
 * Dicionário de métricas do Dashboard Inteligente (governança e documentação de contrato).
 * Fonte principal: ctrl_emp.emp_pend + LEFT JOIN public.empenho (valores/saldos).
 */

const PENDING_STATUSES = ['PENDENTE', 'ATEND. PARCIAL'];

const METRIC_DEFINITIONS = {
  escopoPendente: {
    descricao: 'Apenas itens com status_entrega em PENDENTE ou ATEND. PARCIAL.',
    valores: PENDING_STATUSES,
  },
  previsaoEntrega: {
    descricao: 'Data prevista = dt_confirmacao_recebimento + prazo_entrega_dias (quando há confirmação).',
  },
  atrasoDias: {
    descricao:
      'Dias de atraso após a previsão: CURRENT_DATE - previsao quando CURRENT_DATE > previsao; caso contrário NULL.',
  },
  sla: {
    descricao:
      'SLA considera apenas itens com dt_confirmacao_recebimento informada (há previsão). % no prazo vs % em atraso.',
  },
  valorPendente: {
    descricao:
      'vl_unidade * (qt_de_embalagem - qt_saldo_item) quando saldo existe; senão vl_unidade * qt_de_embalagem; zeros se faltar dado.',
  },
  valorEmRisco: {
    descricao: 'Soma do valor pendente em itens com atraso_dias > 0 (em atraso).',
  },
  agingBuckets: {
    descricao: 'Distribuição do atraso (dias) apenas para itens com atraso_dias > 0.',
    faixas: ['0-10', '11-30', '31-60', '60+'],
  },
  riscoFornecedor: {
    descricao:
      'Score 0–100 heurístico: combina % de itens atrasados, média de atraso (entre atrasados), processos administrativos abertos e participação no valor total.',
    pesos: { atrasoPct: 0.35, mediaAtraso: 0.25, processos: 0.2, valor: 0.2 },
  },
  pareto: {
    descricao: 'Curva de Pareto por valor pendente acumulado por fornecedor (top N).',
  },
  tendencia: {
    descricao:
      'Série semanal: novos registros em emp_pend por semana de dt_cadastro (aproxima entrada de pendências no período).',
  },
  funil: {
    descricao:
      'Estágios derivados de campos em emp_pend: confirmação, atraso, notificação e processo de apuração preenchidos.',
  },
  processosAdministrativos: {
    descricao:
      'Processos abertos em ctrl_emp.proc_fornecedores com dt_conclusao IS NULL, agregados por nm_fornecedor.',
  },
};

module.exports = {
  PENDING_STATUSES,
  METRIC_DEFINITIONS,
};
