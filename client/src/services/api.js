// One place that knows how to talk to the backend. Components never fetch
// directly, and the client never touches SQLite or Ollama.

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // An empty or non-JSON body is handled by the status check below.
  }

  if (!res.ok) {
    const error = new Error(payload?.error?.message ?? `Request failed (${res.status})`);
    error.code = payload?.error?.code ?? 'request_failed';
    error.status = res.status;
    throw error;
  }

  return payload;
}

export const api = {
  health: () => request('/health'),
  aiStatus: () => request('/settings/ai'),

  briefing: () => request('/briefing/today'),

  emails: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    );
    return request(`/emails?${query}`);
  },
  email: (id) => request(`/emails/${id}`),
  analyzeEmail: (id) => request(`/emails/${id}/analyze`, { method: 'POST' }),
  analyzeAll: (body = { limit: 40 }) => request('/analyze-all', { method: 'POST', body }),
  setPriority: (id, priority) =>
    request(`/emails/${id}/priority`, { method: 'PATCH', body: { priority } }),
  draft: (id, tone) => request(`/emails/${id}/drafts`, { method: 'POST', body: { tone } }),

  tasks: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    );
    return request(`/tasks?${query}`);
  },
  updateTask: (id, patch) => request(`/tasks/${id}`, { method: 'PATCH', body: patch }),

  settings: () => request('/settings'),
  updateSettings: (patch) => request('/settings', { method: 'PATCH', body: patch }),
  deleteAllData: () =>
    request('/data', { method: 'DELETE', body: { confirm: 'delete all local data' } }),

  followUps: () => request('/follow-ups'),
  detectFollowUps: () => request('/follow-ups/detect', { method: 'POST' }),
  updateFollowUp: (id, status) =>
    request(`/follow-ups/${id}`, { method: 'PATCH', body: { status } }),
};
