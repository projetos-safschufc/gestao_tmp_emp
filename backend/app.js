const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./src/middlewares/errorHandler');
const { buildRouter } = require('./src/routes');
const requestId = require('./src/middlewares/requestId');

function createApp({ pools } = {}) {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(requestId);

  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  // Monta rotas API
  app.use('/api', buildRouter({ pools }));

  app.use((req, res) => {
    res.status(404).json({ error: 'NotFound', message: 'Rota não encontrada' });
  });

  // Handler de erros deve vir por último (depois de todas as rotas/middlewares).
  app.use(errorHandler);

  if (pools) {
    app.locals.db = pools;
  }

  return app;
}

module.exports = createApp;

