import { NextRequest, NextResponse } from 'next/server';

const STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO',
  Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX',
  Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY',
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json([]);

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=10&addressdetails=1&countrycodes=us`;

  const res = await fetch(url, {
    headers: {
      'User-Agent':    'RiverfrontLabsDashboard/1.0 (contact@riverfront-labs.com)',
      'Accept':        'application/json',
      'Cache-Control': 'no-cache',
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) return NextResponse.json([]);

  const data: any[] = await res.json();

  const seen = new Set<string>();
  const cities: { label: string; value: string }[] = [];

  for (const item of data) {
    const addr  = item.address ?? {};
    const city  = addr.city || addr.town || addr.village || addr.municipality || item.name;
    const state = addr.state;
    if (!city || !state) continue;

    const abbr  = STATE_ABBR[state] ?? state;
    const value = `${city} ${abbr}`;
    const label = `${city}, ${abbr}`;

    if (!seen.has(value)) {
      seen.add(value);
      cities.push({ label, value });
    }
  }

  return NextResponse.json(cities.slice(0, 8));
}
