import { NextRequest, NextResponse } from 'next/server';
import { getLead, updateLead } from '@/lib/api-client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lead = await getLead(parseInt(params.id));
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json({ lead });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const lead = await updateLead(parseInt(params.id), body);
    return NextResponse.json({ lead });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
