import { NextRequest, NextResponse } from 'next/server';
import { ensureColumns, updateLeadCells, colLetter } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const { rowIndex, emailSubject, emailBody, sms } = await req.json();

    const headers = await ensureColumns(['Email Subject', 'Email Body', 'SMS']);
    const col: Record<string, number> = {};
    headers.forEach((h: string, i: number) => { col[h.trim()] = i; });

    const updates: Array<{ range: string; value: string }> = [];
    if (emailSubject !== undefined) updates.push({ range: `Sheet1!${colLetter(col['Email Subject'])}${rowIndex}`, value: emailSubject });
    if (emailBody    !== undefined) updates.push({ range: `Sheet1!${colLetter(col['Email Body'])}${rowIndex}`,    value: emailBody    });
    if (sms          !== undefined) updates.push({ range: `Sheet1!${colLetter(col['SMS'])}${rowIndex}`,           value: sms          });

    await updateLeadCells(updates);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
