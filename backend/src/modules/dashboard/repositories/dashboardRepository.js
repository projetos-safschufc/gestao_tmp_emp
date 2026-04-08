const BaseModel = require('../../../models/BaseModel');
const { PENDING_STATUSES, METRIC_DEFINITIONS } = require('../constants/metricsDictionary');

function trimKey(s) {
  return String(s || '').trim();
}

function buildModel({ pools }) {
  return new BaseModel({ pool: pools.safs });
}

/** CTE base: pendências com valor, previsão e atraso (alinhado ao Histórico/Acompanhamento). */
function sqlPendCte() {
  return `
    pend AS (
      SELECT
        p.id,
        p.nu_documento_siafi,
        p.nu_processo,
        p.item,
        p.cd_material,
        p.dt_confirmacao_recebimento,
        p.prazo_entrega_dias,
        p.dt_cadastro,
        p.dt_atualiz,
        p.notificacao_codigo,
        p.processo_apuracao,
        COALESCE(p.nm_fornecedor, e.nm_fornecedor, 'Não informado') AS nm_fornecedor_eff,
        CASE
          WHEN e.vl_unidade IS NULL OR e.qt_de_embalagem IS NULL THEN 0::numeric(18,2)
          ELSE (
            e.vl_unidade * (
              CASE
                WHEN e.qt_saldo_item IS NULL THEN e.qt_de_embalagem
                ELSE e.qt_de_embalagem - e.qt_saldo_item
              END
            )
          )::numeric(18,2)
        END AS valor_pendente,
        (p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0)) AS previsao_dt,
        CASE
          WHEN p.dt_confirmacao_recebimento IS NOT NULL
            AND CURRENT_DATE > (p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0))
          THEN (
            CURRENT_DATE - (p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0))
          )::integer
          ELSE NULL
        END AS atraso_dias
      FROM ctrl_emp.emp_pend p
      LEFT JOIN public.empenho e
        ON e.nu_documento_siafi::text = p.nu_documento_siafi::text
        AND e.nu_processo::text = p.nu_processo::text
        AND e.cd_material::text = p.cd_material::text
        AND e.item::int = p.item::int
      WHERE p.status_entrega = ANY($1::text[])
    )
  `;
}

async function queryExecutiveSlaAgingPipeline({ model, pendingStatuses }) {
  const sql = `
    WITH ${sqlPendCte()}
    SELECT
      (SELECT COUNT(*)::int FROM pend) AS total_pendentes,
      (SELECT COALESCE(SUM(valor_pendente), 0)::numeric(18,2) FROM pend WHERE COALESCE(atraso_dias, 0) > 0) AS valor_em_risco,
      (SELECT COUNT(*)::int FROM pend WHERE COALESCE(atraso_dias, 0) > 60) AS atrasos_criticos,
      (SELECT COUNT(*)::int FROM pend WHERE dt_atualiz::date < CURRENT_DATE - 20) AS itens_sem_atualizacao_20d,
      (SELECT COUNT(*)::int FROM pend WHERE dt_confirmacao_recebimento IS NOT NULL) AS sla_base_itens,
      (SELECT COUNT(*)::int FROM pend WHERE dt_confirmacao_recebimento IS NOT NULL AND COALESCE(atraso_dias, 0) > 0) AS sla_em_atraso,
      (SELECT COUNT(*)::int FROM pend WHERE dt_confirmacao_recebimento IS NOT NULL AND COALESCE(atraso_dias, 0) = 0) AS sla_no_prazo,
      (SELECT COUNT(*)::int FROM pend WHERE COALESCE(atraso_dias, 0) BETWEEN 1 AND 10) AS aging_0_10,
      (SELECT COUNT(*)::int FROM pend WHERE COALESCE(atraso_dias, 0) BETWEEN 11 AND 30) AS aging_11_30,
      (SELECT COUNT(*)::int FROM pend WHERE COALESCE(atraso_dias, 0) BETWEEN 31 AND 60) AS aging_31_60,
      (SELECT COUNT(*)::int FROM pend WHERE COALESCE(atraso_dias, 0) > 60) AS aging_60_plus,
      (SELECT COUNT(*)::int FROM pend WHERE dt_confirmacao_recebimento IS NOT NULL) AS funil_com_confirmacao,
      (SELECT COUNT(*)::int FROM pend WHERE COALESCE(atraso_dias, 0) = 0 OR atraso_dias IS NULL) AS funil_dentro_ou_sem_atraso,
      (SELECT COUNT(*)::int FROM pend WHERE COALESCE(atraso_dias, 0) > 0) AS funil_em_atraso,
      (SELECT COUNT(*)::int FROM pend WHERE notificacao_codigo IS NOT NULL AND BTRIM(notificacao_codigo::text) <> '') AS funil_com_notificacao,
      (SELECT COUNT(*)::int FROM pend WHERE processo_apuracao IS NOT NULL AND BTRIM(processo_apuracao::text) <> '') AS funil_com_processo_apuracao
  `;
  const res = await model.query(sql, [pendingStatuses]);
  return res.rows[0] || {};
}

