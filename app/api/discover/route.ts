import { NextRequest } from 'next/server';
import { auth } from '@/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session?.accessToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  
  // Proxy the request to the backend API with auth token
  const response = await fetch(`${API_URL}/api/discover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  // Stream the response back to the client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
