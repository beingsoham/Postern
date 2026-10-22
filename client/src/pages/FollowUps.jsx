import { Link } from 'react-router-dom';

import { Button, Card, CardBody, EmptyState, SkeletonText } from '../components/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';
import { relativeTime } from '../lib/time.js';

const STATUS_LABEL = {
  pending: 'Waiting',
  followed_up: 'Followed up',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

function Row({ item, onStatus }) {
  const pending = item.status === 'pending';

  return (
    <li className="group border-b border-border px-4 py-2.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/inbox?focus=${item.email_id}`}
            className="block truncate text-base hover:text-accent"
          >
            {item.subject || '(no subject)'}
          </Link>
          <p className="mt-0.5 font-mono text-xs text-muted">
            sent {relativeTime(item.received_at)} ago
            {item.notes ? ` · ${item.notes}` : ''}
            {!pending && ` · ${STATUS_LABEL[item.status]}`}
          </p>
        </div>

        {pending && (
          <div
            className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-150
                       group-hover:opacity-100 focus-within:opacity-100"
          >
            <Button size="sm" onClick={() => onStatus(item.id, 'followed_up')}>
              Mark followed up
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onStatus(item.id, 'resolved')}>
              Resolve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onStatus(item.id, 'dismissed')}>
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

export function FollowUps() {
  const { data, error, loading, reload } = useAsync(() => api.followUps(), []);

  async function setStatus(id, status) {
    await api.updateFollowUp(id, status);
    reload();
  }

  async function detect() {
    await api.detectFollowUps();
    reload();
  }

  const items = data?.follow_ups ?? [];
  const waiting = items.filter((i) => i.status === 'pending');

  return (
    <div className="mx-auto max-w-4xl px-8 py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl">Follow-ups</h1>
          <p className="mt-1 text-base text-muted">
            Mail you sent that nobody has answered. Detected from your threads, with no model
            involved.
          </p>
        </div>
        <Button size="sm" onClick={detect}>
          Check again
        </Button>
      </div>

      {error && <p className="mb-4 text-base text-urgent">{error.message}</p>}

      {loading ? (
        <Card>
          <CardBody>
            <SkeletonText lines={4} />
          </CardBody>
        </Card>
      ) : !items.length ? (
        <Card>
          <EmptyState
            title="Nobody is keeping you waiting"
            description="Every message you sent has had a reply."
            action={
              <Button variant="primary" onClick={detect}>
                Check again
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <ul>
            {[...waiting, ...items.filter((i) => i.status !== 'pending')].map((item) => (
              <Row key={item.id} item={item} onStatus={setStatus} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
