import { NextRequest, NextResponse } from 'next/server';
import { generateDraft } from '@/lib/api-client';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    const result = await generateDraft(id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
