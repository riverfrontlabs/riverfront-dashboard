import { NextRequest, NextResponse } from 'next/server';
import { toggleShortlist } from '@/lib/api-client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const shortlisted = await toggleShortlist(parseInt(params.id));
    return NextResponse.json({ shortlisted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
