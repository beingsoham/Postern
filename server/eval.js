// Scores the pipeline against the sample inbox, whose correct answers are
// recorded alongside the data. This is how a model change is judged.
import { openDb } from './src/db/db.js';
import { SAMPLE_EMAILS } from './src/db/seed.js';
import { analyzeWithRules } from './src/services/priority/ruleEngine.js';
import { analyzeEmail } from './src/services/ai/analyzeEmail.js';
import { config } from './src/config.js';

const rulesOnly = process.argv.includes('--rules-only');

const db = openDb();
const rows = db.prepare("SELECT * FROM emails WHERE direction = 'in'").all();
db.close();

const expected = new Map(SAMPLE_EMAILS.map((e) => [e.provider_id, e.expect]));

let catHits = 0;
let priHits = 0;
let scored = 0;
const misses = [];

for (const email of rows) {
  const want = expected.get(email.provider_id);
  if (!want?.category) continue;

  const got = rulesOnly
    ? analyzeWithRules(email)
    : (await analyzeEmail(email)).classification;

  scored += 1;
  if (got.category === want.category) catHits += 1;
  else misses.push(`${email.provider_id} category: want ${want.category}, got ${got.category}`);

  if (got.priority === want.priority) priHits += 1;
  else misses.push(`${email.provider_id} priority: want ${want.priority}, got ${got.priority}`);
}

const pct = (n) => `${((n / scored) * 100).toFixed(0)}%`;

console.log(`\nPostern eval — ${rulesOnly ? 'rules only' : config.ollamaModel}`);
console.log(`  emails scored : ${scored}`);
console.log(`  category      : ${catHits}/${scored}  ${pct(catHits)}`);
console.log(`  priority      : ${priHits}/${scored}  ${pct(priHits)}`);
if (misses.length) {
  console.log('\n  misses:');
  for (const m of misses.slice(0, 15)) console.log(`    ${m}`);
  if (misses.length > 15) console.log(`    … and ${misses.length - 15} more`);
}
console.log();
