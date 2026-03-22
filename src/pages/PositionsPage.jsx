// src/pages/PositionsPage.jsx
//
// RULE: Every component (EditModal, AddModal, Field) is defined at the TOP
// of this file — OUTSIDE PositionsPage. Defining components inside another
// component causes React to unmount+remount them on every keystroke, which
// steals keyboard focus from inputs.

import { useState, useMemo } from 'react';
import { Plus, Search, X, Check, List, Trash2, Edit2 } from 'lucide-react';
import { Card, Badge, Btn, PnlSpan, EmptyState } from '../components/atoms';
import { TopBar } from '../components/layout';
import { calcStats } from '../utils/tradeEngine';

// ─── Field — defined OUTSIDE, never recreated ─────────────────────────────────
const Field = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div>
    <label style={{
      fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase',
      letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)',
    }}>
      {label}
    </label>
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      step={type === 'number' ? 'any' : undefined}
    />
  </div>
);

// ─── AddModal — defined OUTSIDE ───────────────────────────────────────────────
const AddModal = ({ show, onClose, form, setForm, onSubmit, busy, err }) => {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Card className="fade-up" style={{ width: 500, maxWidth: '100%', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--fh)', fontSize: 16, fontWeight: 700 }}>Add Manual Trade</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Pair"        value={form.pair}       onChange={e => setForm(f => ({ ...f, pair:       e.target.value }))} placeholder="XAUUSD" />
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>Direction</label>
            <select value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))}>
              <option value="buy">Buy (Long)</option>
              <option value="sell">Sell (Short)</option>
            </select>
          </div>
          <Field label="Entry Price" value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} type="number" />
          <Field label="Exit Price"  value={form.exitPrice}  onChange={e => setForm(f => ({ ...f, exitPrice:  e.target.value }))} type="number" placeholder="Leave blank if open" />
          <Field label="Lot Size"    value={form.lots}       onChange={e => setForm(f => ({ ...f, lots:       e.target.value }))} type="number" placeholder="0.10" />
          <div />
          <Field label="Entry Date"  value={form.entryDate}  onChange={e => setForm(f => ({ ...f, entryDate:  e.target.value }))} type="datetime-local" />
          <Field label="Exit Date"   value={form.exitDate}   onChange={e => setForm(f => ({ ...f, exitDate:   e.target.value }))} type="datetime-local" />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            style={{ resize: 'vertical', fontSize: 12 }}
            placeholder="Trade reasoning…"
          />
        </div>

        {err && <p style={{ color: 'var(--rose)', fontSize: 12, fontFamily: 'var(--fm)', marginTop: 10 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn size="sm" onClick={onSubmit} disabled={busy}>
            {busy
              ? <div className="spin" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
              : <Check size={13} />}
            Add & Save Trade
          </Btn>
        </div>
      </Card>
    </div>
  );
};

// ─── EditModal — defined OUTSIDE ──────────────────────────────────────────────
const EditModal = ({ trade, onSave, onClose, busy }) => {
  const [form, setForm] = useState({
    pair:       trade.pair        || '',
    side:       trade.side        || 'buy',
    entryDate:  trade.entryDate   ? new Date(trade.entryDate).toISOString().slice(0, 16)  : '',
    exitDate:   trade.exitDate    ? new Date(trade.exitDate).toISOString().slice(0, 16)   : '',
    entryPrice: trade.entryPrice  ?? '',
    exitPrice:  trade.exitPrice   ?? '',
    lots:       trade.lots        ?? '',
    tp:         trade.tp          ?? '',
    sl:         trade.sl          ?? '',
    notes:      trade.notes       || '',
  });
  const [err, setErr] = useState('');

  const handleSave = async () => {
    const ep   = parseFloat(form.entryPrice);
    const xp   = parseFloat(form.exitPrice);
    const lots = parseFloat(form.lots);
    if (!ep || !lots) { setErr('Entry price and lot size are required.'); return; }
    setErr('');

    const raw    = !isNaN(xp) && xp > 0
      ? (form.side === 'buy' ? (xp - ep) * lots * 100 : (ep - xp) * lots * 100)
      : null;
    const pnl    = raw !== null ? +raw.toFixed(2) : null;
    const status = pnl === null ? 'open' : pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be';
    const entryDate = form.entryDate ? new Date(form.entryDate).toISOString() : null;
    const exitDate  = form.exitDate  ? new Date(form.exitDate).toISOString()  : null;
    const durMin    = entryDate && exitDate
      ? Math.max(0, Math.round((new Date(exitDate) - new Date(entryDate)) / 60_000))
      : null;
    const duration  = durMin !== null
      ? (durMin < 60 ? `${durMin}m` : `${Math.floor(durMin / 60)}h ${durMin % 60}m`)
      : trade.duration;

    await onSave({
      pair: form.pair, side: form.side,
      entryDate, exitDate, entryPrice: ep,
      exitPrice: !isNaN(xp) && xp > 0 ? xp : null,
      lots, pnl, status, duration,
      tp:    parseFloat(form.tp) || null,
      sl:    parseFloat(form.sl) || null,
      notes: form.notes,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Card className="fade-up" style={{ width: 520, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--fh)', fontSize: 16, fontWeight: 700 }}>Edit Trade — {trade.pair}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Pair"         value={form.pair}       onChange={e => setForm(f => ({ ...f, pair:       e.target.value }))} />
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>Direction</label>
            <select value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))}>
              <option value="buy">Buy (Long)</option>
              <option value="sell">Sell (Short)</option>
            </select>
          </div>
          <Field label="Entry Price"  value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} type="number" />
          <Field label="Exit Price"   value={form.exitPrice}  onChange={e => setForm(f => ({ ...f, exitPrice:  e.target.value }))} type="number" placeholder="Blank = open" />
          <Field label="Lot Size"     value={form.lots}       onChange={e => setForm(f => ({ ...f, lots:       e.target.value }))} type="number" />
          <div />
          <Field label="Entry Time"   value={form.entryDate}  onChange={e => setForm(f => ({ ...f, entryDate:  e.target.value }))} type="datetime-local" />
          <Field label="Exit Time"    value={form.exitDate}   onChange={e => setForm(f => ({ ...f, exitDate:   e.target.value }))} type="datetime-local" />
          <Field label="Stop Loss"    value={form.sl}         onChange={e => setForm(f => ({ ...f, sl:         e.target.value }))} type="number" placeholder="Optional" />
          <Field label="Take Profit"  value={form.tp}         onChange={e => setForm(f => ({ ...f, tp:         e.target.value }))} type="number" placeholder="Optional" />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: 'vertical', fontSize: 12 }} />
        </div>

        {err && <p style={{ color: 'var(--rose)', fontSize: 12, fontFamily: 'var(--fm)', marginTop: 10 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn size="sm" onClick={handleSave} disabled={busy}>
            {busy
              ? <div className="spin" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
              : <Check size={13} />}
            Save Changes
          </Btn>
        </div>
      </Card>
    </div>
  );
};

// ─── SortHeader — defined OUTSIDE ────────────────────────────────────────────
const SortHeader = ({ col, label, sort, setSort }) => (
  <th
    onClick={() => setSort(s => ({ col, asc: s.col === col ? !s.asc : false }))}
    style={{ padding: '10px 14px', fontSize: 10, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--fm)', fontWeight: 500, whiteSpace: 'nowrap', background: 'var(--surface)', borderBottom: '1px solid var(--line)', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
  >
    {label}{sort.col === col ? (sort.asc ? ' ↑' : ' ↓') : ''}
  </th>
);

// ─── Empty add form default ───────────────────────────────────────────────────
const EMPTY_FORM = { pair: '', side: 'buy', entryDate: '', exitDate: '', entryPrice: '', exitPrice: '', lots: '', notes: '' };

// ─── Main page ────────────────────────────────────────────────────────────────
const PositionsPage = ({ trades, setTrades, addTrade, deleteTrade, updateTrade, setPage }) => {
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [sort,     setSort]     = useState({ col: 'exitDate', asc: false });
  const [sel,      setSel]      = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [addForm,  setAddForm]  = useState(EMPTY_FORM);
  const [addBusy,  setAddBusy]  = useState(false);
  const [addErr,   setAddErr]   = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const filtered = useMemo(() => {
    let r = [...trades];
    if (search) r = r.filter(t =>
      t.pair?.toLowerCase().includes(search.toLowerCase()) || t.id?.includes(search)
    );
    if (filter !== 'all') r = r.filter(t => t.status === filter);
    r.sort((a, b) => {
      const va = a[sort.col] ?? '', vb = b[sort.col] ?? '';
      return sort.asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return r;
  }, [trades, search, filter, sort]);

  const stats = useMemo(() => calcStats(filtered), [filtered]);

  // ── Add ──────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const ep   = parseFloat(addForm.entryPrice);
    const xp   = parseFloat(addForm.exitPrice);
    const lots = parseFloat(addForm.lots);
    if (!ep || !lots) { setAddErr('Entry price and lot size are required.'); return; }

    const raw    = !isNaN(xp) && xp > 0
      ? (addForm.side === 'buy' ? (xp - ep) * lots * 100 : (ep - xp) * lots * 100)
      : null;
    const pnl    = raw !== null ? +raw.toFixed(2) : null;
    const status = pnl === null ? 'open' : pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be';

    const newTrade = {
      id:         `M${Date.now()}`,
      pair:        addForm.pair || 'XAUUSD',
      side:        addForm.side,
      entryDate:   addForm.entryDate ? new Date(addForm.entryDate).toISOString() : new Date().toISOString(),
      exitDate:    addForm.exitDate  ? new Date(addForm.exitDate).toISOString()  : null,
      entryPrice:  ep,
      exitPrice:   !isNaN(xp) && xp > 0 ? xp : null,
      lots, pnl, status,
      duration: 'manual', notes: addForm.notes || '',
      tags: [], source: 'manual',
    };

    setAddBusy(true); setAddErr('');
    try {
      if (addTrade) await addTrade(newTrade);
      else setTrades(p => [newTrade, ...p]);
      setShowAdd(false);
      setAddForm(EMPTY_FORM);
    } catch (e) {
      setAddErr(e.message || 'Failed to save trade.');
    } finally {
      setAddBusy(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trade? This cannot be undone.')) return;
    try {
      if (deleteTrade) await deleteTrade(id);
      else setTrades(p => p.filter(t => t.id !== id));
      if (sel?.id === id) setSel(null);
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  // ── Update ────────────────────────────────────────────────────────────────
  const handleUpdate = async (updates) => {
    if (!showEdit) return;
    setEditBusy(true);
    try {
      if (updateTrade) await updateTrade(showEdit.id, updates);
      else setTrades(p => p.map(t => t.id === showEdit.id ? { ...t, ...updates } : t));
      setShowEdit(null);
      if (sel?.id === showEdit.id) setSel(null);
    } catch (e) {
      alert(`Update failed: ${e.message}`);
    } finally {
      setEditBusy(false);
    }
  };

  const openAdd  = () => { setAddForm(EMPTY_FORM); setAddErr(''); setShowAdd(true); };
  const closeAdd = () => { setShowAdd(false); setAddErr(''); };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!trades.length) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title="Positions"
        subtitle="All trades · sorted · filterable"
        actions={<Btn size="sm" onClick={openAdd}><Plus size={13} />Add Trade</Btn>}
      />
      <EmptyState
        icon={List}
        title="No positions yet"
        desc="Add trades manually with the button above, or import a broker CSV."
        cta="Import CSV"
        onCta={() => setPage('import')}
      />
      <AddModal
        show={showAdd}
        onClose={closeAdd}
        form={addForm}
        setForm={setAddForm}
        onSubmit={handleAdd}
        busy={addBusy}
        err={addErr}
      />
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar
        title="Positions"
        subtitle={`${filtered.length} of ${trades.length} records`}
        tradeCount={trades.length}
        actions={<Btn size="sm" onClick={openAdd}><Plus size={13} />Add Trade</Btn>}
      />

      {/* Stats strip */}
      <div style={{ padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--line)', display: 'flex', gap: 16, fontSize: 12, fontFamily: 'var(--fm)', overflowX: 'auto', flexShrink: 0 }}>
        {[
          ['Net P&L',  `$${stats.net?.toFixed(2)}`,              stats.net >= 0 ? 'var(--emerald)' : 'var(--rose)'],
          ['Win Rate', `${stats.winRate}%`,                       stats.winRate >= 50 ? 'var(--emerald)' : 'var(--rose)'],
          ['Trades',    String(stats.total),                      'var(--text)'],
          ['Avg Win',  `$${stats.avgW}`,                         'var(--emerald)'],
          ['Avg Loss', `$${stats.avgL}`,                         'var(--rose)'],
          ['Max DD',   `$${Math.abs(stats.maxDD || 0).toFixed(2)}`, 'var(--amber)'],
        ].map(([k, v, c]) => (
          <div key={k} style={{ whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--muted)' }}>{k}: </span>
            <span style={{ color: c, fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 200 }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pair or ID…" style={{ paddingLeft: 28, height: 32, fontSize: 12 }} />
        </div>
        {['all', 'win', 'loss', 'be', 'open'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid', borderColor: filter === f ? 'var(--indigo)' : 'var(--line)', background: filter === f ? 'rgba(99,102,241,.1)' : 'transparent', color: filter === f ? '#818cf8' : 'var(--muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--fm)', textTransform: 'uppercase', letterSpacing: '.5px', transition: 'all .12s' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <div style={{ minWidth: 760 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <SortHeader col="pair"       label="Pair"    sort={sort} setSort={setSort} />
                <SortHeader col="side"       label="Dir"     sort={sort} setSort={setSort} />
                <SortHeader col="entryDate"  label="Entry"   sort={sort} setSort={setSort} />
                <SortHeader col="exitDate"   label="Exit"    sort={sort} setSort={setSort} />
                <SortHeader col="entryPrice" label="Entry $" sort={sort} setSort={setSort} />
                <SortHeader col="exitPrice"  label="Exit $"  sort={sort} setSort={setSort} />
                <SortHeader col="lots"       label="Lots"    sort={sort} setSort={setSort} />
                <SortHeader col="pnl"        label="P&L"     sort={sort} setSort={setSort} />
                <SortHeader col="status"     label="Result"  sort={sort} setSort={setSort} />
                <SortHeader col="duration"   label="Dur"     sort={sort} setSort={setSort} />
                <th style={{ padding: '10px 10px', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fm)', background: 'var(--surface)', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr
                  key={t.id}
                  onClick={() => setSel(sel?.id === t.id ? null : t)}
                  style={{ cursor: 'pointer', background: sel?.id === t.id ? 'rgba(99,102,241,.04)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.01)', transition: 'background .08s' }}
                >
                  <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600 }}>{t.pair}</td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ fontSize: 11, color: t.side === 'buy' ? 'var(--emerald)' : 'var(--rose)', fontFamily: 'var(--fm)', fontWeight: 500 }}>
                      {t.side === 'buy' ? '▲ L' : '▼ S'}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)', whiteSpace: 'nowrap' }}>
                    {t.entryDate ? new Date(t.entryDate).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)', whiteSpace: 'nowrap' }}>
                    {t.exitDate ? new Date(t.exitDate).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: 'var(--fm)' }}>{t.entryPrice?.toFixed(5)}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: 'var(--fm)' }}>{t.exitPrice?.toFixed(5) || '—'}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: 'var(--fm)' }}>{t.lots}</td>
                  <td style={{ padding: '9px 14px' }}><PnlSpan v={t.pnl} /></td>
                  <td style={{ padding: '9px 14px' }}>
                    {t.status === 'win'  ? <Badge color="emerald">WIN</Badge>  :
                     t.status === 'loss' ? <Badge color="rose">LOSS</Badge>    :
                     t.status === 'open' ? <Badge color="indigo">OPEN</Badge>  :
                                           <Badge color="slate">BE</Badge>}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)' }}>{t.duration || '—'}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setShowEdit(t); }}
                        title="Edit trade"
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 5, borderRadius: 5 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--indigo)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(t.id); }}
                        title="Delete trade"
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 5, borderRadius: 5 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--rose)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--fm)', fontSize: 12 }}>
              No trades match this filter.
            </div>
          )}
        </div>
      </div>

      {/* Detail strip */}
      {sel && (
        <div className="fade-in" style={{ borderTop: '1px solid var(--line2)', padding: '14px 20px', background: 'rgba(99,102,241,.03)', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--fh)', fontWeight: 700, fontSize: 16 }}>{sel.pair}</span>
              <Badge color={sel.side === 'buy' ? 'emerald' : 'rose'}>{sel.side === 'buy' ? 'LONG' : 'SHORT'}</Badge>
              <PnlSpan v={sel.pnl} />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, fontFamily: 'var(--fm)', color: 'var(--sub)', flexWrap: 'wrap' }}>
              {[
                ['Entry',  sel.entryPrice?.toFixed(5)],
                ['Exit',   sel.exitPrice?.toFixed(5) || '—'],
                ['Lots',   sel.lots],
                ['Dur',    sel.duration || '—'],
                ['TP',     sel.tp?.toFixed(5) || '—'],
                ['SL',     sel.sl?.toFixed(5) || '—'],
                ['Source', sel.source || 'csv'],
              ].map(([k, v]) => (
                <span key={k}>{k}: <span style={{ color: 'var(--text)' }}>{v}</span></span>
              ))}
            </div>
            {sel.notes && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--sub)', fontFamily: 'var(--fm)', background: 'var(--card2)', padding: '6px 10px', borderRadius: 6 }}>{sel.notes}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Btn size="sm" variant="ghost" onClick={() => { setShowEdit(sel); setSel(null); }}>
              <Edit2 size={12} /> Edit
            </Btn>
            <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddModal
        show={showAdd}
        onClose={closeAdd}
        form={addForm}
        setForm={setAddForm}
        onSubmit={handleAdd}
        busy={addBusy}
        err={addErr}
      />
      {showEdit && (
        <EditModal
          trade={showEdit}
          onSave={handleUpdate}
          onClose={() => setShowEdit(null)}
          busy={editBusy}
        />
      )}
    </div>
  );
};

export default PositionsPage;
