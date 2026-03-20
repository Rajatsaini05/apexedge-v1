// src/utils/csvParser.js
// Universal broker CSV parser.
//
// HANDLES TWO FORMATS:
//   Format A — Complete trades (one row = one closed trade with entry + exit)
//              Used by: MT4/MT5 statement, IC Markets, Pepperstone, XM, FTMO
//   Format B — Order events (two rows per trade: open + close)
//              Used by: some raw deal exports
//
// The AI mapping step tells us which format we have.

// ── Low-level CSV line parser (handles quoted commas) ───────────────────────
function parseLine(line) {
  const vals = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
    else if (c === '"') { inQ = !inQ; }
    else if ((c === ',' || c === '\t') && !inQ) { vals.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  vals.push(cur.trim());
  return vals;
}

// ── Extract headers and first 8 preview rows ────────────────────────────────
export function previewCSV(text) {
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim().split('\n')
    .filter(l => l.trim());

  // Find header row — skip metadata rows that start with # or have only 1 cell
  let hdrIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cells = parseLine(lines[i]);
    if (cells.length >= 3) { hdrIdx = i; break; }
  }

  const headers = parseLine(lines[hdrIdx]).map(h => h.replace(/^"|"$/g,'').trim());

  const rows = lines.slice(hdrIdx + 1, hdrIdx + 9)
    .filter(l => l.trim() && parseLine(l).some(v => v))
    .map(l => {
      const vals = parseLine(l);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g,'').trim(); });
      return obj;
    });

  return { headers, rows, headerRowIndex: hdrIdx };
}

// ── Auto-detect column mapping from headers (fast fallback before AI) ────────
export function autoDetectMapping(headers) {
  const lower = headers.map(h => h.toLowerCase());

  const find = (...patterns) => {
    for (const p of patterns) {
      const i = lower.findIndex(h => h.includes(p) || new RegExp(p,'i').test(h));
      if (i >= 0) return headers[i];
    }
    return '';
  };

  return {
    // Format A — complete trade rows
    format:      'A',
    id:          find('ticket','order','deal','id','#'),
    pair:        find('symbol','pair','instrument','asset','currency'),
    type:        find('type','order type','direction'),
    side:        find('side','action','buy/sell','direction'),
    entryDate:   find('open time','entry time','open date','date open','time open','entry'),
    exitDate:    find('close time','exit time','close date','date close','time close','exit','closed'),
    entryPrice:  find('open price','entry price','price open','open','entry rate'),
    exitPrice:   find('close price','exit price','price close','close','exit rate'),
    lots:        find('volume','lot','size','qty','quantity'),
    pnl:         find('profit','pnl','p&l','p/l','gain','result','net','realised','realized'),
    tp:          find('take profit','tp','t/p'),
    sl:          find('stop loss','sl','s/l'),
    swap:        find('swap','rollover'),
    commission:  find('commission','commis'),
    // Format B fallback
    price:       find('price','fill price','exec price','executed'),
    status:      find('status','state','filled','exec'),
  };
}

// ── Parse CSV using an AI-generated or manual mapping ────────────────────────
// mapping shape (from AI or autoDetect):
//   { format:'A'|'B', id, pair, side/type, entryDate, exitDate,
//     entryPrice, exitPrice, lots, pnl, tp, sl, swap, commission }
export function parseCSVWithMapping(text, mapping) {
  const { headers, rows: _, headerRowIndex } = previewCSV(text);
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim().split('\n')
    .filter(l => l.trim());

  const dataLines = lines.slice(headerRowIndex + 1).filter(l => {
    const cells = parseLine(l);
    return cells.some(c => c.trim()) && cells.length >= 3;
  });

  const fmt  = mapping.format || 'A';

  if (fmt === 'A') {
    return parseFormatA(dataLines, headers, mapping);
  } else {
    return parseFormatB(dataLines, headers, mapping);
  }
}

