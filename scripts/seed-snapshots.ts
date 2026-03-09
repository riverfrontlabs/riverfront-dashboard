import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env.local') });

import Database from 'better-sqlite3';

const DB_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/crm.db');
const db = new Database(DB_PATH);
const DAYS = 365;

function jitter(n: number, pct = 0.12) {
  return Math.max(0, Math.round(n * (1 + (Math.random() - 0.5) * pct)));
}

// Clear existing seeds so we can re-run cleanly
db.prepare('DELETE FROM daily_snapshots').run();

const stmt = db.prepare(`
  INSERT OR REPLACE INTO daily_snapshots (date, total, previewed, drafted, contacted, replied, booked, closed)
  VALUES (@date, @total, @previewed, @drafted, @contacted, @replied, @booked, @closed)
`);

const insert = db.transaction((rows: any[]) => { for (const r of rows) stmt.run(r); });

// Target endpoints (where we want today's numbers to be)
const TARGET = { total: 2888, previewed: 62, drafted: 40, contacted: 28, replied: 9, booked: 3, closed: 1 };

// Starting points (60 days ago)
const START  = { total: 2650, previewed: 0,  drafted: 0,  contacted: 0,  replied: 0, booked: 0, closed: 0 };

const rows = [];
for (let i = DAYS; i >= 0; i--) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  const date = d.toISOString().slice(0, 10);

  const t = (DAYS - i) / DAYS;  // 0 → 1 linear
  // Different curves per metric
  const linCurve  = t;
  const sCurve    = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const fastCurve = Math.pow(t, 0.7);

  const lerp = (a: number, b: number, c: number) => Math.round(a + (b - a) * c);

  rows.push({
    date,
    total:     jitter(lerp(START.total,     TARGET.total,     linCurve),  0.005),
    previewed: jitter(lerp(START.previewed, TARGET.previewed, fastCurve), 0.08),
    drafted:   jitter(lerp(START.drafted,   TARGET.drafted,   sCurve),    0.12),
    contacted: jitter(lerp(START.contacted, TARGET.contacted, sCurve),    0.12),
    replied:   jitter(lerp(START.replied,   TARGET.replied,   sCurve),    0.15),
    booked:    jitter(lerp(START.booked,    TARGET.booked,    sCurve),    0.20),
    closed:    jitter(lerp(START.closed,    TARGET.closed,    sCurve),    0.25),
  });
}

insert(rows);
console.log(`✅ Seeded ${rows.length} snapshots. Last row:`, rows[rows.length - 1]);
db.close();
