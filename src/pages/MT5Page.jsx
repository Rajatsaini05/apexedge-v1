// src/pages/MT5Page.jsx
// Uses MetaApi cloud — NO local MT5 terminal needed.
// Works on phone, tablet, any browser, 24/7.
//
// HOW TO SETUP (2 minutes):
//   1. Go to app.metaapi.cloud → sign up FREE
//   2. Add Account → enter broker / MT5 login / password
//   3. Copy your API TOKEN from the top of the dashboard
//   4. Paste it below → Connect

import { useState, useCallback } from 'react';
import {
  Wifi, WifiOff, AlertTriangle, Database, Activity, Shield,
  Target, Zap, Check, RefreshCw, Download, ExternalLink,
  ChevronDown, ChevronRight, Trash2, Eye, EyeOff,
} from 'lucide-react';
import { Card, Badge, Btn, StatCard, Divider, PnlSpan } from '../components/atoms';
import { TopBar } from '../components/layout';
import { useMT5 } from '../hooks/useMT5';

// ── Setup guide ───────────────────────────────────────────────────────────────
const SetupGuide = () => (
  <Card style={{ padding: 20 }}>
    <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--fm)', marginBottom: 14 }}>
      Setup Guide — 2 minutes
    </p>
    {[
      ['1', 'Go to', 'app.metaapi.cloud', 'https://app.metaapi.cloud', '→ sign up FREE'],
      ['2', 'Click "New Account"', null, null, '→ enter your MT5 broker, login, password'],
      ['3', 'Wait ~60 seconds', null, null, 'for MetaApi to connect to your broker'],
      ['4', 'Copy your API Token', null, null, 'from the top of the MetaApi dashboard'],
      ['5', 'Paste it on the left', null, null, '→ click Connect'],
    ].map(([n, a, link, href, b]) => (
      <div key={n} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--card2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontFamily: 'var(--fm)', color: 'var(--muted)', flexShrink: 0, marginTop: 1 }}>{n}</div>
        <span style={{ fontSize: 12, fontFamily: 'var(--fm)', color: 'var(--sub)', lineHeight: 1.6 }}>
          {a}{' '}
          {link && <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--indigo)', textDecoration: 'none' }}>{link}</a>}
          {' '}{b}
        </span>
      </div>
    ))}

    <Divider/>

    <div style={{ marginTop: 14 }}>
      <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--fm)', marginBottom: 10 }}>Why MetaApi?</p>
      {[
        ['✓ No MT5 terminal needed', 'Works on phone, tablet, any device'],
        ['✓ Always connected', 'MetaApi keeps the connection 24/7'],
        ['✓ Free tier', '1 account, full history, live positions'],
        ['✓ Secure', 'Your credentials go to MetaApi, not our servers'],
      ].map(([t, d]) => (
        <div key={t} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, fontFamily: 'var(--fm)' }}>
          <span style={{ color: 'var(--emerald)', flexShrink: 0 }}>{t}</span>
          <span style={{ color: 'var(--muted)' }}>{d}</span>
        </div>
      ))}
    </div>

    <Btn variant="ghost" size="sm" style={{ marginTop: 10 }} onClick={() => window.open('https://app.metaapi.cloud', '_blank')}>
      <ExternalLink size={12} /> Open MetaApi Dashboard
    </Btn>
  </Card>
);

