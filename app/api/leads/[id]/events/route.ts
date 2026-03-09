import { NextRequest, NextResponse } from 'next/server';
import { getEvents, addEvent } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ events: getEvents(Number(id)) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id }   = await params;
  const { type, detail } = await req.json();
  const event = addEvent(Number(id), type, detail);
  return NextResponse.json({ event });
}
