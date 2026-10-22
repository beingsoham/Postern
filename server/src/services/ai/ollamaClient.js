import { config } from '../../config.js';
import { AiError } from './errors.js';

const TIMEOUT_MS = 30_000;

/**
 * One request to the local model. `format` is a JSON Schema, so Ollama
 * constrains decoding and the response is structurally valid by construction.
 */
export async function chat({
  system,
  user,
  format,
  model = config.ollamaModel,
  temperature = 0.1,
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        // Qwen3 reasons by default; thinking tokens slow this down and add
        // nothing when the output shape is already fixed.
        think: false,
        keep_alive: '10m',
        format,
        options: { temperature, seed: 7, num_ctx: 4096 },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new AiError('timeout', `Model did not answer within ${TIMEOUT_MS / 1000}s`);
    }
    throw new AiError('unreachable', 'Could not reach Ollama');
  }
  clearTimeout(timer);

  if (!response.ok) {
    throw new AiError('http', `Ollama returned ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.message?.content;
  if (typeof content !== 'string') {
    throw new AiError('invalid', 'Ollama returned no message content');
  }

  return { content, model: payload.model ?? model };
}

/**
 * Calls the model and validates the result with Zod. One retry, because a
 * second attempt costs a second and fixes most one-off malformed responses.
 */
export async function chatJson({ system, user, format, schema, model, retries = 1 }) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { content, model: used } = await chat({ system, user, format, model });

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new AiError('invalid', 'Model output was not JSON');
      }

      const result = schema.safeParse(parsed);
      if (!result.success) {
        throw new AiError('invalid', result.error.issues[0]?.message ?? 'Schema mismatch');
      }

      return { data: result.data, model: used };
    } catch (err) {
      lastError =
        err instanceof AiError ? err : new AiError('invalid', String(err?.message ?? err));
      // A model that is down will still be down on a retry.
      if (lastError.kind === 'unreachable') break;
    }
  }

  throw lastError;
}

/** Health probe for the doctor command and the settings page. */
export async function checkOllama(model = config.ollamaModel) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${config.ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { reachable: false, model, model_available: false };

    const { models = [] } = await res.json();
    const names = models.map((m) => m.name);

    return {
      reachable: true,
      model,
      model_available: names.includes(model),
      installed: names,
    };
  } catch {
    clearTimeout(timer);
    return { reachable: false, model, model_available: false, installed: [] };
  }
}
