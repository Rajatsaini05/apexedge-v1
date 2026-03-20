// src/utils/exportUtils.js
// Export trades to CSV, and generate a plain-text performance report.
// No third-party dependency needed — pure browser APIs.

import { calcStats, buildEquityCurve, buildDailyPnL } from './tradeEngine';

// ── CSV export ─────────────────────────────────────────────────────────────────
const ESC = (v) => {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

/**
 * Download all trades as a CSV file.
 * @param {object[]} trades
 * @param {string}   filename  default: 'apexedge_trades.csv'
 */
export function exportTradesCSV(trades, filename = 'apexedge_trades.csv') {
  const HEADERS = [
    'ID', 'Pair', 'Direction', 'Entry Date', 'Exit Date',
    'Entry Price', 'Exit Price', 'Lots', 'P&L ($)', 'Result',
    'Duration', 'R:R', 'TP', 'SL', 'Tags', 'Notes', 'Source',
  ];

  const rows = trades.map(t => [
    t.id,
    t.pair,
    t.side === 'buy' ? 'LONG' : 'SHORT',
    t.entryDate  ? new Date(t.entryDate).toISOString()  : '',
    t.exitDate   ? new Date(t.exitDate).toISOString()   : '',
    t.entryPrice ?? '',
    t.exitPrice  ?? '',
    t.lots       ?? '',
    t.pnl        ?? '',
    t.status     ?? '',
    t.duration   ?? '',
    t.rr         ?? '',
    t.tp         ?? '',
    t.sl         ?? '',
    (t.tags || []).join(';'),
    t.notes      ?? '',
    t.source     ?? 'csv',
  ].map(ESC).join(','));

  const csv = [HEADERS.join(','), ...rows].join('\n');
  downloadBlob(csv, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export journal entries only (trades that have notes).
 */
export function exportJournalCSV(trades, filename = 'apexedge_journal.csv') {
  const noted = trades.filter(t => t.notes);
  exportTradesCSV(noted, filename);
}

// ── Performance report (plain text) ──────────────────────────────────────────
/**
 * Generate a plain-text performance report and trigger download.
 */
export function exportReport(trades, username = 'Trader', filename = 'apexedge_report.txt') {
  const s      = calcStats(trades);
  const equity = buildEquityCurve(trades);
  const daily  = buildDailyPnL(trades);

  const line   = (char = '─', n = 60) => char.repeat(n);
  const row    = (label, value) => `  ${label.padEnd(28)} ${value}`;
  const now    = new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' });

  // Best / worst day
  const sorted = [...daily].sort((a, b) => a.pnl - b.pnl);
  const worst  = sorted[0];
  const best   = sorted[sorted.length - 1];

  // Longest win / loss streak
  let maxWS = 0, maxLS = 0, ws = 0, ls = 0;
  [...trades]
    .filter(t => ['win','loss'].includes(t.status))
    .sort((a,b) => new Date(a.exitDate) - new Date(b.exitDate))
    .forEach(t => {
      if (t.status === 'win')  { ws++; ls = 0; maxWS = Math.max(maxWS, ws); }
      else                     { ls++; ws = 0; maxLS = Math.max(maxLS, ls); }
    });

  const lines = [
    line('═'),
    `  APEXEDGE — PERFORMANCE REPORT`,
    `  Generated for: ${username}`,
    `  Date: ${now}`,
    line('═'),
    '',
    '  SUMMARY',
    line(),
    row('Total Trades',      s.total),
    row('Winning Trades',    `${s.wins}  (${s.winRate}%)`),
    row('Losing Trades',     s.losses),
    row('Break-even',        s.total - s.wins - s.losses),
    '',
    '  P&L',
    line(),
    row('Net P&L',           `$${s.net.toFixed(2)}`),
    row('Gross Profit',      `$${s.gross_w.toFixed(2)}`),
    row('Gross Loss',        `$${s.gross_l.toFixed(2)}`),
    row('Profit Factor',     String(s.pf)),
    row('Max Drawdown',      `$${Math.abs(s.maxDD).toFixed(2)}`),
    '',
    '  AVERAGES',
    line(),
    row('Avg Win',           `$${s.avgW}`),
    row('Avg Loss',          `$${s.avgL}`),
    row('Avg Lot Size',      String(s.avgLots)),
    row('Win/Loss Ratio',    s.avgL > 0 ? (s.avgW / s.avgL).toFixed(2) : '∞'),
    '',
    '  STREAKS',
    line(),
    row('Longest Win Streak',  `${maxWS} trades`),
    row('Longest Loss Streak', `${maxLS} trades`),
    '',
    '  BEST / WORST DAYS',
    line(),
    best  ? row('Best Day',   `${best.d}  +$${best.pnl.toFixed(2)} (${best.trades} trades)`)  : '',
    worst ? row('Worst Day',  `${worst.d}  $${worst.pnl.toFixed(2)} (${worst.trades} trades)`) : '',
    '',
    '  EQUITY CURVE (last 20 points)',
    line(),
    ...equity.slice(-20).map((p, i) => row(`${i + 1}. ${p.label}`, `$${p.equity.toFixed(2)}  (${p.pnl >= 0 ? '+' : ''}$${p.pnl.toFixed(2)})`)),
    '',
    line('═'),
    `  End of report — APEXEDGE v1.0`,
    line('═'),
  ];

  downloadBlob(lines.join('\n'), filename, 'text/plain;charset=utf-8;');
}

// ── Helper ────────────────────────────────────────────────────────────────────
function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
