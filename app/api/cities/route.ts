import { NextRequest, NextResponse } from 'next/server';
import { searchCities } from '@/lib/api-client';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const cities = await searchCities(q);
  return NextResponse.json(cities);
}
