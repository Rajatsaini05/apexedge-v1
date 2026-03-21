// src/pages/JournalPage.jsx
import { useState, useMemo } from 'react';
import { X, Edit3, Save, BookOpen } from 'lucide-react';
import { Card, Badge, Btn, PnlSpan, Divider, EmptyState } from '../components/atoms';
import { TopBar } from '../components/layout';

export const MISTAKE_TAGS = ['FOMO Entry','Big Lot','Moved SL','Early Exit','Revenge Trade','No Setup','News Trade','Overtrading','Widened SL','Broke Rules'];

const JournalPage = ({ trades, setTrades, setPage }) => {
  const [editId, setEditId] = useState(null);
  const [note,   setNote]   = useState('');
  const [tags,   setTags]   = useState([]);
  const [filter, setFilter] = useState('all');

  const closed = useMemo(() => [...trades].filter(t => t.status !== 'open').sort((a, b) => new Date(b.exitDate || 0) - new Date(a.exitDate || 0)), [trades]);
  const shown  = filter === 'all' ? closed : filter === 'noted' ? closed.filter(t => t.notes) : closed.filter(t => !t.notes);
  const topMistakes = useMemo(() => {
    const m = {};
    trades.flatMap(t => t.tags || []).forEach(t => { m[t] = (m[t] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [trades]);

  const save = () => {
    setTrades(p => p.map(t => t.id === editId ? { ...t, notes: note, tags } : t));
    setEditId(null);
  };

  if (!trades.length) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar title="Journal" subtitle="Document every trade · track mistakes · improve" />
      <EmptyState icon={BookOpen} title="Journal is empty" desc="Import trades to start journaling." cta="Import CSV" onCta={() => setPage('import')} />
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Journal" subtitle={`${closed.filter(t => t.notes).length} / ${closed.length} documented`} tradeCount={closed.length} />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', overflow: 'hidden' }}>
        <div style={{ overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['all', 'noted', 'unnoted'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid', borderColor: filter === f ? 'var(--indigo)' : 'var(--line)', background: filter === f ? 'rgba(99,102,241,.1)' : 'transparent', color: filter === f ? '#818cf8' : 'var(--muted)', fontSize: 11, cursor: 'pointer', textTransform: 'capitalize', transition: 'all .12s' }}>{f}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shown.map(t => (
              <Card key={t.id} style={{ padding: 16, borderColor: t.notes ? 'var(--line2)' : 'var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--fh)', fontWeight: 700, fontSize: 14 }}>{t.pair}</span>
                      <Badge color={t.side === 'buy' ? 'emerald' : 'rose'}>{t.side === 'buy' ? 'LONG' : 'SHORT'}</Badge>
                      <Badge color={t.status === 'win' ? 'emerald' : t.status === 'loss' ? 'rose' : 'slate'}>{t.status.toUpperCase()}</Badge>
                      <PnlSpan v={t.pnl} />
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fm)' }}>{t.lots}L · {t.duration}</span>
                    </div>
                    {t.notes
                      ? <p style={{ fontSize: 12, color: 'var(--sub)', lineHeight: 1.6, background: 'var(--card2)', padding: '8px 12px', borderRadius: 7 }}>{t.notes}</p>
                      : <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No journal entry yet.</p>
                    }
                    {t.tags?.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>{t.tags.map(tag => <Badge key={tag} color="violet">{tag}</Badge>)}</div>}
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => { setEditId(t.id); setNote(t.notes || ''); setTags(t.tags || []); }} style={{ flexShrink: 0 }}><Edit3 size={12} />Note</Btn>
                </div>
              </Card>
            ))}
            {shown.length === 0 && <p style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--fm)', fontSize: 12, padding: 32 }}>No trades for this filter.</p>}
          </div>
        </div>

        {/* Side stats */}
        <div style={{ borderLeft: '1px solid var(--line)', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--fm)', marginBottom: 12 }}>Top Mistakes</p>
            {topMistakes.length > 0
              ? topMistakes.map(([tag, cnt]) => (
                  <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 12, color: 'var(--sub)' }}>{tag}</span><Badge color="rose">{cnt}×</Badge>
                  </div>
                ))
              : <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fm)' }}>Tag mistakes to track patterns.</p>
            }
          </div>
          <Divider />
          <div>
            <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--fm)', marginBottom: 12 }}>Stats</p>
            {[['Closed', closed.length], ['Journaled', closed.filter(t => t.notes).length], ['Tagged', closed.filter(t => t.tags?.length > 0).length], ['Complete', `${closed.length ? Math.round(closed.filter(t => t.notes).length / closed.length * 100) : 0}%`]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'var(--fm)', padding: '5px 0', borderBottom: '1px solid var(--line)', color: 'var(--sub)' }}>
                <span>{k}</span><span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card className="fade-up" style={{ width: 540, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--fh)', fontSize: 15, fontWeight: 700 }}>Journal — {editId}</h3>
              <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={15} /></button>
            </div>
            <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 6, fontFamily: 'var(--fm)' }}>Notes</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={5} placeholder="What happened? Why did you enter? What could you improve?" style={{ resize: 'vertical', lineHeight: 1.6, marginBottom: 14 }} />
            <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--fm)', marginBottom: 8 }}>Mistake Tags</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
              {MISTAKE_TAGS.map(tag => (
                <button key={tag} onClick={() => setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])} style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid', borderColor: tags.includes(tag) ? 'var(--violet)' : 'var(--line)', background: tags.includes(tag) ? 'rgba(139,92,246,.12)' : 'transparent', color: tags.includes(tag) ? '#a78bfa' : 'var(--muted)', fontSize: 11, cursor: 'pointer', transition: 'all .12s' }}>{tag}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" size="sm" onClick={() => setEditId(null)}>Cancel</Btn>
              <Btn size="sm" onClick={save}><Save size={12} />Save Entry</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default JournalPage;
