import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// With globals disabled, Testing Library's automatic cleanup never registers,
// so each render would otherwise pile up in the same document.
afterEach(cleanup);
