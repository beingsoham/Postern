import { config } from '../config.js';

// The only place that turns an error into a response.
// Always { error: { code, message } }. Never a stack trace, never a body echo.
// eslint-disable-next-line no-unused-vars -- Express needs all four parameters
export function errorHandler(err, _req, res, _next) {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const code = err?.code ?? 'internal_error';

  // A 500 is our bug, so the client gets a generic line and we keep the detail.
  const message =
    status >= 500 ? 'Something went wrong on the server' : (err?.message ?? 'Request failed');

  if (status >= 500 && !config.isTest) {
    // Message only. Request bodies may contain email text.
    console.error(`[error] ${code}: ${err?.message ?? 'unknown'}`);
  }

  res.status(status).json({ error: { code, message } });
}
