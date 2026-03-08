import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import twilio from 'twilio';
import { ensureColumns, updateLeadCells, colLetter } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID || 'placeholder',
    process.env.TWILIO_AUTH_TOKEN  || 'placeholder'
  );
  try {
    const { rowIndex, channel, email, phone, emailSubject, emailBody, sms } = await req.json();

    const headers = await ensureColumns(['Email Status', 'SMS Status']);
    const col: Record<string, number> = {};
    headers.forEach((h: string, i: number) => { col[h.trim()] = i; });

    const fromEmail  = process.env.FROM_EMAIL   || 'outreach@riverfront-labs.com';
    const fromName   = process.env.SENDER_NAME  || 'Jeremy';
    const fromPhone  = process.env.TWILIO_FROM  || '';
    const updates: Array<{ range: string; value: string }> = [];
    const result: Record<string, string> = {};

    // Send email
    if ((channel === 'email' || channel === 'both') && email && emailSubject) {
      try {
        await resend.emails.send({
          from: `${fromName} @ Riverfront Labs <${fromEmail}>`,
          to: [email],
          subject: emailSubject,
          text: emailBody,
        });
        updates.push({ range: `Sheet1!${colLetter(col['Email Status'])}${rowIndex}`, value: 'Sent' });
        result.email = 'sent';
      } catch (err: any) {
        updates.push({ range: `Sheet1!${colLetter(col['Email Status'])}${rowIndex}`, value: `Failed: ${err.message}` });
        result.email = `failed: ${err.message}`;
      }
    }

    // Send SMS
    if ((channel === 'sms' || channel === 'both') && phone && sms && fromPhone) {
      try {
        await twilioClient.messages.create({ body: sms, from: fromPhone, to: phone });
        updates.push({ range: `Sheet1!${colLetter(col['SMS Status'])}${rowIndex}`, value: 'Sent' });
        result.sms = 'sent';
      } catch (err: any) {
        updates.push({ range: `Sheet1!${colLetter(col['SMS Status'])}${rowIndex}`, value: `Failed: ${err.message}` });
        result.sms = `failed: ${err.message}`;
      }
    }

    if (updates.length) await updateLeadCells(updates);

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
