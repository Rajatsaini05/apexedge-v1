// src/pages/AnalyticsPage.jsx
// Deep-dive analytics using only safe recharts components (BarChart, LineChart, PieChart).

import { useMemo } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Activity, Target, Zap, Clock,
  BarChart2, Download, FileText,
} from 'lucide-react';
import { Card, StatCard, Badge, PnlSpan, EmptyState, RTooltip, Btn } from '../components/atoms';
import { TopBar } from '../components/layout';
import { calcStats } from '../utils/tradeEngine';
import TradeCalendar from '../components/TradeCalendar';

// ── Helpers ───────────────────────────────────────────────────────────────────
function byKey(trades, keyFn) {
  const m = {};
  trades.forEach(t => {
    const k = keyFn(t);
    if (!m[k]) m[k] = { key:k, wins:0, losses:0, pnl:0, trades:0 };
    m[k].trades++;
    if (t.status === 'win')  m[k].wins++;
    if (t.status === 'loss') m[k].losses++;
    m[k].pnl += t.pnl || 0;
  });
  return Object.values(m).map(x => ({
    ...x,
    pnl:     +x.pnl.toFixed(2),
    winRate: x.trades ? Math.round(x.wins / x.trades * 100) : 0,
  }));
}

const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function calcStreaks(trades) {
  const sorted = [...trades]
    .filter(t => ['win','loss'].includes(t.status) && t.exitDate)
    .sort((a,b) => new Date(a.exitDate) - new Date(b.exitDate));
  let maxW=0, maxL=0, cW=0, cL=0;
  sorted.forEach(t => {
    if (t.status==='win')  { cW++; cL=0; if (cW>maxW) maxW=cW; }
    else                   { cL++; cW=0; if (cL>maxL) maxL=cL; }
  });
  const last = sorted[sorted.length-1];
  let current = { type:'none', count:0 };
  if (last) {
    let cs=0, ct=last.status;
    for (let i=sorted.length-1; i>=0 && sorted[i].status===ct; i--) cs++;
    current = { type:ct, count:cs };
  }
  return { maxW, maxL, current };
}

function consistencyScore(trades) {
  const s = calcStats(trades);
  if (!s.total) return 0;
  const wrScore = Math.min(s.winRate, 70) / 70 * 40;
  const pfScore = Math.min(parseFloat(s.pf)||0, 3) / 3 * 30;
  const ddScore = Math.max(0, 30 - Math.abs(s.maxDD) / Math.max(s.gross_w, 1) * 30);
  return Math.round(wrScore + pfScore + ddScore);
}

function avgDurationMins(trades) {
  const m = trades.filter(t => t.duration && !t.duration.includes('manual')).map(t => {
    const h = t.duration.match(/(\d+)h/);
    const min = t.duration.match(/(\d+)m/);
    return (h ? parseInt(h[1])*60 : 0) + (min ? parseInt(min[1]) : 0);
  }).filter(v => v > 0);
  if (!m.length) return 0;
  return Math.round(m.reduce((s,v)=>s+v,0)/m.length);
}

// ── Export helpers (safe - no external dep) ────────────────────────────────────
function exportCSV(trades) {
  const hdr = ['ID','Pair','Direction','Entry Date','Exit Date','Entry $','Exit $','Lots','PnL','Result','Duration','RR','Notes'];
  const rows = trades.map(t => [
    t.id, t.pair, t.side==='buy'?'LONG':'SHORT',
    t.entryDate||'', t.exitDate||'',
    t.entryPrice||'', t.exitPrice||'', t.lots||'', t.pnl||'', t.status||'',
    t.duration||'', t.rr||'', (t.notes||'').replace(/,/g,' '),
  ].join(','));
  const csv  = [hdr.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href:url, download:'apexedge_trades.csv' });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Main ───────────────────────────────────────────────────────────────────────
