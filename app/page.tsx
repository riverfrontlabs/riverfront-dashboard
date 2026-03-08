'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import LeadDetail from '@/components/LeadDetail';
import type { Lead } from '@/lib/sheets';

const PAGE_SIZE = 50;

function statusColor(s: string) {
  if (s === 'Sent')              return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (s === 'Draft')             return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  if (s?.startsWith('Failed'))   return 'bg-red-500/15 text-red-400 border-red-500/30';
  return '';
}

function scoreColor(s: number) {
  if (s >= 8) return 'text-green-400';
  if (s >= 5) return 'text-yellow-400';
  return 'text-red-400';
}

export default function Dashboard() {
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<Lead | null>(null);
  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterLoc,    setFilterLoc]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortCol,      setSortCol]      = useState<keyof Lead>('score');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc');
  const [page,         setPage]         = useState(1);
  const [checked,      setChecked]      = useState<Set<number>>(new Set());
  const [bulkStatus,   setBulkStatus]   = useState('');
  const [bulkRunning,  setBulkRunning]  = useState(false);

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
  useEffect(() => { setPage(1); setChecked(new Set()); }, [search, filterType, filterLoc, filterStatus]);

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
    total:   leads.length,
    preview: leads.filter(l => l.previewUrl).length,
    drafted: leads.filter(l => l.emailSubject).length,
    sent:    leads.filter(l => l.emailStatus === 'Sent' || l.smsStatus === 'Sent').length,
  };

  const toggleSort = (col: keyof Lead) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const updateLead = useCallback((updated: Lead) => {
    setLeads(prev => prev.map(l => l.rowIndex === updated.rowIndex ? updated : l));
    setSelected(updated);
  }, []);

  // Checkbox logic
  const pageRowIds   = paginated.map(l => l.rowIndex);
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

  const selectAll = () => setChecked(new Set(filtered.map(l => l.rowIndex)));
  const clearAll  = () => setChecked(new Set());

  // Bulk actions
  const checkedLeads = useMemo(() => filtered.filter(l => checked.has(l.rowIndex)), [filtered, checked]);

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
          setLeads(prev => prev.map(l => l.rowIndex === lead.rowIndex
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
          setLeads(prev => prev.map(l => l.rowIndex === lead.rowIndex ? {
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
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="text-xs">
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </Button>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Leads', value: stats.total,   color: 'text-foreground' },
            { label: 'Previewed',   value: stats.preview, color: 'text-blue-400'   },
            { label: 'Drafted',     value: stats.drafted, color: 'text-yellow-400' },
            { label: 'Sent',        value: stats.sent,    color: 'text-green-400'  },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{loading ? '—' : value}</p>
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
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterLoc}    onChange={e => setFilterLoc(e.target.value)}    className="bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary">
            <option value="">All locations</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary">
            <option value="">All statuses</option>
            <option value="preview">Has preview</option>
            <option value="drafted">Has draft</option>
            <option value="sent">Sent</option>
            <option value="unsent">Not sent</option>
          </select>
          {(search || filterType || filterLoc || filterStatus) && (
            <button onClick={() => { setSearch(''); setFilterType(''); setFilterLoc(''); setFilterStatus(''); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
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
              <Button size="sm" variant="outline" onClick={bulkDraft}          disabled={bulkRunning} className="text-xs h-7">✨ Generate Drafts</Button>
              <Button size="sm" variant="outline" onClick={() => bulkSend('email')} disabled={bulkRunning} className="text-xs h-7">📧 Send Email</Button>
              <Button size="sm" variant="outline" onClick={() => bulkSend('sms')}   disabled={bulkRunning} className="text-xs h-7">💬 Send SMS</Button>
              <Button size="sm" variant="outline" onClick={() => bulkSend('both')}  disabled={bulkRunning} className="text-xs h-7">📧💬 Send Both</Button>
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
                    { label: 'Business', col: 'name'     as keyof Lead },
                    { label: 'Type',     col: 'type'     as keyof Lead },
                    { label: 'Location', col: 'location' as keyof Lead },
                    { label: 'Score',    col: 'score'    as keyof Lead },
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
                  const isChecked = checked.has(lead.rowIndex);
                  return (
                    <tr
                      key={lead.rowIndex}
                      onClick={() => setSelected(lead)}
                      className={`border-b border-border/50 cursor-pointer hover:bg-secondary/40 transition-colors ${isChecked ? 'bg-primary/5' : i % 2 === 0 ? '' : 'bg-secondary/10'}`}
                    >
                      <td className="px-4 py-3" onClick={e => toggleRow(lead.rowIndex, e)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-primary w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[220px] truncate">{lead.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{lead.type}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{lead.location}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold tabular-nums ${scoreColor(lead.score)}`}>{lead.score}</span>
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

      {/* Lead detail modal */}
      <LeadDetail
        lead={selected}
        onClose={() => setSelected(null)}
        onUpdate={updateLead}
      />
    </div>
  );
}
