import Database from 'better-sqlite3';
import path from 'path';
export type { Lead, Note, ContactEvent, DailySnapshot } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'crm.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  // Ensure directory exists
  const fs = require('fs');
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      phone        TEXT,
      email        TEXT,
      address      TEXT,
      website      TEXT,
      rating       TEXT,
      reviews      TEXT,
      type         TEXT,
      location     TEXT,
      score        INTEGER DEFAULT 0,
      place_id     TEXT    UNIQUE,
      preview_url  TEXT,
      email_subject TEXT,
      email_body   TEXT,
      sms          TEXT,
      email_status TEXT,
      sms_status   TEXT,
      status       TEXT    DEFAULT 'new',
      created_at   TEXT    DEFAULT (datetime('now')),
      updated_at   TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      content    TEXT    NOT NULL,
      created_at TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      type       TEXT    NOT NULL,
      detail     TEXT,
      created_at TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_snapshots (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      date      TEXT    UNIQUE NOT NULL,
      total     INTEGER DEFAULT 0,
      previewed INTEGER DEFAULT 0,
      drafted   INTEGER DEFAULT 0,
      contacted INTEGER DEFAULT 0,
      replied   INTEGER DEFAULT 0,
      booked    INTEGER DEFAULT 0,
      closed    INTEGER DEFAULT 0,
      created_at TEXT   DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_leads_type     ON leads(type);
    CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(location);
    CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_score    ON leads(score);
    CREATE INDEX IF NOT EXISTS idx_notes_lead     ON notes(lead_id);
    CREATE INDEX IF NOT EXISTS idx_events_lead    ON contact_events(lead_id);
  `);
}

import type { Lead, Note, ContactEvent, DailySnapshot } from './types';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapLead(row: any): Lead {
  return {
    id:           row.id,
    name:         row.name,
    phone:        row.phone,
    email:        row.email,
    address:      row.address,
    website:      row.website,
    rating:       row.rating,
    reviews:      row.reviews,
    type:         row.type,
    location:     row.location,
    score:        row.score,
    placeId:      row.place_id,
    previewUrl:   row.preview_url,
    emailSubject: row.email_subject,
    emailBody:    row.email_body,
    sms:          row.sms,
    emailStatus:  row.email_status,
    smsStatus:    row.sms_status,
    status:       row.status,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

function mapNote(row: any): Note {
  return { id: row.id, leadId: row.lead_id, content: row.content, createdAt: row.created_at };
}

function mapEvent(row: any): ContactEvent {
  return { id: row.id, leadId: row.lead_id, type: row.type, detail: row.detail, createdAt: row.created_at };
}

// ─── Lead queries ─────────────────────────────────────────────────────────────

export function getLeads(): Lead[] {
  return (getDb().prepare('SELECT * FROM leads ORDER BY score DESC').all() as any[]).map(mapLead);
}

export function getLead(id: number): Lead | null {
  const row = getDb().prepare('SELECT * FROM leads WHERE id = ?').get(id) as any;
  return row ? mapLead(row) : null;
}

export function upsertLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead {
  const db = getDb();
  const existing = data.placeId
    ? (db.prepare('SELECT id FROM leads WHERE place_id = ?').get(data.placeId) as any)
    : null;

  if (existing) {
    db.prepare(`UPDATE leads SET
      name=@name, phone=@phone, email=@email, address=@address, website=@website,
      rating=@rating, reviews=@reviews, type=@type, location=@location, score=@score,
      preview_url=@previewUrl, email_subject=@emailSubject, email_body=@emailBody, sms=@sms,
      email_status=@emailStatus, sms_status=@smsStatus, status=@status,
      updated_at=datetime('now')
      WHERE id=@id
    `).run({ ...data, id: existing.id });
    return mapLead(db.prepare('SELECT * FROM leads WHERE id = ?').get(existing.id));
  } else {
    const info = db.prepare(`INSERT INTO leads
      (name,phone,email,address,website,rating,reviews,type,location,score,place_id,
       preview_url,email_subject,email_body,sms,email_status,sms_status,status)
      VALUES
      (@name,@phone,@email,@address,@website,@rating,@reviews,@type,@location,@score,@placeId,
       @previewUrl,@emailSubject,@emailBody,@sms,@emailStatus,@smsStatus,@status)
    `).run(data);
    return mapLead(db.prepare('SELECT * FROM leads WHERE id = ?').get(info.lastInsertRowid));
  }
}

export function updateLead(id: number, data: Partial<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>>): Lead | null {
  const db    = getDb();
  const allow = ['name','phone','email','address','website','rating','reviews','type','location',
                 'score','previewUrl','emailSubject','emailBody','sms','emailStatus','smsStatus','status'] as const;
  const colMap: Record<string, string> = {
    previewUrl: 'preview_url', emailSubject: 'email_subject', emailBody: 'email_body',
    sms: 'sms', emailStatus: 'email_status', smsStatus: 'sms_status', placeId: 'place_id',
  };
  const sets = Object.keys(data)
    .filter(k => allow.includes(k as any))
    .map(k => `${colMap[k] ?? k} = @${k}`);
  if (!sets.length) return getLead(id);
  sets.push(`updated_at = datetime('now')`);
  db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = @id`).run({ ...data, id });
  return getLead(id);
}

