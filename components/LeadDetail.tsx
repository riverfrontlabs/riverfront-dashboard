'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Lead } from '@/lib/sheets';

interface Props {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: (lead: Lead) => void;
}

function statusColor(s: string) {
  if (s === 'Sent')  return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (s === 'Draft') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  if (s?.startsWith('Failed')) return 'bg-red-500/15 text-red-400 border-red-500/30';
  return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
}

export default function LeadDetail({ lead, onClose, onUpdate }: Props) {
  const [emailSubject, setEmailSubject] = useState(lead?.emailSubject || '');
  const [emailBody,    setEmailBody]    = useState(lead?.emailBody    || '');
  const [sms,          setSms]          = useState(lead?.sms          || '');
  const [drafting,     setDrafting]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [sending,      setSending]      = useState<string | null>(null);
  const [toast,        setToast]        = useState('');

  if (!lead) return null;

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const generateDraft = async () => {
    setDrafting(true);
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      const { draft, error } = await res.json();
      if (error) throw new Error(error);
      setEmailSubject(draft.emailSubject);
      setEmailBody(draft.emailBody);
      setSms(draft.sms);
      onUpdate({ ...lead, emailSubject: draft.emailSubject, emailBody: draft.emailBody, sms: draft.sms, emailStatus: 'Draft', smsStatus: 'Draft' });
      flash('✅ Draft generated');
    } catch (e: any) { flash(`❌ ${e.message}`); }
    setDrafting(false);
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await fetch('/api/update-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: lead.rowIndex, emailSubject, emailBody, sms }),
      });
      onUpdate({ ...lead, emailSubject, emailBody, sms });
      flash('✅ Saved');
    } catch (e: any) { flash(`❌ ${e.message}`); }
    setSaving(false);
  };

  const send = async (channel: 'email' | 'sms' | 'both') => {
    setSending(channel);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, channel, emailSubject, emailBody, sms }),
      });
      const { result, error } = await res.json();
      if (error) throw new Error(error);
      const updated = { ...lead };
      if (result.email === 'sent') updated.emailStatus = 'Sent';
      if (result.sms   === 'sent') updated.smsStatus   = 'Sent';
      onUpdate(updated);
      flash(`✅ Sent via ${channel}`);
    } catch (e: any) { flash(`❌ ${e.message}`); }
    setSending(null);
  };

  const hasDraft = emailSubject || emailBody || sms;

  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-3">
            {lead.name}
            <span className="text-xs font-normal text-muted-foreground tracking-widest uppercase">{lead.type}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-card border border-border px-4 py-2 rounded text-sm text-foreground shadow-lg">
            {toast}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          {/* Left — info + preview */}
          <div className="space-y-4">
            {/* Business info */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
              {[
                ['Location', lead.location],
                ['Address',  lead.address],
                ['Phone',    lead.phone],
                ['Email',    lead.email || '—'],
                ['Rating',   lead.rating ? `${lead.rating} ★` : '—'],
                ['Score',    `${lead.score}/10`],
                ['Website',  lead.website || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-muted-foreground w-20 shrink-0">{label}</span>
                  <span className="text-foreground break-all">{value}</span>
                </div>
              ))}
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              {lead.previewUrl && (
                <a href={lead.previewUrl} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30 cursor-pointer hover:bg-blue-500/25">
                    🔗 Preview
                  </Badge>
                </a>
              )}
              <Badge variant="outline" className={statusColor(lead.emailStatus)}>
                📧 {lead.emailStatus || 'No draft'}
              </Badge>
              <Badge variant="outline" className={statusColor(lead.smsStatus)}>
                💬 {lead.smsStatus || 'No draft'}
              </Badge>
            </div>

            {/* Preview iframe */}
            {lead.previewUrl && (
              <div className="rounded-lg overflow-hidden border border-border bg-black">
                <div className="bg-secondary/80 px-3 py-1.5 flex items-center gap-2 border-b border-border">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{lead.previewUrl}</span>
                </div>
                <iframe
                  src={lead.previewUrl}
                  className="w-full h-64 border-0"
                  title={lead.name}
                />
              </div>
            )}
          </div>

          {/* Right — drafts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Outreach Drafts</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={generateDraft}
                disabled={drafting || !lead.previewUrl}
                className="text-xs"
              >
                {drafting ? '⏳ Generating...' : hasDraft ? '🔄 Regenerate' : '✨ Generate Draft'}
              </Button>
            </div>

            {hasDraft ? (
              <>
                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-widest">Email Subject</label>
                  <input
                    className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-widest">Email Body</label>
                  <Textarea
                    className="bg-secondary/50 border-border text-foreground text-sm min-h-36 resize-y"
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-widest flex justify-between">
                    SMS
                    <span className={sms.length > 160 ? 'text-red-400' : 'text-muted-foreground'}>
                      {sms.length}/160
                    </span>
                  </label>
                  <Textarea
                    className="bg-secondary/50 border-border text-foreground text-sm min-h-20 resize-y"
                    value={sms}
                    onChange={e => setSms(e.target.value)}
                  />
                </div>

                {/* Actions */}
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
                      {sending === 'both' ? 'Sending...' : '📧💬 Send Both'}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg">
                <p className="text-muted-foreground text-sm mb-3">No draft yet</p>
                {!lead.previewUrl && (
                  <p className="text-xs text-muted-foreground">Generate a preview first</p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
