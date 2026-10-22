import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Button, Card, CardBody, CardHeader, DemoBadge, EmptyState, SkeletonText,
} from '../components/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';

function ItemList({ items, idKey, to }) {
  if (!items?.length) {
    return <p className="text-base text-muted">Nothing here.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item[idKey]}>
          <Link
            to={to(item)}
            className="block rounded-control px-2 py-1.5 -mx-2 text-base
                       transition-colors duration-150 ease-out hover:bg-surface-2"
          >
            {item.note}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Briefing() {
  const { data, error, loading, reload } = useAsync(() => api.briefing(), []);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(null);

  const briefing = data?.briefing;

  async function analyzeInbox() {
    setAnalyzing(true);
    setProgress('Analyzing inbox locally…');
    try {
      const result = await api.analyzeAll({ limit: 40 });
      setProgress(
        `Analyzed ${result.analyzed}` +
        (result.fallbacks ? `, ${result.fallbacks} fell back to rules` : ''),
      );
      reload();
    } catch (err) {
      setProgress(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {loading ? (
            <SkeletonText lines={1} className="w-80" />
          ) : (
            <h1 className="font-display text-display leading-tight">
              {briefing?.headline ?? 'Your briefing'}
            </h1>
          )}
          {briefing?.next_step && (
            <p className="mt-2 text-md text-muted">{briefing.next_step}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Button variant="primary" onClick={analyzeInbox} disabled={analyzing}>
            {analyzing ? 'Analyzing…' : 'Analyze inbox'}
          </Button>
          <DemoBadge />
        </div>
      </div>

      {progress && <p className="mb-4 font-mono text-xs text-muted">{progress}</p>}

      {error && (
        <Card className="mb-6 border-urgent/40">
          <CardBody>
            <p className="text-base text-urgent">The backend is not reachable.</p>
            <p className="mt-1 text-base text-muted">{error.message}</p>
          </CardBody>
        </Card>
      )}

      {briefing?.source === 'rules' && !loading && (
        <Card className="mb-6 border-accent/40">
          <CardBody>
            <p className="text-base text-accent">Built from rules</p>
            <p className="mt-1 text-base text-muted">
              The local model was unavailable or its answer failed validation, so
              this briefing was assembled deterministically from stored facts.
            </p>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}><CardBody><SkeletonText lines={3} /></CardBody></Card>
          ))}
        </div>
      ) : !briefing || (
        !briefing.needs_attention.length &&
        !briefing.reply_needed.length &&
        !briefing.action_items.length
      ) ? (
        <Card>
          <EmptyState
            title="Nothing needs you right now"
            description="Analyze the inbox to see what deserves your attention today."
            action={<Button variant="primary" onClick={analyzeInbox}>Analyze inbox</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="animate-fade-up">
            <CardHeader title="Needs attention" />
            <CardBody>
              <ItemList
                items={briefing.needs_attention}
                idKey="email_id"
                to={(i) => `/inbox?focus=${i.email_id}`}
              />
            </CardBody>
          </Card>

          <Card className="animate-fade-up">
            <CardHeader title="Reply needed" />
            <CardBody>
              <ItemList
                items={briefing.reply_needed}
                idKey="email_id"
                to={(i) => `/inbox?focus=${i.email_id}`}
              />
            </CardBody>
          </Card>

          <Card className="animate-fade-up">
            <CardHeader title="Action items" />
            <CardBody>
              <ItemList items={briefing.action_items} idKey="task_id" to={() => '/tasks'} />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
