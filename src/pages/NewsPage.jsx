// src/pages/NewsPage.jsx
// Forex Factory economic calendar + latest FX news.
// Uses the public FF calendar JSON endpoint (no API key needed).
// Falls back to a CORS proxy if direct access is blocked.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, AlertTriangle, Clock, Filter, ExternalLink, Calendar } from 'lucide-react';
import { Card, Badge, Btn, EmptyState } from '../components/atoms';
import { TopBar } from '../components/layout';

// ── Forex Factory calendar endpoints ─────────────────────────────────────────
// Primary: direct JSON (works in most regions)
// Fallback: CORS proxy
const FF_ENDPOINTS = [
  'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
  'https://nfs.faireconomy.media/ff_calendar_nextweek.json',
];
const CORS_PREFIX = 'https://corsproxy.io/?';

// ── Currency pairs of interest (filter) ──────────────────────────────────────
const ALL_CURRENCIES = ['ALL','USD','EUR','GBP','JPY','AUD','CAD','CHF','NZD','CNY','XAU'];
const IMPACT_COLORS  = {
  'High':    { bg:'rgba(244,63,94,.12)',   border:'rgba(244,63,94,.3)',   color:'#fb7185',  dot:'#f43f5e' },
  'Medium':  { bg:'rgba(245,158,11,.10)',  border:'rgba(245,158,11,.25)', color:'#fcd34d',  dot:'#f59e0b' },
  'Low':     { bg:'rgba(99,102,241,.08)',  border:'rgba(99,102,241,.2)',  color:'#818cf8',  dot:'#6366f1' },
  'Holiday': { bg:'rgba(148,163,184,.06)', border:'rgba(148,163,184,.15)',color:'#94a3b8',  dot:'#475569' },
};
const IMPACT_LABELS = ['High','Medium','Low','Holiday'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', hour12:false });
  } catch { return isoStr; }
}
function fmtDate(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleDateString('en-GB', { weekday:'short', month:'short', day:'numeric' });
  } catch { return isoStr; }
}
function isUpcoming(isoStr) {
  if (!isoStr) return false;
  return new Date(isoStr) > new Date();
}
function isPast(isoStr) {
  if (!isoStr) return false;
  return new Date(isoStr) < new Date();
}

// ── Fetch from FF (with CORS fallback) ───────────────────────────────────────
async function fetchFFCalendar(useProxy = false) {
  const results = [];
  for (const url of FF_ENDPOINTS) {
    const fetchUrl = useProxy ? `${CORS_PREFIX}${encodeURIComponent(url)}` : url;
    try {
      const res  = await fetch(fetchUrl, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data)) results.push(...data);
    } catch {}
  }
  return results;
}

// ── Impact bullet ─────────────────────────────────────────────────────────────
const ImpactDot = ({ impact }) => {
  const c = IMPACT_COLORS[impact] || IMPACT_COLORS.Low;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background:c.dot, boxShadow: impact==='High' ? `0 0 6px ${c.dot}` : 'none', flexShrink:0 }}/>
      <span style={{ fontSize:10, color:c.color, fontFamily:'var(--fm)', fontWeight:600 }}>{impact?.toUpperCase()}</span>
    </span>
  );
};

