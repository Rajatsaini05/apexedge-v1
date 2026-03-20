// src/components/TradeCalendar.jsx
// Monthly calendar grid showing daily P&L, trade count.
// Click any day to see trade details for that day.
// Standalone — no recharts needed.

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Card, PnlSpan, Badge } from './atoms';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function buildCalendarData(trades, year, month) {
  // month: 0-indexed
  const map = {};
  trades.filter(t => t.exitDate).forEach(t => {
    const d = new Date(t.exitDate);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const key = d.getDate();
    if (!map[key]) map[key] = { pnl: 0, trades: 0, wins: 0, losses: 0, list: [] };
    map[key].pnl    += t.pnl || 0;
    map[key].trades++;
    if (t.status === 'win')  map[key].wins++;
    if (t.status === 'loss') map[key].losses++;
    map[key].list.push(t);
  });
  // Round pnl
  Object.values(map).forEach(d => { d.pnl = Math.round(d.pnl * 100) / 100; });
  return map;
}

const TradeCalendar = ({ trades }) => {
  const today      = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sel,   setSel]   = useState(null); // selected day number

  const data = useMemo(() => buildCalendarData(trades, year, month), [trades, year, month]);

  // Prev / next month
  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); setSel(null); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); setSel(null); };

  // Build grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Mon-first: Sun=6, Mon=0 ... Sat=5
  const offset   = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Monthly totals
  const monthPnl    = Object.values(data).reduce((s,d) => s + d.pnl, 0);
  const monthTrades = Object.values(data).reduce((s,d) => s + d.trades, 0);
  const tradingDays = Object.keys(data).length;

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selData = sel ? data[sel] : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={prev} style={{ background:'var(--card2)', border:'1px solid var(--line)', borderRadius:6, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--sub)' }}>
            <ChevronLeft size={14}/>
          </button>
          <span style={{ fontFamily:'var(--fh)', fontWeight:700, fontSize:15 }}>{MONTHS[month]} {year}</span>
          <button onClick={next} style={{ background:'var(--card2)', border:'1px solid var(--line)', borderRadius:6, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--sub)' }}>
            <ChevronRight size={14}/>
          </button>
        </div>
        <div style={{ display:'flex', gap:16, fontSize:11, fontFamily:'var(--fm)', color:'var(--sub)' }}>
          <span>{monthTrades} trades · {tradingDays} days</span>
          <span style={{ color: monthPnl >= 0 ? 'var(--emerald)' : 'var(--rose)', fontWeight:600 }}>
            {monthPnl >= 0 ? '+' : ''}${monthPnl.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:3 }}>
        {DAYS_OF_WEEK.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:10, color:'var(--muted)', fontFamily:'var(--fm)', padding:'4px 0', letterSpacing:'.5px' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const d         = data[day];
          const isToday   = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
          const isSelected= sel === day;
          const hasTrades = !!d;
          const pnlColor  = !d ? 'transparent' : d.pnl > 0 ? 'rgba(16,185,129,' : d.pnl < 0 ? 'rgba(244,63,94,' : 'rgba(99,102,241,';
          const intensity = hasTrades ? Math.min(Math.abs(d.pnl) / 200, 1) * 0.5 + 0.12 : 0;
          const bg        = hasTrades ? `${pnlColor}${intensity.toFixed(2)})` : 'var(--card2)';

          return (
            <div
              key={day}
              onClick={() => hasTrades && setSel(isSelected ? null : day)}
              style={{
                background:  bg,
                border:      `1px solid ${isSelected ? 'var(--indigo)' : isToday ? 'rgba(99,102,241,.4)' : 'var(--line)'}`,
                borderRadius: 7,
                padding:     '6px 7px',
                minHeight:   54,
                cursor:       hasTrades ? 'pointer' : 'default',
                transition:  'all .12s',
                position:    'relative',
              }}
            >
              <div style={{ fontSize:11, fontFamily:'var(--fm)', color: isToday ? 'var(--indigo)' : 'var(--sub)', fontWeight: isToday ? 700 : 400, marginBottom:3 }}>
                {day}
              </div>
              {d && (
                <>
                  <div style={{ fontSize:10, fontFamily:'var(--fm)', fontWeight:600, color: d.pnl > 0 ? 'var(--emerald)' : d.pnl < 0 ? 'var(--rose)' : 'var(--sub)', lineHeight:1.2 }}>
                    {d.pnl > 0 ? '+' : ''}${d.pnl.toFixed(2)}
                  </div>
                  <div style={{ fontSize:9, color:'var(--muted)', fontFamily:'var(--fm)', marginTop:2 }}>
                    {d.trades}T
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginTop:10, fontSize:10, fontFamily:'var(--fm)', color:'var(--muted)' }}>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:10, height:10, borderRadius:3, background:'rgba(16,185,129,.35)', display:'inline-block' }}/>Profit
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:10, height:10, borderRadius:3, background:'rgba(244,63,94,.35)', display:'inline-block' }}/>Loss
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:10, height:10, borderRadius:3, background:'var(--card2)', border:'1px solid var(--line)', display:'inline-block' }}/>No trades
        </span>
        <span style={{ marginLeft:'auto' }}>Click any day for details</span>
      </div>

      {/* Day detail panel */}
      {sel && selData && (
        <div className="fade-in" style={{ marginTop:14, padding:16, background:'var(--card2)', border:'1px solid var(--line2)', borderRadius:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontFamily:'var(--fh)', fontWeight:700, fontSize:15 }}>
                {MONTHS[month]} {sel}, {year}
              </span>
              <Badge color={selData.pnl >= 0 ? 'emerald' : 'rose'}>
                {selData.pnl >= 0 ? '+' : ''}${selData.pnl.toFixed(2)}
              </Badge>
              <Badge color="slate">{selData.trades} trade{selData.trades !== 1 ? 's' : ''}</Badge>
              {selData.wins   > 0 && <Badge color="emerald">{selData.wins}W</Badge>}
              {selData.losses > 0 && <Badge color="rose">{selData.losses}L</Badge>}
            </div>
            <button onClick={() => setSel(null)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer' }}>
              <X size={15}/>
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {selData.list.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', background:'var(--card)', borderRadius:7, border:'1px solid var(--line)', fontSize:12 }}>
                <span style={{ fontFamily:'var(--fm)', color:'var(--muted)', fontSize:10, width:32 }}>{t.id}</span>
                <span style={{ fontWeight:600 }}>{t.pair}</span>
                <span style={{ fontSize:11, color: t.side==='buy' ? 'var(--emerald)' : 'var(--rose)', fontFamily:'var(--fm)' }}>
                  {t.side==='buy' ? '▲ LONG' : '▼ SHORT'}
                </span>
                <span style={{ fontFamily:'var(--fm)', fontSize:11, color:'var(--sub)' }}>{t.lots}L</span>
                <span style={{ fontFamily:'var(--fm)', fontSize:11, color:'var(--sub)' }}>
                  {t.entryPrice?.toFixed(2)} → {t.exitPrice?.toFixed(2) || '—'}
                </span>
                <span style={{ fontFamily:'var(--fm)', fontSize:11, color:'var(--sub)' }}>{t.duration}</span>
                <div style={{ marginLeft:'auto' }}><PnlSpan v={t.pnl}/></div>
                <Badge color={t.status==='win'?'emerald':t.status==='loss'?'rose':'slate'}>
                  {t.status?.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeCalendar;
