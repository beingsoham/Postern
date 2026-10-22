import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import { PriorityBadge } from '../src/components/PriorityBadge.jsx';
import { ReasonChip } from '../src/components/ReasonChip.jsx';
import { StatusPill } from '../src/components/StatusPill.jsx';
import { EmailBody } from '../src/components/EmailBody.jsx';
import { TaskRow } from '../src/components/TaskRow.jsx';
import { MessageList } from '../src/components/MessageList.jsx';
import { AppShell } from '../src/components/AppShell.jsx';

describe('PriorityBadge', () => {
  // A colour alone is unreadable to anyone who cannot distinguish it.
  it.each(['urgent', 'important', 'normal', 'low'])('shows a text label for %s', (priority) => {
    render(<PriorityBadge priority={priority} />);
    expect(screen.getByText(new RegExp(priority, 'i'))).toBeInTheDocument();
  });

  it('falls back to normal for an unknown priority', () => {
    render(<PriorityBadge priority="nonsense" />);
    expect(screen.getByText(/normal/i)).toBeInTheDocument();
  });
});

describe('ReasonChip', () => {
  it('shows the reason and offers a correction', async () => {
    const onCorrect = vi.fn();
    render(<ReasonChip reason="Because a deadline was found." onCorrect={onCorrect} />);

    expect(screen.getByText(/because a deadline/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /correct this/i }));
    expect(onCorrect).toHaveBeenCalledOnce();
  });

  it('hides the control when no handler is given', () => {
    render(<ReasonChip reason="Just a reason." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('StatusPill', () => {
  it('says the model is running locally when reachable', () => {
    render(<StatusPill model="qwen3:1.7b" reachable />);
    expect(screen.getByText('qwen3:1.7b')).toBeInTheDocument();
    expect(screen.getByText(/running locally/i)).toBeInTheDocument();
  });

  it('says unavailable rather than hiding the problem', () => {
    render(<StatusPill model="qwen3:1.7b" reachable={false} />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });
});

describe('EmailBody', () => {
  it('renders plain text as text', () => {
    render(<EmailBody body="Just a normal sentence." />);
    expect(screen.getByText(/just a normal sentence/i)).toBeInTheDocument();
  });

  it('strips a script tag out of HTML mail', () => {
    const { container } = render(
      <EmailBody body="<p>Hello</p><script>window.stolen = true;</script>" />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('strips remote images, which would report that the mail was opened', () => {
    const { container } = render(
      <EmailBody body='<p>Hi</p><img src="https://tracker.example/pixel.gif" />' />,
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('removes an inline event handler', () => {
    const { container } = render(<EmailBody body='<p onclick="steal()">Click</p>' />);
    expect(container.querySelector('p')?.getAttribute('onclick')).toBeNull();
  });
});

describe('TaskRow', () => {
  const task = {
    id: 1,
    description: 'Submit the lab report',
    due_date: '2026-11-01',
    status: 'open',
    verification: 'verified',
  };

  it('completes a task through the checkbox', async () => {
    const onToggle = vi.fn();
    render(<TaskRow task={task} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith(task, 'done');
  });

  it('labels a date that was never confirmed', () => {
    render(<TaskRow task={{ ...task, verification: 'unverified' }} onToggle={vi.fn()} />);
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();
  });
});

describe('MessageList', () => {
  const emails = [
    {
      id: 1,
      subject: 'Urgent thing',
      sender: 'a@b.com',
      sender_name: 'Ann',
      received_at: new Date().toISOString(),
      priority: 'urgent',
      is_demo: 1,
      is_read: 0,
    },
    {
      id: 2,
      subject: 'Quiet thing',
      sender: 'c@d.com',
      sender_name: 'Cal',
      received_at: new Date().toISOString(),
      priority: null,
      is_demo: 0,
      is_read: 1,
    },
  ];

  it('selects a message when it is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <MessageList emails={emails} loading={false} selectedId={null} onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByText('Urgent thing'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('marks an unanalyzed message rather than guessing a priority', () => {
    render(
      <MessageList emails={emails} loading={false} selectedId={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText(/unanalyzed/i)).toBeInTheDocument();
  });

  it('does not repeat a demo badge on every row', () => {
    // Sample data is a property of the session, so the shell states it once.
    // Forty copies of the same badge was noise, not information.
    render(
      <MessageList emails={emails} loading={false} selectedId={null} onSelect={vi.fn()} />,
    );
    expect(screen.queryByText(/^demo$/i)).not.toBeInTheDocument();
  });

  it('says so when nothing matches the filters', () => {
    render(<MessageList emails={[]} loading={false} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/no messages match/i)).toBeInTheDocument();
  });
});

describe('AppShell', () => {
  const shell = (aiStatus) =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppShell aiStatus={aiStatus} />}>
            <Route index element={<p>Page content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

  it('states the demo context exactly once', () => {
    shell({ model: 'qwen3:1.7b', reachable: true });
    expect(screen.getAllByText(/^demo$/i)).toHaveLength(1);
  });

  it('shows every destination and the model status', () => {
    shell({ model: 'qwen3:1.7b', reachable: true });

    for (const label of ['Briefing', 'Inbox', 'Tasks', 'Follow-ups', 'Settings']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText('qwen3:1.7b')).toBeInTheDocument();
    expect(screen.getByText(/running locally/i)).toBeInTheDocument();
  });

  it('renders the routed page inside the shell', () => {
    shell({ model: null, reachable: false });
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });
});
