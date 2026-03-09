import { NextRequest, NextResponse } from 'next/server';
import { updateLead } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { id, emailSubject, emailBody, sms } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    updateLead(id, { emailSubject, emailBody, sms });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
