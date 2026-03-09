import { NextRequest, NextResponse } from 'next/server';
import { getEvents, addEvent } from '@/lib/api-client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const events = await getEvents(parseInt(id));
    return NextResponse.json({ events });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { type, detail } = await req.json();
    const event = await addEvent(parseInt(id), type, detail);
    return NextResponse.json({ event });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