// ── Format A: one row = one complete closed trade ────────────────────────────
function parseFormatA(lines, headers, m) {
  const trades = [];
  let idx = 0;

  for (const line of lines) {
    const vals = parseLine(line);
    const row  = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').replace(/^"|"$/g,'').trim(); });

    const pair = m.pair       ? row[m.pair]?.trim() : '';
    if (!pair) continue;

    // Resolve side/direction
    let side = '';
    const rawType = (m.type ? row[m.type] : '') || (m.side ? row[m.side] : '') || '';
    const t = rawType.toLowerCase();
    if (t.includes('buy') || t === 'b' || t === '0' || t === 'long')  side = 'buy';
    if (t.includes('sell')|| t === 's' || t === '1' || t === 'short') side = 'sell';
    if (!side) continue; // skip non-trade rows (balance, credit, deposits)

    const entryPrice = m.entryPrice ? parseFloat(row[m.entryPrice]) || null : null;
    const exitPrice  = m.exitPrice  ? parseFloat(row[m.exitPrice])  || null : null;
    const lots       = m.lots       ? parseFloat(row[m.lots])       || 0   : 0;
    let   pnl        = m.pnl        ? parseFloat(row[m.pnl]?.replace(/[^\d.-]/g,'')) : null;
    const swap       = m.swap       ? parseFloat(row[m.swap])       || 0   : 0;
    const comm       = m.commission ? parseFloat(row[m.commission]) || 0   : 0;

    // Add swap/commission to pnl if pnl doesn't already include them
    if (pnl !== null && (swap || comm)) {
      // Only add if they're separate columns (not already in pnl)
      // Heuristic: if |swap+comm| > |pnl|/2, pnl likely already includes them
      if (Math.abs(swap + comm) < Math.abs(pnl) / 2 + 0.01) {
        pnl = Math.round((pnl + swap + comm) * 100) / 100;
      }
    }

    const entryDate = m.entryDate ? parseDate(row[m.entryDate]) : null;
    const exitDate  = m.exitDate  ? parseDate(row[m.exitDate])  : null;

    // Duration
    let duration = '';
    if (entryDate && exitDate) {
      const mins = Math.max(0, Math.round((new Date(exitDate) - new Date(entryDate)) / 60_000));
      duration = mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;
    }

    // Status
    let status = 'open';
    if (exitDate && exitPrice) {
      if (pnl === null && entryPrice && exitPrice && lots) {
        const raw = side === 'buy' ? (exitPrice - entryPrice) * lots * 100 : (entryPrice - exitPrice) * lots * 100;
        pnl = Math.round(raw * 100) / 100;
      }
      status = pnl === null ? 'open' : pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be';
    }

    const id = m.id ? (row[m.id] || `T${++idx}`) : `T${++idx}`;

    trades.push({
      id:    `CSV-${id}`,
      pair:  normalisePair(pair),
      side,
      entryDate,
      exitDate,
      entryPrice,
      exitPrice,
      lots,
      pnl:    pnl !== null ? Math.round(pnl * 100) / 100 : null,
      status,
      duration,
      tp:     m.tp ? parseFloat(row[m.tp]) || null : null,
      sl:     m.sl ? parseFloat(row[m.sl]) || null : null,
      rr:     null,
      notes:  '',
      tags:   [],
      source: 'csv',
    });
  }

  return trades.filter(t => t.pair && (t.exitDate || t.status === 'open'));
}

