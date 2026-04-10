const {
  upsertEmpPendItem,
  listItensByEmpenho,
  listItensByEmpenhoHistorico,
  getEmpPendItemByKey,
  updateEmpPendHistoricoItem,
} = require('../repositories/acompanhamentoRepository');

const { toISODate } = require('../../../utils/formatters');

function parseDateToISO(value) {
  // Aceita:
  // - YYYY-MM-DD (ISO)
  // - DD/MM/YYYY (BR)
  if (!value) return null;
  if (typeof value !== 'string') return toISODate(value);
  const v = value.trim();
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (br) {
    const dd = Number(br[1]);
    const mm = Number(br[2]) - 1;
    const yyyy = Number(br[3]);
    const d = new Date(Date.UTC(yyyy, mm, dd));
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  // fallback: Date parse
  return toISODate(v);
}

function addDaysISO(isoDate, days) {
  if (!isoDate) return null;
  const d = new Date(isoDate + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function normalizeConditionalFields(input) {
  const normalized = { ...input };

  if (!normalized.apuracao_irregularidade) normalized.processo_apuracao = null;
  if (!normalized.troca_marca) normalized.processo_troca_marca = null;
  if (!normalized.reequilibrio_financeiro) normalized.processo_reequilibrio_financeiro = null;
  if (!normalized.aplicacao_imr) normalized.valor_imr = null;

  return normalized;
}

function pickHistoricoEditableFields(input, existing) {
  return {
    ...existing,
    prazo_entrega_dias: input.prazo_entrega_dias ?? existing.prazo_entrega_dias ?? 0,
    dt_confirmacao_recebimento: input.dt_confirmacao_recebimento ?? existing.dt_confirmacao_recebimento ?? null,
    apuracao_irregularidade: Boolean(input.apuracao_irregularidade),
    troca_marca: Boolean(input.troca_marca),
    observacao: input.observacao ?? null,
  };
}

async function listItensByEmpenhoService({ pools, empenho, mode = 'novo' }) {
  const rows =
    mode === 'historico'
      ? await listItensByEmpenhoHistorico({ pools, empenho })
      : await listItensByEmpenho({ pools, empenho });
  return { empenho, itens: rows };
}

async function upsertItensService({ pools, items, user, mode = 'novo' }) {
  const respCadastro = user?.nome ? String(user.nome) : null;

  const results = [];
  // Mantém consistência por item dentro de uma sequência simples.
  // (Em escala futura, podemos otimizar com bulk insert.)
  for (const raw of items) {
    const dtConfirmacao = parseDateToISO(raw.dt_confirmacao_recebimento);
    const prazo = raw.prazo_entrega_dias ?? 0;
    const previsao = dtConfirmacao ? addDaysISO(dtConfirmacao, prazo) : null;

    let normalized = normalizeConditionalFields({
      ...raw,
      dt_confirmacao_recebimento: dtConfirmacao,
      previsao_entrega: previsao,
      // valor_imr chega como string (frontend) ou null
      valor_imr: raw.aplicacao_imr ? raw.valor_imr : null,
    });

    if (mode === 'historico') {
      const existing = await getEmpPendItemByKey({ pools, item: normalized });
      if (!existing) {
        const err = new Error('Item não encontrado no histórico para atualização.');
        err.status = 400;
        throw err;
      }
      normalized = normalizeConditionalFields(pickHistoricoEditableFields(normalized, existing));
      normalized.previsao_entrega = normalized.dt_confirmacao_recebimento
        ? addDaysISO(normalized.dt_confirmacao_recebimento, normalized.prazo_entrega_dias ?? 0)
        : null;
    }

    const inserted =
      mode === 'historico'
        ? await updateEmpPendHistoricoItem({
            pools,
            item: normalized,
            respCadastro,
          })
        : await upsertEmpPendItem({
            pools,
            item: normalized,
            respCadastro,
          });
    if (!inserted) {
      const err = new Error('Nenhum registro foi atualizado no histórico.');
      err.status = 400;
      throw err;
    }
    results.push(inserted);
  }

  return { ok: true, count: results.length, results };
}

module.exports = { listItensByEmpenhoService, upsertItensService };

