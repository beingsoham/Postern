import { describe, it, expect } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('unknown routes', () => {
  it('return the standard error shape with no stack trace', async () => {
    const res = await request(createApp()).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
    expect(typeof res.body.error.message).toBe('string');
    expect(res.body).not.toHaveProperty('stack');
  });
});
