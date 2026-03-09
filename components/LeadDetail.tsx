'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Lead, Note, ContactEvent } from '@/lib/types';

const STATUSES = ['new', 'contacted', 'replied', 'booked', 'closed', 'dead'] as const;

const statusColors: Record<string, string> = {
  new:       'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  contacted: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  replied:   'bg-violet-500/15 text-violet-400 border-violet-500/30',
  booked:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  closed:    'bg-green-500/15 text-green-400 border-green-500/30',
  dead:      'bg-red-500/15 text-red-400 border-red-500/30',
};

const sendStatusColor = (s: string) => {
  if (s === 'Sent')            return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (s === 'Draft')           return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  if (s?.startsWith('Failed')) return 'bg-red-500/15 text-red-400 border-red-500/30';
  return '';
};

const EVENT_ICONS: Record<string, string> = {
  email_sent:    '📧', sms_sent:      '💬', email_opened: '👁️',
  replied:       '↩️',  called:        '📞', booked:      '📅',
  closed:        '✅',  draft_created: '✍️',  note:        '📝',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface Props {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: (lead: Lead) => void;
  onDelete: (id: number) => void;
}

type Tab = 'outreach' | 'notes' | 'history';

export default function LeadDetail({ lead, onClose, onUpdate, onDelete }: Props) {
  const [tab,          setTab]          = useState<Tab>('outreach');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody,    setEmailBody]    = useState('');
  const [sms,          setSms]          = useState('');
  const [notes,        setNotes]        = useState<Note[]>([]);
  const [events,       setEvents]       = useState<ContactEvent[]>([]);
  const [newNote,      setNewNote]      = useState('');
  const [drafting,     setDrafting]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [sending,      setSending]      = useState<string | null>(null);
  const [generating,   setGenerating]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [confirmDel,   setConfirmDel]   = useState(false);
  const [toast,        setToast]        = useState('');
  const [iframeView,   setIframeView]   = useState<'preview' | 'existing'>('preview');
  const [iframeExpanded, setIframeExpanded] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setEmailSubject(lead.emailSubject || '');
    setEmailBody(lead.emailBody || '');
    setSms(lead.sms || '');
    setTab('outreach');
    setConfirmDel(false);
    const _hasPreview = !!lead.previewUrl?.trim();
    const _hasWebsite = !!lead.website?.trim();
    setIframeView(_hasPreview ? 'preview' : _hasWebsite ? 'existing' : 'preview');
    // Load notes + events
    fetch(`/api/leads/${lead.id}/notes`).then(r => r.json()).then(d => setNotes(d.notes || []));
    fetch(`/api/leads/${lead.id}/events`).then(r => r.json()).then(d => setEvents(d.events || []));
  }, [lead?.id]);

  if (!lead) return null;

  const BOGUS = new Set(['none', 'n/a', 'na', '-', '--', 'no website', 'no site', 'unknown']);
  const hasWebsite = !!lead.website?.trim() && !BOGUS.has(lead.website.trim().toLowerCase());
  const hasPreview = !!lead.previewUrl?.trim();

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const generateDraft = async () => {
    setDrafting(true);
    try {
      const res  = await fetch('/api/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmailSubject(data.draft.emailSubject);
      setEmailBody(data.draft.emailBody);
      setSms(data.draft.sms);
      onUpdate({ ...lead, emailSubject: data.draft.emailSubject, emailBody: data.draft.emailBody, sms: data.draft.sms, emailStatus: 'Draft', smsStatus: 'Draft' });
      flash('✅ Draft generated');
    } catch (e: any) { flash(`❌ ${e.message}`); }
    setDrafting(false);
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await fetch('/api/update-draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: lead.id, emailSubject, emailBody, sms }) });
      onUpdate({ ...lead, emailSubject, emailBody, sms });
      flash('✅ Saved');
    } catch (e: any) { flash(`❌ ${e.message}`); }
    setSaving(false);
  };

  const send = async (channel: 'email' | 'sms' | 'both') => {
    setSending(channel);
    try {
      const res  = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...lead, channel, emailSubject, emailBody, sms }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const updated = { ...lead };
      if (data.result.email === 'sent') { updated.emailStatus = 'Sent'; updated.status = 'contacted'; }
      if (data.result.sms   === 'sent') { updated.smsStatus   = 'Sent'; updated.status = 'contacted'; }
      onUpdate(updated);
      // Refresh events
      fetch(`/api/leads/${lead.id}/events`).then(r => r.json()).then(d => setEvents(d.events || []));
      flash(`✅ Sent via ${channel}`);
    } catch (e: any) { flash(`❌ ${e.message}`); }
    setSending(null);
  };

  const setStatus = async (status: string) => {
    const res  = await fetch(`/api/leads/${lead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (data.lead) { onUpdate(data.lead); flash(`✅ Status → ${status}`); }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const res  = await fetch(`/api/leads/${lead.id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newNote }) });
    const data = await res.json();
    if (data.note) { setNotes(prev => [data.note, ...prev]); setNewNote(''); flash('✅ Note saved'); }
  };

  const removeNote = async (noteId: number) => {
    await fetch(`/api/leads/${lead.id}/notes`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noteId }) });
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const deleteLead = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
    onDelete(lead.id);
    onClose();
  };

  const generatePreview = async () => {
    setGenerating(true);
    try {
      const res  = await fetch(`/api/leads/${lead.id}/generate`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onUpdate({ ...lead, previewUrl: data.previewUrl });
      setIframeView('preview');
      // Refresh events
      fetch(`/api/leads/${lead.id}/events`).then(r => r.json()).then(d => setEvents(d.events || []));
      flash(`✅ Preview generated → ${data.templateId} template`);
    } catch (e: any) { flash(`❌ ${e.message}`); }
    setGenerating(false);
  };

  const hasDraft = emailSubject || emailBody || sms;

  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="w-[93vw] max-w-[93vw] max-h-[90vh] overflow-y-auto bg-card border-border">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-[100] bg-card border border-border px-4 py-2 rounded text-sm text-foreground shadow-xl">
            {toast}
          </div>
        )}

        <DialogHeader>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl font-bold text-foreground">{lead.name}</DialogTitle>
              <button
                onClick={async () => {
                  const res  = await fetch(`/api/leads/${lead.id}/shortlist`, { method: 'POST' });
                  const data = await res.json();
                  onUpdate({ ...lead, shortlisted: data.shortlisted });
                }}
                className={`text-xl leading-none transition-all ${lead.shortlisted ? 'opacity-100' : 'opacity-25 hover:opacity-70'}`}
                title={lead.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
              >⭐</button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{lead.type} · {lead.location}</span>
              {/* Status picker + delete inline */}
              <div className="flex gap-1 flex-wrap items-center">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`text-xs px-2 py-0.5 rounded border capitalize transition-all ${lead.status === s ? statusColors[s] : 'border-transparent text-muted-foreground/50 hover:text-muted-foreground'}`}
                  >
                    {s}
                  </button>
                ))}
                <span className="text-muted-foreground/30 text-xs select-none">·</span>
                {confirmDel ? (
                  <>
                    <button
                      onClick={deleteLead}
                      disabled={deleting}
                      className="text-xs px-2 py-0.5 rounded border bg-red-500/20 border-red-500/50 text-red-400 transition-colors flex items-center gap-1"
                    >
                      <span>✕</span>
                      {deleting ? 'deleting...' : 'confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDel(false)}
                      className="text-xs px-2 py-0.5 rounded border border-blue-400/40 text-blue-400 hover:bg-blue-400/10 transition-colors flex items-center gap-1"
                    >
                      <span>←</span> cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDel(true)}
                    className="text-xs px-2 py-0.5 rounded border border-transparent text-red-700 hover:text-red-400 hover:border-red-500/40 transition-colors"
                  >
                    🗑 delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_380px] gap-6 mt-2">
          {/* Left — info */}
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
              {[
                ['Phone',   lead.phone || '—'],
                ['Email',   lead.email || '—'],
                ['Address', lead.address || '—'],
                ['Rating',  lead.rating ? `${lead.rating} ★` : '—'],
                ['Priority', lead.score >= 10 ? `🔥 Hot (${lead.score})` : lead.score >= 7 ? `🟠 Warm (${lead.score})` : lead.score >= 4 ? `🟡 Cool (${lead.score})` : `🔵 Cold (${lead.score})`],
                ['Website', lead.website || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-muted-foreground w-16 shrink-0 text-xs">{label}</span>
                  <span className="text-foreground text-xs break-all">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {lead.previewUrl && (
                <a href={lead.previewUrl} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30 cursor-pointer hover:bg-blue-500/25 text-xs">🔗 Preview</Badge>
                </a>
              )}
              {hasWebsite && (
                <a href={lead.website!.startsWith('http') ? lead.website! : `https://${lead.website}`} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30 cursor-pointer hover:bg-zinc-500/25 text-xs">🌐 Current site</Badge>
                </a>
              )}
              {lead.emailStatus && <Badge variant="outline" className={`text-xs ${sendStatusColor(lead.emailStatus)}`}>📧 {lead.emailStatus}</Badge>}
              {lead.smsStatus   && <Badge variant="outline" className={`text-xs ${sendStatusColor(lead.smsStatus)}`}>💬 {lead.smsStatus}</Badge>}
            </div>

            {/* Generate preview button */}
            <Button
              size="sm"
              variant="outline"
              onClick={generatePreview}
              disabled={generating}
              className="w-full text-xs"
            >
              {generating ? '⏳ Generating preview...' : lead.previewUrl ? '🔄 Regenerate Preview' : '🚀 Generate Preview'}
            </Button>

            {/* Expanded iframe modal */}
            {iframeExpanded && (hasPreview || hasWebsite) && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setIframeExpanded(false)}>
                <div className="relative w-[90%] h-[90%] rounded-xl overflow-hidden border border-border shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                  {/* Chrome */}
                  <div className="bg-card px-4 py-2 flex items-center gap-3 border-b border-border shrink-0">
                    <div className="flex gap-1.5 shrink-0">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {iframeView === 'preview' ? lead.previewUrl : lead.website}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasPreview && hasWebsite && (
                        <div className="flex border border-border/60 rounded overflow-hidden">
                          <button onClick={() => setIframeView('preview')} className={`text-xs px-2.5 py-1 transition-colors ${iframeView === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Preview</button>
                          <button onClick={() => setIframeView('existing')} className={`text-xs px-2.5 py-1 transition-colors ${iframeView === 'existing' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Current site</button>
                        </div>
                      )}
                      <a
                        href={(iframeView === "preview" ? lead.previewUrl : lead.website)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/60 rounded px-2 py-0.5"
                      >↗ Open</a>
                      <button onClick={() => setIframeExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/60 rounded px-2 py-0.5">✕ Close</button>
                    </div>
                  </div>
                  {/* Full iframe */}
                  {iframeView === 'preview' && lead.previewUrl ? (
                    <iframe src={lead.previewUrl!} className="w-full flex-1 border-0 bg-white" title={`${lead.name} preview`} />
                  ) : (
                    <iframe src={lead.website!} className="w-full flex-1 border-0 bg-white" title={`${lead.name} current site`} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Middle — tabs */}
          <div className="space-y-4 min-w-0">
            {/* Tab bar */}
            <div className="flex border-b border-border">
              {(['outreach', 'notes', 'history'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {t}
                  {t === 'notes'   && notes.length   > 0 && <span className="ml-1.5 text-xs bg-secondary rounded-full px-1.5">{notes.length}</span>}
                  {t === 'history' && events.length  > 0 && <span className="ml-1.5 text-xs bg-secondary rounded-full px-1.5">{events.length}</span>}
                </button>
              ))}
            </div>

            {/* Outreach tab */}
            {tab === 'outreach' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Email & SMS Draft</h3>
                  <Button size="sm" variant="outline" onClick={generateDraft} disabled={drafting || !lead.previewUrl} className="text-xs">
                    {drafting ? '⏳ Generating...' : hasDraft ? '🔄 Regenerate' : '✨ Generate Draft'}
                  </Button>
                </div>

                {hasDraft ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground uppercase tracking-widest">Subject</label>
                      <input className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground uppercase tracking-widest">Email Body</label>
                      <Textarea className="bg-secondary/50 border-border text-foreground text-sm min-h-40 resize-y" value={emailBody} onChange={e => setEmailBody(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground uppercase tracking-widest flex justify-between">
                        SMS
                        <span className={sms.length > 160 ? 'text-red-400' : 'text-muted-foreground'}>{sms.length}/160</span>
                      </label>
                      <Textarea className="bg-secondary/50 border-border text-foreground text-sm min-h-20 resize-y" value={sms} onChange={e => setSms(e.target.value)} />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <Button size="sm" variant="outline" onClick={saveDraft} disabled={saving} className="text-xs">
                        {saving ? 'Saving...' : '💾 Save Edits'}
                      </Button>
                      {lead.email && lead.emailStatus !== 'Sent' && (
                        <Button size="sm" onClick={() => send('email')} disabled={!!sending} className="text-xs bg-primary hover:bg-primary/90">
                          {sending === 'email' ? 'Sending...' : '📧 Send Email'}
                        </Button>
                      )}
                      {lead.phone && lead.smsStatus !== 'Sent' && (
                        <Button size="sm" onClick={() => send('sms')} disabled={!!sending} className="text-xs bg-primary hover:bg-primary/90">
                          {sending === 'sms' ? 'Sending...' : '💬 Send SMS'}
                        </Button>
                      )}
                      {lead.email && lead.phone && lead.emailStatus !== 'Sent' && lead.smsStatus !== 'Sent' && (
                        <Button size="sm" onClick={() => send('both')} disabled={!!sending} className="text-xs bg-primary hover:bg-primary/90">
                          {sending === 'both' ? 'Sending...' : '📧💬 Both'}
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg gap-3">
                    <p className="text-muted-foreground text-sm">No draft yet</p>
                    {!lead.previewUrl ? (
                      <Button size="sm" variant="outline" onClick={generatePreview} disabled={generating} className="text-xs">
                        {generating ? '⏳ Generating...' : '🚀 Generate Preview First'}
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">Click "✨ Generate Draft" above</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notes tab */}
            {tab === 'notes' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    className="bg-secondary/50 border-border text-foreground text-sm min-h-24 resize-none"
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) addNote(); }}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">⌘↵ to save</span>
                    <Button size="sm" onClick={addNote} disabled={!newNote.trim()} className="text-xs">Save Note</Button>
                  </div>
                </div>

                {notes.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">No notes yet</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map(note => (
                      <div key={note.id} className="bg-secondary/30 rounded-lg p-3 group relative">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">{timeAgo(note.createdAt)}</span>
                          <button onClick={() => removeNote(note.id)} className="text-xs text-muted-foreground/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* History tab */}
            {tab === 'history' && (
              <div className="space-y-3">
                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {events.map((ev, i) => (
                      <div key={ev.id} className="flex items-start gap-3">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-7 h-7 rounded-full bg-secondary/80 flex items-center justify-center text-sm">
                            {EVENT_ICONS[ev.type] || '•'}
                          </div>
                          {i < events.length - 1 && <div className="w-px h-4 bg-border mt-1" />}
                        </div>
                        <div className="pb-1">
                          <p className="text-sm text-foreground capitalize">{ev.type.replace(/_/g, ' ')}</p>
                          {ev.detail && <p className="text-xs text-muted-foreground">{ev.detail}</p>}
                          <p className="text-xs text-muted-foreground/60 mt-0.5">{timeAgo(ev.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual event log */}
                <div className="border-t border-border pt-3 mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Log event manually:</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['replied', 'called', 'booked', 'closed'] as const).map(type => (
                      <button
                        key={type}
                        onClick={async () => {
                          const res  = await fetch(`/api/leads/${lead.id}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) });
                          const data = await res.json();
                          if (data.event) {
                            setEvents(prev => [data.event, ...prev]);
                            if (type === 'booked' || type === 'closed') setStatus(type);
                          }
                        }}
                        className="text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors capitalize"
                      >
                        {EVENT_ICONS[type]} {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right — preview */}
          <div className="flex flex-col gap-3">
            {(hasPreview || hasWebsite) ? (
              <div className="rounded-lg overflow-hidden border border-border bg-black flex flex-col h-full min-h-[500px]">
                {/* Browser chrome */}
                <div className="bg-secondary/80 px-3 py-1.5 flex items-center gap-2 border-b border-border shrink-0">
                  <div className="flex gap-1 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-red-500/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                    <div className="w-2 h-2 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {iframeView === 'preview' ? lead.previewUrl : lead.website}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasPreview && hasWebsite && (
                      <div className="flex border border-border/60 rounded overflow-hidden">
                        <button onClick={() => setIframeView('preview')}  className={`text-xs px-2 py-0.5 transition-colors ${iframeView === 'preview'  ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Preview</button>
                        <button onClick={() => setIframeView('existing')} className={`text-xs px-2 py-0.5 transition-colors ${iframeView === 'existing' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Current</button>
                      </div>
                    )}
                    <button onClick={() => setIframeExpanded(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 border border-border/60 rounded" title="Expand">⛶</button>
                  </div>
                </div>
                {iframeView === 'preview' && lead.previewUrl ? (
                  <iframe src={lead.previewUrl!} className="w-full flex-1 border-0 bg-white" title={`${lead.name} preview`} />
                ) : hasWebsite ? (
                  <iframe src={lead.website!} className="w-full flex-1 border-0 bg-white" title={`${lead.name} current site`} />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No preview yet</div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-3 h-full min-h-[300px] text-center p-6">
                <span className="text-3xl">🚀</span>
                <p className="text-sm text-muted-foreground">No preview yet</p>
                <Button size="sm" variant="outline" onClick={generatePreview} disabled={generating} className="text-xs">
                  {generating ? '⏳ Generating...' : '✨ Generate Preview'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


