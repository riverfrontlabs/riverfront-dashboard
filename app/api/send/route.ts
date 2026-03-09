import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import twilio from 'twilio';
import { updateLead, addEvent } from '@/lib/db';

export async function POST(req: NextRequest) {
  const resend       = new Resend(process.env.RESEND_API_KEY || 'placeholder');
  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID || 'placeholder',
    process.env.TWILIO_AUTH_TOKEN  || 'placeholder'
  );

  try {
    const { id, channel, email, phone, emailSubject, emailBody, sms } = await req.json();

    const fromEmail = process.env.FROM_EMAIL  || 'outreach@riverfront-labs.com';
    const fromName  = process.env.SENDER_NAME || 'Jeremy';
    const fromPhone = process.env.TWILIO_FROM || '';
    const result: Record<string, string> = {};

    if ((channel === 'email' || channel === 'both') && email && emailSubject) {
      try {
        await resend.emails.send({
          from:    `${fromName} @ Riverfront Labs <${fromEmail}>`,
          to:      [email],
          subject: emailSubject,
          text:    emailBody,
        });
        if (id) { updateLead(id, { emailStatus: 'Sent' }); addEvent(id, 'email_sent', email); }
        result.email = 'sent';
      } catch (err: any) {
        if (id) updateLead(id, { emailStatus: `Failed: ${err.message}` });
        result.email = `failed: ${err.message}`;
      }
    }

    if ((channel === 'sms' || channel === 'both') && phone && sms && fromPhone) {
      try {
        await twilioClient.messages.create({ body: sms, from: fromPhone, to: phone });
        if (id) { updateLead(id, { smsStatus: 'Sent' }); addEvent(id, 'sms_sent', phone); }
        result.sms = 'sent';
      } catch (err: any) {
        if (id) updateLead(id, { smsStatus: `Failed: ${err.message}` });
        result.sms = `failed: ${err.message}`;
      }
    }

    // Auto-advance status to 'contacted' if sent
    if (id && (result.email === 'sent' || result.sms === 'sent')) {
      updateLead(id, { status: 'contacted' });
    }

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
