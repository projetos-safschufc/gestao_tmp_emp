// Resolve dinamicamente qual schema do DW contém uma determinada tabela.
// Motivo: algumas bases não expõem as tabelas em "public", então hardcoding quebra.
//
// Uso: resolveDwTableRelation(pools.dw, { tableName: 'empenho', preferredSchema: 'public' })
//
// Importante: identificadores SQL (schema/tabela) não podem ser parametrizados,
// então validamos o resultado via regex para evitar injeção.

const identRe = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ilikePatternRe = /^[A-Za-z0-9_%]+$/;

function assertSafeIdentifier(value, label) {
  if (typeof value !== 'string') {
    throw new Error(`Identificador inválido para ${label}: tipo não-string`);
  }
  if (!identRe.test(value)) {
    throw new Error(`Identificador inválido para ${label}: ${value}`);
  }
  return value;
}

const cache = new Map();

async function resolveDwTableRelation(pool, { tableName, preferredSchema, matchMode = 'exact', tableNameLikePattern }) {
  const t = assertSafeIdentifier(tableName, 'tableName');
  const p = preferredSchema ? assertSafeIdentifier(preferredSchema, 'preferredSchema') : null;

  const cacheKey = `${t}|${p || ''}|${matchMode}|${tableNameLikePattern || ''}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  // Preferimos o schema "preferredSchema" se existir; caso contrário, pegamos o primeiro schema encontrado.
  let sql;
  let params;

  if (matchMode === 'ilike') {
    const pattern = tableNameLikePattern || `%${t}%`;
    if (!ilikePatternRe.test(pattern)) {
      throw new Error(`Pattern ILIKE inválido: ${pattern}`);
    }
    sql = `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name ILIKE $1
        AND table_type = 'BASE TABLE'
      ORDER BY
        CASE WHEN $2::text IS NOT NULL AND table_schema = $2::text THEN 0 ELSE 1 END,
        CASE WHEN LOWER(table_name) = LOWER($3::text) THEN 0 ELSE 1 END,
        table_schema,
        table_name
      LIMIT 1
    `;
    params = [pattern, p, t];
  } else {
    sql = `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE LOWER(table_name) = LOWER($1)
        AND table_type = 'BASE TABLE'
      ORDER BY
        CASE WHEN $2::text IS NOT NULL AND table_schema = $2::text THEN 0 ELSE 1 END,
        table_schema,
        table_name
      LIMIT 1
    `;
    params = [t, p];
  }

  const result = await pool.query(sql, params);
  const row = result.rows && result.rows[0] ? result.rows[0] : null;
  if (!row?.table_schema || !row?.table_name) {
    throw new Error(`Tabela DW não encontrada: ${t} (preferredSchema=${p || 'null'})`);
  }

  const schema = assertSafeIdentifier(row.table_schema, 'table_schema');
  // table_name pode vir com capitalização diferente (ex.: "SAFS_fEmpenho"), então usamos o valor retornado.
  const table = assertSafeIdentifier(row.table_name, 'table_name');
  // Os identificadores podem ser case-sensitive (tabelas criadas com aspas).
  // Então retornamos com aspas duplas para preservar exatamente o nome.
  const relation = `"${schema}"."${table}"`;
  cache.set(cacheKey, relation);
  return relation;
}

module.exports = { resolveDwTableRelation };

