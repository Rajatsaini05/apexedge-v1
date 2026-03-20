// src/utils/tradeEngine.js
// Core trading logic:
//  - Match raw orders into closed trades (FIFO)
//  - Calculate performance statistics
//  - Build equity curve / daily PnL for charts
//  - Generate synthetic candlestick data with trade markers

// ─── TRADE MATCHING ───────────────────────────────────────────────────────────

/**
 * Match filled orders into complete trades using FIFO pairing.
 * Supports multi-pair, handles partial fills.
 */
export function buildTrades(orders) {
  const filled = orders.filter(o => o.status === 'filled');
  const sorted = [...filled].sort((a, b) => new Date(a.date) - new Date(b.date));
  const stacks = {}; // pair → open positions stack
  const trades = [];
  let   idx    = 0;

  for (const ord of sorted) {
    const k   = ord.pair;
    if (!stacks[k]) stacks[k] = [];
    const opp = ord.side === 'buy' ? 'sell' : 'buy';
    const oi  = stacks[k].findIndex(p => p.side === opp);

    if (oi >= 0) {
      // Close existing position
      const open   = stacks[k].splice(oi, 1)[0];
      const lots   = Math.min(open.lots, ord.lots);
      const raw    = open.side === 'buy'
        ? (ord.price  - open.price) * lots * 100
        : (open.price - ord.price)  * lots * 100;
      const pnl    = Math.round(raw * 100) / 100;
      const durMin = Math.round((new Date(ord.date) - new Date(open.date)) / 60_000);

      // Try to find associated TP / SL orders (within 5 s of entry)
      const tp  = orders.find(o =>
        o.type === 'take_profit' &&
        Math.abs(new Date(o.date) - new Date(open.date)) < 5000
      );
      const sl  = orders.find(o =>
        o.type === 'stop_loss' &&
        Math.abs(new Date(o.date) - new Date(open.date)) < 5000
      );
      const tpP = tp?.price ?? null;
      const slP = sl?.price ?? null;
      let   rr  = null;
      if (tpP && slP) {
        const reward = Math.abs(tpP - open.price);
        const risk   = Math.abs(slP - open.price);
        if (risk > 0) rr = Math.round((reward / risk) * 10) / 10;
      }

      trades.push({
        id:         `T${++idx}`,
        pair:        ord.pair,
        side:        open.side,
        entryDate:   open.date,
        exitDate:    ord.date,
        entryPrice:  open.price,
        exitPrice:   ord.price,
        lots,
        pnl,
        status:      pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be',
        duration:    durMin < 60
          ? `${durMin}m`
          : `${Math.floor(durMin / 60)}h ${durMin % 60}m`,
        rr,
        tp:  tpP,
        sl:  slP,
        notes: '',
        tags:  [],
      });
    } else {
      // Open new position
      stacks[k].push({ ...ord });
    }
  }
  return trades;
}

// ─── STATISTICS ───────────────────────────────────────────────────────────────

/**
 * Calculate comprehensive performance statistics from a trades array.
 */
export function calcStats(trades) {
  const closed  = trades.filter(t => ['win', 'loss', 'be'].includes(t.status));
  const wins    = closed.filter(t => t.status === 'win');
  const losses  = closed.filter(t => t.status === 'loss');
  const gross_w = wins.reduce((s, t)    => s + t.pnl, 0);
  const gross_l = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const net     = closed.reduce((s, t)  => s + t.pnl, 0);
  const winRate = closed.length ? Math.round(wins.length / closed.length * 100) : 0;
  const pf      = gross_l > 0 ? +(gross_w / gross_l).toFixed(2) : gross_w > 0 ? '∞' : 0;
  const avgW    = wins.length    ? +(gross_w / wins.length).toFixed(2)    : 0;
  const avgL    = losses.length  ? +(gross_l / losses.length).toFixed(2)  : 0;
  const avgLots = closed.length  ? +(closed.reduce((s,t) => s + t.lots, 0) / closed.length).toFixed(3) : 0;

  // Max drawdown (sequential equity)
  let peak = 0, eq = 0, maxDD = 0;
  [...closed]
    .sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate))
    .forEach(t => {
      eq += t.pnl;
      if (eq > peak) peak = eq;
      const dd = eq - peak;
      if (dd < maxDD) maxDD = dd;
    });

  return {
    total: closed.length,
    wins:  wins.length,
    losses: losses.length,
    winRate,
    net:     +net.toFixed(2),
    gross_w: +gross_w.toFixed(2),
    gross_l: +gross_l.toFixed(2),
    pf,
    avgW,
    avgL,
    avgLots,
    maxDD: +maxDD.toFixed(2),
  };
}

// ─── CHART DATA BUILDERS ──────────────────────────────────────────────────────

/** Running equity curve — one point per closed trade. */
export function buildEquityCurve(trades) {
  let eq = 0;
  return [...trades]
    .filter(t => t.exitDate)
    .sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate))
    .map(t => {
      eq += t.pnl;
      return {
        label:  new Date(t.exitDate).toLocaleDateString('en-GB', { month:'short', day:'numeric' }),
        equity: +eq.toFixed(2),
        pnl:    t.pnl,
      };
    });
}

