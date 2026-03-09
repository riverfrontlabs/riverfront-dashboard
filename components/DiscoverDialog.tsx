'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onClose:    () => void;
  onComplete: () => void;
}

// ── Full Google Places type list ─────────────────────────────────────
const PLACE_TYPES: { id: string; label: string }[] = [
  { id: 'accounting',              label: 'Accounting'              },
  { id: 'airport',                 label: 'Airport'                 },
  { id: 'amusement_park',          label: 'Amusement Park'          },
  { id: 'aquarium',                label: 'Aquarium'                },
  { id: 'art_gallery',             label: 'Art Gallery'             },
  { id: 'atm',                     label: 'ATM'                     },
  { id: 'bakery',                  label: 'Bakery'                  },
  { id: 'bank',                    label: 'Bank'                    },
  { id: 'bar',                     label: 'Bar'                     },
  { id: 'beauty_salon',            label: 'Beauty Salon'            },
  { id: 'bicycle_store',           label: 'Bicycle Store'           },
  { id: 'book_store',              label: 'Book Store'              },
  { id: 'bowling_alley',           label: 'Bowling Alley'           },
  { id: 'bus_station',             label: 'Bus Station'             },
  { id: 'cafe',                    label: 'Café'                    },
  { id: 'campground',              label: 'Campground'              },
  { id: 'car_dealer',              label: 'Car Dealer'              },
  { id: 'car_rental',              label: 'Car Rental'              },
  { id: 'car_repair',              label: 'Car Repair'              },
  { id: 'car_wash',                label: 'Car Wash'                },
  { id: 'casino',                  label: 'Casino'                  },
  { id: 'cemetery',                label: 'Cemetery'                },
  { id: 'church',                  label: 'Church'                  },
  { id: 'city_hall',               label: 'City Hall'               },
  { id: 'clothing_store',          label: 'Clothing Store'          },
  { id: 'convenience_store',       label: 'Convenience Store'       },
  { id: 'courthouse',              label: 'Courthouse'              },
  { id: 'dentist',                 label: 'Dentist'                 },
  { id: 'department_store',        label: 'Department Store'        },
  { id: 'doctor',                  label: 'Doctor'                  },
  { id: 'drugstore',               label: 'Drugstore'               },
  { id: 'electrician',             label: 'Electrician'             },
  { id: 'electronics_store',       label: 'Electronics Store'       },
  { id: 'embassy',                 label: 'Embassy'                 },
  { id: 'fire_station',            label: 'Fire Station'            },
  { id: 'florist',                 label: 'Florist'                 },
  { id: 'funeral_home',            label: 'Funeral Home'            },
  { id: 'furniture_store',         label: 'Furniture Store'         },
  { id: 'gas_station',             label: 'Gas Station'             },
  { id: 'gym',                     label: 'Gym / Fitness'           },
  { id: 'hair_care',               label: 'Hair Care'               },
  { id: 'hardware_store',          label: 'Hardware Store'          },
  { id: 'hindu_temple',            label: 'Hindu Temple'            },
  { id: 'home_goods_store',        label: 'Home Goods Store'        },
  { id: 'hospital',                label: 'Hospital'                },
  { id: 'insurance_agency',        label: 'Insurance Agency'        },
  { id: 'jewelry_store',           label: 'Jewelry Store'           },
  { id: 'laundry',                 label: 'Laundry'                 },
  { id: 'lawyer',                  label: 'Lawyer'                  },
  { id: 'library',                 label: 'Library'                 },
  { id: 'liquor_store',            label: 'Liquor Store'            },
  { id: 'local_government_office', label: 'Local Government Office' },
  { id: 'locksmith',               label: 'Locksmith'               },
  { id: 'lodging',                 label: 'Lodging / Hotel'         },
  { id: 'meal_delivery',           label: 'Meal Delivery'           },
  { id: 'meal_takeaway',           label: 'Meal Takeaway'           },
  { id: 'mosque',                  label: 'Mosque'                  },
  { id: 'movie_rental',            label: 'Movie Rental'            },
  { id: 'movie_theater',           label: 'Movie Theater'           },
  { id: 'moving_company',          label: 'Moving Company'          },
  { id: 'museum',                  label: 'Museum'                  },
  { id: 'night_club',              label: 'Night Club'              },
  { id: 'painter',                 label: 'Painter'                 },
  { id: 'park',                    label: 'Park'                    },
  { id: 'parking',                 label: 'Parking'                 },
  { id: 'pet_store',               label: 'Pet Store'               },
  { id: 'pharmacy',                label: 'Pharmacy'                },
  { id: 'physiotherapist',         label: 'Physiotherapist'         },
  { id: 'plumber',                 label: 'Plumber'                 },
  { id: 'police',                  label: 'Police'                  },
  { id: 'post_office',             label: 'Post Office'             },
  { id: 'primary_school',          label: 'Primary School'          },
  { id: 'real_estate_agency',      label: 'Real Estate Agency'      },
  { id: 'restaurant',              label: 'Restaurant'              },
  { id: 'roofing_contractor',      label: 'Roofing Contractor'      },
  { id: 'rv_park',                 label: 'RV Park'                 },
  { id: 'school',                  label: 'School'                  },
  { id: 'shoe_store',              label: 'Shoe Store'              },
  { id: 'shopping_mall',           label: 'Shopping Mall'           },
  { id: 'spa',                     label: 'Spa'                     },
  { id: 'stadium',                 label: 'Stadium'                 },
  { id: 'storage',                 label: 'Storage'                 },
  { id: 'store',                   label: 'Store (General)'         },
  { id: 'subway_station',          label: 'Subway Station'          },
  { id: 'supermarket',             label: 'Supermarket'             },
  { id: 'synagogue',               label: 'Synagogue'               },
  { id: 'taxi_stand',              label: 'Taxi Stand'              },
  { id: 'tourist_attraction',      label: 'Tourist Attraction'      },
  { id: 'train_station',           label: 'Train Station'           },
  { id: 'transit_station',         label: 'Transit Station'         },
  { id: 'travel_agency',           label: 'Travel Agency'           },
  { id: 'university',              label: 'University'              },
  { id: 'veterinary_care',         label: 'Veterinary Care'         },
  { id: 'zoo',                     label: 'Zoo'                     },
];

