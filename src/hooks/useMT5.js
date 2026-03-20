// src/hooks/useMT5.js
// Uses MetaApi cloud — NO local MT5 terminal needed.
// Works on phone, tablet, any browser, 24/7.
//
// Setup (one-time, 2 minutes):
//   1. Go to app.metaapi.cloud → sign up free
//   2. Click "Add Account" → enter your MT5 broker/login/password
//   3. Copy your MetaApi TOKEN (not the account id)
//   4. Enter it in the MT5 Connect page
//
// MetaApi free tier: 1 account, full history, real-time positions.

import { useState, useEffect, useCallback, useRef } from 'react';

const LS_KEY = 'apexedge_metaapi';   // { token, accountId, broker, login }
const SS_KEY = 'apexedge_metaapi_t'; // token in sessionStorage as backup

const MA_BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai';

// ── MetaApi REST helpers ───────────────────────────────────────────────────────
async function maFetch(path, token, opts = {}) {
  const res = await fetch(`${MA_BASE}${path}`, {
    ...opts,
    headers: {
      'auth-token': token,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    signal: opts.signal || AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

// ── Deal → Trade converter ────────────────────────────────────────────────────
// MetaApi returns deals with entryType: 'DEAL_ENTRY_IN' | 'DEAL_ENTRY_OUT' etc.
export function convertMetaApiDeals(deals, broker = '') {
  if (!deals?.length) return [];

  console.log(`[MetaApi] Converting ${deals.length} deals`);

  // Count entry types for debug
  const ec = {};
  deals.forEach(d => { ec[d.entryType || d.type || 'unknown'] = (ec[d.entryType || d.type || 'unknown'] || 0) + 1; });
  console.log('[MetaApi] Entry types:', ec);

  const opens  = {};
  const trades = [];

  const sorted = [...deals]
    .filter(d => d.symbol && (d.type === 'DEAL_TYPE_BUY' || d.type === 'DEAL_TYPE_SELL'))
    .sort((a, b) => new Date(a.time || a.brokerTime) - new Date(b.time || b.brokerTime));

  console.log(`[MetaApi] Trade deals after filter: ${sorted.length}`);

  for (const deal of sorted) {
    const posId = String(deal.positionId || deal.orderId || deal.id);
    const entry = deal.entryType || '';
    const side  = deal.type === 'DEAL_TYPE_BUY' ? 'buy' : 'sell';
    const time  = deal.time || deal.brokerTime;

    if (entry === 'DEAL_ENTRY_IN' || entry === 'in') {
      opens[posId] = { ...deal, side, time };

    } else if (entry === 'DEAL_ENTRY_OUT' || entry === 'DEAL_ENTRY_OUT_BY' || entry === 'out' || entry === 'out_by') {
      const open    = opens[posId];
      const entryDate  = open?.time  || time;
      const entryPrice = open ? parseFloat(open.price || open.openPrice || 0) : parseFloat(deal.price || 0);
      const openSide   = open?.side  || (side === 'buy' ? 'sell' : 'buy');
      const lots       = parseFloat(deal.volume || open?.volume || 0);
      const pnl = Math.round((
        (parseFloat(deal.profit)     || 0) +
        (parseFloat(deal.swap)       || 0) +
        (parseFloat(deal.commission) || 0)
      ) * 100) / 100;
      const durMin = Math.max(0, Math.round((new Date(time) - new Date(entryDate)) / 60_000));

      trades.push({
        id:          `MA-${deal.id}`,
        pair:         deal.symbol,
        side:         openSide,
        entryDate,
        exitDate:     time,
        entryPrice,
        exitPrice:    parseFloat(deal.price || 0),
        lots,
        pnl,
        status:       pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be',
        duration:     durMin < 60 ? `${durMin}m` : `${Math.floor(durMin/60)}h ${durMin%60}m`,
        rr: null, tp: null, sl: null,
        notes: '', tags: [], source: 'mt5', broker,
        rawEntryId: open ? String(open.id) : null,
        rawExitId:  String(deal.id),
      });
      delete opens[posId];
    }
  }

  console.log(`[MetaApi] Built ${trades.length} matched trades, ${Object.keys(opens).length} orphaned opens`);
  return trades;
}

// ── useMT5 hook ────────────────────────────────────────────────────────────────
export function useMT5() {
  const [connected,     setConnected]     = useState(false);
  const [account,       setAccount]       = useState(null);
  const [savedCreds,    setSavedCreds]    = useState(null);
  const [openPositions, setOpenPositions] = useState([]);
  const [syncing,       setSyncing]       = useState(false);
  const [syncResult,    setSyncResult]    = useState(null);
  const [error,         setError]         = useState('');
  const [wsStatus,      setWsStatus]      = useState('disconnected');
  const [autoReconnecting, setAutoReconnecting] = useState(false);

  const wsRef   = useRef(null);
  const pollRef = useRef(null);

  // ── Load saved creds + auto-reconnect ───────────────────────────────────────
  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return;
        const creds = JSON.parse(raw);
        if (!creds?.token || !creds?.accountId) return;
        if (alive) { setSavedCreds(creds); setAutoReconnecting(true); }

        // Verify token still valid
        const acct = await fetchAccountInfo(creds.token, creds.accountId).catch(() => null);
        if (!acct || !alive) return;

        setAccount(buildAccountObj(acct, creds));
        setConnected(true);
        startWS(creds.token, creds.accountId);
      } catch (e) {
        console.warn('[MetaApi] Auto-reconnect failed:', e.message);
      } finally {
        if (alive) setAutoReconnecting(false);
      }
    }
    init();
    return () => { alive = false; };
  }, []);

  useEffect(() => () => { stopAll(); }, []);

  // ── Fetch account info from MetaApi ────────────────────────────────────────
  async function fetchAccountInfo(token, accountId) {
    return maFetch(`/users/current/accounts/${accountId}`, token);
  }

  // ── Fetch live account state (equity etc.) ──────────────────────────────────
  async function fetchAccountState(token, accountId) {
    return maFetch(`/users/current/accounts/${accountId}/account-information`, token);
  }

  // ── Build account display object ─────────────────────────────────────────────
  function buildAccountObj(raw, creds) {
    return {
      balance:     parseFloat(raw.balance    || raw.equity || 0),
      equity:      parseFloat(raw.equity     || raw.balance|| 0),
      margin:      parseFloat(raw.margin     || 0),
      freeMargin:  parseFloat(raw.freeMargin || raw.equity || 0),
      marginLevel: parseFloat(raw.marginLevel|| 0),
      leverage:    `1:${raw.leverage || 0}`,
      currency:    raw.currency    || 'USD',
      platform:   'MetaTrader 5',
      broker:      creds.broker   || raw.broker || 'Broker',
      server:      creds.server   || raw.server || '',
      login:       creds.login    || String(raw.login || ''),
      accountId:   creds.accountId,
      name:        raw.name || raw.accountId,
    };
  }

  // ── WebSocket for live positions ────────────────────────────────────────────
  // MetaApi provides a streaming WebSocket — 1s position updates
  function startWS(token, accountId) {
    if (wsRef.current) { try { wsRef.current.close(); } catch {} }
    stopPolling();

    // MetaApi streaming endpoint
    const wsUrl = `wss://mt-client-api-v1.london.agiliumtrade.ai/ws/v1/users/current/accounts/${accountId}/positions/stream?auth-token=${token}`;
    console.log('[MetaApi] Connecting WebSocket for live positions');
    setWsStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen  = () => { console.log('[MetaApi] WS connected'); setWsStatus('connected'); };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.positions !== undefined) {
            setOpenPositions(normalisePositions(msg.positions || []));
          }
          if (msg.accountInformation) {
            const ai = msg.accountInformation;
            setAccount(prev => prev ? {
              ...prev,
              balance:    parseFloat(ai.balance    || prev.balance),
              equity:     parseFloat(ai.equity     || prev.equity),
              margin:     parseFloat(ai.margin     || prev.margin),
              freeMargin: parseFloat(ai.freeMargin || prev.freeMargin),
            } : prev);
          }
        } catch {}
      };
      ws.onerror = () => { setWsStatus('error'); startFallbackPolling(token, accountId); };
      ws.onclose = () => { setWsStatus('disconnected'); };
      wsRef.current = ws;
    } catch {
      startFallbackPolling(token, accountId);
    }
  }

  // ── Fallback REST polling every 3s ────────────────────────────────────────────
  function startFallbackPolling(token, accountId) {
    stopPolling();
    const poll = async () => {
      try {
        const [pos, ai] = await Promise.all([
          maFetch(`/users/current/accounts/${accountId}/positions`, token, { signal: AbortSignal.timeout(8000) }),
          maFetch(`/users/current/accounts/${accountId}/account-information`, token, { signal: AbortSignal.timeout(8000) }),
        ]);
        setOpenPositions(normalisePositions(pos || []));
        setAccount(prev => prev ? {
          ...prev,
          balance:    parseFloat(ai.balance    || prev.balance),
          equity:     parseFloat(ai.equity     || prev.equity),
          freeMargin: parseFloat(ai.freeMargin || prev.freeMargin),
        } : prev);
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    setWsStatus('polling');
  }

  function stopPolling() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }
  function stopAll()     { if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; } stopPolling(); setWsStatus('disconnected'); }

  // ── Normalise MetaApi position format ─────────────────────────────────────────
  function normalisePositions(positions) {
    return positions.map(p => ({
      ticket:        p.id          || p.ticket,
      time:          p.time        || p.openTime,
      type:          (p.type || '').toLowerCase().includes('buy') ? 'buy' : 'sell',
      symbol:        p.symbol,
      volume:        parseFloat(p.volume     || 0),
      price_open:    parseFloat(p.openPrice  || p.price_open  || 0),
      price_current: parseFloat(p.currentPrice || p.price_current || p.openPrice || 0),
      profit:        parseFloat(p.profit     || 0),
      swap:          parseFloat(p.swap       || 0),
      sl:            parseFloat(p.stopLoss   || p.sl || 0) || null,
      tp:            parseFloat(p.takeProfit || p.tp || 0) || null,
      comment:       p.comment    || '',
    }));
  }

  // ── Connect (find or create MetaApi account) ──────────────────────────────────
  const connect = useCallback(async ({ token, broker, server, login, password }) => {
    setError('');
    if (!token) throw new Error('MetaApi token is required. Get it from app.metaapi.cloud');

    // 1. List existing accounts
    const accounts = await maFetch('/users/current/accounts?limit=100', token);

    // 2. Find matching account (by login)
    let acct = (Array.isArray(accounts) ? accounts : accounts?.items || [])
      .find(a => String(a.login) === String(login) || String(a.name).includes(String(login)));

    // 3. If not found, create it
    if (!acct) {
      console.log('[MetaApi] Account not found — creating…');
      acct = await maFetch('/users/current/accounts', token, {
        method: 'POST',
        body: JSON.stringify({
          name:          `${broker || 'Broker'} ${login}`,
          type:          'cloud',
          login:         String(login),
          password,
          server,
          platform:      'mt5',
          magic:         0,
          quoteStreamingIntervalInSeconds: 1,
        }),
      });
    }

    if (!acct?.id) throw new Error('Could not find or create MetaApi account. Check your token and credentials.');

    // 4. Wait for account to deploy/connect (up to 60s)
    console.log('[MetaApi] Waiting for account to connect…');
    let state = acct;
    for (let i = 0; i < 30; i++) {
      state = await maFetch(`/users/current/accounts/${acct.id}`, token);
      if (state.state === 'DEPLOYED' || state.connectionStatus === 'CONNECTED') break;
      if (state.state === 'ERROR') throw new Error(`MetaApi account error: ${state.connectionStatus}`);
      await new Promise(r => setTimeout(r, 2000));
    }

    // 5. Fetch live account info
    let ai = {};
    try {
      ai = await maFetch(`/users/current/accounts/${acct.id}/account-information`, token);
    } catch {}

    const creds = { token, accountId: acct.id, broker: broker || state.name, server, login: String(login) };
    const accObj = buildAccountObj({ ...ai, ...state }, creds);

    localStorage.setItem(LS_KEY, JSON.stringify(creds));
    sessionStorage.setItem(SS_KEY, token);
    setSavedCreds(creds);
    setAccount(accObj);
    setConnected(true);
    startWS(token, acct.id);

    return accObj;
  }, []);

  // ── Sync history ──────────────────────────────────────────────────────────────
  const syncHistory = useCallback(async () => {
    const creds = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    if (!creds.token || !creds.accountId) throw new Error('Not connected.');
    setSyncing(true); setError('');

    try {
      console.log('[MetaApi] Fetching deal history…');
      const startTime = new Date(Date.now() - 5 * 365 * 24 * 3600_000).toISOString(); // 5 years back

      const deals = await maFetch(
        `/users/current/accounts/${creds.accountId}/history-deals/time/${encodeURIComponent(startTime)}/${encodeURIComponent(new Date().toISOString())}?limit=10000`,
        creds.token,
        { signal: AbortSignal.timeout(120_000) }
      );

      const dealsArr = Array.isArray(deals) ? deals : deals?.items || deals?.deals || [];
      console.log(`[MetaApi] Got ${dealsArr.length} deals`);

      const trades = convertMetaApiDeals(dealsArr, creds.broker || '');
      setSyncResult({ deals: dealsArr.length, trades: trades.length });
      return { deals: dealsArr, trades };
    } finally {
      setSyncing(false);
    }
  }, []);

  // ── Disconnect ─────────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    stopAll();
    setConnected(false); setAccount(null);
    setOpenPositions([]); setSyncResult(null); setError('');
  }, []);

  // ── Forget saved credentials ──────────────────────────────────────────────────
  const forgetCreds = useCallback(() => {
    disconnect();
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
    setSavedCreds(null);
  }, [disconnect]);

  return {
    connected, account, savedCreds, openPositions, wsStatus,
    syncing, syncResult, error, setError, autoReconnecting,
    connect, disconnect, syncHistory, forgetCreds,
  };
}
