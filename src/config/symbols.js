// src/config/symbols.js
// All TradingView symbol definitions grouped by category.
// Add / remove symbols here — no other file needs changing.

export const SYMBOL_CATS = [
  {
    cat: 'Forex Majors',
    color: 'var(--indigo)',
    symbols: [
      { label: 'EUR/USD', value: 'OANDA:EURUSD' },
      { label: 'GBP/USD', value: 'OANDA:GBPUSD' },
      { label: 'USD/JPY', value: 'OANDA:USDJPY' },
      { label: 'USD/CHF', value: 'OANDA:USDCHF' },
      { label: 'AUD/USD', value: 'OANDA:AUDUSD' },
      { label: 'USD/CAD', value: 'OANDA:USDCAD' },
      { label: 'NZD/USD', value: 'OANDA:NZDUSD' },
    ],
  },
  {
    cat: 'Forex Minors',
    color: 'var(--sky)',
    symbols: [
      { label: 'EUR/GBP', value: 'OANDA:EURGBP' },
      { label: 'EUR/JPY', value: 'OANDA:EURJPY' },
      { label: 'GBP/JPY', value: 'OANDA:GBPJPY' },
      { label: 'EUR/AUD', value: 'OANDA:EURAUD' },
      { label: 'EUR/CHF', value: 'OANDA:EURCHF' },
      { label: 'AUD/JPY', value: 'OANDA:AUDJPY' },
      { label: 'GBP/CHF', value: 'OANDA:GBPCHF' },
      { label: 'CAD/JPY', value: 'OANDA:CADJPY' },
    ],
  },
  {
    cat: 'Metals & Energy',
    color: 'var(--amber)',
    symbols: [
      { label: 'XAU/USD', value: 'OANDA:XAUUSD' },
      { label: 'XAG/USD', value: 'OANDA:XAGUSD' },
      { label: 'WTI Oil', value: 'TVC:USOIL'    },
      { label: 'Brent',   value: 'TVC:UKOIL'    },
      { label: 'Copper',  value: 'COMEX:HG1!'   },
    ],
  },
  {
    cat: 'Indices',
    color: 'var(--emerald)',
    symbols: [
      { label: 'S&P 500',  value: 'CME_MINI:ES1!'  },
      { label: 'Nasdaq',   value: 'NASDAQ:NQ1!'    },
      { label: 'Dow',      value: 'CBOT_MINI:YM1!' },
      { label: 'DAX',      value: 'XETR:DAX'       },
      { label: 'FTSE 100', value: 'SPREADEX:FTSE'  },
      { label: 'Nikkei',   value: 'TVC:NI225'      },
    ],
  },
  {
    cat: 'Crypto',
    color: 'var(--violet)',
    symbols: [
      { label: 'BTC/USD', value: 'BINANCE:BTCUSDT' },
      { label: 'ETH/USD', value: 'BINANCE:ETHUSDT' },
      { label: 'SOL/USD', value: 'BINANCE:SOLUSDT' },
      { label: 'XRP/USD', value: 'BINANCE:XRPUSDT' },
    ],
  },
];

/** Default symbol shown when the chart first loads */
export const DEFAULT_SYMBOL = 'OANDA:XAUUSD';
