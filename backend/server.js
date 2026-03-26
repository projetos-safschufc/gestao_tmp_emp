require('dotenv').config();

const createApp = require('./app');
const { createDbPools } = require('./src/db/pools');

async function main() {
  const pools = createDbPools();
  const app = createApp({ pools });

  const host = process.env.HOST || '0.0.0.0';
  const basePort = Number(process.env.PORT || 3001);
  const defaultFallbackAttempts = process.env.NODE_ENV === 'production' ? 0 : 5;
  const fallbackAttempts = Number(process.env.PORT_FALLBACK_ATTEMPTS || defaultFallbackAttempts);
  const fallbackStep = Number(process.env.PORT_FALLBACK_STEP || 1);

  let server = null;
  let chosenPort = null;
  let lastErr = null;

  for (let attempt = 0; attempt <= fallbackAttempts; attempt += 1) {
    const candidatePort = basePort + attempt * fallbackStep;

    // eslint-disable-next-line no-console
    console.log(`Starting server on ${host}:${candidatePort} (attempt ${attempt + 1}/${fallbackAttempts + 1})`);

    server = app.listen(candidatePort, host);

    try {
      await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
      });

      chosenPort = candidatePort;
      break;
    } catch (err) {
      lastErr = err;

      if (err && err.code === 'EADDRINUSE') {
        if (fallbackAttempts === 0) {
          console.error(
            `Port ${candidatePort} is already in use and fallback is disabled. ` +
              'Set a free PORT or enable PORT_FALLBACK_ATTEMPTS.',
          );
          throw err;
        }
        // eslint-disable-next-line no-console
        console.warn(`Port ${candidatePort} in use. Trying next...`);

        try {
          server.close();
        } catch {
          // ignora erros de close quando não subiu
        }
        server = null;
        continue;
      }

      throw err;
    }
  }

  if (!chosenPort) {
    throw lastErr || new Error('Não foi possível iniciar o servidor em nenhuma porta disponível');
  }

  // eslint-disable-next-line no-console
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  console.log(`API listening on ${host}:${chosenPort} (local: http://${displayHost}:${chosenPort})`);

  // Graceful shutdown (evita deixar conexões penduradas em dev)
  const shutdown = async () => {
    try {
      if (server) server.close();
      await Promise.allSettled([pools.dw.end(), pools.safs.end()]);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('UnhandledRejection:', err);
});

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});

