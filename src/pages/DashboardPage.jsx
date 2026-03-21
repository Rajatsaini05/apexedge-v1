// src/pages/DashboardPage.jsx
import { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Activity, Target, Shield, Zap, BarChart2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Card, Badge, StatCard, PnlSpan, Divider, EmptyState, RTooltip } from '../components/atoms';
import { TopBar } from '../components/layout';
import { calcStats, buildEquityCurve, buildDailyPnL } from '../utils/tradeEngine';
import TradeCalendar from '../components/TradeCalendar';
import { useMT5 } from '../hooks/useMT5';

const PAIR_COLORS = ['#6366f1','#10b981','#f59e0b','#f43f5e','#38bdf8'];

const DashboardPage = ({ trades, setPage }) => {
  const { connected, account, openPositions } = useMT5();
  const stats   = useMemo(() => calcStats(trades),        [trades]);
  const equity  = useMemo(() => buildEquityCurve(trades), [trades]);
  const daily   = useMemo(() => buildDailyPnL(trades),    [trades]);
  const recent  = useMemo(() => [...trades]
    .filter(t => t.exitDate)
    .sort((a,b) => new Date(b.exitDate) - new Date(a.exitDate))
    .slice(0,7), [trades]);
  const pairMap = useMemo(() => {
    const m = {};
    trades.forEach(t => {
      if (!m[t.pair]) m[t.pair] = { name:t.pair, value:0 };
      m[t.pair].value++;
    });
    return Object.values(m);
  }, [trades]);

  // Live equity from MT5 if connected
  const liveEquity = connected && account ? parseFloat(account.equity||0) : null;
  const totalFloating = openPositions.reduce((s,p) => s + parseFloat(p.profit||0), 0);

  if (!trades.length) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <TopBar title="Dashboard" subtitle="Overview of your trading performance" />
      <EmptyState
        icon={BarChart2}
        title="No trades yet"
        desc="Import a CSV or connect your MT5 account to start seeing analytics."
        cta="Import Trades"
        onCta={() => setPage('import')}
      />
    </div>
  );

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <TopBar
        title="Dashboard"
        subtitle={`Last updated ${new Date().toLocaleTimeString()}`}
        tradeCount={stats.total}
        actions={
          <Badge color={stats.net >= 0 ? 'emerald' : 'rose'}>
            {stats.net >= 0 ? '+' : ''}${stats.net?.toFixed(2)} Net P&L
          </Badge>
        }
      />

      <div style={{ flex:1, overflowY:'auto', padding:20 }}>

        {/* ── Stat row ── */}
        <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, marginBottom:16 }}>
          <StatCard label="Total Trades"  value={stats.total}
            sub={`${stats.wins}W / ${stats.losses}L`}
            icon={Activity} accent="indigo" glow trend={stats.winRate} />
          <StatCard label="Win Rate"      value={`${stats.winRate}%`}
            sub={`PF: ${stats.pf}`}
            icon={Target}   accent={stats.winRate >= 50 ? 'emerald' : 'rose'} trend={stats.winRate} />
          <StatCard label="Net P&L"       value={`$${stats.net?.toFixed(2)}`}
            sub={`GW $${stats.gross_w?.toFixed(0)} / GL $${stats.gross_l?.toFixed(0)}`}
            icon={stats.net >= 0 ? TrendingUp : TrendingDown}
            accent={stats.net >= 0 ? 'emerald' : 'rose'} />
          <StatCard label="Profit Factor" value={stats.pf}
            sub={`Max DD: $${Math.abs(stats.maxDD || 0).toFixed(2)}`}
            icon={Shield}
            accent={parseFloat(stats.pf) >= 1.5 ? 'emerald' : parseFloat(stats.pf) >= 1 ? 'amber' : 'rose'} />
          <StatCard label="Avg Win/Loss"  value={`$${stats.avgW}`}
            sub={`Avg Loss: $${stats.avgL}`}
            icon={Zap} accent="amber" />
        </div>

        {/* ── Equity curve + pie ── */}
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) min(300px,100%)', gap:12, marginBottom:12 }}>
          <Card style={{ padding:16 }}>
            <p style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.7px', fontFamily:'var(--fm)', marginBottom:16 }}>
              Equity Curve
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={equity} margin={{ top:4, right:4, bottom:0, left:0 }}>
                <defs>
                  <linearGradient id="eqG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="label" tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`}/>
                <Tooltip content={<RTooltip/>}/>
                <Area type="monotone" dataKey="equity" stroke="#6366f1" strokeWidth={2} fill="url(#eqG)" dot={false}
                  activeDot={{ fill:'#818cf8', r:4, stroke:'#6366f1', strokeWidth:2 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <Card style={{ padding:16, flex:1 }}>
              <p style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.7px', fontFamily:'var(--fm)', marginBottom:12 }}>
                Pairs
              </p>
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={pairMap} cx="50%" cy="50%" innerRadius={32} outerRadius={48} dataKey="value" paddingAngle={4}>
                    {pairMap.map((_,i) => <Cell key={i} fill={PAIR_COLORS[i % PAIR_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n) => [v,n]} contentStyle={{ background:'var(--card2)', border:'1px solid var(--line)', fontSize:11, fontFamily:'var(--fm)' }}/>
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card style={{ padding:16 }}>
              <p style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.7px', fontFamily:'var(--fm)', marginBottom:10 }}>
                Result Split
              </p>
              <div style={{ display:'flex', gap:6 }}>
                {[['Wins',stats.wins,'var(--emerald)'],['Losses',stats.losses,'var(--rose)']].map(([l,v,c]) => (
                  <div key={l} style={{ flex:1, background:'var(--card2)', borderRadius:8, padding:'10px 12px' }}>
                    <p style={{ fontSize:18, fontFamily:'var(--fh)', fontWeight:700, color:c }}>{v}</p>
                    <p style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--fm)', textTransform:'uppercase', letterSpacing:'.5px' }}>{l}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Daily P&L bar + recent trades ── */}
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) min(280px,100%)', gap:12, marginBottom:12 }}>
          <Card style={{ padding:16 }}>
            <p style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.7px', fontFamily:'var(--fm)', marginBottom:16 }}>
              Daily P&L
            </p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={daily} margin={{ top:4, right:4, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
                <XAxis dataKey="d" tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'#475569', fontSize:10, fontFamily:'var(--fm)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`}/>
                <Tooltip content={<RTooltip/>}/>
                <Bar dataKey="pnl" radius={[4,4,0,0]}>
                  {daily.map((d,i) => <Cell key={i} fill={d.pnl >= 0 ? '#10b981' : '#f43f5e'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card style={{ padding:0, overflow:'hidden' }}>
            <p style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.7px', fontFamily:'var(--fm)', padding:'14px 16px 10px' }}>
              Recent Trades
            </p>
            <Divider/>
            <div style={{ padding:'4px 0' }}>
              {recent.map(t => (
                <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 16px', borderBottom:'1px solid var(--line)', fontSize:12 }}>
                  <div>
                    <span style={{ fontWeight:500, color:'var(--text)' }}>{t.pair}</span>
                    <span style={{ fontSize:10, color: t.side==='buy'?'var(--emerald)':'var(--rose)', marginLeft:6, fontFamily:'var(--fm)' }}>
                      {t.side==='buy' ? '▲' : '▼'}
                    </span>
                  </div>
                  <PnlSpan v={t.pnl}/>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── MT5 Live strip (only when connected) ── */}
        {connected && account && (
          <div className="fade-in" style={{ marginBottom:12, padding:'10px 16px', background:'rgba(16,185,129,.04)', border:'1px solid rgba(16,185,129,.15)', borderRadius:10, display:'flex', alignItems:'center', gap:20, flexWrap:'wrap', fontSize:12, fontFamily:'var(--fm)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--emerald)',boxShadow:'0 0 6px var(--emerald)',animation:'blink 2s ease infinite' }}/>
              <span style={{ color:'var(--emerald)', fontWeight:600 }}>MT5 Live</span>
              <span style={{ color:'var(--muted)' }}>{account.broker} · {account.login}</span>
            </div>
            {[
              ['Balance',   `$${parseFloat(account.balance||0).toFixed(2)}`,    'var(--text)'],
              ['Equity',    `$${parseFloat(account.equity||0).toFixed(2)}`,     parseFloat(account.equity||0) >= parseFloat(account.balance||0) ? 'var(--emerald)' : 'var(--rose)'],
              ['Floating',  `${totalFloating >= 0 ? '+' : ''}$${totalFloating.toFixed(2)}`, totalFloating >= 0 ? 'var(--emerald)' : 'var(--rose)'],
              ['Open Pos',  openPositions.length,                                'var(--indigo)'],
              ['Free Margin', `$${parseFloat(account.freeMargin||0).toFixed(2)}`, 'var(--sub)'],
            ].map(([k,v,c]) => (
              <div key={k}><span style={{ color:'var(--muted)' }}>{k}: </span><span style={{ color:c, fontWeight:600 }}>{v}</span></div>
            ))}
            <button onClick={()=>setPage('mt5')} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--indigo)', cursor:'pointer', fontSize:11, fontFamily:'var(--fm)' }}>View MT5 →</button>
          </div>
        )}

        {/* ── Live open positions (MT5) ── */}
        {connected && openPositions.length > 0 && (
          <Card style={{ padding:16, marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <p style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.7px', fontFamily:'var(--fm)' }}>
                Live Open Positions
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:'var(--emerald)',animation:'blink 2s ease infinite' }}/>
                <span style={{ fontSize:10, color:'var(--emerald)', fontFamily:'var(--fm)' }}>LIVE · updates every 10s</span>
              </div>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Symbol','Direction','Volume','Open Price','Current','Float P&L','SL','TP'].map(h => (
                      <th key={h} style={{ padding:'7px 12px', fontSize:10, letterSpacing:'.5px', textTransform:'uppercase', color:'var(--muted)', fontFamily:'var(--fm)', fontWeight:500, background:'var(--surface)', borderBottom:'1px solid var(--line)', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map((p,i) => (
                    <tr key={p.ticket} style={{ background: i%2===0?'transparent':'rgba(255,255,255,.01)' }}>
                      <td style={{ padding:'8px 12px', fontSize:13, fontWeight:600 }}>{p.symbol}</td>
                      <td style={{ padding:'8px 12px' }}><span style={{ fontSize:11, color:p.type==='buy'?'var(--emerald)':'var(--rose)', fontFamily:'var(--fm)', fontWeight:500 }}>{p.type==='buy'?'▲ LONG':'▼ SHORT'}</span></td>
                      <td style={{ padding:'8px 12px', fontSize:12, fontFamily:'var(--fm)' }}>{p.volume}</td>
                      <td style={{ padding:'8px 12px', fontSize:12, fontFamily:'var(--fm)' }}>{parseFloat(p.price_open||0).toFixed(5)}</td>
                      <td style={{ padding:'8px 12px', fontSize:12, fontFamily:'var(--fm)', fontWeight:600, color:parseFloat(p.profit||0)>=0?'var(--emerald)':'var(--rose)' }}>{parseFloat(p.price_current||0).toFixed(5)}</td>
                      <td style={{ padding:'8px 12px' }}><PnlSpan v={parseFloat(p.profit||0)}/></td>
                      <td style={{ padding:'8px 12px', fontSize:11, fontFamily:'var(--fm)', color:'var(--rose)' }}>{p.sl||'—'}</td>
                      <td style={{ padding:'8px 12px', fontSize:11, fontFamily:'var(--fm)', color:'var(--emerald)' }}>{p.tp||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Monthly P&L Calendar ── */}
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

export default DashboardPage;
