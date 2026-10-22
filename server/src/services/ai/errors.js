// A typed failure so the pipeline can tell "model said something invalid"
// from "model was not reachable", and fall back either way.
export class AiError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'AiError';
    this.kind = kind; // 'unreachable' | 'timeout' | 'invalid' | 'http'
  }
}
