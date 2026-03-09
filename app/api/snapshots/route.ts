import { NextRequest, NextResponse } from 'next/server';
import { getSnapshots, recordSnapshot } from '@/lib/db';

export async function GET(req: NextRequest) {
  const days = parseInt(new URL(req.url).searchParams.get('days') ?? '30');
  return NextResponse.json({ snapshots: getSnapshots(days) });
}

export async function POST() {
  const snapshot = recordSnapshot();
  return NextResponse.json({ snapshot });
}
