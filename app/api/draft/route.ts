import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getLeads, ensureColumns, updateLeadCells, colLetter } from '@/lib/sheets';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DRAFT_COLS = ['Email Subject', 'Email Body', 'SMS', 'Email Status', 'SMS Status'];

export async function POST(req: NextRequest) {
  try {
    const { rowIndex, name, type, location, rating, score, previewUrl } = await req.json();

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

    // Write to sheet
    const headers = await ensureColumns(DRAFT_COLS);
    const col: Record<string, number> = {};
    headers.forEach((h: string, i: number) => { col[h.trim()] = i; });

    await updateLeadCells([
      { range: `Sheet1!${colLetter(col['Email Subject'])}${rowIndex}`, value: draft.emailSubject },
      { range: `Sheet1!${colLetter(col['Email Body'])}${rowIndex}`,    value: draft.emailBody    },
      { range: `Sheet1!${colLetter(col['SMS'])}${rowIndex}`,           value: draft.sms          },
      { range: `Sheet1!${colLetter(col['Email Status'])}${rowIndex}`,  value: 'Draft'            },
      { range: `Sheet1!${colLetter(col['SMS Status'])}${rowIndex}`,    value: 'Draft'            },
    ]);

    return NextResponse.json({ draft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
