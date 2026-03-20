// src/pages/ChartPage.jsx
import { useState, useMemo } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Badge, Btn, Divider, PnlSpan, TogglePill } from '../components/atoms';
import { TVWidget, LWChart } from '../components/charts';
import { SYMBOL_CATS, DEFAULT_SYMBOL } from '../config/symbols';

const ChartPage = ({ trades, setPage }) => {
  const [symbol,      setSymbol]      = useState(DEFAULT_SYMBOL);
  const [activeCat,   setActiveCat]   = useState('Forex Majors');
  const [showMarkers, setShowMarkers] = useState(false);
  const [selectedId,  setSelectedId]  = useState(null);
  const [customSym,   setCustomSym]   = useState('');
  const [showCustom,  setShowCustom]  = useState(false);

  const recent    = useMemo(() => [...trades].filter(t => t.exitDate).sort((a, b) => new Date(b.exitDate) - new Date(a.exitDate)).slice(0, 20), [trades]);
  const hasTrades = trades.length > 0;
  const catData   = SYMBOL_CATS.find(c => c.cat === activeCat);

  const applyCustom = () => {
    const v = customSym.trim().toUpperCase();
    if (v) { setSymbol(v); setShowCustom(false); setCustomSym(''); }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Category tabs ── */}
      <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 40, gap: 2, overflowX: 'auto' }}>
          {SYMBOL_CATS.map(c => (
            <button key={c.cat} onClick={() => setActiveCat(c.cat)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--fm)', fontSize: 11, whiteSpace: 'nowrap', transition: 'all .12s', background: activeCat === c.cat ? 'rgba(255,255,255,.07)' : 'transparent', color: activeCat === c.cat ? 'var(--text)' : 'var(--muted)', fontWeight: activeCat === c.cat ? 600 : 400 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', marginRight: 6, verticalAlign: 'middle', background: activeCat === c.cat ? c.color : 'transparent', transition: 'all .12s' }} />
              {c.cat}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {showCustom ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input value={customSym} onChange={e => setCustomSym(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyCustom()} placeholder="e.g. FX:USDJPY" style={{ width: 160, height: 28, fontSize: 11, padding: '4px 8px' }} autoFocus />
              <Btn size="sm" onClick={applyCustom} style={{ height: 28, padding: '0 10px' }}>Go</Btn>
              <button onClick={() => setShowCustom(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0 4px' }}><X size={13} /></button>
            </div>
          ) : (
            <button onClick={() => setShowCustom(true)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--fm)' }}>+ Custom</button>
          )}
        </div>

        {/* ── Symbol chips ── */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 40, gap: 4, overflowX: 'auto', borderTop: '1px solid var(--line)' }}>
          {catData?.symbols.map(s => (
            <button key={s.value} onClick={() => setSymbol(s.value)} style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid', whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'var(--fm)', fontSize: 11, transition: 'all .12s', borderColor: symbol === s.value ? catData.color : 'var(--line)', background: symbol === s.value ? `color-mix(in srgb, ${catData.color} 12%, transparent)` : 'transparent', color: symbol === s.value ? catData.color : 'var(--muted)', fontWeight: symbol === s.value ? 600 : 400 }}>
              {s.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fm)', marginRight: 8 }}>
            Active: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{symbol.split(':')[1] || symbol}</span>
          </span>
          <TogglePill on={showMarkers} onToggle={() => setShowMarkers(v => !v)} label="Show My Trades" badge={hasTrades ? trades.length : null} />
        </div>
      </div>

      {/* ── Chart area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* TradingView — always visible */}
        <div style={{ flex: showMarkers && hasTrades ? '0 0 55%' : 1, minHeight: 0, transition: 'flex .25s ease' }}>
          <TVWidget symbol={symbol} />
        </div>

        {/* Trade markers panel */}
        {showMarkers && hasTrades && (
          <div className="fade-in" style={{ flex: '0 0 45%', minHeight: 0, borderTop: '2px solid var(--indigo)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ height: 36, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, borderBottom: '1px solid var(--line)', background: 'var(--surface)', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fm)', textTransform: 'uppercase', letterSpacing: '.7px' }}>Trade Markers</span>
              <Badge color="indigo">{trades.length} plotted</Badge>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fm)', display: 'flex', gap: 16 }}>
                <span><span style={{ color: 'var(--emerald)' }}>▲</span> Buy entry</span>
                <span><span style={{ color: 'var(--rose)' }}>▼</span> Sell entry</span>
                <span><span style={{ color: 'var(--emerald)' }}>●</span> Win exit</span>
                <span><span style={{ color: 'var(--rose)' }}>●</span> Loss exit</span>
                <span style={{ color: 'var(--muted)' }}>5-min synthetic · hover for details</span>
              </span>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 260px', minHeight: 0, overflow: 'hidden' }}>
              <div style={{ position: 'relative', minHeight: 0 }}>
                <LWChart trades={trades} />
              </div>
              <div style={{ borderLeft: '1px solid var(--line)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fm)', textTransform: 'uppercase', letterSpacing: '.5px', flexShrink: 0 }}>Trade Log</div>
                {recent.map(t => (
                  <div key={t.id} onClick={() => setSelectedId(selectedId === t.id ? null : t.id)} style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: selectedId === t.id ? 'rgba(99,102,241,.07)' : 'transparent', transition: 'background .1s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{t.id} · {t.pair}</span>
                      <PnlSpan v={t.pnl} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--muted)' }}>
                      <span style={{ color: t.side === 'buy' ? 'var(--emerald)' : 'var(--rose)' }}>{t.side === 'buy' ? '▲' : '▼'} {t.side.toUpperCase()} {t.lots}L</span>
                      <span>{t.duration}</span>
                    </div>
                    {selectedId === t.id && (
                      <div className="fade-in" style={{ marginTop: 8, padding: 8, background: 'var(--card2)', borderRadius: 7, fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)', lineHeight: 2 }}>
                        {[['Entry', t.entryPrice?.toFixed(2)], ['Exit', t.exitPrice?.toFixed(2) || '—'], ['TP', t.tp?.toFixed(2) || '—'], ['SL', t.sl?.toFixed(2) || '—'], ['R:R', t.rr || '—'], ['P&L', (t.pnl > 0 ? '+' : '') + '$' + (t.pnl?.toFixed(2) ?? '0')]].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{k}</span>
                            <span style={{ color: k === 'P&L' ? (t.pnl > 0 ? 'var(--emerald)' : 'var(--rose)') : 'var(--text)', fontWeight: 500 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No-trades hint */}
        {showMarkers && !hasTrades && (
          <div className="fade-in" style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--card2)', border: '1px solid var(--amber)', borderRadius: 10, padding: '10px 20px', fontSize: 12, fontFamily: 'var(--fm)', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', zIndex: 10 }}>
            <AlertTriangle size={14} />
            No trades imported yet —{' '}
            <button onClick={() => setPage('import')} style={{ background: 'none', border: 'none', color: 'var(--indigo)', cursor: 'pointer', fontFamily: 'var(--fm)', fontSize: 12, textDecoration: 'underline' }}>
              import your CSV
            </button>{' '}
            to see markers
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartPage;
