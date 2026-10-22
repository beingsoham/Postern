import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted fonts. The app never calls a font CDN, which keeps the privacy
// story intact: no third party learns when you open your inbox.
import '@fontsource/instrument-serif/400.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/jetbrains-mono';

import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
