function parseDateToISO(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const v = String(value).trim();
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
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function daysBetweenISO(startISO, endISO) {
  if (!startISO || !endISO) return null;
  const start = new Date(startISO + 'T00:00:00Z');
  const end = new Date(endISO + 'T00:00:00Z');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

function parseCurrencyBRToNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return value;
  }

  const raw = String(value)
    .trim()
    .replace(/R\$\s?/i, '')
    .replace(/\s/g, '');

  if (!raw) return null;

  // Ex: 1.234,56 => remove '.' and convert ',' to '.'
  const normalized = raw.replace(/\./g, '').replace(/,/g, '.');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeConditionalFields(raw) {
  const normalized = { ...raw };

  // Se não for multa, valor_multa deve ser nulo.
  if (normalized.sancao_aplicada !== 'multa') {
    normalized.valor_multa = null;
  }

  // dt_conclusao vazia vira null.
  if (normalized.dt_conclusao === '' || normalized.dt_conclusao === undefined) {
    normalized.dt_conclusao = null;
  }

  return normalized;
}

const { createProcesso, updateProcesso, deleteProcesso, listProcessos, countProcessos } = require('../repositories/processosRepository');

async function listProcessosService({ pools, query, limit, offset }) {
  const [rows, total] = await Promise.all([
    listProcessos({ pools, query, limit, offset }),
    countProcessos({ pools, query }),
  ]);
  return { rows, total, limit, offset };
}

async function createProcessoService({ pools, input, user }) {
  const respCadastro = user?.nome ? String(user.nome) : null;

  const raw = normalizeConditionalFields({
    ...input,
    resp_cadastro: respCadastro,
  });

  const dt_processo = parseDateToISO(raw.dt_processo);
  if (!dt_processo) {
    const err = new Error('dt_processo inválida');
    err.statusCode = 400;
    throw err;
  }

  const dt_conclusao = raw.dt_conclusao ? parseDateToISO(raw.dt_conclusao) : null;

  const status = raw.status;
  if ((status.startsWith('concluído') || status.toLowerCase().startsWith('concluído')) && !dt_conclusao) {
    const err = new Error('dt_conclusao é obrigatória para status concluído');
    err.statusCode = 400;
    throw err;
  }

  let tmp_processo = null;
  if (dt_conclusao) {
    tmp_processo = daysBetweenISO(dt_processo, dt_conclusao);
  } else {
    const todayISO = new Date().toISOString().slice(0, 10);
    tmp_processo = daysBetweenISO(dt_processo, todayISO);
  }

  const valor_multa_num = raw.sancao_aplicada === 'multa' ? parseCurrencyBRToNumber(raw.valor_multa) : null;
  if (raw.sancao_aplicada === 'multa' && valor_multa_num === null) {
    const err = new Error('valor_multa é obrigatório quando sancao_aplicada = multa');
    err.statusCode = 400;
    throw err;
  }

  const dt_ufac = raw.dt_ufac ? parseDateToISO(raw.dt_ufac) : null;

  const payload = {
    ...raw,
    dt_processo,
    dt_conclusao,
    tmp_processo,
    valor_multa: valor_multa_num,
    dt_ufac,
    anexo: raw.anexo ?? [],
  };

  return createProcesso({ pools, input: payload });
}

async function updateProcessoService({ pools, id_proc, input, user }) {
  const updated = {
    ...input,
  };

  if (updated.resp_cadastro === undefined) {
    updated.resp_cadastro = user?.nome ? String(user.nome) : null;
  }

  // Normaliza datas e tmp_processo quando campos existirem.
  const dt_processo = updated.dt_processo !== undefined ? parseDateToISO(updated.dt_processo) : undefined;
  const dt_conclusao =
    updated.dt_conclusao !== undefined && updated.dt_conclusao !== null && updated.dt_conclusao !== ''
      ? parseDateToISO(updated.dt_conclusao)
      : updated.dt_conclusao === ''
        ? null
        : undefined;

  const status = updated.status;

  if (status && (status.startsWith('concluído') || status.toLowerCase().startsWith('concluído')) && dt_conclusao === undefined) {
    const err = new Error('dt_conclusao deve ser informado para status concluído');
    err.statusCode = 400;
    throw err;
  }

  let tmp_processo = undefined;
  if (dt_processo) {
    if (dt_conclusao) tmp_processo = daysBetweenISO(dt_processo, dt_conclusao);
    else {
      const todayISO = new Date().toISOString().slice(0, 10);
      tmp_processo = daysBetweenISO(dt_processo, todayISO);
    }
  }

  const sancao = updated.sancao_aplicada;
  let valor_multa = undefined;
  if (sancao !== undefined) {
    valor_multa =
      sancao === 'multa' ? parseCurrencyBRToNumber(updated.valor_multa) : null;
    if (sancao === 'multa' && valor_multa === null) {
      const err = new Error('valor_multa é obrigatório quando sancao_aplicada = multa');
      err.statusCode = 400;
      throw err;
    }
  }

  const dt_ufac = updated.dt_ufac !== undefined ? (updated.dt_ufac ? parseDateToISO(updated.dt_ufac) : null) : undefined;

  const payload = {
    ...updated,
    dt_processo,
    dt_conclusao,
    tmp_processo,
    valor_multa,
    dt_ufac,
    anexo: updated.anexo ?? undefined,
  };

  return updateProcesso({ pools, id_proc, input: payload });
}

module.exports = {
  listProcessosService,
  createProcessoService,
  updateProcessoService,
  deleteProcessoService: ({ pools, id_proc }) => deleteProcesso({ pools, id_proc }),
};

