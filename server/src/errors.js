// A single error type so routes can signal an HTTP status without
// the error handler having to guess.

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'not_found', message);
  }

  static badRequest(message = 'Invalid request') {
    return new ApiError(400, 'bad_request', message);
  }
}
