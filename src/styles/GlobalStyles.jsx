// src/styles/GlobalStyles.jsx
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:      #06070d;
      --surface: #0c0e18;
      --card:    #10121f;
      --card2:   #161929;
      --line:    rgba(255,255,255,0.06);
      --line2:   rgba(99,102,241,0.22);
      --indigo:  #6366f1;
      --violet:  #8b5cf6;
      --emerald: #10b981;
      --rose:    #f43f5e;
      --amber:   #f59e0b;
      --sky:     #38bdf8;
      --text:    #f1f5f9;
      --sub:     #94a3b8;
      --muted:   #475569;
      --fh: 'Syne', sans-serif;
      --fb: 'DM Sans', sans-serif;
      --fm: 'JetBrains Mono', monospace;
      --r:    10px;
      --r-sm: 6px;
      --bottom-nav-height: 0px;
    }

    html, body, #root { height: 100%; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--fb);
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      /* Prevent horizontal scroll on mobile */
      overflow-x: hidden;
    }

    input, textarea, select {
      background: var(--card2);
      border: 1px solid var(--line);
      color: var(--text);
      font-family: var(--fb);
      font-size: 13px;
      padding: 8px 12px;
      border-radius: var(--r-sm);
      outline: none;
      width: 100%;
      transition: border-color .15s;
      /* Prevent iOS zoom on focus */
      font-size: max(16px, 13px);
    }
    input:focus, textarea:focus, select:focus { border-color: var(--indigo); }
    input::placeholder, textarea::placeholder { color: var(--muted); }
    button { cursor: pointer; font-family: var(--fb); }

    ::-webkit-scrollbar       { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--card2); border-radius: 4px; }

    @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes spin   { to { transform: rotate(360deg); } }
    @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:.4} }

    .fade-up { animation: fadeUp .3s ease both; }
    .fade-in { animation: fadeIn .25s ease both; }
    .spin    { animation: spin .7s linear infinite; }

    .stagger > * { animation: fadeUp .3s ease both; }
    .stagger > *:nth-child(1) { animation-delay: .04s; }
    .stagger > *:nth-child(2) { animation-delay: .08s; }
    .stagger > *:nth-child(3) { animation-delay: .12s; }
    .stagger > *:nth-child(4) { animation-delay: .16s; }
    .stagger > *:nth-child(5) { animation-delay: .20s; }
    .stagger > *:nth-child(6) { animation-delay: .24s; }

    td, th { vertical-align: middle; }

    /* ── MOBILE RESPONSIVE ─────────────────────────────────────────── */
    @media (max-width: 768px) {
      :root {
        /* Reserve space at bottom for the fixed bottom nav */
        --bottom-nav-height: 60px;
      }

      /* All pages need bottom padding so content isn't hidden behind bottom nav */
      main {
        padding-bottom: 60px !important;
      }

      /* Smaller base font on mobile */
      body { font-size: 13px; }

      /* Inputs: keep 16px to prevent iOS zoom */
      input, textarea, select { font-size: 16px; }

      /* ── Grid layouts → single column on mobile ── */
      .mobile-stack {
        grid-template-columns: 1fr !important;
      }

      /* ── Stat card grids: 2 columns on mobile instead of 5 ── */
      .stagger[style*="repeat(5"] ,
      .stagger[style*="repeat(4"] ,
      .stagger[style*="repeat(3"] {
        grid-template-columns: 1fr 1fr !important;
      }

      /* ── Tables: horizontal scroll ── */
      table {
        font-size: 11px !important;
        min-width: 500px;
      }
      /* Wrapper divs with overflow-x:auto already handle table scroll */

      /* ── Cards: reduce padding on mobile ── */
      .card-mobile-pad {
        padding: 12px !important;
      }

      /* ── Hide subtitle on very small screens ── */
      .topbar-subtitle { display: none; }

      /* ── Auth page: single column on mobile ── */
      .auth-right {
        width: 100% !important;
        border-left: none !important;
        padding: 24px 20px !important;
      }
      .auth-left { display: none !important; }

      /* ── Chart page: full width ── */
      .chart-container {
        height: 280px !important;
      }
    }

    @media (max-width: 480px) {
      /* Extra small phones */
      .stagger[style*="repeat"] {
        grid-template-columns: 1fr !important;
      }
    }
  `}</style>
);

export default GlobalStyles;