export function deleteLead(id: number): void {
  getDb().prepare('DELETE FROM leads WHERE id = ?').run(id);
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function getNotes(leadId: number): Note[] {
  return (getDb().prepare('SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC').all(leadId) as any[]).map(mapNote);
}

export function addNote(leadId: number, content: string): Note {
  const db   = getDb();
  const info = db.prepare('INSERT INTO notes (lead_id, content) VALUES (?, ?)').run(leadId, content);
  return mapNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid));
}

export function deleteNote(id: number): void {
  getDb().prepare('DELETE FROM notes WHERE id = ?').run(id);
}

// ─── Contact events ───────────────────────────────────────────────────────────

export function getEvents(leadId: number): ContactEvent[] {
  return (getDb().prepare('SELECT * FROM contact_events WHERE lead_id = ? ORDER BY created_at DESC').all(leadId) as any[]).map(mapEvent);
}

export function addEvent(leadId: number, type: string, detail?: string): ContactEvent {
  const db   = getDb();
  const info = db.prepare('INSERT INTO contact_events (lead_id, type, detail) VALUES (?, ?, ?)').run(leadId, type, detail ?? null);
  return mapEvent(db.prepare('SELECT * FROM contact_events WHERE id = ?').get(info.lastInsertRowid));
}

// ─── Daily snapshots ─────────────────────────────────────────────────────────

export function recordSnapshot(): DailySnapshot {
  const db   = getDb();
  const date = new Date().toISOString().slice(0, 10);
  const row  = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN preview_url IS NOT NULL THEN 1 ELSE 0 END) as previewed,
      SUM(CASE WHEN email_subject IS NOT NULL THEN 1 ELSE 0 END) as drafted,
      SUM(CASE WHEN status IN ('contacted','replied','booked','closed') THEN 1 ELSE 0 END) as contacted,
      SUM(CASE WHEN status IN ('replied','booked','closed') THEN 1 ELSE 0 END) as replied,
      SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END) as booked,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed
    FROM leads
  `).get() as any;

  db.prepare(`
    INSERT INTO daily_snapshots (date,total,previewed,drafted,contacted,replied,booked,closed)
    VALUES (@date,@total,@previewed,@drafted,@contacted,@replied,@booked,@closed)
    ON CONFLICT(date) DO UPDATE SET
      total=@total, previewed=@previewed, drafted=@drafted, contacted=@contacted,
      replied=@replied, booked=@booked, closed=@closed
  `).run({ date, ...row });

  return db.prepare('SELECT * FROM daily_snapshots WHERE date = ?').get(date) as DailySnapshot;
}

export function getSnapshots(days = 30): DailySnapshot[] {
  return getDb().prepare(
    'SELECT * FROM daily_snapshots ORDER BY date ASC LIMIT ?'
  ).all(days) as DailySnapshot[];
}
