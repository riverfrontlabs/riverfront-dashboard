import { NextRequest, NextResponse } from 'next/server';
import { updateDraft } from '@/lib/api-client';

export async function POST(req: NextRequest) {
  try {
    const { id, emailSubject, emailBody, sms } = await req.json();
    const result = await updateDraft(id, { emailSubject, emailBody, sms });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
