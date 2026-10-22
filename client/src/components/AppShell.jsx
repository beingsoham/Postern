import { NavLink, Outlet } from 'react-router-dom';

import { StatusPill } from './StatusPill.jsx';
import { cn } from './cn.js';

const NAV = [
  { to: '/', label: 'Briefing', end: true },
  { to: '/inbox', label: 'Inbox' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/follow-ups', label: 'Follow-ups' },
  { to: '/settings', label: 'Settings' },
];

// Left sidebar + content. The AI status lives at the bottom of the sidebar so
// the user can always see whether the local model is actually up.
export function AppShell({ aiStatus }) {
  return (
    <div className="flex h-full">
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-4 py-5">
          <span className="font-display text-lg tracking-tight">Postern</span>
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'block rounded-control px-2.5 py-1.5 text-base',
                  'transition-colors duration-150 ease-out',
                  isActive
                    ? 'bg-surface-2 text-text'
                    : 'text-muted hover:bg-surface-2 hover:text-text',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-2">
          <StatusPill model={aiStatus?.model} reachable={aiStatus?.reachable} />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
