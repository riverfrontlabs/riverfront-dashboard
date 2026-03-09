import { NextRequest, NextResponse } from 'next/server';
import { getLead, updateLead, addEvent } from '@/lib/db';
import OpenAI from 'openai';
import { writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PREVIEW_BASE_URL = process.env.PREVIEW_BASE_URL || 'https://preview.riverfront-labs.com';
const OUTPUT_DIR       = process.env.PREVIEW_OUTPUT_DIR || path.join(process.cwd(), '..', 'templates', 'bold-contractor-template', 'public');

const FALLBACK_PHOTOS: Record<string, string> = {
  plumber:          'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=80',
  electrician:      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
  general_contractor:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
  auto_repair:      'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=1200&q=80',
  car_repair:       'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=1200&q=80',
  hair_care:        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80',
  spa:              'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80',
  dentist:          'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=1200&q=80',
  restaurant:       'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
  cafe:             'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80',
  gym:              'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80',
  default:          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
};

const TEMPLATE_MAP: Record<string, string[]> = {
  contractor:     ['plumber','electrician','general_contractor','roofing','hvac','handyman','locksmith','painter','landscaper'],
  automotive:     ['auto_repair','car_repair','mechanic','tire','auto_body','towing'],
  beauty:         ['hair_care','beauty_salon','nail_salon','spa','barber','waxing','skincare','lash','tanning','tattoo'],
  health:         ['dentist','doctor','chiropractor','physical_therapy','optometrist','urgent_care','orthodontist'],
  restaurant:     ['restaurant','cafe','bar','bakery','food','pizza','barbecue','diner','brewery','catering'],
  musician:       ['musician','band','artist','dj','singer','performer','entertainment'],
  'local-business':['gym','fitness','yoga','pilates','accountant','insurance','real_estate','pet_grooming','veterinarian','photography'],
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function pickTemplate(type: string | null): string {
  if (!type) return 'local-business';
  for (const [tmpl, industries] of Object.entries(TEMPLATE_MAP)) {
    if (industries.includes(type)) return tmpl;
  }
  return 'local-business';
}

async function getPlacesPhoto(placeId: string): Promise<string | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    const res  = await fetch(url);
    const data = await res.json() as any;
    const ref  = data.result?.photos?.[0]?.photo_reference;
    if (!ref) return null;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${ref}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
  } catch { return null; }
}

async function generateCopy(lead: any) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Write website copy for a local business. Reply ONLY with valid JSON.

Business: ${lead.name}
Type: ${lead.type}
Location: ${lead.location}
Rating: ${lead.rating} stars
Phone: ${lead.phone}
Address: ${lead.address}

Return: { "tagline": "6-8 word punchy headline mentioning city or trade", "description": "2 warm specific sentences mentioning location", "services": ["service1","service2","service3","service4","service5","service6"] }`,
    }],
  });
  const text = res.choices[0].message.content?.trim() || '';
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('No JSON from AI');
  return JSON.parse(json);
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead   = getLead(Number(id));
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  try {
    // 1. Hero image
    let heroImage: string | null = null;
    if (lead.placeId) heroImage = await getPlacesPhoto(lead.placeId);
    if (!heroImage)   heroImage = FALLBACK_PHOTOS[lead.type ?? 'default'] ?? FALLBACK_PHOTOS.default;

    // 2. AI copy
    const copy = await generateCopy(lead);

    // 3. Build data payload
    const templateId = pickTemplate(lead.type);
    const slug       = slugify(lead.name);
    const data = {
      templateId,
      businessName: lead.name,
      tagline:      copy.tagline,
      description:  copy.description,
      services:     copy.services,
      phone:        lead.phone,
      address:      lead.address,
      rating:       parseFloat(lead.rating ?? '5') || 5.0,
      reviewCount:  0,
      heroImage,
      primaryColor: null,
    };

    // 4. Write JSON to preview template repo
    const dataDir  = path.join(OUTPUT_DIR, 'data');
    const repoRoot = OUTPUT_DIR.replace(/[/\\]public$/, ''); // one level up from /public
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(path.join(dataDir, `${slug}.json`), JSON.stringify(data, null, 2));

    // 5. Git commit + push so Netlify deploys
    try {
      execSync(`git add public/data/${slug}.json`, { cwd: repoRoot, stdio: 'pipe' });
      execSync(`git commit -m "preview: ${lead.name} (${lead.location})"`, { cwd: repoRoot, stdio: 'pipe' });
      execSync(`git push`, { cwd: repoRoot, stdio: 'pipe' });
    } catch (gitErr: any) {
      const msg = gitErr.stderr?.toString() || gitErr.message;
      // "nothing to commit" is fine — slug already exists
      if (!msg.includes('nothing to commit')) {
        console.error('Git error:', msg);
        throw new Error(`Git push failed: ${msg}`);
      }
    }

    // 6. Update DB
    const previewUrl = `${PREVIEW_BASE_URL}/${slug}`;
    updateLead(Number(id), { previewUrl });
    addEvent(Number(id), 'preview_generated', slug);

    return NextResponse.json({ previewUrl, slug, templateId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
