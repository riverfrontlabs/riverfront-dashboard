'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, Area, AreaChart, ComposedChart, Bar,
} from 'recharts';

interface Snapshot {
  date: string;
  total: number; previewed: number; drafted: number;
  contacted: number; replied: number; booked: number; closed: number;
}

interface Props {
  targets?: { contacted: number; closed: number };
  days?: number;
}

const COLORS = {
  total:     '#6366f1',
  previewed: '#38bdf8',
  drafted:   '#facc15',
  contacted: '#a78bfa',
  replied:   '#fb923c',
  booked:    '#34d399',
  closed:    '#4ade80',
};

function shortDate(d: string) {
  const [, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}`;
}

// Linear projection: extend last known slope N days forward
function project(snapshots: Snapshot[], daysAhead = 14) {
  if (snapshots.length < 2) return [];
  const n    = snapshots.length;
  const last = snapshots[n - 1];
  const prev = snapshots[Math.max(0, n - 7)];
  const days = Math.max(1, n - Math.max(0, n - 7));

  const slopeContacted = (last.contacted - prev.contacted) / days;
  const slopeClosed    = (last.closed    - prev.closed)    / days;

  const out = [];
  const base = new Date(last.date);
  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({
      date:      d.toISOString().slice(0, 10),
      contacted: Math.round(last.contacted + slopeContacted * i),
      closed:    Math.round(last.closed    + slopeClosed    * i),
      projected: true,
    });
  }
  return out;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function StatsGraph({ targets, days = 30 }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [view,      setView]      = useState<'pipeline' | 'funnel'>('pipeline');
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch(`/api/snapshots?days=${days}`)
      .then(r => r.json())
      .then(d => { setSnapshots(d.snapshots || []); setLoading(false); });
  }, [days]);

  const projected = project(snapshots);
  const chartData = [
    ...snapshots.map(s => ({ ...s, date: shortDate(s.date) })),
    ...projected.map(s => ({ ...s, date: shortDate(s.date) })),
  ];

  const latest = snapshots[snapshots.length - 1];

  const funnelData = latest ? [
    { stage: 'Total',     count: latest.total },
    { stage: 'Previewed', count: latest.previewed },
    { stage: 'Drafted',   count: latest.drafted },
    { stage: 'Contacted', count: latest.contacted },
    { stage: 'Replied',   count: latest.replied },
    { stage: 'Booked',    count: latest.booked },
    { stage: 'Closed',    count: latest.closed },
  ] : [];

  const conversionRate = latest?.total
    ? ((latest.closed / latest.total) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Pipeline Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {snapshots.length} day{snapshots.length !== 1 ? 's' : ''} of data
            {latest && ` · ${conversionRate}% close rate`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Snapshot button */}
          <button
            onClick={() => fetch('/api/snapshots', { method: 'POST' }).then(() =>
              fetch(`/api/snapshots?days=${days}`).then(r => r.json()).then(d => setSnapshots(d.snapshots || []))
            )}
            className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors"
          >
            📸 Snapshot now
          </button>
          <div className="flex border border-border rounded overflow-hidden">
            {(['pipeline', 'funnel'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs px-3 py-1 capitalize transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI row */}
      {latest && (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {funnelData.map(({ stage, count }) => (
            <div key={stage} className="text-center">
              <p className="text-lg font-bold text-foreground">{count.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{stage}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          {snapshots.length === 0 ? 'No snapshots yet — click "Snapshot now" to record today\'s stats.' : 'Loading...'}
        </div>
      ) : snapshots.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
          <p>No historical data yet.</p>
          <button
            onClick={() => fetch('/api/snapshots', { method: 'POST' }).then(() =>
              fetch(`/api/snapshots?days=${days}`).then(r => r.json()).then(d => setSnapshots(d.snapshots || []))
            )}
            className="text-xs bg-primary text-primary-foreground rounded px-3 py-1.5"
          >
            Record first snapshot
          </button>
        </div>
      ) : view === 'pipeline' ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              {Object.entries(COLORS).map(([key, color]) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}    />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 260)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'oklch(0.55 0.01 260)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'oklch(0.55 0.01 260)' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {/* Projection separator */}
            {projected.length > 0 && (
              <ReferenceLine
                x={shortDate(snapshots[snapshots.length - 1].date)}
                stroke="oklch(0.55 0.01 260)"
                strokeDasharray="4 4"
                label={{ value: 'projected →', position: 'insideTopRight', fontSize: 10, fill: 'oklch(0.55 0.01 260)' }}
              />
            )}
            {/* Target lines */}
            {targets?.contacted && (
              <ReferenceLine y={targets.contacted} stroke={COLORS.contacted} strokeDasharray="4 4"
                label={{ value: `Target: ${targets.contacted}`, position: 'right', fontSize: 10, fill: COLORS.contacted }} />
            )}
            {targets?.closed && (
              <ReferenceLine y={targets.closed} stroke={COLORS.closed} strokeDasharray="4 4"
                label={{ value: `Goal: ${targets.closed}`, position: 'right', fontSize: 10, fill: COLORS.closed }} />
            )}
            <Area type="monotone" dataKey="contacted" stroke={COLORS.contacted} fill={`url(#grad-contacted)`} strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="replied"   stroke={COLORS.replied}   fill={`url(#grad-replied)`}   strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="booked"    stroke={COLORS.booked}    fill={`url(#grad-booked)`}    strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="closed"    stroke={COLORS.closed}    fill={`url(#grad-closed)`}    strokeWidth={2} dot={false} strokeDasharray={projected.length > 0 ? undefined : undefined} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={funnelData} layout="vertical" margin={{ top: 5, right: 40, left: 60, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 260)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'oklch(0.55 0.01 260)' }} />
            <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: 'oklch(0.75 0.01 260)' }} width={70} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}
              fill="url(#grad-contacted)"
              label={{ position: 'right', fontSize: 11, fill: 'oklch(0.75 0.01 260)' }}
              background={{ fill: 'oklch(0.18 0.01 260)', radius: 4 }}
            >
              {funnelData.map((_, i) => {
                const colors = Object.values(COLORS);
                return <rect key={i} fill={colors[i % colors.length]} />;
              })}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
