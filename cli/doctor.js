#!/usr/bin/env node
import { existsSync } from 'node:fs';

import { config } from '../server/src/config.js';
import { openDb } from '../server/src/db/db.js';
import { analyzeWithRules } from '../server/src/services/priority/ruleEngine.js';
import { checkOllama } from '../server/src/services/ai/ollamaClient.js';
import { analyzeEmail } from '../server/src/services/ai/analyzeEmail.js';

const COLORS = { pass: '\u001b[32m', warn: '\u001b[33m', fail: '\u001b[31m', off: '\u001b[0m' };
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

/** Formats one check line. Exported so it can be tested without running checks. */
export function formatLine({ level, label, detail, fix }) {
  const tag = level.toUpperCase();
  const painted = useColor ? `${COLORS[level]}[${tag}]${COLORS.off}` : `[${tag}]`;
  const lines = [`${painted} ${label}${detail ? ` — ${detail}` : ''}`];
  if (fix && level !== 'pass') lines.push(`        fix: ${fix}`);
  return lines.join('\n');
}

export function summarise(results) {
  const failed = results.filter((r) => r.level === 'fail').length;
  const warned = results.filter((r) => r.level === 'warn').length;

  if (failed) return { line: `${failed} check(s) failed. Postern will not run correctly.`, code: 1 };
  if (warned) return { line: 'Ready to run in demo mode, with warnings.', code: 0 };
  return { line: 'Ready to run in demo mode.', code: 0 };
}

async function runChecks() {
  const results = [];
  const add = (level, label, detail, fix) => results.push({ level, label, detail, fix });

  // Node
  const major = Number(process.versions.node.split('.')[0]);
  major >= 20
    ? add('pass', 'Node version', `v${process.versions.node}`)
    : add('fail', 'Node version', `v${process.versions.node}`, 'Install Node 20 or newer.');

  // Database
  let db = null;
  if (!existsSync(config.dbPath)) {
    add('warn', 'Database file', 'not created yet', 'Run: npm run db:migrate && npm run db:seed');
  } else {
    try {
      db = openDb();
      const { n } = db.prepare('SELECT COUNT(*) AS n FROM emails').get();
      n > 0
        ? add('pass', 'Database', `${n} emails stored`)
        : add('warn', 'Database', 'no emails', 'Run: npm run db:seed');
    } catch (err) {
      add('fail', 'Database', err.message, 'Delete the file and run npm run db:migrate.');
    }
  }

  // Rule engine works without any model at all.
  try {
    const r = analyzeWithRules(
      { subject: 'Report due today', body: 'Submit by EOD.', sender: 'a@b.com',
        received_at: new Date().toISOString(), direction: 'in' },
      new Date(),
    );
    r.priority
      ? add('pass', 'Rule engine', `sample classified ${r.priority}`)
      : add('fail', 'Rule engine', 'returned no priority');
  } catch (err) {
    add('fail', 'Rule engine', err.message);
  }

  // Ollama
  const ai = await checkOllama();
  if (!ai.reachable) {
    add('warn', 'Ollama', `not reachable at ${config.ollamaUrl}`,
        'Start it with: ollama serve');
  } else if (!ai.model_available) {
    add('warn', 'Model', `${config.ollamaModel} not installed`,
        `Pull it with: ollama pull ${config.ollamaModel}`);
  } else {
    add('pass', 'Ollama', `${config.ollamaModel} available`);

    // A real end-to-end classification, timed.
    const started = Date.now();
    try {
      const result = await analyzeEmail({
        id: 0, subject: 'Lab report due Friday',
        body: 'The signals lab report is due this Friday before 5 PM.',
        sender: 'prof@university.edu', received_at: new Date().toISOString(),
        direction: 'in', list_unsubscribe: 0,
      });
      const seconds = ((Date.now() - started) / 1000).toFixed(1);

      result.classification.status === 'ok'
        ? add('pass', 'Sample classification', `${result.classification.priority} in ${seconds}s`)
        : add('warn', 'Sample classification', `fell back to rules after ${seconds}s`,
              'The model was slow or returned invalid output. Rules still work.');
    } catch (err) {
      add('warn', 'Sample classification', err.message, 'Rules will be used instead.');
    }
  }

  // Gmail is not wired up yet, and the spec says to say so rather than imply it.
  add('warn', 'Gmail connection', 'not connected', 'Sample data is in use. Gmail OAuth is on the roadmap.');

  db?.close();
  return results;
}

// Only run the checks when invoked directly, so tests can import the
// formatting helpers without the process exiting under them.
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = await runChecks();
  console.log('\nPostern doctor\n');
  for (const r of results) console.log(formatLine(r));

  const { line, code } = summarise(results);
  console.log(`\n${line}\n`);
  process.exit(code);
}
