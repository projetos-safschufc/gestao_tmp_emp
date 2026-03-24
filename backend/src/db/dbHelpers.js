function clampInt(value, { min = 0, max = 1000 } = {}) {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const i = Math.trunc(n);
  return Math.max(min, Math.min(max, i));
}

function getPagination({ limit, offset }) {
  const safeLimit = clampInt(limit, { min: 1, max: 100 });
  const safeOffset = clampInt(offset, { min: 0, max: 1000000 });
  return {
    limit: safeLimit ?? 20,
    offset: safeOffset ?? 0,
  };
}

async function runQuery(pool, queryText, params) {
  if (!pool) throw new Error('Pool não fornecido');
  if (typeof queryText !== 'string') throw new Error('Query inválida');
  return pool.query(queryText, params);
}

module.exports = {
  getPagination,
  runQuery,
};

