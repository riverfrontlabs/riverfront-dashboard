import { NextRequest, NextResponse } from 'next/server';
import { getLead, updateLead, deleteLead, getNotes, getEvents } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = getLead(Number(id));
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const notes  = getNotes(Number(id));
  const events = getEvents(Number(id));
  return NextResponse.json({ lead, notes, events });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body    = await req.json();
    const updated = updateLead(Number(id), body);
    return NextResponse.json({ lead: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    deleteLead(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
