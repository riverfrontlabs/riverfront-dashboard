import { NextRequest, NextResponse } from 'next/server';
import { generatePreview } from '@/lib/api-client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await generatePreview(parseInt(params.id));
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
