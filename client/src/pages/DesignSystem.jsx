import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  EmptyState,
  PriorityBadge,
  ReasonChip,
  Skeleton,
  SkeletonText,
  StatusPill,
} from '../components/index.js';

const SWATCHES = [
  ['bg', '#0E0F12'],
  ['surface', '#15171C'],
  ['surface-2', '#1B1E25'],
  ['border', '#262A33'],
  ['text', '#ECEAE4'],
  ['muted', '#8B909A'],
  ['accent', '#E8B04A'],
  ['local-ai', '#5ED1B1'],
  ['urgent', '#F0654D'],
  ['important', '#E8B04A'],
  ['normal', '#7AA2D6'],
  ['low', '#5B6070'],
];

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="font-mono text-xs tracking-widest text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

// Every component in one place, so a visual regression is obvious.
export function DesignSystem() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
      <header>
        <h1 className="font-display text-xl">Ink and Amber</h1>
        <p className="mt-1 text-base text-muted">
          Every component in the Postern design system, rendered once.
        </p>
      </header>

      <Section title="Typography">
        <Card>
          <CardBody className="space-y-3">
            <p className="font-display text-display leading-none">Two things need you today</p>
            <p className="text-md">
              Interface text in Geist, set at 14–15px on 1.55 line height.
            </p>
            <p className="text-base text-muted">Secondary text uses the muted token.</p>
            <p className="font-mono text-xs">14:32 · task_0291 · qwen3:4b · confidence 0.86</p>
          </CardBody>
        </Card>
      </Section>

      <Section title="Colour tokens">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SWATCHES.map(([name, hex]) => (
            <div key={name} className="rounded-control border border-border p-2">
              <div
                className="h-9 rounded border border-border"
                style={{ backgroundColor: hex }}
                aria-hidden="true"
              />
              <p className="mt-1.5 font-mono text-xs text-text">{name}</p>
              <p className="font-mono text-xs text-muted">{hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <Card>
          <CardBody className="flex flex-wrap items-center gap-2">
            <Button variant="primary">Analyze inbox</Button>
            <Button variant="secondary">Draft reply</Button>
            <Button variant="ghost">Dismiss</Button>
            <Button variant="danger">Delete all local data</Button>
            <Button variant="secondary" size="sm">
              Small
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </CardBody>
        </Card>
      </Section>

      <Section title="Priority badges">
        <Card>
          <CardBody className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority="urgent" />
            <PriorityBadge priority="important" />
            <PriorityBadge priority="normal" />
            <PriorityBadge priority="low" />
            <DemoBadge />
          </CardBody>
        </Card>
      </Section>

      <Section title="Reason chip">
        <ReasonChip
          reason="The sender asks a direct question and names a deadline of Friday."
          onCorrect={() => {}}
        />
      </Section>

      <Section title="Status pill">
        <div className="flex flex-wrap gap-3">
          <StatusPill model="qwen3:4b" reachable />
          <StatusPill model="qwen3:4b" reachable={false} />
        </div>
      </Section>

      <Section title="Card with header">
        <Card className="animate-fade-up">
          <CardHeader title="Needs attention" action={<Button size="sm">View all</Button>} />
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-base">Lab report submission closes Friday</p>
              <PriorityBadge priority="urgent" />
            </div>
            <p className="font-mono text-xs text-muted">prof.rao@university.edu · 2h ago</p>
          </CardBody>
        </Card>
      </Section>

      <Section title="Loading">
        <Card>
          <CardBody className="space-y-4">
            <SkeletonText lines={3} />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-16" />
            </div>
          </CardBody>
        </Card>
      </Section>

      <Section title="Empty state">
        <Card>
          <EmptyState
            title="Nothing needs you right now"
            description="Every message has been triaged and no deadlines are close."
            action={<Button variant="primary">Analyze inbox</Button>}
          />
        </Card>
      </Section>
    </div>
  );
}