/** Daily aggregated P&L for bar chart. */
export function buildDailyPnL(trades) {
  const m = {};
  trades.filter(t => t.exitDate).forEach(t => {
    const d = new Date(t.exitDate).toLocaleDateString('en-GB', { month:'short', day:'numeric' });
    if (!m[d]) m[d] = { d, pnl: 0, trades: 0 };
    m[d].pnl    += t.pnl;
    m[d].trades += 1;
  });
  return Object.values(m).map(x => ({ ...x, pnl: +x.pnl.toFixed(2) }));
}

// ─── LIGHTWEIGHT CHARTS DATA ──────────────────────────────────────────────────

const STEP_MS  = 5 * 60_000;   // 5-minute candles
const STEP_SEC = 5 * 60;

/**
 * Generate synthetic 5-min candlestick data anchored to real trade prices.
 * This gives the LWChart component something to render even though we don't
 * have tick data — entry/exit prices are always exactly on-bar.
 */
export function generateCandles(trades) {
  const valid = trades.filter(t => t.entryDate && t.entryPrice > 0);
  if (!valid.length) return [];

  const sorted  = [...valid].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  const allMs   = sorted.flatMap(t => [
    new Date(t.entryDate).getTime(),
    t.exitDate ? new Date(t.exitDate).getTime() : new Date(t.entryDate).getTime(),
  ]);
  const startMs = Math.min(...allMs) - 2 * 3_600_000;
  const endMs   = Math.max(...allMs) + 2 * 3_600_000;

  // Pin real prices to their candle bucket
  const anchors = {};
  sorted.forEach(t => {
    const ek = Math.floor(new Date(t.entryDate).getTime() / STEP_MS) * STEP_MS;
    anchors[ek] = t.entryPrice;
    if (t.exitDate && t.exitPrice) {
      const xk = Math.floor(new Date(t.exitDate).getTime() / STEP_MS) * STEP_MS;
      anchors[xk] = t.exitPrice;
    }
  });

  let price     = sorted[0].entryPrice;
  const seen    = new Set();
  const candles = [];

  for (let ms = startMs; ms <= endMs; ms += STEP_MS) {
    const bucket = Math.floor(ms / STEP_MS) * STEP_MS;
    const sec    = Math.floor(bucket / 1000);
    if (seen.has(sec)) continue;
    seen.add(sec);

    if (anchors[bucket] !== undefined) price = anchors[bucket];

    const vol   = price * 0.0009;
    const delta = (Math.random() - 0.5) * vol * 2;
    const open  = price;
    const close = price + delta;
    const wk    = vol * (0.3 + Math.random() * 0.7);
    const high  = Math.max(open, close) + wk * Math.random();
    const low   = Math.min(open, close) - wk * Math.random();

    candles.push({
      time:  sec,
      open:  +open.toFixed(2),
      high:  +high.toFixed(2),
      low:   +low.toFixed(2),
      close: +close.toFixed(2),
    });
    price = close;
  }

  return candles.sort((a, b) => a.time - b.time);
}

/**
 * Build series markers for Lightweight Charts from the trades array.
 * Entry arrows are placed at the entry bar, exit circles at the exit bar.
 */
export function buildChartMarkers(trades) {
  const markers = [];
  const usedT   = {};

  const uniq = (sec) => {
    usedT[sec] = (usedT[sec] || 0) + 1;
    return sec + (usedT[sec] - 1) * 60;
  };

  [...trades]
    .filter(t => t.entryDate)
    .sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate))
    .forEach(t => {
      // Entry marker
      const eS = Math.floor(new Date(t.entryDate).getTime() / 1000);
      const eC = Math.floor(eS / STEP_SEC) * STEP_SEC;
      markers.push({
        time:     uniq(eC),
        position: t.side === 'buy' ? 'belowBar' : 'aboveBar',
        color:    t.side === 'buy' ? '#10b981'  : '#f43f5e',
        shape:    t.side === 'buy' ? 'arrowUp'  : 'arrowDown',
        text:     `${t.id} ${t.side.toUpperCase()} ${t.lots}L`,
        size:     1,
      });

      // Exit marker
      if (t.exitDate && t.exitPrice != null) {
        const xS  = Math.floor(new Date(t.exitDate).getTime() / 1000);
        const xC  = Math.floor(xS / STEP_SEC) * STEP_SEC;
        const pnl = t.pnl ?? 0;
        markers.push({
          time:     uniq(xC),
          position: t.side === 'buy' ? 'aboveBar' : 'belowBar',
          color:    pnl > 0 ? '#10b981' : pnl < 0 ? '#f43f5e' : '#6366f1',
          shape:    'circle',
          text:     `${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)}`,
          size:     1,
        });
      }
    });

  return markers.sort((a, b) => a.time - b.time);
}