// ── Format B: two rows per trade (open + close events) ───────────────────────
function parseFormatB(lines, headers, m) {
  // Fall back to the classic order-matching engine
  const orders = lines.map((line, i) => {
    const vals = parseLine(line);
    const row  = {};
    headers.forEach((h, idx2) => { row[h] = (vals[idx2] || '').replace(/^"|"$/g,'').trim(); });

    const pair  = m.pair  ? row[m.pair]?.trim()  : '';
    const price = m.price ? parseFloat(row[m.price]) || 0 : 0;
    const rawT  = (m.type ? row[m.type] : '') || (m.side ? row[m.side] : '') || '';
    const t     = rawT.toLowerCase();
    const side  = t.includes('buy')||t==='0'||t==='b'||t==='long' ? 'buy'
                : t.includes('sell')||t==='1'||t==='s'||t==='short' ? 'sell' : '';

    if (!pair || !side || !price) return null;
    return {
      id:     m.id ? row[m.id] || `O${i}` : `O${i}`,
      date:   m.entryDate ? parseDate(row[m.entryDate]) || row[m.entryDate] : '',
      pair:   normalisePair(pair),
      side,
      lots:   m.lots ? parseFloat(row[m.lots]) || 0 : 0,
      price,
      status: 'filled',
    };
  }).filter(Boolean);

  return buildTradesFromOrders(orders);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseDate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || s === '-' || s === '') return null;
  // Try native parse first
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString();
  // DD.MM.YYYY HH:MM:SS (MT4/MT5 default)
  const m1 = s.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)$/);
  if (m1) return new Date(`${m1[3]}-${m1[2]}-${m1[1]}T${m1[4]}`).toISOString();
  // YYYY.MM.DD HH:MM
  const m2 = s.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)$/);
  if (m2) return new Date(`${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}`).toISOString();
  return null;
}

function normalisePair(raw) {
  if (!raw) return '';
  return raw.trim().replace('/', '').replace('-', '').toUpperCase();
}

function buildTradesFromOrders(orders) {
  const filled = orders.filter(o => o.status === 'filled');
  const sorted = [...filled].sort((a, b) => new Date(a.date) - new Date(b.date));
  const stacks = {};
  const trades = [];
  let idx = 0;

  for (const ord of sorted) {
    const k = ord.pair;
    if (!stacks[k]) stacks[k] = [];
    const opp = ord.side === 'buy' ? 'sell' : 'buy';
    const oi  = stacks[k].findIndex(p => p.side === opp);
    if (oi >= 0) {
      const open = stacks[k].splice(oi, 1)[0];
      const lots = Math.min(open.lots, ord.lots);
      const raw  = open.side === 'buy'
        ? (ord.price - open.price) * lots * 100
        : (open.price - ord.price) * lots * 100;
      const pnl  = Math.round(raw * 100) / 100;
      const mins = Math.max(0, Math.round((new Date(ord.date) - new Date(open.date)) / 60_000));
      trades.push({
        id:          `T${++idx}`,
        pair:         ord.pair,
        side:         open.side,
        entryDate:    open.date,
        exitDate:     ord.date,
        entryPrice:   open.price,
        exitPrice:    ord.price,
        lots,
        pnl,
        status:       pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be',
        duration:     mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`,
        rr: null, tp: null, sl: null,
        notes: '', tags: [], source: 'csv',
      });
    } else {
      stacks[k].push({ ...ord });
    }
  }
  return trades;
}

// ── Legacy export (used by old code) ────────────────────────────────────────
export function buildTrades(orders) { return buildTradesFromOrders(orders); }
export function parseCSV(text, map) {
  // Legacy shim — treat as format B
  return buildTradesFromOrders(
    text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim().split('\n').slice(1)
      .map((l, i) => {
        if (!l.trim()) return null;
        const m = map || {};
        const { headers } = previewCSV(text);
        const vals = parseLine(l);
        const row = {};
        headers.forEach((h, idx) => { row[h] = (vals[idx]||'').trim(); });
        const price = parseFloat(row[m.price||'Price']) || 0;
        const pair  = row[m.pair||'Symbol']||row[m.pair||'Pair']||'';
        if (!pair || !price) return null;
        const t = (row[m.side||'Side']||row[m.type||'Type']||'').toLowerCase();
        const side = t.includes('buy') ? 'buy' : t.includes('sell') ? 'sell' : '';
        if (!side) return null;
        return { id: row[m.orderId||'Order ID']||`O${i}`, date: row[m.date||'Date']||'', pair: normalisePair(pair), side, lots: parseFloat(row[m.lotSize||'Volume'])||0, price, status:'filled' };
      }).filter(Boolean)
  );
}
