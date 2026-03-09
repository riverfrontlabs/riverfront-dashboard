'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onClose:    () => void;
  onComplete: () => void; // refresh leads after run
}

const DEFAULT_LOCATIONS = 'St. Louis MO';
const DEFAULT_TYPES     = 'restaurant,hair_care,plumber,auto_repair,beauty_salon';
const DEFAULT_LIMIT     = 50;

export default function DiscoverDialog({ onClose, onComplete }: Props) {
  const [locations, setLocations] = useState(DEFAULT_LOCATIONS);
  const [types,     setTypes]     = useState(DEFAULT_TYPES);
  const [limit,     setLimit]     = useState(DEFAULT_LIMIT);
  const [running,   setRunning]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [exitCode,  setExitCode]  = useState<number | null>(null);
  const [log,       setLog]       = useState<{ line: string; error?: boolean }[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  async function run() {
    setRunning(true);
    setDone(false);
    setLog([]);

    const res = await fetch('/api/discover', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ locations, types, limit }),
    });

    if (!res.body) {
      setLog([{ line: 'No response body — check server logs', error: true }]);
      setRunning(false);
      return;
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buf     = '';

    while (true) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;

      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop() ?? '';

      for (const part of parts) {
        const dataLine = part.replace(/^data: /, '').trim();
        if (!dataLine) continue;
        try {
          const msg = JSON.parse(dataLine);
          if (msg.done) {
            setDone(true);
            setExitCode(msg.code ?? 0);
          } else {
            setLog(prev => [...prev, { line: msg.line, error: msg.error }]);
          }
        } catch {}
      }
    }

    setRunning(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">🔍 Discover Leads</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Run the Google Places pipeline and import results directly into the CRM</p>
          </div>
          <button onClick={onClose} disabled={running} className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none">✕</button>
        </div>

        {/* Config */}
        {!running && !done && (
          <div className="px-6 py-5 space-y-4 shrink-0">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Locations</label>
              <textarea
                value={locations}
                onChange={e => setLocations(e.target.value)}
                rows={2}
                placeholder="St. Louis MO, Chesterfield MO, Clayton MO"
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
              />
              <p className="text-xs text-muted-foreground">Comma-separated city names</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Types</label>
              <textarea
                value={types}
                onChange={e => setTypes(e.target.value)}
                rows={3}
                placeholder="restaurant,hair_care,plumber,auto_repair"
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none font-mono"
              />
              <p className="text-xs text-muted-foreground">Google Places types, comma-separated. Common: <span className="font-mono text-foreground/70">restaurant, hair_care, plumber, auto_repair, beauty_salon, gym, dentist, florist, lawyer</span></p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Discover Limit</label>
              <input
                type="number"
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                min={1}
                max={500}
                className="w-32 bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">Max leads to import per run (0 = no limit)</p>
            </div>
          </div>
        )}

        {/* Log output */}
        {(running || done) && (
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto px-5 py-4 font-mono text-xs bg-black/40 m-4 rounded-lg border border-border min-h-48"
          >
            {log.map((entry, i) => (
              <div key={i} className={entry.error ? 'text-red-400' : 'text-green-300/80'}>
                {entry.line}
              </div>
            ))}
            {running && (
              <div className="text-muted-foreground animate-pulse mt-1">▌</div>
            )}
            {done && (
              <div className={`mt-2 font-bold ${exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {exitCode === 0 ? '✅ Discovery complete!' : `❌ Exited with code ${exitCode}`}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            disabled={running}
            className="text-xs px-3 py-1.5 rounded border border-blue-400/40 text-blue-400 hover:bg-blue-400/10 transition-colors disabled:opacity-40"
          >
            ← {done ? 'Close' : 'Cancel'}
          </button>

          <div className="flex gap-2">
            {done && exitCode === 0 && (
              <Button size="sm" onClick={() => { onComplete(); onClose(); }} className="text-xs h-7">
                ↻ Refresh Leads
              </Button>
            )}
            {!done && (
              <Button size="sm" onClick={run} disabled={running || !locations.trim() || !types.trim()} className="text-xs h-7">
                {running ? (
                  <span className="flex items-center gap-1.5"><span className="animate-spin">⟳</span> Running…</span>
                ) : (
                  '🔍 Run Discovery'
                )}
              </Button>
            )}
            {done && (
              <Button size="sm" variant="outline" onClick={() => { setDone(false); setLog([]); }} className="text-xs h-7">
                🔁 Run Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
