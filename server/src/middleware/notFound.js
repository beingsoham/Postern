import { ApiError } from '../errors.js';

// Any route that fell through becomes a normal 404 for the error handler.
export function notFound(req, _res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.path}`));
}