const AnalyticsPage = ({ trades, setPage }) => {
  const closed   = useMemo(() => trades.filter(t => ['win','loss','be'].includes(t.status)), [trades]);
  const stats    = useMemo(() => calcStats(trades),     [trades]);
  const strk     = useMemo(() => calcStreaks(trades),   [trades]);
  const score    = useMemo(() => consistencyScore(trades), [trades]);
  const avgDurMins = useMemo(() => avgDurationMins(closed), [closed]);

  const byPair    = useMemo(() => byKey(closed, t => t.pair).sort((a,b) => b.trades-a.trades), [closed]);
  const byDay     = useMemo(() => byKey(closed, t => {
    const idx = (new Date(t.exitDate||t.entryDate).getDay() + 6) % 7; // Mon=0
    return DAYS[idx];
  }), [closed]);
  const byMonth   = useMemo(() => byKey(closed, t => MONTHS[new Date(t.exitDate||t.entryDate).getMonth()]), [closed]);

  // Lot distribution
  const lotBuckets = useMemo(() => {
    const m = {};
    closed.forEach(t => {
      const k = (Math.floor(t.lots*10)/10).toFixed(1);
      if (!m[k]) m[k] = { lot:k, count:0 };
      m[k].count++;
    });
    return Object.values(m).sort((a,b) => parseFloat(a.lot)-parseFloat(b.lot));
  }, [closed]);

  // Cumulative PnL line
  const cumPnl = useMemo(() => {
    let eq = 0;
    return [...closed]
      .sort((a,b) => new Date(a.exitDate)-new Date(b.exitDate))
      .map((t,i) => { eq+=t.pnl; return { n:i+1, equity:+eq.toFixed(2) }; });
  }, [closed]);

  if (!trades.length) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <TopBar title="Analytics" subtitle="Deep-dive performance statistics"/>
      <EmptyState icon={BarChart2} title="No data to analyse" desc="Import trades first." cta="Import CSV" onCta={()=>setPage('import')}/>
    </div>
  );

  const scoreColor = score>=70?'emerald':score>=45?'amber':'rose';
  const avgDurLabel = avgDurMins < 60 ? `${avgDurMins}m` : `${Math.floor(avgDurMins/60)}h ${avgDurMins%60}m`;

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <TopBar
        title="Analytics"
        subtitle="Pair breakdown · Day analysis · Streak stats · Risk profile"
        tradeCount={closed.length}
        actions={
          <Btn variant="ghost" size="sm" onClick={() => exportCSV(trades)}>
            <Download size={12}/> Export CSV
          </Btn>
        }
      />

      <div style={{ flex:1, overflowY:'auto', padding:20 }}>

        {/* ── Headline stats ── */}
        <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12, marginBottom:16 }}>
          <StatCard label="Consistency" value={score} sub={score>=70?'Consistent':score>=45?'Developing':'Needs Work'}
            icon={Target} accent={scoreColor} glow trend={score}/>
          <StatCard label="Best Win Streak"  value={`${strk.maxW} trades`}
            sub={`Current: ${strk.current.type==='win'?strk.current.count:0}`} icon={TrendingUp} accent="emerald"/>
          <StatCard label="Worst Loss Streak" value={`${strk.maxL} trades`}
            sub={`Current: ${strk.current.type==='loss'?strk.current.count:0}`} icon={TrendingDown} accent="rose"/>
          <StatCard label="Avg Duration" value={avgDurMins ? avgDurLabel : '—'}
            icon={Clock} accent="sky"/>
          <StatCard label="Expectancy / Trade"
            value={`$${stats.total ? ((stats.gross_w-stats.gross_l)/stats.total).toFixed(2) : '0.00'}`}
            sub="Expected PnL per trade" icon={Zap}
            accent={stats.gross_w>stats.gross_l?'emerald':'rose'}/>
        </div>

        {/* ── Cumulative PnL + By Pair ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:12, marginBottom:12 }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={cumPnl} margin={{ top:4,right:4,bottom:0,left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="n" tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false} label={{ value:'Trade #', position:'insideBottomRight', offset:-4, fill:'#475569', fontSize:10 }}/>
                <YAxis tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                <Tooltip content={<RTooltip/>}/>
                <Line type="monotone" dataKey="equity" stroke="#6366f1" strokeWidth={2} dot={false}
                  activeDot={{ fill:'#818cf8', r:4 }}/>
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card style={{ padding:16 }}>
            <p style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.7px', fontFamily:'var(--fm)', marginBottom:12 }}>P&L by Pair</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byPair} layout="vertical" margin={{ top:4,right:12,bottom:0,left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" horizontal={false}/>
                <XAxis type="number" tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                <YAxis type="category" dataKey="key" tick={{ fill:'#94a3b8', fontSize:11, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false} width={70}/>
                <Tooltip content={<RTooltip/>}/>
                <Bar dataKey="pnl" radius={[0,4,4,0]}>
                  {byPair.map((d,i) => <Cell key={i} fill={d.pnl>=0?'#10b981':'#f43f5e'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* ── Win rate by day + Monthly PnL ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <Card style={{ padding:16 }}>
            <p style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.7px', fontFamily:'var(--fm)', marginBottom:12 }}>Win Rate by Day of Week</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={DAYS.map(d => byDay.find(x=>x.key===d) || { key:d, winRate:0, trades:0 })} margin={{ top:4,right:4,bottom:0,left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
                <XAxis dataKey="key" tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                <Tooltip contentStyle={{ background:'var(--card2)', border:'1px solid var(--line)', fontSize:11, fontFamily:'var(--fm)' }} formatter={v=>[`${v}%`,'Win Rate']}/>
                <Bar dataKey="winRate" radius={[4,4,0,0]}>
                  {DAYS.map((d,i) => { const wd=byDay.find(x=>x.key===d); return <Cell key={i} fill={(wd?.winRate||0)>=50?'#10b981':'#f43f5e'}/>; })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Day tiles */}
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:10 }}>
              {DAYS.map(d => { const wd=byDay.find(x=>x.key===d); if (!wd) return null; return (
                <div key={d} style={{ flex:1, minWidth:50, background:'var(--card2)', borderRadius:7, padding:'6px 8px', textAlign:'center' }}>
                  <p style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--fm)', marginBottom:2 }}>{d}</p>
                  <p style={{ fontSize:13, fontWeight:700, fontFamily:'var(--fh)', color:wd.winRate>=50?'var(--emerald)':'var(--rose)' }}>{wd.winRate}%</p>
                  <p style={{ fontSize:9, color:'var(--muted)', fontFamily:'var(--fm)' }}>{wd.trades}T</p>
                </div>
              ); })}
            </div>
          </Card>

          <Card style={{ padding:16 }}>
            <p style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.7px', fontFamily:'var(--fm)', marginBottom:12 }}>Monthly P&L</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={byMonth} margin={{ top:4,right:4,bottom:0,left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
                <XAxis dataKey="key" tick={{ fill:'#475569', fontSize:9, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                <Tooltip content={<RTooltip/>}/>
                <Bar dataKey="pnl" radius={[4,4,0,0]}>
                  {byMonth.map((d,i) => <Cell key={i} fill={d.pnl>=0?'#10b981':'#f43f5e'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* ── Lot size distribution ── */}
        <Card style={{ padding:16, marginBottom:12 }}>
          <p style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.7px', fontFamily:'var(--fm)', marginBottom:12 }}>
            Lot Size Distribution · Avg {stats.avgLots}
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={lotBuckets} margin={{ top:4,right:4,bottom:0,left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
              <XAxis dataKey="lot" tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:'var(--card2)', border:'1px solid var(--line)', fontSize:11, fontFamily:'var(--fm)' }} formatter={v=>[v,'Trades']}/>
              <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* ── Calendar ── */}
        <Card style={{ padding:20 }}>
          <p style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.7px', fontFamily:'var(--fm)', marginBottom:16 }}>
            Monthly P&L Calendar
          </p>
          <TradeCalendar trades={trades}/>
        </Card>

      </div>
    </div>
  );
};

export default AnalyticsPage;
