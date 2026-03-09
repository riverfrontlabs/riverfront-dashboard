import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env.local') });
import { google } from 'googleapis';
import { upsertLead } from '../lib/db.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('\n📋 Migrating Google Sheets → SQLite CRM...\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../../lead-pipeline/credentials.json'),
    scopes:  ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'Sheet1',
  });

  const [rawHeaders, ...rows] = res.data.values ?? [[]];
  const col: Record<string, number> = {};
  rawHeaders.forEach((h: string, i: number) => { col[h.trim()] = i; });
  const g = (row: string[], key: string): string | null => row[col[key]]?.trim() || null;

  let inserted = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const name = g(row, 'Business Name');
    if (!name) { skipped++; continue; }

    try {
      upsertLead({
        name,
        phone:        g(row, 'Phone'),
        email:        g(row, 'Email'),
        address:      g(row, 'Address'),
        website:      g(row, 'Website'),
        rating:       g(row, 'Rating'),
        reviews:      g(row, 'Reviews'),
        type:         g(row, 'Type'),
        location:     g(row, 'Location'),
        score:        parseInt(g(row, 'Lead Score') ?? '0') || 0,
        placeId:      g(row, 'Place ID'),
        previewUrl:   g(row, 'Preview URL'),
        emailSubject: g(row, 'Email Subject'),
        emailBody:    g(row, 'Email Body'),
        sms:          g(row, 'SMS'),
        emailStatus:  g(row, 'Email Status'),
        smsStatus:    g(row, 'SMS Status'),
        status:       'new',
      });
      inserted++;
      if (inserted % 200 === 0) process.stdout.write(`  ${inserted} imported...\r`);
    } catch (err: any) {
      failed++;
      if (failed < 5) console.error(`  ❌ ${name}: ${err.message}`);
    }
  }

  console.log(`\n✅ Done: ${inserted} imported, ${skipped} skipped, ${failed} failed\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