// ── Connect form ──────────────────────────────────────────────────────────────
const ConnectForm = ({ onConnect, savedCreds, onForget }) => {
  const hasSaved = !!savedCreds?.token;
  const [token,    setToken]    = useState(savedCreds?.token || '');
  const [broker,   setBroker]   = useState(savedCreds?.broker || '');
  const [server,   setServer]   = useState(savedCreds?.server || '');
  const [login,    setLogin]    = useState(savedCreds?.login || '');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [showTok,  setShowTok]  = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');
  const [step,     setStep]     = useState(hasSaved ? 'reconnect' : 'setup'); // 'setup'|'reconnect'

  const handle = async () => {
    if (!token.trim()) { setErr('MetaApi token is required.'); return; }
    setBusy(true); setErr('');
    try {
      await onConnect({ token: token.trim(), broker, server, login, password });
    } catch (e) {
      setErr(e.message || 'Connection failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
      <Card style={{ padding: 24 }}>

        {/* Saved account banner */}
        {hasSaved && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(99,102,241,.06)', border: '1px solid var(--line2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Check size={13} color="var(--indigo)" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{savedCreds.broker || 'Saved Account'}</p>
              <p style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)' }}>
                Login {savedCreds.login} · MetaApi connected
              </p>
            </div>
            <button onClick={onForget} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trash2 size={11} /> Forget
            </button>
          </div>
        )}

        <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--fm)', marginBottom: 16 }}>
          {hasSaved ? 'Reconnect via MetaApi' : 'Connect via MetaApi Cloud'}
        </p>

        {/* MetaApi Token */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>
            MetaApi Token <span style={{ color: 'var(--rose)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste your token from app.metaapi.cloud"
              type={showTok ? 'text' : 'password'}
              style={{ paddingRight: 36 }}
            />
            <button onClick={() => setShowTok(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
              {showTok ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fm)', marginTop: 4 }}>
            Get this from app.metaapi.cloud → top-right → API Access → Auth token
          </p>
        </div>

        {/* Optional: MT5 credentials for creating new account on MetaApi */}
        {!hasSaved && (
          <>
            <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fm)', marginBottom: 10, padding: '8px 10px', background: 'var(--card2)', borderRadius: 6 }}>
              Already added your account on MetaApi? You only need the token above. These fields are only needed if you want APEXEDGE to create the MetaApi account for you automatically.
            </p>
            {[
              ['Broker Name',   broker,   setBroker,   'ICMarkets, XM…', 'text'],
              ['MT5 Server',    server,   setServer,   'ICMarketsSC-Demo', 'text'],
              ['MT5 Login',     login,    setLogin,    '12345678', 'text'],
            ].map(([l, v, s, ph, type]) => (
              <div key={l} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>{l}</label>
                <input value={v} onChange={e => s(e.target.value)} placeholder={ph} type={type} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>MT5 Password</label>
              <div style={{ position: 'relative' }}>
                <input value={password} onChange={e => setPassword(e.target.value)} type={showPwd ? 'text' : 'password'} placeholder="Only needed for auto-setup" style={{ paddingRight: 36 }} />
                <button onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </>
        )}

        {err && (
          <div style={{ padding: '10px 12px', background: 'rgba(244,63,94,.06)', border: '1px solid rgba(244,63,94,.2)', borderRadius: 7, marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: 'var(--rose)', fontFamily: 'var(--fm)', lineHeight: 1.6 }}>{err}</p>
          </div>
        )}

        <Btn onClick={handle} disabled={busy} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
          {busy
            ? <><div className="spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} />Connecting to MetaApi…</>
            : <><Wifi size={14} />{hasSaved ? 'Reconnect' : 'Connect Account'}</>
          }
        </Btn>

        <div style={{ marginTop: 14, padding: 12, background: 'rgba(16,185,129,.05)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 8 }}>
          <p style={{ fontSize: 11, color: 'var(--emerald)', fontFamily: 'var(--fm)', lineHeight: 1.7 }}>
            ✓ <strong>No MT5 terminal needed.</strong> MetaApi connects to your broker 24/7 from the cloud. Works on any device including your phone.
          </p>
        </div>
      </Card>

      <SetupGuide />
    </div>
  );
};

// ── Live positions table ──────────────────────────────────────────────────────
const LivePositions = ({ positions }) => {
  if (!positions.length) return (
    <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fm)', padding: '16px 0' }}>
      No open positions right now. They will appear here as soon as you open a trade.
    </p>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Symbol', 'Direction', 'Volume', 'Open Price', 'Current', 'Float P&L', 'SL', 'TP'].map(h => (
              <th key={h} style={{ padding: '8px 12px', fontSize: 10, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--fm)', fontWeight: 500, background: 'var(--surface)', borderBottom: '1px solid var(--line)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => (
            <tr key={p.ticket || i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.01)' }}>
              <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600 }}>{p.symbol}</td>
              <td style={{ padding: '9px 12px' }}>
                <span style={{ fontSize: 11, color: p.type === 'buy' ? 'var(--emerald)' : 'var(--rose)', fontFamily: 'var(--fm)', fontWeight: 600 }}>
                  {p.type === 'buy' ? '▲ LONG' : '▼ SHORT'}
                </span>
              </td>
              <td style={{ padding: '9px 12px', fontSize: 12, fontFamily: 'var(--fm)' }}>{p.volume}</td>
              <td style={{ padding: '9px 12px', fontSize: 12, fontFamily: 'var(--fm)' }}>{parseFloat(p.price_open || 0).toFixed(5)}</td>
              <td style={{ padding: '9px 12px', fontSize: 12, fontFamily: 'var(--fm)', fontWeight: 600, color: parseFloat(p.profit || 0) >= 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                {parseFloat(p.price_current || 0).toFixed(5)}
              </td>
              <td style={{ padding: '9px 12px' }}><PnlSpan v={parseFloat(p.profit || 0)} /></td>
              <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--rose)' }}>{p.sl || '—'}</td>
              <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--emerald)' }}>{p.tp || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Trade history table ───────────────────────────────────────────────────────
const HistoryTable = ({ trades }) => {
  const [show, setShow] = useState(25);
  if (!trades.length) return (
    <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fm)', padding: '12px 0' }}>
      No trade history yet. Click "Sync History" above.
    </p>
  );
  return (
    <div>
      <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              {['Pair', 'Dir', 'Entry Time', 'Exit Time', 'Entry $', 'Exit $', 'Lots', 'P&L', 'Result', 'Duration'].map(h => (
                <th key={h} style={{ padding: '8px 12px', fontSize: 10, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--fm)', fontWeight: 500, background: 'var(--surface)', borderBottom: '1px solid var(--line)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.slice(0, show).map((t, i) => (
              <tr key={t.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.01)' }}>
                <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>{t.pair}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontSize: 11, color: t.side === 'buy' ? 'var(--emerald)' : 'var(--rose)', fontFamily: 'var(--fm)', fontWeight: 500 }}>
                    {t.side === 'buy' ? '▲ L' : '▼ S'}
                  </span>
                </td>
                <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)', whiteSpace: 'nowrap' }}>
                  {t.entryDate ? new Date(t.entryDate).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)', whiteSpace: 'nowrap' }}>
                  {t.exitDate ? new Date(t.exitDate).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'var(--fm)' }}>{parseFloat(t.entryPrice || 0).toFixed(5)}</td>
                <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'var(--fm)' }}>{parseFloat(t.exitPrice || 0).toFixed(5)}</td>
                <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'var(--fm)' }}>{t.lots}</td>
                <td style={{ padding: '8px 12px' }}><PnlSpan v={t.pnl} /></td>
                <td style={{ padding: '8px 12px' }}>
                  {t.status === 'win' ? <Badge color="emerald">WIN</Badge>
                    : t.status === 'loss' ? <Badge color="rose">LOSS</Badge>
                    : <Badge color="slate">BE</Badge>}
                </td>
                <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)' }}>{t.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {trades.length > show && (
        <button onClick={() => setShow(v => v + 50)} style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--indigo)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--fm)' }}>
          Show more ({trades.length - show} remaining)
        </button>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const MT5Page = ({ onImport }) => {
  const {
    connected, account, savedCreds, openPositions, wsStatus,
    syncing, syncResult, error, setError, autoReconnecting,
    connect, disconnect, syncHistory, forgetCreds,
  } = useMT5();

  const [previewTrades, setPreviewTrades] = useState([]);
  const [imported,      setImported]      = useState(false);
  const [activeTab,     setActiveTab]     = useState('positions');

  const handleConnect = useCallback(async (form) => {
    const acc = await connect(form);
    // Auto-sync history after connecting
    try {
      const { trades } = await syncHistory();
      setPreviewTrades(trades);
    } catch (e) {
      setError(`Connected! But history sync failed: ${e.message}`);
    }
  }, [connect, syncHistory, setError]);

  const handleSync = useCallback(async () => {
    try {
      const { trades } = await syncHistory();
      setPreviewTrades(trades);
      setImported(false);
    } catch (e) {
      setError(e.message);
    }
  }, [syncHistory, setError]);

  const handleImport = useCallback(async () => {
    if (!previewTrades.length || !onImport) return;
    const fakeOrders = previewTrades.map(t => ({
      id: t.id, date: t.exitDate, pair: t.pair, type: 'market',
      side: t.side, lots: t.lots, price: t.exitPrice, status: 'filled',
    }));
    await onImport(fakeOrders, previewTrades, { source: 'mt5', broker: account?.broker });
    setImported(true);
  }, [previewTrades, onImport, account]);

  // Auto-reconnecting overlay
  if (autoReconnecting) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar title="MT5 Connect" subtitle="Restoring MetaApi session…" actions={<Badge color="amber">● Reconnecting</Badge>} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)', fontFamily: 'var(--fm)', fontSize: 13 }}>
        <div className="spin" style={{ width: 20, height: 20, border: '3px solid var(--line)', borderTopColor: 'var(--indigo)', borderRadius: '50%' }} />
        Reconnecting to MetaApi…
      </div>
    </div>
  );

  const liveLabel = wsStatus === 'connected' ? '● Live (WebSocket)' : wsStatus === 'polling' ? '● Live (3s polling)' : '● Connected';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar
        title="MT5 Connect"
        subtitle="Powered by MetaApi Cloud · No terminal needed · Works on any device"
        actions={<Badge color={connected ? 'emerald' : 'slate'}>{connected ? liveLabel : '○ Disconnected'}</Badge>}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!connected ? (
          <ConnectForm onConnect={handleConnect} savedCreds={savedCreds} onForget={forgetCreds} />
        ) : (
          <div className="fade-in">

            {/* Status bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(16,185,129,.05)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 10, marginBottom: 20 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--emerald)', animation: 'blink 2s ease infinite', boxShadow: '0 0 8px var(--emerald)' }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--emerald)', fontWeight: 600 }}>
                  {account?.broker} · {account?.login}
                </span>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--sub)', marginLeft: 12 }}>
                  MetaApi Cloud · {wsStatus === 'connected' ? 'WebSocket ~1s' : wsStatus === 'polling' ? 'REST ~3s' : 'Connected'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" size="sm" onClick={handleSync} disabled={syncing}>
                  {syncing ? <div className="spin" style={{ width: 12, height: 12, border: '2px solid var(--muted)', borderTopColor: 'var(--text)', borderRadius: '50%' }} /> : <RefreshCw size={12} />}
                  {syncing ? 'Syncing…' : 'Sync History'}
                </Btn>
                <Btn variant="danger" size="sm" onClick={disconnect}>
                  <WifiOff size={12} /> Disconnect
                </Btn>
              </div>
            </div>

            {error && (
              <div style={{ padding: 12, background: 'rgba(244,63,94,.06)', border: '1px solid rgba(244,63,94,.2)', borderRadius: 8, marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--rose)', fontFamily: 'var(--fm)' }}>{error}</p>
              </div>
            )}

            {/* Account stat cards */}
            <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
              <StatCard label="Balance"      value={`$${parseFloat(account?.balance || 0).toFixed(2)}`}     icon={Database}      accent="sky" />
              <StatCard label="Equity"       value={`$${parseFloat(account?.equity  || 0).toFixed(2)}`}     icon={Activity}      accent={parseFloat(account?.equity || 0) >= parseFloat(account?.balance || 0) ? 'emerald' : 'rose'} />
              <StatCard label="Free Margin"  value={`$${parseFloat(account?.freeMargin || 0).toFixed(2)}`}  icon={Shield}        accent="indigo" />
              <StatCard label="Margin Used"  value={`$${parseFloat(account?.margin  || 0).toFixed(2)}`}     icon={AlertTriangle} accent="amber" />
              <StatCard label="Margin Level" value={`${parseFloat(account?.marginLevel || 0).toFixed(0)}%`} icon={Target}        accent={parseFloat(account?.marginLevel || 0) > 200 ? 'emerald' : 'rose'} />
              <StatCard label="Leverage"     value={account?.leverage || '—'}                               icon={Zap}           accent="violet" />
            </div>

            {/* Account details */}
            <Card style={{ padding: 18, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                {[
                  ['Broker',   account?.broker],
                  ['Platform', account?.platform],
                  ['Currency', account?.currency],
                  ['Login',    account?.login],
                  ['Server',   account?.server || 'MetaApi Cloud'],
                  ['Leverage', account?.leverage],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--card2)', borderRadius: 7, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'var(--fm)' }}>
                    <span style={{ color: 'var(--muted)' }}>{k}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{v || '—'}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tabs */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
                {[
                  ['positions', `Live Positions (${openPositions.length})`],
                  ['history',   `Trade History ${syncResult ? `(${previewTrades.length})` : ''}`],
                ].map(([id, label]) => (
                  <button key={id} onClick={() => setActiveTab(id)} style={{ padding: '12px 20px', border: 'none', borderBottom: `2px solid ${activeTab === id ? 'var(--indigo)' : 'transparent'}`, background: 'transparent', color: activeTab === id ? 'var(--indigo)' : 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 13, fontWeight: activeTab === id ? 600 : 400, cursor: 'pointer', transition: 'all .12s' }}>
                    {label}
                  </button>
                ))}
                {activeTab === 'history' && previewTrades.length > 0 && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
                    {!imported
                      ? <Btn size="sm" onClick={handleImport}><Download size={12} />Import {previewTrades.length} Trades to Journal</Btn>
                      : <Badge color="emerald">✓ Imported to Journal</Badge>
                    }
                  </div>
                )}
              </div>

              <div style={{ padding: 20 }}>
                {activeTab === 'positions' && <LivePositions positions={openPositions} />}
                {activeTab === 'history' && (
                  syncing
                    ? <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontFamily: 'var(--fm)', fontSize: 12 }}>
                        <div className="spin" style={{ width: 16, height: 16, border: '2px solid var(--line)', borderTopColor: 'var(--indigo)', borderRadius: '50%' }} />
                        Fetching trade history from MetaApi…
                      </div>
                    : <HistoryTable trades={previewTrades} />
                )}
              </div>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
};

export default MT5Page;
