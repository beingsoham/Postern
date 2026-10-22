import { describe, it, expect } from 'vitest';

import { formatLine, summarise } from '../../cli/doctor.js';

describe('doctor report formatting', () => {
  it('prints a pass line without a fix', () => {
    const line = formatLine({ level: 'pass', label: 'Node version', detail: 'v22' });
    expect(line).toContain('[PASS]');
    expect(line).toContain('Node version — v22');
    expect(line).not.toContain('fix:');
  });

  it('prints an actionable fix for a failure', () => {
    const line = formatLine({
      level: 'fail',
      label: 'Database',
      detail: 'missing',
      fix: 'Run: npm run db:migrate',
    });
    expect(line).toContain('[FAIL]');
    expect(line).toContain('fix: Run: npm run db:migrate');
  });

  it('exits non-zero when anything failed', () => {
    expect(summarise([{ level: 'pass' }, { level: 'fail' }]).code).toBe(1);
  });

  it('exits zero with warnings and says so', () => {
    const { line, code } = summarise([{ level: 'pass' }, { level: 'warn' }]);
    expect(code).toBe(0);
    expect(line).toMatch(/warning/i);
  });

  it('exits zero and is clean when everything passes', () => {
    const { line, code } = summarise([{ level: 'pass' }, { level: 'pass' }]);
    expect(code).toBe(0);
    expect(line).toBe('Ready to run in demo mode.');
  });
});
