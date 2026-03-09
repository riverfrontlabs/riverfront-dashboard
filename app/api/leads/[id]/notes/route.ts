import { NextRequest, NextResponse } from 'next/server';
import { getNotes, addNote } from '@/lib/api-client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const notes = await getNotes(parseInt(id));
    return NextResponse.json({ notes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { content } = await req.json();
    const note = await addNote(parseInt(id), content);
    return NextResponse.json({ note });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
