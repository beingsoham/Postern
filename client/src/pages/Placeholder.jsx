import { EmptyState } from '../components/index.js';

// Stand-in for pages that later prompts build out.
export function Placeholder({ title, description }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <EmptyState title={title} description={description} />
    </div>
  );
}