const DEFAULT_TYPES     = ['restaurant', 'hair_care', 'plumber', 'auto_repair', 'beauty_salon'];
const DEFAULT_LOCATIONS = ['St. Louis MO'];

// ── Tag chip ─────────────────────────────────────────────────────────
function Tag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-xs text-primary font-medium">
      {label}
      <button onClick={onRemove} className="opacity-60 hover:opacity-100 transition-opacity leading-none ml-0.5">✕</button>
    </span>
  );
}

// ── Location autocomplete ─────────────────────────────────────────────
function LocationPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [input,       setInput]       = useState('');
  const [suggestions, setSuggestions] = useState<{ label: string; value: string }[]>([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef  = useRef<AbortController | null>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (q: string) => {
    setInput(q);

    // Cancel any pending debounce + in-flight request
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }

    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    // Wait for the user to stop typing before fetching
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res  = await fetch(`/api/cities?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 700);
  };

  const add = (value: string) => {
    if (!selected.includes(value)) onChange([...selected, value]);
    setInput('');
    setSuggestions([]);
    setOpen(false);
    setLoading(false);
  };

  const remove = (value: string) => onChange(selected.filter(v => v !== value));

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="relative">
        <input
          value={input}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search for a city…"
          className="w-full bg-background border border-border rounded px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        {/* Spinner */}
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </span>
        )}
        {open && !loading && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-xl overflow-hidden">
            {suggestions.map(s => (
              <li
                key={s.value}
                onMouseDown={() => add(s.value)}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {selected.length > 0 && (
        <div className="grid grid-flow-col grid-rows-6 gap-x-3 gap-y-1.5 w-fit">
          {selected.map(v => (
            <Tag key={v} label={v} onRemove={() => remove(v)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Business type picker ──────────────────────────────────────────────
function TypePicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [open,   setOpen]   = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = PLACE_TYPES.filter(t =>
    !selected.includes(t.id) &&
    (t.label.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search.toLowerCase()))
  );

  const add = (id: string) => {
    onChange([...selected, id]);
    setSearch('');
  };

  const remove = (id: string) => onChange(selected.filter(v => v !== id));

  const labelFor = (id: string) => PLACE_TYPES.find(t => t.id === id)?.label ?? id;

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="relative">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search business types…"
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        {open && (
          <ul className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-xl overflow-y-auto max-h-52">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                {selected.length === PLACE_TYPES.length ? 'All types selected' : 'No matches'}
              </li>
            ) : filtered.map(t => (
              <li
                key={t.id}
                onMouseDown={() => add(t.id)}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between"
              >
                <span>{t.label}</span>
                <span className="text-xs text-muted-foreground font-mono ml-2">{t.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selected.length > 0 && (
        <div className="grid grid-flow-col grid-rows-6 gap-x-3 gap-y-1.5 w-fit">
          {selected.map(id => (
            <Tag key={id} label={labelFor(id)} onRemove={() => remove(id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────
export default function DiscoverDialog({ onClose, onComplete }: Props) {
  const [selLocations, setSelLocations] = useState<string[]>(DEFAULT_LOCATIONS);
  const [selTypes,     setSelTypes]     = useState<string[]>(DEFAULT_TYPES);
  const [limit,        setLimit]        = useState(50);
  const [running,      setRunning]      = useState(false);
  const [done,         setDone]         = useState(false);
  const [exitCode,     setExitCode]     = useState<number | null>(null);
  const [log,          setLog]          = useState<{ line: string; error?: boolean }[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

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
      body:    JSON.stringify({
        locations: selLocations.join(', '),
        types:     selTypes.join(','),
        limit,
      }),
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
          if (msg.done) { setDone(true); setExitCode(msg.code ?? 0); }
          else           setLog(prev => [...prev, { line: msg.line, error: msg.error }]);
        } catch {}
      }
    }

    setRunning(false);
  }

  const canRun = selLocations.length > 0 && selTypes.length > 0 && !running;

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
          <div className="px-6 py-5 space-y-5 shrink-0 overflow-y-auto">

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Target Locations
              </label>
              <LocationPicker selected={selLocations} onChange={setSelLocations} />
              <p className="text-xs text-muted-foreground">Type a city name and select from the suggestions</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Business Types
              </label>
              <TypePicker selected={selTypes} onChange={setSelTypes} />
              <p className="text-xs text-muted-foreground">Search and select from all Google Places business types</p>
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
              <p className="text-xs text-muted-foreground">Max leads to import per run</p>
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
              <div key={i} className={entry.error ? 'text-red-400' : 'text-green-300/80'}>{entry.line}</div>
            ))}
            {running && <div className="text-muted-foreground animate-pulse mt-1">▌</div>}
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
              <Button size="sm" onClick={run} disabled={!canRun} className="text-xs h-7">
                {running
                  ? <span className="flex items-center gap-1.5"><span className="animate-spin">⟳</span> Running…</span>
                  : '🔍 Run Discovery'}
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
