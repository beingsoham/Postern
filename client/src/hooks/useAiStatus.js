import { useEffect, useState } from 'react';

// Asks the backend what the local model situation is. The backend is the only
// thing that talks to Ollama; the client never does.
export function useAiStatus() {
  const [status, setStatus] = useState({ model: null, reachable: false, loading: true });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/settings/ai')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('unavailable'))))
      .then((data) => {
        if (!cancelled) setStatus({ ...data, loading: false });
      })
      .catch(() => {
        // Until the route exists this is the honest answer: we do not know.
        if (!cancelled) setStatus({ model: null, reachable: false, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
