function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const status = err.statusCode || err.status || 500;

  const requestId = res.locals?.requestId;

  // Evita vazar detalhes sensíveis em produção.
  const message =
    process.env.NODE_ENV === 'production'
      ? 'InternalServerError'
      : err.message || 'InternalServerError';

  // Loga o stack no servidor (sem vazar no client).
  if (process.env.NODE_ENV !== 'production' && err && err.stack) {
    // eslint-disable-next-line no-console
    console.error('RequestError', {
      requestId,
      method: req?.method,
      path: req?.path,
      status,
      message: err.message,
      stack: err.stack,
    });
  } else if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error('RequestError', {
      requestId,
      method: req?.method,
      path: req?.path,
      status,
      message,
    });
  }

  const payload = {
    error: err.name || 'Error',
    message,
  };

  if (process.env.NODE_ENV !== 'production' && err.details) {
    payload.details = err.details;
  }

  // eslint-disable-next-line no-unused-vars
  return res.status(status).json(payload);
}

module.exports = errorHandler;