async function queryTempoMedioLegacy({ model, pendingStatuses }) {
  const sql = `
    SELECT AVG(
      (CURRENT_DATE - COALESCE(dt_confirmacao_recebimento::date, dt_cadastro::date))
    )::numeric(18,2) AS tempo_medio_envio_dias
    FROM ctrl_emp.emp_pend
    WHERE status_entrega = ANY($1::text[])
      AND dt_confirmacao_recebimento IS NOT NULL
  `;
  const res = await model.query(sql, [pendingStatuses]);
  const v = res.rows[0]?.tempo_medio_envio_dias;
  return v === null || v === undefined ? null : Number(v);
}

async function queryTopFornecedoresLegacy({ model, pendingStatuses }) {
  const sql = `
    SELECT
      COALESCE(p.nm_fornecedor, e.nm_fornecedor, 'Não informado') AS nm_fornecedor,
      COUNT(*)::int AS total_itens_pendentes,
      COALESCE(SUM(
        CASE
          WHEN e.vl_unidade IS NULL OR e.qt_de_embalagem IS NULL THEN 0
          ELSE e.vl_unidade * (
            CASE
              WHEN e.qt_saldo_item IS NULL THEN e.qt_de_embalagem
              ELSE e.qt_de_embalagem - e.qt_saldo_item
            END
          )
        END
      ), 0)::numeric(18,2) AS valor_pendente_acumulado
    FROM ctrl_emp.emp_pend p
    LEFT JOIN public.empenho e
      ON e.nu_documento_siafi::text = p.nu_documento_siafi::text
      AND e.nu_processo::text = p.nu_processo::text
      AND e.cd_material::text = p.cd_material::text
      AND e.item::int = p.item::int
    WHERE p.status_entrega = ANY($1::text[])
    GROUP BY COALESCE(p.nm_fornecedor, e.nm_fornecedor, 'Não informado')
    ORDER BY valor_pendente_acumulado DESC, total_itens_pendentes DESC
    LIMIT 5
  `;
  const res = await model.query(sql, [pendingStatuses]);
  return (res.rows || []).map((r) => ({
    nm_fornecedor: r.nm_fornecedor,
    totalItensPendentes: Number(r.total_itens_pendentes || 0),
    valorPendenteAcumulado: Number(r.valor_pendente_acumulado || 0),
  }));
}

