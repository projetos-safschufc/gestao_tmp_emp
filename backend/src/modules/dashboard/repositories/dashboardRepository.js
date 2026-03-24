const BaseModel = require('../../../models/BaseModel');

function buildModel({ pools }) {
  return new BaseModel({ pool: pools.safs });
}

async function getDashboardMetrics({ pools }) {
  const model = buildModel({ pools });

  // Pendentes: PENDENTE e ATEND. PARCIAL (ENTREGUE/CANCELADO ficam fora).
  const pendingStatuses = ['PENDENTE', 'ATEND. PARCIAL'];

  const sqlTotal = `
    SELECT COUNT(*)::int AS total_pendentes
    FROM ctrl_emp.emp_pend
    WHERE status_entrega = ANY($1)
  `;

  const sqlTempoMedio = `
    SELECT AVG(
      (CURRENT_DATE - COALESCE(dt_confirmacao_recebimento::date, dt_cadastro::date))
    )::numeric(18,2) AS tempo_medio_envio_dias
    FROM ctrl_emp.emp_pend
    WHERE status_entrega = ANY($1)
      AND dt_confirmacao_recebimento IS NOT NULL
  `;

  const sqlTop = `
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
    WHERE p.status_entrega = ANY($1)
    GROUP BY COALESCE(p.nm_fornecedor, e.nm_fornecedor, 'Não informado')
    ORDER BY valor_pendente_acumulado DESC, total_itens_pendentes DESC
    LIMIT 5
  `;

  const sqlTopAtrasos = `
    SELECT
      CONCAT(
        COALESCE(p.nm_fornecedor, e.nm_fornecedor, 'Fornecedor não informado'),
        ' - ',
        COALESCE(p.nu_documento_siafi::text, e.nu_documento_siafi::text, 'SIAFI N/D')
      ) AS label,
      (CURRENT_DATE - COALESCE(p.dt_confirmacao_recebimento::date, p.dt_cadastro::date))::int AS tempo_envio_dias
    FROM ctrl_emp.emp_pend p
    LEFT JOIN public.empenho e
      ON e.nu_documento_siafi::text = p.nu_documento_siafi::text
      AND e.nu_processo::text = p.nu_processo::text
      AND e.cd_material::text = p.cd_material::text
      AND e.item::int = p.item::int
    WHERE p.status_entrega = ANY($1)
      AND COALESCE(p.dt_confirmacao_recebimento::date, p.dt_cadastro::date) IS NOT NULL
    ORDER BY tempo_envio_dias DESC
    LIMIT 10
  `;

  const [totalRes, tempoRes, topRes, topAtrasosRes] = await Promise.all([
    model.query(sqlTotal, [pendingStatuses]),
    model.query(sqlTempoMedio, [pendingStatuses]),
    model.query(sqlTop, [pendingStatuses]),
    model.query(sqlTopAtrasos, [pendingStatuses]),
  ]);

  const totalPendentes = totalRes.rows[0]?.total_pendentes || 0;
  const tempoMedioEnvioDias = tempoRes.rows[0]?.tempo_medio_envio_dias
    ? Number(tempoRes.rows[0].tempo_medio_envio_dias)
    : null;

  const topFornecedores = (topRes.rows || []).map((r) => ({
    nm_fornecedor: r.nm_fornecedor,
    totalItensPendentes: Number(r.total_itens_pendentes || 0),
    valorPendenteAcumulado: Number(r.valor_pendente_acumulado || 0),
  }));

  const topAtrasos = (topAtrasosRes.rows || []).map((r) => ({
    label: r.label,
    tempoEnvioDias: Number(r.tempo_envio_dias || 0),
  }));

  return {
    totalPendentes,
    tempoMedioEnvioDias,
    topFornecedores,
    topAtrasos,
  };
}

module.exports = { getDashboardMetrics };