// ── Live clock ────────────────────────────────────────────────────────────────
const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <span style={{ fontFamily:'var(--fm)', fontSize:12, color:'var(--sub)' }}>
      {time.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })} UTC{new Intl.DateTimeFormat().resolvedOptions().timeZone === 'UTC' ? '' : ' (local)'}
    </span>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const NewsPage = () => {
  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [filterCcy,    setFilterCcy]    = useState('ALL');
  const [filterImpact, setFilterImpact] = useState(['High','Medium','Low','Holiday']);
  const [selectedEvent,setSelectedEvent]= useState(null);

  const load = useCallback(async (useProxy = false) => {
    setLoading(true); setError('');
    try {
      let data = await fetchFFCalendar(useProxy);
      if (!data.length && !useProxy) {
        console.log('[News] Direct fetch empty — trying CORS proxy…');
        data = await fetchFFCalendar(true);
      }
      if (!data.length) throw new Error('No calendar data returned. This may be a weekend or the service is temporarily unavailable.');

      // Sort by date ascending
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || 'Failed to load calendar.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const t = setInterval(() => load(), 5 * 60_000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    let r = [...events];
    if (filterCcy !== 'ALL') r = r.filter(e => e.currency === filterCcy);
    r = r.filter(e => filterImpact.includes(e.impact));
    return r;
  }, [events, filterCcy, filterImpact]);

  // Group by date
  const grouped = useMemo(() => {
    const m = {};
    filtered.forEach(e => {
      const d = fmtDate(e.date);
      if (!m[d]) m[d] = [];
      m[d].push(e);
    });
    return Object.entries(m);
  }, [filtered]);

  const toggleImpact = (imp) =>
    setFilterImpact(prev => prev.includes(imp) ? (prev.length > 1 ? prev.filter(x => x !== imp) : prev) : [...prev, imp]);

  // High-impact upcoming count for badge
  const highUpcoming = events.filter(e => e.impact === 'High' && isUpcoming(e.date)).length;

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <TopBar
        title="Economic Calendar"
        subtitle="Forex Factory · This week + next week"
        actions={
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <LiveClock/>
            {highUpcoming > 0 && <Badge color="rose">{highUpcoming} High Impact Upcoming</Badge>}
            <Btn variant="ghost" size="sm" onClick={() => load()} disabled={loading}>
              <RefreshCw size={12} className={loading ? 'spin' : ''}/> {loading ? 'Loading…' : 'Refresh'}
            </Btn>
          </div>
        }
      />

      {/* ── Filters ── */}
      <div style={{ borderBottom:'1px solid var(--line)', padding:'10px 20px', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', background:'var(--surface)' }}>
        {/* Currency filter */}
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {ALL_CURRENCIES.map(c => (
            <button key={c} onClick={() => setFilterCcy(c)} style={{ padding:'4px 10px', borderRadius:20, border:'1px solid', borderColor: filterCcy===c ? 'var(--indigo)' : 'var(--line)', background: filterCcy===c ? 'rgba(99,102,241,.1)' : 'transparent', color: filterCcy===c ? '#818cf8' : 'var(--muted)', fontSize:11, cursor:'pointer', fontFamily:'var(--fm)', fontWeight: filterCcy===c ? 600 : 400, transition:'all .12s' }}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ width:1, height:20, background:'var(--line)' }}/>

        {/* Impact filter */}
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <Filter size={12} color="var(--muted)"/>
          {IMPACT_LABELS.map(imp => {
            const c = IMPACT_COLORS[imp];
            const on = filterImpact.includes(imp);
            return (
              <button key={imp} onClick={() => toggleImpact(imp)} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, border:`1px solid ${on ? c.border : 'var(--line)'}`, background: on ? c.bg : 'transparent', color: on ? c.color : 'var(--muted)', fontSize:11, cursor:'pointer', fontFamily:'var(--fm)', transition:'all .12s' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background: on ? c.dot : 'var(--muted)' }}/>
                {imp}
              </button>
            );
          })}
        </div>

        {lastUpdated && (
          <span style={{ marginLeft:'auto', fontSize:10, color:'var(--muted)', fontFamily:'var(--fm)' }}>
            Updated {lastUpdated.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ flex:1, overflowY:'auto', padding:20 }}>
        {error && (
          <div style={{ marginBottom:16, padding:'12px 16px', background:'rgba(244,63,94,.06)', border:'1px solid rgba(244,63,94,.2)', borderRadius:10 }}>
            <p style={{ fontSize:12, color:'var(--rose)', fontFamily:'var(--fm)', display:'flex', alignItems:'flex-start', gap:8 }}>
              <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }}/>{error}
            </p>
            <Btn variant="ghost" size="sm" onClick={() => load(true)} style={{ marginTop:10 }}>
              <RefreshCw size={11}/> Try with CORS proxy
            </Btn>
          </div>
        )}

        {loading && !events.length && (
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:40, justifyContent:'center', color:'var(--muted)', fontFamily:'var(--fm)', fontSize:13 }}>
            <div className="spin" style={{ width:20,height:20,border:'2px solid var(--line)',borderTopColor:'var(--indigo)',borderRadius:'50%' }}/>
            Loading economic calendar…
          </div>
        )}

        {!loading && !events.length && !error && (
          <EmptyState icon={Calendar} title="No events found" desc="The calendar may be empty for this period, or try refreshing." cta="Refresh" onCta={() => load()}/>
        )}

        {grouped.map(([dateLabel, dayEvents]) => (
          <div key={dateLabel} style={{ marginBottom:20 }}>
            {/* Date header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <span style={{ fontFamily:'var(--fh)', fontWeight:700, fontSize:14, color:'var(--text)' }}>{dateLabel}</span>
              <div style={{ flex:1, height:1, background:'var(--line)' }}/>
              <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--fm)' }}>
                {dayEvents.filter(e => e.impact === 'High').length > 0 && (
                  <span style={{ color:'var(--rose)', fontWeight:600 }}>{dayEvents.filter(e => e.impact === 'High').length} High </span>
                )}
                {dayEvents.length} events
              </span>
            </div>

            {/* Events */}
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {dayEvents.map((ev, i) => {
                const c         = IMPACT_COLORS[ev.impact] || IMPACT_COLORS.Low;
                const upcoming  = isUpcoming(ev.date);
                const past      = isPast(ev.date);
                const isSelected= selectedEvent?.title === ev.title && selectedEvent?.date === ev.date;
                const hasActual = ev.actual !== undefined && ev.actual !== null && ev.actual !== '';

                return (
                  <div key={i}>
                    <div
                      onClick={() => setSelectedEvent(isSelected ? null : ev)}
                      style={{
                        display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                        background: isSelected ? c.bg : upcoming && ev.impact==='High' ? 'rgba(244,63,94,.04)' : 'var(--card)',
                        border:`1px solid ${isSelected ? c.border : upcoming && ev.impact==='High' ? 'rgba(244,63,94,.15)' : 'var(--line)'}`,
                        borderRadius:8, cursor:'pointer', transition:'all .12s',
                        opacity: past && !hasActual ? 0.65 : 1,
                      }}
                    >
                      {/* Time */}
                      <div style={{ width:52, flexShrink:0 }}>
                        <span style={{ fontSize:12, fontFamily:'var(--fm)', color: upcoming ? 'var(--text)' : 'var(--muted)', fontWeight: upcoming ? 600 : 400 }}>
                          {fmtTime(ev.date)}
                        </span>
                      </div>

                      {/* Currency badge */}
                      <div style={{ width:38, flexShrink:0 }}>
                        <span style={{ display:'inline-block', padding:'2px 6px', borderRadius:4, background:'var(--card2)', border:'1px solid var(--line)', fontSize:11, fontFamily:'var(--fm)', fontWeight:700, color:'var(--text)' }}>
                          {ev.currency}
                        </span>
                      </div>

                      {/* Impact */}
                      <div style={{ width:90, flexShrink:0 }}>
                        <ImpactDot impact={ev.impact}/>
                      </div>

                      {/* Event title */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight: ev.impact==='High' ? 600 : 400, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {ev.title}
                        </p>
                      </div>

                      {/* Forecast / Actual / Previous */}
                      <div style={{ display:'flex', gap:16, fontSize:11, fontFamily:'var(--fm)', flexShrink:0 }}>
                        {ev.forecast !== undefined && ev.forecast !== null && ev.forecast !== '' && (
                          <div style={{ textAlign:'center', minWidth:50 }}>
                            <p style={{ color:'var(--muted)', fontSize:9, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:1 }}>Forecast</p>
                            <p style={{ color:'var(--sub)', fontWeight:500 }}>{ev.forecast}</p>
                          </div>
                        )}
                        {hasActual && (
                          <div style={{ textAlign:'center', minWidth:50 }}>
                            <p style={{ color:'var(--muted)', fontSize:9, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:1 }}>Actual</p>
                            <p style={{ fontWeight:700, color: ev.forecast && ev.actual > ev.forecast ? 'var(--emerald)' : ev.forecast && ev.actual < ev.forecast ? 'var(--rose)' : 'var(--text)' }}>
                              {ev.actual}
                            </p>
                          </div>
                        )}
                        {ev.previous !== undefined && ev.previous !== null && ev.previous !== '' && (
                          <div style={{ textAlign:'center', minWidth:50 }}>
                            <p style={{ color:'var(--muted)', fontSize:9, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:1 }}>Previous</p>
                            <p style={{ color:'var(--muted)' }}>{ev.previous}</p>
                          </div>
                        )}
                        {upcoming && ev.impact === 'High' && (
                          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--rose)', animation:'blink 1.5s ease infinite', boxShadow:'0 0 6px var(--rose)', alignSelf:'center' }}/>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isSelected && (
                      <div className="fade-in" style={{ marginTop:2, marginLeft:8, padding:'12px 16px', background:'var(--card2)', border:'1px solid var(--line)', borderRadius:8, fontSize:12, fontFamily:'var(--fm)' }}>
                        <p style={{ fontWeight:600, color:'var(--text)', marginBottom:8 }}>{ev.title}</p>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom: ev.url ? 12 : 0 }}>
                          {[
                            ['Currency', ev.currency],
                            ['Impact',   ev.impact],
                            ['Forecast', ev.forecast || '—'],
                            ['Actual',   ev.actual   || '—'],
                            ['Previous', ev.previous || '—'],
                            ['Time',     fmtTime(ev.date)],
                          ].map(([k,v]) => (
                            <div key={k} style={{ background:'var(--card)', borderRadius:6, padding:'7px 10px' }}>
                              <p style={{ fontSize:9, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3 }}>{k}</p>
                              <p style={{ fontWeight:600, color:'var(--text)' }}>{v}</p>
                            </div>
                          ))}
                        </div>
                        {ev.url && (
                          <a href={ev.url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'var(--indigo)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
                            <ExternalLink size={11}/> View on Forex Factory
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsPage;
