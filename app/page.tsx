'use client';

import { useEffect, useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import LeadDetail from '@/components/LeadDetail';
import type { Lead } from '@/lib/sheets';

function statusColor(s: string) {
  if (s === 'Sent')  return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (s === 'Draft') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  if (s?.startsWith('Failed')) return 'bg-red-500/15 text-red-400 border-red-500/30';
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

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (e) {
      console.error('Failed to load leads', e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const types     = [...new Set(leads.map(l => l.type).filter(Boolean))].sort();
  const locations = [...new Set(leads.map(l => l.location).filter(Boolean))].sort();

  const filtered = useMemo(() => {
    let out = leads.filter(l => {
      if (search       && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType   && l.type !== filterType)     return false;
      if (filterLoc    && l.location !== filterLoc)  return false;
      if (filterStatus === 'preview'  && !l.previewUrl)   return false;
      if (filterStatus === 'drafted'  && !l.emailSubject) return false;
      if (filterStatus === 'sent'     && l.emailStatus !== 'Sent' && l.smsStatus !== 'Sent') return false;
      if (filterStatus === 'unsent'   && (l.emailStatus === 'Sent' || l.smsStatus === 'Sent')) return false;
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

  const stats = {
    total:    leads.length,
    preview:  leads.filter(l => l.previewUrl).length,
    drafted:  leads.filter(l => l.emailSubject).length,
    sent:     leads.filter(l => l.emailStatus === 'Sent' || l.smsStatus === 'Sent').length,
  };

  const toggleSort = (col: keyof Lead) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const updateLead = (updated: Lead) => {
    setLeads(prev => prev.map(l => l.rowIndex === updated.rowIndex ? updated : l));
    setSelected(updated);
  };

  const SortIcon = ({ col }: { col: keyof Lead }) =>
    sortCol === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-primary font-bold text-lg tracking-tight">Riverfront Labs</span>
            <span className="text-muted-foreground text-sm">/ Lead Dashboard</span>
          </div>
          <Button size="sm" variant="outline" onClick={load} className="text-xs">
            🔄 Refresh
          </Button>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Leads',  value: stats.total,   color: 'text-foreground'  },
            { label: 'Previewed',    value: stats.preview, color: 'text-blue-400'    },
            { label: 'Drafted',      value: stats.drafted, color: 'text-yellow-400'  },
            { label: 'Sent',         value: stats.sent,    color: 'text-green-400'   },
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
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">All types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterLoc}
            onChange={e => setFilterLoc(e.target.value)}
            className="bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">All locations</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">All statuses</option>
            <option value="preview">Has preview</option>
            <option value="drafted">Has draft</option>
            <option value="sent">Sent</option>
            <option value="unsent">Not sent</option>
          </select>
          {(search || filterType || filterLoc || filterStatus) && (
            <button
              onClick={() => { setSearch(''); setFilterType(''); setFilterLoc(''); setFilterStatus(''); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} of {leads.length} leads
          </span>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {[
                    { label: 'Business',   col: 'name'     as keyof Lead },
                    { label: 'Type',       col: 'type'     as keyof Lead },
                    { label: 'Location',   col: 'location' as keyof Lead },
                    { label: 'Score',      col: 'score'    as keyof Lead },
                    { label: 'Preview',    col: null },
                    { label: 'Email',      col: null },
                    { label: 'SMS',        col: null },
                  ].map(({ label, col }) => (
                    <th
                      key={label}
                      onClick={() => col && toggleSort(col)}
                      className={`text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${col ? 'cursor-pointer hover:text-foreground' : ''}`}
                    >
                      {label}{col ? <SortIcon col={col} /> : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No leads match filters</td></tr>
                ) : filtered.map((lead, i) => (
                  <tr
                    key={lead.rowIndex}
                    onClick={() => setSelected(lead)}
                    className={`border-b border-border/50 cursor-pointer hover:bg-secondary/40 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{lead.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{lead.type}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{lead.location}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${scoreColor(lead.score)}`}>{lead.score}</span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.previewUrl
                        ? <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs">✓ Live</Badge>
                        : <span className="text-muted-foreground/40 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {lead.emailStatus
                        ? <Badge variant="outline" className={`text-xs ${statusColor(lead.emailStatus)}`}>{lead.emailStatus}</Badge>
                        : <span className="text-muted-foreground/40 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {lead.smsStatus
                        ? <Badge variant="outline" className={`text-xs ${statusColor(lead.smsStatus)}`}>{lead.smsStatus}</Badge>
                        : <span className="text-muted-foreground/40 text-xs">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
