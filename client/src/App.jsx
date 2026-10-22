import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/AppShell.jsx';
import { useAiStatus } from './hooks/useAiStatus.js';
import { Briefing } from './pages/Briefing.jsx';
import { DesignSystem } from './pages/DesignSystem.jsx';
import { Placeholder } from './pages/Placeholder.jsx';

export default function App() {
  const aiStatus = useAiStatus();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell aiStatus={aiStatus} />}>
          <Route index element={<Briefing />} />
          <Route
            path="inbox"
            element={
              <Placeholder title="Inbox" description="The message list arrives with Prompt 10." />
            }
          />
          <Route
            path="tasks"
            element={
              <Placeholder
                title="Tasks"
                description="Extracted actions and deadlines, grouped by due date."
              />
            }
          />
          <Route
            path="follow-ups"
            element={
              <Placeholder
                title="Follow-ups"
                description="Sent mail that nobody has answered yet."
              />
            }
          />
          <Route
            path="settings"
            element={
              <Placeholder
                title="Settings"
                description="Model status, follow-up window, and local data controls."
              />
            }
          />
          <Route path="design" element={<DesignSystem />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
