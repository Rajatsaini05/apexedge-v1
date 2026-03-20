// src/components/charts/index.jsx
// Two chart engines used on the Chart page:
//
//  TVWidget  — embeds the TradingView Advanced Chart widget
//              NO default indicators (user can add their own via the TV toolbar)
//
//  LWChart   — Lightweight Charts v4 rendering synthetic 5-min candles
//              with entry/exit markers from real trade data

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { generateCandles, buildChartMarkers } from '../../utils/tradeEngine';

// ─── TRADINGVIEW ADVANCED CHART ───────────────────────────────────────────────
/**
 * Embeds the TradingView Advanced Chart as an iframe-based widget.
 * Key choices:
 *  - studies: []           → NO indicators by default (user adds them in TV)
 *  - allow_symbol_change   → user can type any symbol in the TV search bar
 *  - hide_side_toolbar: false → drawing tools visible
 */
export const TVWidget = ({ symbol }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container__widget';
    wrap.style.cssText = 'height:calc(100% - 32px);width:100%';

    const script = document.createElement('script');
    script.type  = 'text/javascript';
    script.async = true;
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

    script.textContent = JSON.stringify({
      autosize:           true,
      symbol,
      interval:           '5',
      timezone:           'Etc/UTC',
      theme:              'dark',
      style:              '1',
      locale:             'en',
      backgroundColor:    'rgba(6,7,13,1)',
      gridColor:          'rgba(255,255,255,0.04)',
      hide_top_toolbar:   false,
      withdateranges:     true,
      allow_symbol_change: true,
      calendar:           false,
      hide_side_toolbar:  false,
      studies:            [],          // ← NO default indicators
      support_host:       'https://www.tradingview.com',
    });

    ref.current.appendChild(wrap);
    ref.current.appendChild(script);

    return () => { if (ref.current) ref.current.innerHTML = ''; };
  }, [symbol]);

  return (
    <div
      ref={ref}
      className="tradingview-widget-container"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

// ─── LIGHTWEIGHT CHARTS ───────────────────────────────────────────────────────
/**
 * Renders synthetic 5-min candlesticks with entry/exit trade markers.
 * Loaded from CDN so no extra npm dependency is needed.
 */
export const LWChart = ({ trades }) => {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const [loaded, setLoaded] = useState(!!window.LightweightCharts);
  const [hovTrade, setHovTrade] = useState(null);

  // Load the Lightweight Charts script once globally
  useEffect(() => {
    if (window.LightweightCharts) { setLoaded(true); return; }
    const s    = document.createElement('script');
    s.src      = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js';
    s.onload   = () => setLoaded(true);
    s.onerror  = () => console.error('[LWChart] failed to load CDN script');
    document.head.appendChild(s);
  }, []);

  // Build / rebuild chart whenever the script is ready or trades change
  useEffect(() => {
    if (!loaded || !containerRef.current) return;
    if (chartRef.current) { try { chartRef.current.remove(); } catch {} chartRef.current = null; }

    const LC = window.LightweightCharts;
    const el = containerRef.current;

    const chart = LC.createChart(el, {
      width:  el.clientWidth,
      height: el.clientHeight,
      layout: {
        background:  { type: 'solid', color: '#06070d' },
        textColor:   '#64748b',
        fontFamily:  'var(--fm)',
        fontSize:    11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,.04)' },
        horzLines: { color: 'rgba(255,255,255,.04)' },
      },
      crosshair: {
        mode: LC.CrosshairMode.Normal,
        vertLine: { color: '#6366f1', labelBackgroundColor: '#4f46e5' },
        horzLine: { color: '#6366f1', labelBackgroundColor: '#4f46e5' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,.06)', minimumWidth: 80 },
      timeScale:       { borderColor: 'rgba(255,255,255,.06)', timeVisible: true, secondsVisible: false, rightOffset: 8 },
      handleScroll:    true,
      handleScale:     true,
    });
    chartRef.current = chart;

    const candles = generateCandles(trades);
    if (candles.length > 0) {
      const series = chart.addCandlestickSeries({
        upColor:        '#10b981', downColor:        '#f43f5e',
        borderUpColor:  '#10b981', borderDownColor:  '#f43f5e',
        wickUpColor:    '#6ee7b7', wickDownColor:    '#fda4af',
      });
      series.setData(candles);

      const markers = buildChartMarkers(trades);
      if (markers.length) series.setMarkers(markers);

      chart.timeScale().fitContent();

      // Crosshair hover → highlight nearest trade
      chart.subscribeCrosshairMove(param => {
        if (!param.time) { setHovTrade(null); return; }
        const nearby = trades.find(t => {
          const es = t.entryDate ? Math.floor(new Date(t.entryDate).getTime() / 1000) : 0;
          const xs = t.exitDate  ? Math.floor(new Date(t.exitDate).getTime()  / 1000) : 0;
          return Math.abs(es - param.time) < 600 || Math.abs(xs - param.time) < 600;
        });
        setHovTrade(nearby ?? null);
      });
    }

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      try { chartRef.current?.remove(); } catch {}
    };
  }, [loaded, trades]);

  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontFamily: 'var(--fm)', fontSize: 12 }}>
      <div className="spin" style={{ width: 18, height: 18, border: '2px solid var(--line)', borderTopColor: 'var(--indigo)', borderRadius: '50%', marginRight: 10 }} />
      Loading chart engine…
    </div>
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Hover trade detail card */}
      {hovTrade && (
        <div className="fade-in" style={{
          position: 'absolute', top: 12, right: 12, zIndex: 10,
          background: 'rgba(16,18,31,.96)', border: '1px solid var(--line2)',
          borderRadius: 10, padding: '12px 16px', fontSize: 12,
          fontFamily: 'var(--fm)', minWidth: 200, backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13 }}>{hovTrade.pair}</span>
            <span style={{ color: hovTrade.side === 'buy' ? 'var(--emerald)' : 'var(--rose)', textTransform: 'uppercase', fontSize: 11 }}>
              {hovTrade.side === 'buy' ? '▲ LONG' : '▼ SHORT'}
            </span>
          </div>
          {[
            ['Trade',    hovTrade.id],
            ['Lots',     hovTrade.lots],
            ['Entry',    hovTrade.entryPrice?.toFixed(2)],
            ['Exit',     hovTrade.exitPrice?.toFixed(2) ?? '—'],
            ['P&L',      (hovTrade.pnl > 0 ? '+' : '') + '$' + (hovTrade.pnl?.toFixed(2) ?? '0')],
            ['Duration', hovTrade.duration ?? '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--sub)', lineHeight: 1.9 }}>
              <span>{k}</span>
              <span style={{ color: k === 'P&L' ? (hovTrade.pnl > 0 ? 'var(--emerald)' : 'var(--rose)') : 'var(--text)' }}>
                {v}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
