import { NextRequest, NextResponse } from 'next/server';
import { getNotes, addNote } from '@/lib/api-client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const notes = await getNotes(parseInt(params.id));
    return NextResponse.json({ notes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { content } = await req.json();
    const note = await addNote(parseInt(params.id), content);
    return NextResponse.json({ note });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
