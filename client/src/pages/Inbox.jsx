import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button, MessageList, Reader } from '../components/index.js';
import { api } from '../services/api.js';

const PRIORITIES = ['urgent', 'important', 'normal', 'low'];
const CATEGORIES = [
  'academic',
  'work',
  'recruiting',
  'finance',
  'security',
  'newsletter',
  'social',
  'other',
];

const LIMIT = 25;

export function Inbox() {
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const [list, setList] = useState({ emails: [], total: 0, pages: 1, loading: true });
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [error, setError] = useState(null);

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const loadList = useCallback(async () => {
    setList((s) => ({ ...s, loading: true }));
    try {
      const data = await api.emails({
        search: debounced,
        priority,
        category,
        page,
        limit: LIMIT,
      });
      setList({ ...data, loading: false });
      setError(null);
    } catch (err) {
      setList({ emails: [], total: 0, pages: 1, loading: false });
      setError(err.message);
    }
  }, [debounced, priority, category, page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // A briefing link arrives as /inbox?focus=<id>.
  useEffect(() => {
    const focus = params.get('focus');
    if (focus) {
      setSelectedId(Number(focus));
      params.delete('focus');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDraftOpen(false);
    try {
      setDetail(await api.email(id));
    } catch (err) {
      setError(err.message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const ids = useMemo(() => list.emails.map((e) => e.id), [list.emails]);

  async function analyzeSelected() {
    if (!selectedId) return;
    setAnalyzing(true);
    try {
      await api.analyzeEmail(selectedId);
      await Promise.all([loadDetail(selectedId), loadList()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function override(next) {
    await api.setPriority(selectedId, next);
    await Promise.all([loadDetail(selectedId), loadList()]);
  }

  async function toggleTask(task, status) {
    await api.updateTask(task.id, { status });
    await loadDetail(selectedId);
  }

  // j/k move, e analyze, r draft. Ignored while typing in a field.
  const handlers = useRef({});
  handlers.current = { analyzeSelected, ids, selectedId };

  useEffect(() => {
    function onKey(event) {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const { ids: rows, selectedId: current } = handlers.current;
      const index = rows.indexOf(current);

      if (event.key === 'j' && rows.length) {
        event.preventDefault();
        setSelectedId(rows[Math.min(index + 1, rows.length - 1)] ?? rows[0]);
      } else if (event.key === 'k' && rows.length) {
        event.preventDefault();
        setSelectedId(rows[Math.max(index - 1, 0)] ?? rows[0]);
      } else if (event.key === 'e') {
        event.preventDefault();
        handlers.current.analyzeSelected();
      } else if (event.key === 'r') {
        event.preventDefault();
        setDraftOpen(true);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-full">
      <section className="flex w-96 shrink-0 flex-col border-r border-border">
        <div className="space-y-2 border-b border-border p-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, sender or body"
            className="w-full rounded-control border border-control bg-surface px-2.5 py-1.5
                       text-base text-text placeholder:text-muted"
          />
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="flex-1 rounded-control border border-control bg-surface px-2 py-1.5
                         font-mono text-xs text-text"
              aria-label="Filter by priority"
            >
              <option value="">all priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="flex-1 rounded-control border border-control bg-surface px-2 py-1.5
                         font-mono text-xs text-text"
              aria-label="Filter by category"
            >
              <option value="">all categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <p className="font-mono text-xs text-muted">
            {list.loading ? 'loading…' : `${list.total} message${list.total === 1 ? '' : 's'}`}
            <span className="float-right">j/k move · e analyze · r draft</span>
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <MessageList
            emails={list.emails}
            loading={list.loading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {list.pages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-border p-2">
            <Button
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="font-mono text-xs text-muted">
              {page} / {list.pages}
            </span>
            <Button
              size="sm"
              onClick={() => setPage((p) => Math.min(list.pages, p + 1))}
              disabled={page >= list.pages}
            >
              Next
            </Button>
          </div>
        )}
      </section>

      <section className="min-w-0 flex-1 overflow-y-auto">
        {error && (
          <p className="border-b border-urgent/40 bg-urgent/10 px-6 py-3 text-base text-urgent">
            {error}
          </p>
        )}
        <Reader
          detail={detail}
          loading={detailLoading}
          analyzing={analyzing}
          onAnalyze={analyzeSelected}
          onOverride={override}
          onToggleTask={toggleTask}
          draftOpen={draftOpen}
          setDraftOpen={setDraftOpen}
        />
      </section>
    </div>
  );
}
