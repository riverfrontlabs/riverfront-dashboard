import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'not set',
      authSecretSet: !!process.env.AUTH_SECRET,
      nodeEnv: process.env.NODE_ENV,
    }
  });
}
