import { NextRequest, NextResponse } from 'next/server';
import { getEvents, addEvent } from '@/lib/api-client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const events = await getEvents(parseInt(params.id));
    return NextResponse.json({ events });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { type, detail } = await req.json();
    const event = await addEvent(parseInt(params.id), type, detail);
    return NextResponse.json({ event });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
