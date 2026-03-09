import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { updateLead, addEvent } from '@/lib/db';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const lead = await req.json();
    const { id, name, type, location, rating, score, previewUrl } = lead;

    if (!previewUrl) return NextResponse.json({ error: 'No preview URL' }, { status: 400 });

    const senderName  = process.env.SENDER_NAME  || 'Jeremy';
    const companyName = process.env.COMPANY_NAME || 'Riverfront Labs';
    const senderPhone = process.env.SENDER_PHONE || '';

    const prompt = `You are writing a short, personal cold outreach email and text message for a web design agency.

Business: ${name}
Type: ${type}
Location: ${location}
Google Rating: ${rating} stars
Website Score: ${score}/10
Preview URL: ${previewUrl}

Sender: ${senderName} from ${companyName}

Write TWO things:

1. EMAIL — subject line + body. Rules:
   - Subject: short, curious, not spammy. Reference their business name.
   - Body: 4-6 sentences. Mention we noticed their site could use work. Say we built a free preview. Include the preview URL on its own line. Soft CTA. Sign off with ${senderName}, ${companyName}${senderPhone ? `, ${senderPhone}` : ''}.
   - Tone: friendly, direct, human.

2. SMS — under 160 characters. Mention the business name, free website preview, include the URL. End with "- ${senderName} @ ${companyName}".

Reply ONLY with valid JSON: { "emailSubject": "...", "emailBody": "...", "sms": "..." }`;

    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = res.choices[0].message.content?.trim() || '';
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error('No JSON in AI response');
    const draft = JSON.parse(json);

    if (!draft.emailBody.includes(previewUrl)) draft.emailBody += `\n\n${previewUrl}`;

    if (id) {
      updateLead(id, {
        emailSubject: draft.emailSubject,
        emailBody:    draft.emailBody,
        sms:          draft.sms,
        emailStatus:  'Draft',
        smsStatus:    'Draft',
      });
      addEvent(id, 'draft_created');
    }

    return NextResponse.json({ draft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
