const { Pool } = require('pg');

function env(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

function createDbPools() {
  const poolMax = Number(process.env.DB_POOL_MAX || 10);

  const dw = new Pool({
    host: env('DB_DW_HOST'),
    port: Number(env('DB_DW_PORT')),
    database: env('DB_DW_NAME'),
    user: env('DB_DW_USER'),
    password: env('DB_DW_PASSWORD'),
    max: poolMax,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });

  const safs = new Pool({
    host: env('DB_SAFS_HOST'),
    port: Number(env('DB_SAFS_PORT')),
    database: env('DB_SAFS_NAME'),
    user: env('DB_SAFS_USER'),
    password: env('DB_SAFS_PASSWORD'),
    max: poolMax,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });

  // Logs de falhas assíncronas em runtime (não bloqueiam startup)
  dw.on('error', (err) => console.error('[DW pool error]', err));
  safs.on('error', (err) => console.error('[SAFS pool error]', err));

  return { dw, safs };
}

module.exports = { createDbPools };

