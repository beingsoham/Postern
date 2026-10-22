import { useEffect, useState } from 'react';

import { Button, Card, CardBody, CardHeader, SkeletonText } from '../components/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';

function StatusRow({ label, value, good }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-base text-muted">{label}</span>
      <span className="flex items-center gap-2 font-mono text-xs">
        {good !== undefined && (
          <span
            className={`size-2 rounded-full ${good ? 'bg-local-ai' : 'bg-urgent'}`}
            aria-hidden="true"
          />
        )}
        {value}
      </span>
    </div>
  );
}

function DeleteDialog({ onCancel, onConfirm, busy }) {
  const [typed, setTyped] = useState('');
  const phrase = 'delete all local data';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm deletion"
    >
      <Card className="w-full max-w-md">
        <CardHeader title="Delete all local data" />
        <CardBody className="space-y-3">
          <p className="text-base">
            This removes every email, classification, task, draft and follow-up from the
            database on this machine. It cannot be undone.
          </p>
          <p className="text-base text-muted">
            Type <span className="font-mono text-text">{phrase}</span> to confirm.
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full rounded-control border border-control bg-bg px-2.5 py-1.5
                       font-mono text-xs text-text"
            aria-label="Confirmation phrase"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={typed !== phrase || busy}>
              {busy ? 'Deleting…' : 'Delete everything'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export function Settings() {
  const ai = useAsync(() => api.aiStatus(), []);
  const settings = useAsync(() => api.settings(), []);

  const [days, setDays] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (settings.data) setDays(String(settings.data.settings.follow_up_days));
  }, [settings.data]);

  async function saveDays() {
    await api.updateSettings({ follow_up_days: Number(days) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function deleteEverything() {
    setBusy(true);
    try {
      const result = await api.deleteAllData();
      setMessage(`Deleted ${result.deleted_emails} emails and everything derived from them.`);
      setConfirming(false);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-12">
      <h1 className="font-display text-xl">Settings</h1>

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader title="Local AI" />
          <CardBody>
            {ai.loading ? (
              <SkeletonText lines={3} />
            ) : (
              <>
                <StatusRow
                  label="Ollama"
                  value={ai.data?.ollama_reachable ? 'reachable' : 'not reachable'}
                  good={ai.data?.ollama_reachable}
                />
                <StatusRow
                  label="Model"
                  value={ai.data?.model ?? 'none'}
                  good={ai.data?.model_available}
                />
                <StatusRow label="Endpoint" value={ai.data?.url ?? '—'} />
                {!ai.data?.reachable && (
                  <p className="mt-3 text-base text-muted">
                    Postern still works without the model: every email is classified by rules
                    instead, and the briefing is assembled from stored facts.
                  </p>
                )}
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Follow-ups" />
          <CardBody>
            <label className="block text-base" htmlFor="follow-up-days">
              Treat a sent message as unanswered after
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="follow-up-days"
                type="number"
                min="1"
                max="90"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-20 rounded-control border border-control bg-bg px-2 py-1.5
                           font-mono text-xs text-text"
              />
              <span className="text-base text-muted">days</span>
              <Button size="sm" onClick={saveDays} disabled={!days}>
                {saved ? 'Saved' : 'Save'}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Privacy" />
          <CardBody className="space-y-3">
            <p className="text-base text-muted">
              Analysis runs on this machine through Ollama. Email bodies and tokens are never
              written to logs, and the database is a file on your own disk. Local inference is
              not the same as fully offline: syncing real mail would still involve network
              traffic.
            </p>
            <div className="flex items-center gap-3 border-t border-border pt-3">
              <Button variant="danger" onClick={() => setConfirming(true)}>
                Delete all local data
              </Button>
              {message && <p className="text-base text-muted">{message}</p>}
            </div>
          </CardBody>
        </Card>
      </div>

      {confirming && (
        <DeleteDialog
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={deleteEverything}
        />
      )}
    </div>
  );
}
