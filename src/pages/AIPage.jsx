// src/pages/AIPage.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Brain, Zap, Shield, Check, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge, Btn, TogglePill } from '../components/atoms';
import { AI_MODELS } from '../config/aiModels';
import { callModelSafe } from '../hooks/useAIProxy';
import { calcStats } from '../utils/tradeEngine';

const SYSTEM_PROMPT = `You are an elite professional trading coach with 20 years of experience. You have full access to this trader's real performance data. Be specific — reference actual numbers. Be direct but constructive. Use ## headers for sections. Always end with 3 numbered "Action Steps:". The trader trades XAU/USD (Gold) and other CFDs/Forex.`;

const QUICK_PROMPTS = [
  'Analyze my biggest weaknesses and risk management',
  'What patterns appear in my winning vs losing trades?',
  'Am I overtrading? Evaluate my lot sizing discipline',
  'Give me a probability & edge assessment',
  "What's causing my biggest drawdowns?",
  'Give me 3 concrete steps to improve my win rate',
];

const AIPage = ({ trades }) => {
  const [selectedModels, setSelectedModels] = useState(['claude-sonnet']);
  const [compareMode,    setCompareMode]    = useState(false);
  const [msgs,           setMsgs]           = useState([]);
  const [input,          setInput]          = useState('');
  const [busy,           setBusy]           = useState(false);
  const [keys,           setKeys]           = useState({ anthropic: '', openai: '', gemini: '' });
  const [showKeys,       setShowKeys]       = useState(false);
  const endRef = useRef();
  const stats  = useMemo(() => calcStats(trades), [trades]);

  const buildContext = useCallback(() => {
    const summary = { total: stats.total, winRate: `${stats.winRate}%`, net: `$${stats.net}`, pf: stats.pf, avgWin: `$${stats.avgW}`, avgLoss: `$${stats.avgL}`, maxDD: `$${Math.abs(stats.maxDD || 0)}`, avgLots: stats.avgLots };
    const detail  = trades.filter(t => t.status !== 'open').slice(-25).map(t => ({ id: t.id, pair: t.pair, side: t.side, lots: t.lots, entry: t.entryPrice, exit: t.exitPrice, pnl: t.pnl, duration: t.duration, result: t.status, notes: t.notes || '', mistakes: t.tags || [] }));
    return `TRADER DATA:\n${JSON.stringify(summary, null, 2)}\n\nTRADES:\n${JSON.stringify(detail, null, 2)}`;
  }, [trades, stats]);

  const toggleModel = (id) => setSelectedModels(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || busy) return;
    setInput(''); setBusy(true);
    const fullQuery    = `${buildContext()}\n\nQuestion: ${msg}`;
    const modelsToCall = AI_MODELS.filter(m => selectedModels.includes(m.id));

    setMsgs(prev => [...prev, { role: 'user', text: msg, id: Date.now() }]);

    if (compareMode && modelsToCall.length > 1) {
      const pid = Date.now() + 1;
      setMsgs(prev => [...prev, { role: 'compare', id: pid, models: modelsToCall.map(m => ({ ...m, status: 'loading', text: '' })) }]);
      const results = await Promise.allSettled(modelsToCall.map(m => callModelSafe(m, SYSTEM_PROMPT, fullQuery, keys)));
      setMsgs(prev => prev.map(m => m.id === pid ? { ...m, models: modelsToCall.map((mc, i) => ({ ...mc, status: results[i].status === 'fulfilled' ? 'done' : 'error', text: results[i].status === 'fulfilled' ? results[i].value : `❌ ${results[i].reason?.message || 'Failed'}` })) } : m));
    } else {
      for (const mc of modelsToCall) {
        const pid = Date.now() + Math.random();
        setMsgs(prev => [...prev, { role: 'ai', id: pid, modelCfg: mc, text: null, status: 'loading' }]);
        try {
          const text = await callModelSafe(mc, SYSTEM_PROMPT, fullQuery, keys);
          setMsgs(prev => prev.map(m => m.id === pid ? { ...m, text, status: 'done' } : m));
        } catch (e) {
          setMsgs(prev => prev.map(m => m.id === pid ? { ...m, text: `❌ ${e.message}`, status: 'error' } : m));
        }
      }
    }
    setBusy(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs]);
  useEffect(() => {
    if (msgs.length === 0) setMsgs([{ role: 'ai', id: 'welcome', modelCfg: AI_MODELS[0], status: 'done', text: `Welcome to AI Coach. ${trades.length > 0 ? `I can see your ${stats.total} trades. Select a model and ask anything, or pick a quick prompt.` : 'Import your trades first, then return here for personalized coaching.'}` }]);
  }, []);

  const activeModelCfgs = AI_MODELS.filter(m => selectedModels.includes(m.id));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ height: 52, borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0, background: 'var(--surface)' }}>
        <Brain size={16} color="var(--violet)" />
        <span style={{ fontFamily: 'var(--fh)', fontWeight: 700, fontSize: 15 }}>AI Coach</span>
        {trades.length > 0 && <Badge color="slate">{stats.total} trades · {stats.winRate}% WR · ${stats.net}</Badge>}
        <div style={{ flex: 1 }} />
        <TogglePill on={compareMode} onToggle={() => setCompareMode(v => !v)} label="Compare Models" />
        <button onClick={() => setShowKeys(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: `1px solid ${showKeys ? 'var(--amber)' : 'var(--line)'}`, background: showKeys ? 'rgba(245,158,11,.08)' : 'transparent', color: showKeys ? 'var(--amber)' : 'var(--muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--fm)' }}>
          <Shield size={12} /> API Keys
        </button>
      </div>

      {/* API Keys panel */}
      {showKeys && (
        <div className="fade-in" style={{ borderBottom: '1px solid var(--line)', padding: '14px 20px', background: 'rgba(245,158,11,.03)', display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {[['Anthropic', 'anthropic', 'sk-ant-…'], ['OpenAI', 'openai', 'sk-…'], ['Google Gemini', 'gemini', 'AIza…']].map(([l, k, ph]) => (
            <div key={k} style={{ flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 4, fontFamily: 'var(--fm)' }}>{l}</label>
              <input type="password" value={keys[k]} onChange={e => setKeys(p => ({ ...p, [k]: e.target.value }))} placeholder={ph} style={{ fontSize: 11, height: 32 }} />
            </div>
          ))}
          <p style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fm)', width: '100%', marginTop: 4 }}>Keys stored in memory only. Gemini 2.0 Flash works free without a key in most regions.</p>
        </div>
      )}

      {/* Model selector */}
      <div style={{ borderBottom: '1px solid var(--line)', padding: '10px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fm)', textTransform: 'uppercase', letterSpacing: '.6px', marginRight: 4 }}>Models:</span>
        {AI_MODELS.map(m => {
          const active = selectedModels.includes(m.id);
          return (
            <button key={m.id} onClick={() => toggleModel(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 7, border: `1px solid ${active ? m.border : 'var(--line)'}`, background: active ? m.bg : 'transparent', color: active ? m.color : 'var(--muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--fm)', transition: 'all .12s', fontWeight: active ? 600 : 400 }}>
              <span>{m.icon}</span>
              {m.label}
              {m.free && <span style={{ fontSize: 9, background: 'rgba(16,185,129,.15)', color: 'var(--emerald)', padding: '1px 5px', borderRadius: 4 }}>FREE</span>}
              {active && compareMode && selectedModels.length > 1 && <Check size={10} />}
            </button>
          );
        })}
        {compareMode && selectedModels.length > 1 && <Badge color="amber">{selectedModels.length} models in parallel</Badge>}
      </div>

      {/* Quick prompts */}
      <div style={{ borderBottom: '1px solid var(--line)', padding: '8px 20px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {QUICK_PROMPTS.map((q, i) => (
          <button key={i} onClick={() => send(q)} disabled={busy} style={{ padding: '4px 14px', borderRadius: 20, border: '1px solid var(--line)', background: 'transparent', color: 'var(--sub)', fontSize: 11, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'var(--fb)', transition: 'all .12s', opacity: busy ? 0.6 : 1 }}>{q}</button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {msgs.map(m => {
          if (m.role === 'user') return (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ maxWidth: '72%', background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.25)', borderRadius: 12, padding: '10px 16px', fontSize: 13, lineHeight: 1.7, color: 'var(--text)', fontFamily: 'var(--fb)', whiteSpace: 'pre-wrap' }}>{m.text}</div>
            </div>
          );

          if (m.role === 'compare') return (
            <div key={m.id} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fm)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Side-by-side — {m.models.length} models</div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(m.models.length, 2)}, 1fr)`, gap: 10 }}>
                {m.models.map(mc => (
                  <div key={mc.id} style={{ background: 'var(--card)', border: `1px solid ${mc.border}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--line)', background: mc.bg }}>
                      <span style={{ color: mc.color, fontSize: 14 }}>{mc.icon}</span>
                      <span style={{ fontFamily: 'var(--fm)', fontSize: 12, fontWeight: 600, color: mc.color }}>{mc.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fm)' }}>{mc.provider}</span>
                      <div style={{ marginLeft: 'auto' }}>
                        {mc.status === 'loading' && <div className="spin" style={{ width: 12, height: 12, border: `2px solid ${mc.color}33`, borderTopColor: mc.color, borderRadius: '50%' }} />}
                        {mc.status === 'done'    && <CheckCircle size={12} color="var(--emerald)" />}
                        {mc.status === 'error'   && <AlertTriangle size={12} color="var(--rose)" />}
                      </div>
                    </div>
                    <div style={{ padding: '12px 14px', fontSize: 12, lineHeight: 1.75, color: mc.status === 'error' ? 'var(--rose)' : 'var(--text)', fontFamily: 'var(--fb)', whiteSpace: 'pre-wrap', minHeight: 60, maxHeight: 320, overflowY: 'auto' }}>
                      {mc.status === 'loading' ? <div style={{ display: 'flex', gap: 5 }}>{[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: mc.color, opacity: 0.4, animation: `blink 1.2s ease ${i * 0.2}s infinite` }} />)}</div> : mc.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );

          const mc = m.modelCfg || AI_MODELS[0];
          return (
            <div key={m.id} className="fade-in" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: mc.bg, border: `1px solid ${mc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: mc.color }}>{mc.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fm)', marginBottom: 4 }}>
                  <span style={{ color: mc.color, fontWeight: 600 }}>{mc.label}</span>
                  <span style={{ marginLeft: 6 }}>{mc.provider}</span>
                </div>
                <div style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: m.status === 'error' ? 'var(--rose)' : 'var(--text)', fontFamily: 'var(--fb)' }}>
                  {m.status === 'loading'
                    ? <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>{[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: mc.color, opacity: 0.4, animation: `blink 1.2s ease ${i * 0.2}s infinite` }} />)}<span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6, fontFamily: 'var(--fm)' }}>Analyzing…</span></div>
                    : m.text
                  }
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder={`Ask ${activeModelCfgs.map(m => m.label).join(' & ')}…`} style={{ flex: 1 }} />
        <Btn onClick={() => send()} disabled={busy || !input.trim()}>
          <Zap size={14} />
          {compareMode && selectedModels.length > 1 ? `Ask ${selectedModels.length} Models` : 'Analyze'}
        </Btn>
      </div>
    </div>
  );
};

export default AIPage;
