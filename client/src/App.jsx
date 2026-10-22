import { useEffect, useState } from 'react';

// Scaffold page. It exists to prove one thing: the client reaches the API
// through the Vite proxy. The real UI arrives with the design system.
export default function App() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('bad response'))))
      .then((data) => {
        if (!cancelled) setStatus(data.status);
      })
      .catch(() => {
        if (!cancelled) setStatus('unreachable');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const reachable = status === 'ok';

  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8">
        <h1 className="text-2xl tracking-tight">Postern</h1>
        <p className="mt-2 text-sm text-muted">Your private AI inbox.</p>

        <div className="mt-6 flex items-center gap-2 border-t border-border pt-6">
          <span
            className={`size-2 rounded-full ${reachable ? 'bg-local-ai' : 'bg-urgent'}`}
            aria-hidden="true"
          />
          <span className="text-sm text-muted">
            API: <span className="text-text">{status}</span>
          </span>
        </div>
      </div>
    </main>
  );
}
