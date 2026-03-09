import { NextRequest, NextResponse } from 'next/server';
import { getSnapshots, recordSnapshot } from '@/lib/db';

export async function GET(req: NextRequest) {
  const days = parseInt(new URL(req.url).searchParams.get('days') ?? '30');
  // Cap at 365 days
  return NextResponse.json({ snapshots: getSnapshots(Math.min(days, 365)) });
}

export async function POST() {
  const snapshot = recordSnapshot();
  return NextResponse.json({ snapshot });
}
