import { useState } from 'react';

import { Button } from './Button.jsx';
import { SkeletonText } from './Skeleton.jsx';
import { api } from '../services/api.js';

const TONES = ['friendly', 'formal', 'brief'];

/**
 * Drafts are editable and copyable. There is deliberately no Send button:
 * nothing leaves this application.
 */
export function DraftPanel({ email, onClose }) {
  const [tone, setTone] = useState('friendly');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  async function generate(nextTone = tone) {
    setLoading(true);
    setError(null);
    try {
      const { draft } = await api.draft(email.id, nextTone);
      setContent(draft.content);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy to the clipboard.');
    }
  }

  return (
    <div className="mt-4 rounded-card border border-border bg-surface-2 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {TONES.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={t === tone ? 'primary' : 'ghost'}
              onClick={() => {
                setTone(t);
                generate(t);
              }}
              disabled={loading}
            >
              {t}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {loading && <SkeletonText lines={4} />}

      {!loading && !content && !error && (
        <Button variant="primary" size="sm" onClick={() => generate()}>
          Generate draft
        </Button>
      )}

      {error && <p className="text-base text-urgent">{error}</p>}

      {!loading && content && (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full resize-y rounded-control border border-control bg-bg p-2.5
                       text-base leading-relaxed text-text"
            aria-label="Draft reply"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={() => generate()} disabled={loading}>
              Regenerate
            </Button>
            <Button size="sm" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setContent('')}>
              Discard
            </Button>
            <span className="ml-auto font-mono text-xs text-muted">
              never sent automatically
            </span>
          </div>
        </>
      )}
    </div>
  );
}
