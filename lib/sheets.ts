import { google } from 'googleapis';
import path from 'path';

const CREDENTIALS_PATH = path.join(process.cwd(), '..', 'lead-pipeline', 'credentials.json');

export interface Lead {
  rowIndex: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  rating: string;
  reviews: string;
  type: string;
  location: string;
  score: number;
  status: string;
  placeId: string;
  previewUrl: string;
  emailSubject: string;
  emailBody: string;
  sms: string;
  emailStatus: string;
  smsStatus: string;
}

async function getClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function getLeads(): Promise<{ leads: Lead[]; headers: string[] }> {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'Sheet1',
  });

  const [rawHeaders, ...rows] = res.data.values ?? [[]];
  if (!rawHeaders) return { leads: [], headers: [] };

  const col: Record<string, number> = {};
  rawHeaders.forEach((h: string, i: number) => { col[h.trim()] = i; });

  const g = (row: string[], key: string) => row[col[key]] || '';

  const leads: Lead[] = rows
    .map((row: string[], i: number) => ({
      rowIndex:     i + 2,
      name:         g(row, 'Business Name'),
      phone:        g(row, 'Phone'),
      email:        g(row, 'Email'),
      address:      g(row, 'Address'),
      website:      g(row, 'Website'),
      rating:       g(row, 'Rating'),
      reviews:      g(row, 'Reviews'),
      type:         g(row, 'Type'),
      location:     g(row, 'Location'),
      score:        parseInt(g(row, 'Lead Score')) || 0,
      status:       g(row, 'Status'),
      placeId:      g(row, 'Place ID'),
      previewUrl:   g(row, 'Preview URL'),
      emailSubject: g(row, 'Email Subject'),
      emailBody:    g(row, 'Email Body'),
      sms:          g(row, 'SMS'),
      emailStatus:  g(row, 'Email Status'),
      smsStatus:    g(row, 'SMS Status'),
    }))
    .filter((l: Lead) => l.name);

  return { leads, headers: rawHeaders };
}

export async function updateLeadCells(
  updates: Array<{ range: string; value: string }>
) {
  const sheets = await getClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates.map(u => ({ range: u.range, values: [[u.value]] })),
    },
  });
}

export async function getHeaders(): Promise<string[]> {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'Sheet1!1:1',
  });
  return res.data.values?.[0] ?? [];
}

export async function ensureColumns(extraCols: string[]): Promise<string[]> {
  const headers = await getHeaders();
  const missing = extraCols.filter(c => !headers.includes(c));
  if (!missing.length) return headers;
  const updated = [...headers, ...missing];
  const sheets = await getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [updated] },
  });
  return updated;
}

export function colLetter(i: number) {
  return String.fromCharCode(65 + i);
}
