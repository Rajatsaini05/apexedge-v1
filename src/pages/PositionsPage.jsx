// src/pages/PositionsPage.jsx
// Uses addTrade (Supabase) for manual entries and deleteTrade for removal.

import { useState, useMemo } from 'react';
import { Plus, Search, X, Check, List, Trash2 } from 'lucide-react';
import { Card, Badge, Btn, PnlSpan, EmptyState } from '../components/atoms';
import { TopBar } from '../components/layout';
import { calcStats } from '../utils/tradeEngine';
import { useTrades } from '../hooks/useTrades';

const PositionsPage = ({ trades, setTrades, addTrade, setPage }) => {
  const { deleteTrade } = useTrades();
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [sort,    setSort]    = useState({ col: 'exitDate', asc: false });
  const [sel,     setSel]     = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addErr,  setAddErr]  = useState('');
  const [form,    setForm]    = useState({ pair: 'XAU/USD', side: 'buy', entryDate: '', exitDate: '', entryPrice: '', exitPrice: '', lots: '', notes: '' });

  const filtered = useMemo(() => {
    let r = [...trades];
    if (search) r = r.filter(t => t.pair?.toLowerCase().includes(search.toLowerCase()) || t.id?.includes(search));
    if (filter !== 'all') r = r.filter(t => t.status === filter);
    r.sort((a, b) => {
      const va = a[sort.col] ?? '', vb = b[sort.col] ?? '';
      return sort.asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return r;
  }, [trades, search, filter, sort]);

  const stats = useMemo(() => calcStats(filtered), [filtered]);

  // ── Manual trade entry → saved to Supabase ───────────────────────────────────
  const handleAddManual = async () => {
    const ep   = parseFloat(form.entryPrice);
    const xp   = parseFloat(form.exitPrice);
    const lots = parseFloat(form.lots);
    if (!ep || !lots) { setAddErr('Entry price and lot size are required.'); return; }

    const raw = !isNaN(xp) && xp > 0
      ? (form.side === 'buy' ? (xp - ep) * lots * 100 : (ep - xp) * lots * 100)
      : null;
    const pnl    = raw !== null ? +raw.toFixed(2) : null;
    const status = pnl === null ? 'open' : pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be';

    const newTrade = {
      id:          `M${Date.now()}`,
      pair:         form.pair || 'XAU/USD',
      side:         form.side,
      entryDate:    form.entryDate || new Date().toISOString(),
      exitDate:     form.exitDate  || null,
      entryPrice:   ep,
      exitPrice:    !isNaN(xp) && xp > 0 ? xp : null,
      lots,
      pnl,
      status,
      duration:    'manual',
      notes:        form.notes || '',
      tags:         [],
      source:      'manual',
    };

    setAddBusy(true); setAddErr('');
    try {
      if (addTrade) {
        // Persist to Supabase
        await addTrade(newTrade);
      } else {
        // Fallback: local state only
        setTrades(p => [newTrade, ...p]);
      }
      setShowAdd(false);
      setForm({ pair: 'XAU/USD', side: 'buy', entryDate: '', exitDate: '', entryPrice: '', exitPrice: '', lots: '', notes: '' });
    } catch (e) {
      setAddErr(e.message || 'Failed to save trade.');
    } finally {
      setAddBusy(false);
    }
  };

  // ── Delete trade from Supabase ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trade?')) return;
    try {
      if (deleteTrade) await deleteTrade(id);
      else setTrades(p => p.filter(t => t.id !== id));
      if (sel?.id === id) setSel(null);
    } catch (e) {
      console.error('[Delete trade]', e);
    }
  };

  const Th = ({ col, label }) => (
    <th onClick={() => setSort(s => ({ col, asc: s.col === col ? !s.asc : false }))} style={{ padding: '10px 14px', fontSize: 10, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--fm)', fontWeight: 500, whiteSpace: 'nowrap', background: 'var(--surface)', borderBottom: '1px solid var(--line)', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>
      {label}{sort.col === col ? (sort.asc ? ' ↑' : ' ↓') : ''}
    </th>
  );

  if (!trades.length) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar title="Positions" subtitle="All trades · sorted · filterable" />
      <EmptyState icon={List} title="No positions yet" desc="Import your trade history or add entries manually." cta="Import CSV" onCta={() => setPage('import')} />
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar
        title="Positions"
        subtitle={`${filtered.length} of ${trades.length} records`}
        tradeCount={trades.length}
        actions={<Btn size="sm" onClick={() => { setShowAdd(true); setAddErr(''); }}><Plus size={13} />Add Trade</Btn>}
      />

      {/* Quick stats strip */}
      <div style={{ padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--line)', display: 'flex', gap: 16, fontSize: 12, fontFamily: 'var(--fm)', overflowX: 'auto', flexShrink: 0 }}>
        {[
          ['Net P&L',  `$${stats.net?.toFixed(2)}`,  stats.net  >= 0 ? 'var(--emerald)' : 'var(--rose)'],
          ['Win Rate', `${stats.winRate}%`,           stats.winRate >= 50 ? 'var(--emerald)' : 'var(--rose)'],
          ['Trades',   stats.total,                   'var(--text)'],
          ['Avg Win',  `$${stats.avgW}`,              'var(--emerald)'],
          ['Avg Loss', `$${stats.avgL}`,              'var(--rose)'],
          ['Max DD',   `$${Math.abs(stats.maxDD||0).toFixed(2)}`, 'var(--amber)'],
        ].map(([k, v, c]) => (
          <div key={k}><span style={{ color: 'var(--muted)' }}>{k}: </span><span style={{ color: c, fontWeight: 500 }}>{v}</span></div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pair or ID…" style={{ paddingLeft: 32, height: 32, fontSize: 12 }} />
        </div>
        {['all', 'win', 'loss', 'be', 'open'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid', borderColor: filter === f ? 'var(--indigo)' : 'var(--line)', background: filter === f ? 'rgba(99,102,241,.1)' : 'transparent', color: filter === f ? '#818cf8' : 'var(--muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--fm)', textTransform: 'uppercase', letterSpacing: '.5px', transition: 'all .12s' }}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <Th col="id"          label="ID" />
              <Th col="pair"        label="Pair" />
              <Th col="side"        label="Dir" />
              <Th col="entryDate"   label="Entry Time" />
              <Th col="exitDate"    label="Exit Time" />
              <Th col="entryPrice"  label="Entry $" />
              <Th col="exitPrice"   label="Exit $" />
              <Th col="lots"        label="Lots" />
              <Th col="pnl"         label="P&L" />
              <Th col="status"      label="Result" />
              <Th col="duration"    label="Dur" />
              <Th col="rr"          label="R:R" />
              <th style={{ padding: '10px 14px', fontSize: 10, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--fm)', fontWeight: 500, background: 'var(--surface)', borderBottom: '1px solid var(--line)', textAlign: 'left' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr
                key={t.id}
                onClick={() => setSel(sel?.id === t.id ? null : t)}
                style={{ cursor: 'pointer', background: sel?.id === t.id ? 'rgba(99,102,241,.04)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.01)', transition: 'background .08s' }}
              >
                <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--muted)' }}>{t.id}</td>
                <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600 }}>{t.pair}</td>
                <td style={{ padding: '9px 14px' }}><span style={{ fontSize: 11, color: t.side === 'buy' ? 'var(--emerald)' : 'var(--rose)', fontFamily: 'var(--fm)', fontWeight: 500 }}>{t.side === 'buy' ? '▲ L' : '▼ S'}</span></td>
                <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)', whiteSpace: 'nowrap' }}>{t.entryDate ? new Date(t.entryDate).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)', whiteSpace: 'nowrap' }}>{t.exitDate ? new Date(t.exitDate).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: 'var(--fm)' }}>{t.entryPrice?.toFixed(2)}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: 'var(--fm)' }}>{t.exitPrice?.toFixed(2) || '—'}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: 'var(--fm)' }}>{t.lots}</td>
                <td style={{ padding: '9px 14px' }}><PnlSpan v={t.pnl} /></td>
                <td style={{ padding: '9px 14px' }}>
                  {t.status === 'win'  ? <Badge color="emerald">WIN</Badge>  :
                   t.status === 'loss' ? <Badge color="rose">LOSS</Badge>    :
                   t.status === 'be'   ? <Badge color="slate">BE</Badge>     :
                                         <Badge color="indigo">OPEN</Badge>}
                </td>
                <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)' }}>{t.duration || '—'}</td>
                <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--amber)' }}>{t.rr || '—'}</td>
                <td style={{ padding: '9px 14px' }}>
                  <button onClick={e => { e.stopPropagation(); handleDelete(t.id); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, borderRadius: 4, opacity: 0.5 }}>
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--fm)', fontSize: 12 }}>No trades match this filter.</div>}
        </div>{/* end minWidth wrapper */}
      </div>

      {/* Detail strip */}
      {sel && (
        <div className="fade-in" style={{ borderTop: '1px solid var(--line2)', padding: '14px 20px', background: 'rgba(99,102,241,.03)', display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--fh)', fontWeight: 700, fontSize: 16 }}>{sel.pair}</span>
              <Badge color={sel.side === 'buy' ? 'emerald' : 'rose'}>{sel.side === 'buy' ? 'LONG' : 'SHORT'}</Badge>
              <PnlSpan v={sel.pnl} />
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 12, fontFamily: 'var(--fm)', color: 'var(--sub)', flexWrap: 'wrap' }}>
              {[['Entry', sel.entryPrice?.toFixed(2)], ['Exit', sel.exitPrice?.toFixed(2) || '—'], ['Lots', sel.lots], ['Duration', sel.duration], ['TP', sel.tp?.toFixed(2) || '—'], ['SL', sel.sl?.toFixed(2) || '—'], ['R:R', sel.rr || '—'], ['Source', sel.source || 'csv']].map(([k, v]) => (
                <span key={k}>{k}: <span style={{ color: 'var(--text)' }}>{v}</span></span>
              ))}
            </div>
            {sel.notes && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--sub)', fontFamily: 'var(--fm)', background: 'var(--card2)', padding: '6px 10px', borderRadius: 6 }}>{sel.notes}</p>}
          </div>
          <button onClick={() => setSel(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>
      )}

      {/* Add manual modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card className="fade-up" style={{ width: 500, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--fh)', fontSize: 16, fontWeight: 700 }}>Manual Trade Entry</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Pair', 'pair', 'text', 'XAU/USD'], ['Entry Price', 'entryPrice', 'number', ''], ['Exit Price', 'exitPrice', 'number', 'Optional'], ['Lot Size', 'lots', 'number', '0.10']].map(([l, k, type, ph]) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>{l}</label>
                  <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} type={type} placeholder={ph} step="any" />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>Direction</label>
                <select value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))}><option value="buy">Buy (Long)</option><option value="sell">Sell (Short)</option></select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>Entry Date</label>
                <input type="datetime-local" value={form.entryDate} onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>Exit Date</label>
                <input type="datetime-local" value={form.exitDate} onChange={e => setForm(f => ({ ...f, exitDate: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Trade reasoning…" style={{ resize: 'vertical', fontSize: 12 }} />
            </div>
            {addErr && <p style={{ color: 'var(--rose)', fontSize: 12, fontFamily: 'var(--fm)', marginTop: 10 }}>{addErr}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <Btn variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Btn>
              <Btn size="sm" onClick={handleAddManual} disabled={addBusy}>
                {addBusy ? <div className="spin" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : <Check size={13} />}
                Add & Save Trade
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PositionsPage;
