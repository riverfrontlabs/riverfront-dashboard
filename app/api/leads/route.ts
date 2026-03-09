import { NextResponse } from 'next/server';
import { getLeads } from '@/lib/db';

export async function GET() {
  try {
    const leads = getLeads();
    return NextResponse.json({ leads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
