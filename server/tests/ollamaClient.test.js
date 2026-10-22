import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';

import { chat, chatJson, checkOllama } from '../src/services/ai/ollamaClient.js';
import { classificationFormat, ClassificationSchema } from '../src/services/ai/schemas.js';

const ok = (content) => ({
  ok: true,
  status: 200,
  json: async () => ({ message: { content }, model: 'test-model' }),
});

const valid = JSON.stringify({
  category: 'work',
  priority: 'normal',
  requires_reply: false,
  action_items: [],
  reason: 'Routine update.',
});

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('request shape', () => {
  it('sends the schema as format and disables thinking', async () => {
    fetchMock.mockResolvedValue(ok(valid));

    await chat({ system: 's', user: 'u', format: classificationFormat });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);

    expect(url).toContain('/api/chat');
    expect(body.format).toEqual(classificationFormat);
    expect(body.think).toBe(false);
    expect(body.stream).toBe(false);
    expect(body.keep_alive).toBeTruthy();
    // A fixed seed and low temperature keep the demo reproducible.
    expect(body.options.temperature).toBeLessThanOrEqual(0.2);
    expect(body.options.seed).toBeDefined();
  });
});

describe('valid responses', () => {
  it('parses and validates a good answer', async () => {
    fetchMock.mockResolvedValue(ok(valid));

    const { data, model } = await chatJson({
      system: 's',
      user: 'u',
      format: classificationFormat,
      schema: ClassificationSchema,
    });

    expect(data.category).toBe('work');
    expect(model).toBe('test-model');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe('malformed responses', () => {
  it('retries once when the output is not JSON, then succeeds', async () => {
    fetchMock.mockResolvedValueOnce(ok('this is not json')).mockResolvedValueOnce(ok(valid));

    const { data } = await chatJson({
      system: 's',
      user: 'u',
      format: classificationFormat,
      schema: ClassificationSchema,
    });

    expect(data.category).toBe('work');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws an invalid AiError when both attempts fail', async () => {
    fetchMock.mockResolvedValue(ok('{"category":"not-a-category"}'));

    await expect(
      chatJson({
        system: 's',
        user: 'u',
        format: classificationFormat,
        schema: ClassificationSchema,
      }),
    ).rejects.toMatchObject({ name: 'AiError', kind: 'invalid' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a response with no message content', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    await expect(
      chatJson({ system: 's', user: 'u', format: {}, schema: z.object({}) }),
    ).rejects.toMatchObject({ kind: 'invalid' });
  });
});

describe('transport failures', () => {
  it('reports a timeout when the request is aborted', async () => {
    fetchMock.mockImplementation(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    await expect(chat({ system: 's', user: 'u', format: {} })).rejects.toMatchObject({
      kind: 'timeout',
    });
  });

  it('reports unreachable when the connection fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(chat({ system: 's', user: 'u', format: {} })).rejects.toMatchObject({
      kind: 'unreachable',
    });
  });

  it('does not retry when Ollama is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      chatJson({ system: 's', user: 'u', format: {}, schema: z.object({}) }),
    ).rejects.toMatchObject({ kind: 'unreachable' });

    // A server that is down will still be down a second later.
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('surfaces an HTTP error status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    await expect(chat({ system: 's', user: 'u', format: {} })).rejects.toMatchObject({
      kind: 'http',
    });
  });
});

describe('checkOllama', () => {
  it('reports the model as available when it is installed', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'qwen3:1.7b' }, { name: 'llama3:8b' }] }),
    });

    const status = await checkOllama('qwen3:1.7b');
    expect(status).toMatchObject({ reachable: true, model_available: true });
  });

  it('reports reachable but unavailable when the model is missing', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'other' }] }),
    });

    const status = await checkOllama('qwen3:1.7b');
    expect(status).toMatchObject({ reachable: true, model_available: false });
  });

  it('never throws when Ollama is down', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const status = await checkOllama('qwen3:1.7b');
    expect(status).toMatchObject({ reachable: false, model_available: false });
  });
});
