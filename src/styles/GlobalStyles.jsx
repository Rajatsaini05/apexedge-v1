// src/styles/GlobalStyles.jsx
// All CSS custom properties, resets, animations and global rules.
// Import this ONCE at the top of App.jsx.

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      /* backgrounds */
      --bg:      #06070d;
      --surface: #0c0e18;
      --card:    #10121f;
      --card2:   #161929;

      /* borders */
      --line:  rgba(255,255,255,0.06);
      --line2: rgba(99,102,241,0.22);

      /* accent palette */
      --indigo:  #6366f1;
      --violet:  #8b5cf6;
      --emerald: #10b981;
      --rose:    #f43f5e;
      --amber:   #f59e0b;
      --sky:     #38bdf8;

      /* typography */
      --text:  #f1f5f9;
      --sub:   #94a3b8;
      --muted: #475569;
      --fh: 'Syne', sans-serif;
      --fb: 'DM Sans', sans-serif;
      --fm: 'JetBrains Mono', monospace;

      /* radius */
      --r:    10px;
      --r-sm: 6px;
    }

    html, body, #root { height: 100%; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--fb);
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
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
    }
    input:focus, textarea:focus, select:focus { border-color: var(--indigo); }
    input::placeholder, textarea::placeholder  { color: var(--muted); }
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

    /* staggered children */
    .stagger > * { animation: fadeUp .3s ease both; }
    .stagger > *:nth-child(1) { animation-delay: .04s; }
    .stagger > *:nth-child(2) { animation-delay: .08s; }
    .stagger > *:nth-child(3) { animation-delay: .12s; }
    .stagger > *:nth-child(4) { animation-delay: .16s; }
    .stagger > *:nth-child(5) { animation-delay: .20s; }
    .stagger > *:nth-child(6) { animation-delay: .24s; }

    td, th { vertical-align: middle; }
  `}</style>
);

export default GlobalStyles;
