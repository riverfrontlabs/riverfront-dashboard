import { NextRequest, NextResponse } from 'next/server';
import { getSnapshots, recordSnapshot } from '@/lib/api-client';

export async function GET(req: NextRequest) {
  const days = parseInt(new URL(req.url).searchParams.get('days') ?? '30');
  const snapshots = await getSnapshots(Math.min(days, 365));
  return NextResponse.json({ snapshots });
}

export async function POST() {
  const snapshot = await recordSnapshot();
  return NextResponse.json({ snapshot });
}
