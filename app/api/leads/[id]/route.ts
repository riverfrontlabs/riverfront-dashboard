import { NextRequest, NextResponse } from 'next/server';
import { getLead, updateLead } from '@/lib/api-client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await getLead(parseInt(id));
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json({ lead });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const lead = await updateLead(parseInt(id), body);
    return NextResponse.json({ lead });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
