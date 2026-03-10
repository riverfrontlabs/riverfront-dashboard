import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type { Lead, Note, ContactEvent, DailySnapshot } from './types';

// Helper to get auth headers - works both server and client side
async function getAuthHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Client-side: get token from session
  if (typeof window !== 'undefined') {
    const { getSession } = await import('next-auth/react');
    const session = await getSession();
    
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
  } else {
    // Server-side: use auth() from next-auth
    const { auth } = await import('@/auth');
    const session = await auth();
    
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
  }
  
  return headers;
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export async function getLeads(filters?: {
  status?: string;
  minScore?: number;
  noWebsite?: boolean;
  hasWebsite?: boolean;
  noPreview?: boolean;
  noDraft?: boolean;
  type?: string;
  location?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
  }
  
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/leads?${params}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const data = await res.json();
  return data.leads;
}

export async function getLead(id: number) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/leads/${id}`, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`API error: ${res.statusText}`);
  }
  const data = await res.json();
  return data.lead;
}

export async function updateLead(id: number, updates: any) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/leads/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const data = await res.json();
  return data.lead;
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function getNotes(leadId: number) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/leads/${leadId}/notes`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const data = await res.json();
  return data.notes;
}

export async function addNote(leadId: number, content: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/leads/${leadId}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const data = await res.json();
  return data.note;
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function getEvents(leadId: number) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/leads/${leadId}/events`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const data = await res.json();
  return data.events;
}

export async function addEvent(leadId: number, type: string, detail?: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/leads/${leadId}/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ type, detail }),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const data = await res.json();
  return data.event;
}

// ── Shortlist ─────────────────────────────────────────────────────────────────

export async function toggleShortlist(leadId: number) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/leads/${leadId}/shortlist`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const data = await res.json();
  return data.shortlisted;
}

// ── Generate ──────────────────────────────────────────────────────────────────

export async function generatePreview(leadId: number) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/generate/${leadId}`, {
    method: 'POST',
    headers,
    body: '{}', // Send empty JSON body to satisfy Fastify
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return await res.json();
}

// ── Draft ─────────────────────────────────────────────────────────────────────

export async function generateDraft(leadId: number) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/draft/${leadId}`, {
    method: 'POST',
    headers,
    body: '{}', // Send empty JSON body
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return await res.json();
}

export async function updateDraft(leadId: number, draft: {
  emailSubject?: string;
  emailBody?: string;
  sms?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/draft/update`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: leadId, ...draft }),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return await res.json();
}

// ── Send ──────────────────────────────────────────────────────────────────────

export async function sendOutreach(leadIds: number[], method: 'email' | 'sms' | 'both', dryRun = false) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ leadIds, method, dryRun }),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return await res.json();
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export async function getSnapshots(days = 30) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/snapshots?days=${days}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const data = await res.json();
  return data.snapshots;
}

export async function recordSnapshot() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/snapshots`, {
    method: 'POST',
    headers,
    body: '{}', // Send empty JSON body
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  const data = await res.json();
  return data.snapshot;
}

// ── Cities ────────────────────────────────────────────────────────────────────

export async function searchCities(query: string) {
  if (query.length < 2) return [];
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/cities?q=${encodeURIComponent(query)}`, { headers });
  if (!res.ok) return [];
  return await res.json();
}

// ── Discovery ─────────────────────────────────────────────────────────────────

export async function discoverLeads(params: {
  locations: string;
  types: string;
  limit: number;
}) {
  // Returns a fetch Response for server-sent events
  const headers = await getAuthHeaders();
  return fetch(`${API_URL}/api/discover`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
}
