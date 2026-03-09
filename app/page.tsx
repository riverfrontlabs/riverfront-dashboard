'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import LeadDetail from '@/components/LeadDetail';
import StatsGraph from '@/components/StatsGraph';
import type { Lead } from '@/lib/types';
import DiscoverDialog from '@/components/DiscoverDialog';

const PAGE_SIZE = 50;

function statusColor(s: string) {
  if (s === 'Sent')              return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (s === 'Draft')             return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  if (s?.startsWith('Failed'))   return 'bg-red-500/15 text-red-400 border-red-500/30';
  return '';
}

function scoreTier(s: number): { label: string; className: string } {
  if (s >= 10) return { label: '🔥 Hot',  className: 'bg-red-500/15 text-red-400 border-red-500/30'    };
  if (s >= 7)  return { label: '🟠 Warm', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
  if (s >= 4)  return { label: '🟡 Cool', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' };
  return       { label: '🔵 Cold', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30'   };
}

export default function Dashboard() {
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<Lead | null>(null);
  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterLoc,    setFilterLoc]    = useState('');
  const [filterStatus,    setFilterStatus]    = useState('');
  const [filterPriority,  setFilterPriority]  = useState('');
  const [filterShortlist, setFilterShortlist] = useState(false);
  const [sortCol,      setSortCol]      = useState<keyof Lead>('score');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc');
  const [page,         setPage]         = useState(1);
  const [checked,      setChecked]      = useState<Set<number>>(new Set());
  const [bulkStatus,   setBulkStatus]   = useState('');
  const [bulkRunning,  setBulkRunning]  = useState(false);
  const [showGraph,    setShowGraph]    = useState(false);
  const [confirm,      setConfirm]      = useState<{ action: 'generate' | 'delete'; count: number } | null>(null);
  const [showDiscover, setShowDiscover] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (e) {
      console.error('Failed to load leads', e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Reset page + selections when filters change
  useEffect(() => { setPage(1); setChecked(new Set()); }, [search, filterType, filterLoc, filterStatus, filterPriority, filterShortlist]);

  const types     = useMemo(() => [...new Set(leads.map(l => l.type).filter(Boolean))].sort(),     [leads]);
  const locations = useMemo(() => [...new Set(leads.map(l => l.location).filter(Boolean))].sort(), [leads]);

  const filtered = useMemo(() => {
    const out = leads.filter(l => {
      if (search       && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType   && l.type !== filterType)    return false;
      if (filterLoc    && l.location !== filterLoc) return false;
      if (filterStatus === 'preview' && !l.previewUrl)   return false;
      if (filterStatus === 'drafted' && !l.emailSubject) return false;
      if (filterStatus === 'sent'    && l.emailStatus !== 'Sent' && l.smsStatus !== 'Sent') return false;
      if (filterStatus === 'unsent'  && (l.emailStatus === 'Sent' || l.smsStatus === 'Sent')) return false;
      if (filterPriority === 'hot'  && l.score < 10) return false;
      if (filterPriority === 'warm' && (l.score < 7 || l.score >= 10)) return false;
      if (filterPriority === 'cool' && (l.score < 4 || l.score >= 7))  return false;
      if (filterPriority === 'cold' && l.score >= 4) return false;
      if (filterShortlist && !l.shortlisted) return false;
      return true;
    });
    out.sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1  : -1;
      return 0;
    });
    return out;
  }, [leads, search, filterType, filterLoc, filterStatus, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total:       leads.length,
    shortlisted: leads.filter(l => l.shortlisted).length,
    preview:     leads.filter(l => l.previewUrl).length,
    drafted:     leads.filter(l => l.emailSubject).length,
    contacted:   leads.filter(l => ['contacted','replied','booked','closed'].includes(l.status)).length,
    closed:      leads.filter(l => l.status === 'closed').length,
  };

  const toggleSort = (col: keyof Lead) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const updateLead = useCallback((updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSelected(updated);
  }, []);

  const deleteLead = useCallback((id: number) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    setSelected(null);
  }, []);

  // Checkbox logic
  const pageRowIds     = paginated.map(l => l.id);
  const allPageChecked = pageRowIds.length > 0 && pageRowIds.every(id => checked.has(id));
  const someChecked    = checked.size > 0;

  const toggleRow = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePageAll = () => {
    if (allPageChecked) {
      setChecked(prev => { const n = new Set(prev); pageRowIds.forEach(id => n.delete(id)); return n; });
    } else {
      setChecked(prev => { const n = new Set(prev); pageRowIds.forEach(id => n.add(id)); return n; });
    }
  };

  const selectAll = () => setChecked(new Set(filtered.map(l => l.id)));
  const clearAll  = () => setChecked(new Set());

  // Bulk actions
  const checkedLeads = useMemo(() => filtered.filter(l => checked.has(l.id)), [filtered, checked]);

  const bulkDraft = async () => {
    const targets = checkedLeads.filter(l => l.previewUrl);
    if (!targets.length) return;
    setBulkRunning(true);
    let done = 0;
    for (const lead of targets) {
      setBulkStatus(`Drafting ${++done}/${targets.length}: ${lead.name}`);
      try {
        const res  = await fetch('/api/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
        const data = await res.json();
        if (data.draft) {
          setLeads(prev => prev.map(l => l.id === lead.id
            ? { ...l, emailSubject: data.draft.emailSubject, emailBody: data.draft.emailBody, sms: data.draft.sms, emailStatus: 'Draft', smsStatus: 'Draft' }
            : l));
        }
      } catch {}
      await new Promise(r => setTimeout(r, 600));
    }
    setBulkStatus(`✅ Drafted ${done} leads`);
    setTimeout(() => setBulkStatus(''), 4000);
    setBulkRunning(false);
  };

  const bulkSend = async (channel: 'email' | 'sms' | 'both') => {
    const targets = checkedLeads.filter(l =>
      l.emailSubject && (channel === 'email' ? l.email : channel === 'sms' ? l.phone : l.email || l.phone)
    );
    if (!targets.length) return;
    setBulkRunning(true);
    let done = 0;
    for (const lead of targets) {
      setBulkStatus(`Sending ${++done}/${targets.length}: ${lead.name}`);
      try {
        const res  = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...lead, channel }) });
        const data = await res.json();
        if (data.result) {
          setLeads(prev => prev.map(l => l.id === lead.id ? {
            ...l,
            emailStatus: data.result.email === 'sent' ? 'Sent' : l.emailStatus,
            smsStatus:   data.result.sms   === 'sent' ? 'Sent' : l.smsStatus,
          } : l));
        }
      } catch {}
      await new Promise(r => setTimeout(r, 800));
    }
    setBulkStatus(`✅ Sent to ${done} leads`);
    setTimeout(() => setBulkStatus(''), 4000);
    setBulkRunning(false);
  };

  const bulkGenerate = async () => {
    const targets = checkedLeads;
    if (!targets.length) return;
    setBulkRunning(true);
    let done = 0;
    for (const lead of targets) {
      setBulkStatus(`Generating ${++done}/${targets.length}: ${lead.name}`);
      try {
        const res  = await fetch(`/api/leads/${lead.id}/generate`, { method: 'POST' });
        const data = await res.json();
        if (data.previewUrl) {
          setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, previewUrl: data.previewUrl } : l));
        }
      } catch {}
      await new Promise(r => setTimeout(r, 1200));
    }
    setBulkStatus(`✅ Generated ${done} previews`);
    setTimeout(() => setBulkStatus(''), 4000);
    setBulkRunning(false);
  };

  const bulkDelete = async () => {
    const targets = checkedLeads;
    if (!targets.length) return;
    setBulkRunning(true);
    let done = 0;
    for (const lead of targets) {
      setBulkStatus(`Deleting ${++done}/${targets.length}: ${lead.name}`);
      try {
        await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
        setLeads(prev => prev.filter(l => l.id !== lead.id));
      } catch {}
    }
    setChecked(new Set());
    setBulkStatus(`✅ Deleted ${done} leads`);
    setTimeout(() => setBulkStatus(''), 4000);
    setBulkRunning(false);
  };

  const toggleShortlist = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const res  = await fetch(`/api/leads/${id}/shortlist`, { method: 'POST' });
    const data = await res.json();
    setLeads(prev => prev.map(l => l.id === id ? { ...l, shortlisted: data.shortlisted } : l));
  };

  const SortIcon = ({ col }: { col: keyof Lead }) =>
    <span className="opacity-60">{sortCol === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}</span>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-primary font-bold text-lg tracking-tight">Riverfront Labs</span>
            <span className="text-muted-foreground text-sm">/ Lead Dashboard</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowDiscover(true)} className="text-xs">
              🔍 Discover
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowGraph(g => !g)} className={`text-xs ${showGraph ? 'bg-primary/20 border-primary/50' : ''}`}>
              📈 {showGraph ? 'Hide Graph' : 'Show Graph'}
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading} className="text-xs">
              {loading ? '⏳ Loading...' : '🔄 Refresh'}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

        {/* Graph */}
        {showGraph && (
          <StatsGraph targets={{ contacted: 500, closed: 25 }} />
        )}

        {/* Stats */}
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: 'Total',       value: stats.total,       color: 'text-foreground'  },
            { label: '⭐ Shortlist', value: stats.shortlisted, color: 'text-amber-400',  onClick: () => setFilterShortlist(f => !f) },
            { label: 'Previewed',   value: stats.preview,     color: 'text-blue-400'    },
            { label: 'Drafted',     value: stats.drafted,     color: 'text-yellow-400'  },
            { label: 'Contacted',   value: stats.contacted,   color: 'text-violet-400'  },
            { label: 'Closed',      value: stats.closed,      color: 'text-green-400'   },
          ].map(({ label, value, color, onClick }) => (
            <div key={label} onClick={onClick} className={`bg-card border border-border rounded-lg px-4 py-3 ${onClick ? 'cursor-pointer hover:border-amber-400/50 transition-colors' : ''} ${label === '⭐ Shortlist' && filterShortlist ? 'border-amber-400/50 bg-amber-400/5' : ''}`}>
              <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-2xl font-bold tabular-nums ${color}`}>{loading ? '—' : value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            placeholder="Search business name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-56"
          />
          <select value={filterType}   onChange={e => setFilterType(e.target.value)}   className="bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary">
            <option value="">All types</option>
            {types.map(t => <option key={t!} value={t!}>{t}</option>)}
          </select>
          <select value={filterLoc}    onChange={e => setFilterLoc(e.target.value)}    className="bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary">
            <option value="">All locations</option>
            {locations.map(l => <option key={l!} value={l!}>{l}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary">
            <option value="">All statuses</option>
            <option value="preview">Has preview</option>
            <option value="drafted">Has draft</option>
            <option value="sent">Sent</option>
            <option value="unsent">Not sent</option>
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary">
            <option value="">All priorities</option>
            <option value="hot">🔥 Hot (10+)</option>
            <option value="warm">🟠 Warm (7-9)</option>
            <option value="cool">🟡 Cool (4-6)</option>
            <option value="cold">🔵 Cold (1-3)</option>
          </select>
          <button
            onClick={() => setFilterShortlist(f => !f)}
            className={`text-xs px-2 py-1.5 rounded border transition-colors ${filterShortlist ? 'border-amber-400/50 text-amber-400 bg-amber-400/10' : 'border-border text-muted-foreground hover:text-amber-400 hover:border-amber-400/40'}`}
          >
            ⭐ Shortlist
          </button>
          {(search || filterType || filterLoc || filterStatus || filterPriority || filterShortlist) && (
            <button onClick={() => { setSearch(''); setFilterType(''); setFilterLoc(''); setFilterStatus(''); setFilterPriority(''); setFilterShortlist(false); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ✕ Clear
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length.toLocaleString()} of {leads.length.toLocaleString()} leads
          </span>
        </div>

        {/* Bulk action bar */}
        {someChecked && (
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5 flex-wrap">
            <span className="text-sm font-medium text-primary shrink-0">
              {checked.size} selected
            </span>
            <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Select all {filtered.length.toLocaleString()}
            </button>
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
            <div className="flex gap-2 ml-auto flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setConfirm({ action: 'generate', count: checkedLeads.length })} disabled={bulkRunning} className="text-xs h-7">🚀 Generate Previews</Button>
              <Button size="sm" variant="outline" onClick={bulkDraft}               disabled={bulkRunning} className="text-xs h-7">✨ Draft Outreach</Button>
              <Button size="sm" variant="outline" onClick={() => bulkSend('email')} disabled={bulkRunning} className="text-xs h-7">📧 Send Email</Button>
              <Button size="sm" variant="outline" onClick={() => bulkSend('sms')}   disabled={bulkRunning} className="text-xs h-7">💬 Send SMS</Button>
              <Button size="sm" variant="outline" onClick={() => bulkSend('both')}  disabled={bulkRunning} className="text-xs h-7">📧💬 Send Both</Button>
              <Button size="sm" variant="outline" onClick={() => setConfirm({ action: 'delete', count: checkedLeads.length })} disabled={bulkRunning} className="text-xs h-7 text-red-700 hover:text-red-400 border-red-900/40 hover:border-red-500/50">🗑 Delete</Button>
            </div>
            {bulkStatus && (
              <span className="text-xs text-muted-foreground w-full pt-1">{bulkStatus}</span>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {/* Checkbox */}
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allPageChecked}
                      onChange={togglePageAll}
                      className="accent-primary w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  {([
                    { label: '⭐',       col: null },
                    { label: 'Business', col: 'name'     as keyof Lead },
                    { label: 'Type',     col: 'type'     as keyof Lead },
                    { label: 'Location', col: 'location' as keyof Lead },
                    { label: 'Priority', col: 'score'    as keyof Lead },
                    { label: 'Preview',  col: null },
                    { label: 'Email',    col: null },
                    { label: 'SMS',      col: null },
                  ] as { label: string; col: keyof Lead | null }[]).map(({ label, col }) => (
                    <th
                      key={label}
                      onClick={() => col && toggleSort(col)}
                      className={`text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none ${col ? 'cursor-pointer hover:text-foreground' : ''}`}
                    >
                      {label}{col && <SortIcon col={col} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No leads match filters</td></tr>
                ) : paginated.map((lead, i) => {
                  const isChecked = checked.has(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelected(lead)}
                      className={`border-b border-border/50 cursor-pointer hover:bg-secondary/40 transition-colors ${isChecked ? 'bg-primary/5' : i % 2 === 0 ? '' : 'bg-secondary/10'}`}
                    >
                      <td className="px-4 py-3" onClick={e => toggleRow(lead.id, e)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-primary w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3" onClick={e => toggleShortlist(lead.id, e)}>
                        <span className={`text-base leading-none transition-all ${lead.shortlisted ? 'opacity-100' : 'opacity-20 hover:opacity-60'}`}>⭐</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[220px] truncate">{lead.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{lead.type}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{lead.location}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${scoreTier(lead.score).className}`}>
                          {scoreTier(lead.score).label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {lead.previewUrl
                          ? <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs">✓ Live</Badge>
                          : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {lead.emailStatus
                          ? <Badge variant="outline" className={`text-xs ${statusColor(lead.emailStatus)}`}>{lead.emailStatus}</Badge>
                          : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {lead.smsStatus
                          ? <Badge variant="outline" className={`text-xs ${statusColor(lead.smsStatus)}`}>{lead.smsStatus}</Badge>
                          : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
              <span className="text-xs text-muted-foreground">
                {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => setPage(1)}       disabled={page === 1}          className="text-xs h-7 px-2">«</Button>
                <Button size="sm" variant="outline" onClick={() => setPage(p => p - 1)} disabled={page === 1}       className="text-xs h-7 px-2">‹</Button>
                {/* Page number pills */}
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 7)         p = i + 1;
                  else if (page <= 4)          p = i + 1;
                  else if (page >= totalPages - 3) p = totalPages - 6 + i;
                  else                         p = page - 3 + i;
                  return (
                    <Button
                      key={p}
                      size="sm"
                      variant={p === page ? 'default' : 'outline'}
                      onClick={() => setPage(p)}
                      className="text-xs h-7 w-7 px-0"
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="text-xs h-7 px-2">›</Button>
                <Button size="sm" variant="outline" onClick={() => setPage(totalPages)} disabled={page === totalPages} className="text-xs h-7 px-2">»</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discover dialog */}
      {showDiscover && (
        <DiscoverDialog
          onClose={() => setShowDiscover(false)}
          onComplete={load}
        />
      )}

      {/* Bulk confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                {confirm.action === 'delete' ? '🗑 Delete leads?' : '🚀 Generate previews?'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {confirm.action === 'delete'
                  ? `This will permanently delete ${confirm.count} lead${confirm.count !== 1 ? 's' : ''}. This cannot be undone.`
                  : `Generate AI preview pages for ${confirm.count} lead${confirm.count !== 1 ? 's' : ''}. Each will be committed and pushed to Netlify.`}
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirm(null)}
                className="text-xs border-blue-400/40 text-blue-400 hover:bg-blue-400/10"
              >
                ← Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setConfirm(null);
                  if (confirm.action === 'delete')   bulkDelete();
                  if (confirm.action === 'generate') bulkGenerate();
                }}
                className={`text-xs ${confirm.action === 'delete' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-primary hover:bg-primary/90'}`}
              >
                {confirm.action === 'delete' ? '✕ Delete' : '🚀 Generate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lead detail modal */}
      <LeadDetail
        lead={selected}
        onClose={() => setSelected(null)}
        onUpdate={updateLead}
        onDelete={deleteLead}
      />
    </div>
  );
}
