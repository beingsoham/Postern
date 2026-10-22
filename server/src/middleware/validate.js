import { ApiError } from '../errors.js';

// Validates req.query or req.params with a Zod schema and replaces the raw
// value with the parsed one. Email-derived input is never trusted.
export function validate(schema, source = 'query') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join('.') || source}: ${i.message}`)
        .join('; ');
      return next(ApiError.badRequest(detail));
    }

    req.valid = { ...(req.valid ?? {}), [source]: result.data };
    next();
  };
}
