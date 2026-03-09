import { NextRequest, NextResponse } from 'next/server';
import { sendOutreach } from '@/lib/api-client';

export async function POST(req: NextRequest) {
  try {
    const { leadIds, method, dryRun } = await req.json();
    const result = await sendOutreach(leadIds, method, dryRun);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
