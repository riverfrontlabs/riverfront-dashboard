import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const lead = db.prepare('SELECT shortlisted FROM leads WHERE id = ?').get(Number(id)) as any;
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const next = lead.shortlisted ? 0 : 1;
  db.prepare('UPDATE leads SET shortlisted = ?, updated_at = datetime(\'now\') WHERE id = ?').run(next, Number(id));

  return NextResponse.json({ shortlisted: next });
}
