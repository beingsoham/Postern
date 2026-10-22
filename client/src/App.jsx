import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/AppShell.jsx';
import { useAiStatus } from './hooks/useAiStatus.js';
import { Briefing } from './pages/Briefing.jsx';
import { DesignSystem } from './pages/DesignSystem.jsx';
import { FollowUps } from './pages/FollowUps.jsx';
import { Inbox } from './pages/Inbox.jsx';
import { Settings } from './pages/Settings.jsx';
import { Tasks } from './pages/Tasks.jsx';

export default function App() {
  const aiStatus = useAiStatus();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell aiStatus={aiStatus} />}>
          <Route index element={<Briefing />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="follow-ups" element={<FollowUps />} />
          <Route path="settings" element={<Settings />} />
          <Route path="design" element={<DesignSystem />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
