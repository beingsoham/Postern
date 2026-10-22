import { api } from '../services/api.js';
import { useAsync } from './useAsync.js';

// Asks the backend what the local model situation is. The backend is the only
// thing that talks to Ollama; the client never does.
export function useAiStatus() {
  const { data, loading } = useAsync(() => api.aiStatus(), []);

  return {
    model: data?.model ?? null,
    reachable: Boolean(data?.reachable),
    loading,
  };
}
