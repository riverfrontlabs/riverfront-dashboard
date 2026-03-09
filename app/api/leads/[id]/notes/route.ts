import { NextRequest, NextResponse } from 'next/server';
import { getNotes, addNote, deleteNote } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ notes: getNotes(Number(id)) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });
  const note = addNote(Number(id), content.trim());
  return NextResponse.json({ note });
}

export async function DELETE(req: NextRequest) {
  const { noteId } = await req.json();
  deleteNote(Number(noteId));
  return NextResponse.json({ ok: true });
}