async function queryTopAtrasosLegacy({ model, pendingStatuses }) {
  const sql = `
    WITH atraso_por_item AS (
      SELECT
        COALESCE(p.nu_documento_siafi::text, e.nu_documento_siafi::text, p.nu_processo::text) AS empenho_ref,
        COALESCE(p.nm_fornecedor, e.nm_fornecedor, 'Fornecedor não informado') AS nm_fornecedor,
        COALESCE(p.nu_documento_siafi::text, e.nu_documento_siafi::text, 'SIAFI N/D') AS documento_siafi,
        (CURRENT_DATE - COALESCE(p.dt_confirmacao_recebimento::date, p.dt_cadastro::date))::int AS tempo_envio_dias
      FROM ctrl_emp.emp_pend p
      LEFT JOIN public.empenho e
        ON e.nu_documento_siafi::text = p.nu_documento_siafi::text
        AND e.nu_processo::text = p.nu_processo::text
        AND e.cd_material::text = p.cd_material::text
        AND e.item::int = p.item::int
      WHERE p.status_entrega = ANY($1::text[])
        AND COALESCE(p.dt_confirmacao_recebimento::date, p.dt_cadastro::date) IS NOT NULL
    ),
    atrasos_distintos AS (
      SELECT
        empenho_ref,
        nm_fornecedor,
        documento_siafi,
        tempo_envio_dias,
        ROW_NUMBER() OVER (PARTITION BY empenho_ref ORDER BY tempo_envio_dias DESC) AS rn
      FROM atraso_por_item
    )
    SELECT
      CONCAT(nm_fornecedor, ' - ', documento_siafi) AS label,
      tempo_envio_dias
    FROM atrasos_distintos
    WHERE rn = 1
    ORDER BY tempo_envio_dias DESC
    LIMIT 10
  `;
  const res = await model.query(sql, [pendingStatuses]);
  return (res.rows || []).map((r) => ({
    label: r.label,
    tempoEnvioDias: Number(r.tempo_envio_dias || 0),
  }));
}

async function querySupplierAggregates({ model, pendingStatuses }) {
  const sql = `
    WITH ${sqlPendCte()}
    SELECT
      nm_fornecedor_eff,
      COUNT(*)::int AS total_itens,
      COALESCE(SUM(valor_pendente), 0)::numeric(18,2) AS valor_total,
      COUNT(*) FILTER (WHERE COALESCE(atraso_dias, 0) > 0)::int AS itens_atrasados,
      COALESCE(AVG(atraso_dias) FILTER (WHERE atraso_dias > 0), 0)::numeric(18,4) AS media_atraso
    FROM pend
    GROUP BY nm_fornecedor_eff
    ORDER BY valor_total DESC
    LIMIT 25
  `;
  const res = await model.query(sql, [pendingStatuses]);
  return res.rows || [];
}

async function queryProcessosAbertosPorFornecedor({ model }) {
  const sql = `
    SELECT
      BTRIM(nm_fornecedor) AS nm_fornecedor,
      COUNT(*)::int AS processos_abertos
    FROM ctrl_emp.proc_fornecedores
    WHERE dt_conclusao IS NULL
    GROUP BY BTRIM(nm_fornecedor)
  `;
  const res = await model.query(sql, []);
  const map = new Map();
  for (const r of res.rows || []) {
    map.set(r.nm_fornecedor, Number(r.processos_abertos || 0));
  }
  return map;
}

function computeRiskScore(rows, processosMap) {
  const maxValor = Math.max(1, ...rows.map((r) => Number(r.valor_total || 0)));
  return rows.map((r) => {
    const total = Number(r.total_itens || 0);
    const late = Number(r.itens_atrasados || 0);
    const pctAtraso = total > 0 ? (late / total) * 100 : 0;
    const mediaAtraso = Number(r.media_atraso || 0);
    const valor = Number(r.valor_total || 0);
    const valorNorm = (valor / maxValor) * 100;
    const proc = processosMap.get(trimKey(r.nm_fornecedor_eff)) || 0;

    const score =
      0.35 * Math.min(100, pctAtraso) +
      0.25 * Math.min(100, (mediaAtraso / 45) * 100) +
      0.2 * Math.min(100, proc * 20) +
      0.2 * valorNorm;

    let nivel = 'BAIXO';
    if (score >= 70) nivel = 'ALTO';
    else if (score >= 40) nivel = 'MÉDIO';

    return {
      nmFornecedor: r.nm_fornecedor_eff,
      totalItens: total,
      itensAtrasados: late,
      pctAtraso: Math.round(pctAtraso * 100) / 100,
      mediaAtrasoDias: Math.round(mediaAtraso * 100) / 100,
      processosAbertos: proc,
      valorPendenteTotal: valor,
      scoreRisco: Math.round(score * 100) / 100,
      nivelRisco: nivel,
      componentes: {
        pesoAtrasoPct: Math.round(0.35 * Math.min(100, pctAtraso) * 100) / 100,
        pesoMediaAtraso: Math.round(0.25 * Math.min(100, (mediaAtraso / 45) * 100) * 100) / 100,
        pesoProcessos: Math.round(0.2 * Math.min(100, proc * 20) * 100) / 100,
        pesoValor: Math.round(0.2 * valorNorm * 100) / 100,
      },
    };
  });
}

function buildPareto(supplierRows) {
  const totalValor = supplierRows.reduce((acc, r) => acc + Number(r.valor_total || 0), 0) || 1;
  let cum = 0;
  return supplierRows.slice(0, 15).map((r) => {
    const v = Number(r.valor_total || 0);
    cum += v;
    return {
      nmFornecedor: r.nm_fornecedor_eff,
      valorPendente: v,
      pctAcumulado: Math.round((cum / totalValor) * 10000) / 100,
    };
  });
}

function buildHeatmap(riskRanked, topN = 10) {
  const slice = riskRanked.slice(0, topN);
  const maxScore = Math.max(1, ...slice.map((s) => s.scoreRisco));
  const maxPct = Math.max(1, ...slice.map((s) => s.pctAtraso));
  return slice.map((s) => ({
    nmFornecedor: s.nmFornecedor,
    slaScore: Math.round(((100 - Math.min(100, s.pctAtraso)) / 100) * 100),
    atrasoScore: Math.round((Math.min(100, s.pctAtraso) / maxPct) * 100),
    riscoScore: Math.round((s.scoreRisco / maxScore) * 100),
  }));
}

async function queryTrendWeekly({ model, pendingStatuses, trendDays }) {
  const sql = `
    SELECT
      date_trunc('week', dt_cadastro)::date AS period_start,
      COUNT(*)::int AS novos_pendentes
    FROM ctrl_emp.emp_pend
    WHERE status_entrega = ANY($1::text[])
      AND dt_cadastro >= (CURRENT_TIMESTAMP - ($2::int * INTERVAL '1 day'))
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  const res = await model.query(sql, [pendingStatuses, trendDays]);
  return (res.rows || []).map((r) => ({
    periodStart: r.period_start,
    novosPendentes: Number(r.novos_pendentes || 0),
  }));
}

async function queryTopEmpenhosProgress({ model, pendingStatuses }) {
  const sql = `
    WITH ${sqlPendCte()}
    SELECT
      COALESCE(p.nu_documento_siafi::text, 'N/D') AS nu_documento_siafi,
      p.nm_fornecedor_eff AS nm_fornecedor,
      p.valor_pendente,
      CASE
        WHEN e.qt_de_embalagem IS NULL OR e.qt_de_embalagem = 0 THEN NULL
        ELSE LEAST(
          100,
          GREATEST(
            0,
            ROUND(
              (
                (e.qt_de_embalagem - COALESCE(e.qt_saldo_item, 0))::numeric
                / NULLIF(e.qt_de_embalagem::numeric, 0)
              ) * 100
            )
          )
        )::int
      END AS pct_entregue,
      CASE
        WHEN COALESCE(p.atraso_dias, 0) > 60 THEN 'vermelho'
        WHEN COALESCE(p.atraso_dias, 0) > 0 THEN 'amarelo'
        ELSE 'verde'
      END AS semaforo
    FROM pend p
    LEFT JOIN public.empenho e
      ON e.nu_documento_siafi::text = p.nu_documento_siafi::text
      AND e.nu_processo::text = p.nu_processo::text
      AND e.cd_material::text = p.cd_material::text
      AND e.item::int = p.item::int
    ORDER BY p.valor_pendente DESC NULLS LAST
    LIMIT 10
  `;
  const res = await model.query(sql, [pendingStatuses]);
  return (res.rows || []).map((r) => ({
    nuDocumentoSiafi: r.nu_documento_siafi,
    nmFornecedor: r.nm_fornecedor,
    valorPendente: Number(r.valor_pendente || 0),
    pctEntregue: r.pct_entregue === null || r.pct_entregue === undefined ? null : Number(r.pct_entregue),
    semaforo: r.semaforo,
  }));
}

async function getDashboardMetrics({ pools, query = {} }) {
  const model = buildModel({ pools });
  const pendingStatuses = PENDING_STATUSES;
  const trendDays = Number.isFinite(query.trendDays) ? Math.min(365, Math.max(7, query.trendDays)) : 90;

  const [
    agg,
    tempoMedioEnvioDias,
    topFornecedores,
    topAtrasos,
    supplierRows,
    processosMap,
    trendPoints,
    topEmpenhosProgress,
  ] = await Promise.all([
    queryExecutiveSlaAgingPipeline({ model, pendingStatuses }),
    queryTempoMedioLegacy({ model, pendingStatuses }),
    queryTopFornecedoresLegacy({ model, pendingStatuses }),
    queryTopAtrasosLegacy({ model, pendingStatuses }),
    querySupplierAggregates({ model, pendingStatuses }),
    queryProcessosAbertosPorFornecedor({ model }),
    queryTrendWeekly({ model, pendingStatuses, trendDays }),
    queryTopEmpenhosProgress({ model, pendingStatuses }),
  ]);

  const slaBase = Number(agg.sla_base_itens || 0);
  const slaAtraso = Number(agg.sla_em_atraso || 0);
  const slaNoPrazo = Number(agg.sla_no_prazo || 0);
  const pctNoPrazo = slaBase > 0 ? Math.round((slaNoPrazo / slaBase) * 10000) / 100 : null;
  const pctAtrasado = slaBase > 0 ? Math.round((slaAtraso / slaBase) * 10000) / 100 : null;

  const riskRanked = computeRiskScore(supplierRows, processosMap).sort((a, b) => b.scoreRisco - a.scoreRisco);
  const paretoSuppliers = buildPareto(supplierRows);
  const supplierHeatmap = buildHeatmap(riskRanked, 10);

  const executiveCards = {
    totalPendentes: Number(agg.total_pendentes || 0),
    valorEmRisco: Number(agg.valor_em_risco || 0),
    atrasosCriticos: Number(agg.atrasos_criticos || 0),
    itensSemAtualizacao20d: Number(agg.itens_sem_atualizacao_20d || 0),
  };

  const sla = {
    baseItensComPrevisao: slaBase,
    itensNoPrazo: slaNoPrazo,
    itensEmAtraso: slaAtraso,
    pctNoPrazo,
    pctAtrasado,
  };

  const agingBuckets = [
    { faixa: '0-10', count: Number(agg.aging_0_10 || 0) },
    { faixa: '11-30', count: Number(agg.aging_11_30 || 0) },
    { faixa: '31-60', count: Number(agg.aging_31_60 || 0) },
    { faixa: '60+', count: Number(agg.aging_60_plus || 0) },
  ];

  const pipelineStages = {
    totalPendentes: Number(agg.total_pendentes || 0),
    comConfirmacaoEmail: Number(agg.funil_com_confirmacao || 0),
    dentroPrazoOuSemAtraso: Number(agg.funil_dentro_ou_sem_atraso || 0),
    emAtraso: Number(agg.funil_em_atraso || 0),
    comNotificacao: Number(agg.funil_com_notificacao || 0),
    comProcessoApuracao: Number(agg.funil_com_processo_apuracao || 0),
  };

  const trendSeries = {
    granularity: 'week',
    trendDays,
    points: trendPoints,
  };

  return {
    metricDefinitions: METRIC_DEFINITIONS,
    executiveCards,
    sla,
    agingBuckets,
    supplierRiskRanking: riskRanked.slice(0, 20),
    paretoSuppliers,
    trendSeries,
    pipelineStages,
    supplierHeatmap,
    topEmpenhosProgress,
    alertContext: {
      itensSemAtualizacao20d: executiveCards.itensSemAtualizacao20d,
      atrasosCriticos: executiveCards.atrasosCriticos,
      topRiscoFornecedor: riskRanked[0] || null,
      valorEmRisco: executiveCards.valorEmRisco,
    },
    totalPendentes: executiveCards.totalPendentes,
    tempoMedioEnvioDias,
    topFornecedores,
    topAtrasos,
  };
}

module.exports = { getDashboardMetrics };
