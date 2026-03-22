// src/App.jsx
import { useState, useCallback, useEffect  } from 'react';
import GlobalStyles   from './styles/GlobalStyles';
import { Sidebar }    from './components/layout';
import { useAuth }    from './hooks/useAuth';
import { useTrades }  from './hooks/useTrades';
import { useToast }   from './hooks/useToast';

import AuthPage       from './pages/AuthPage';
import DashboardPage  from './pages/DashboardPage';
import ChartPage      from './pages/ChartPage';
import PositionsPage  from './pages/PositionsPage';
import AnalyticsPage  from './pages/AnalyticsPage';
import JournalPage    from './pages/JournalPage';
import AIPage         from './pages/AIPage';
import ImportPage     from './pages/ImportPage';
import MT5Page        from './pages/MT5Page';
import PlansPage      from './pages/PlansPage';
import NewsPage       from './pages/NewsPage';
import SettingsPage   from './pages/SettingsPage';

// ── Loading screen — shows "retry" button after 8 seconds ─────────────────────
function FullScreenSpinner() {
  const [showRetry, setShowRetry] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowRetry(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:16 }}>
      {!showRetry ? (
        <>
          <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid var(--line)', borderTopColor:'var(--indigo)', animation:'spin .7s linear infinite' }}/>
          <p style={{ color:'var(--muted)', fontFamily:'var(--fm)', fontSize:12 }}>Restoring session…</p>
        </>
      ) : (
        <>
          <div style={{ width:52, height:52, borderRadius:12, background:'var(--card)', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>⚡</div>
          <p style={{ color:'var(--text)', fontFamily:'var(--fh)', fontWeight:700, fontSize:16 }}>Taking longer than expected</p>
          <p style={{ color:'var(--sub)', fontFamily:'var(--fm)', fontSize:12, maxWidth:320, textAlign:'center', lineHeight:1.6 }}>
            Supabase may be slow or your connection dropped. Check your VITE_SUPABASE_URL in .env
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background:'var(--indigo)', color:'#fff', border:'none', borderRadius:8, padding:'9px 24px', fontSize:13, fontFamily:'var(--fb)', fontWeight:600, cursor:'pointer' }}
          >
            Reload Page
          </button>
        </>
      )}
    </div>
  );
}

function InnerApp() {
  const { user, profile, signOut } = useAuth();
  const {
    trades, loading: tradesLoading, error: tradesError,
    importTrades, updateTrade, addTrade,
    clearAllTrades, deleteTrade, setTrades,
  } = useTrades();
  const { toast } = useToast();
  const [page, setPage] = useState('dashboard');
  // After 8s of loading trades, show the app anyway with empty state
  const [tradesTimedOut, setTradesTimedOut] = useState(false);
  useEffect(() => {
    if (!tradesLoading) { setTradesTimedOut(false); return; }
    const t = setTimeout(() => setTradesTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [tradesLoading]);

  // CSV/MT5 import → persist to Supabase → navigate to dashboard
  const handleImport = useCallback(async (_orders, newTrades, meta = {}) => {
    try {
      const { count } = await importTrades(newTrades, meta);
      toast.success(`${count} trades imported successfully.`);
      setPage('dashboard');
    } catch (e) {
      toast.error(`Import failed: ${e.message}`);
      console.error('[Import]', e);
    }
  }, [importTrades, toast]);

  // Journal / note updates — optimistic local + DB persist
  const handleSetTrades = useCallback((updater) => {
    const updated = typeof updater === 'function' ? updater(trades) : updater;
    updated.forEach(t => {
      const orig = trades.find(o => o.id === t.id);
      if (orig && (orig.notes !== t.notes || JSON.stringify(orig.tags) !== JSON.stringify(t.tags))) {
        updateTrade(t.id, { notes: t.notes, tags: t.tags }).catch(e => {
          toast.error(`Failed to save note: ${e.message}`);
        });
      }
    });
    setTrades(updated);
  }, [trades, updateTrade, setTrades, toast]);

  // Danger zone: wipe all trades
  const handleClearAll = useCallback(async () => {
    if (!window.confirm('Delete ALL trades permanently? This cannot be undone.')) return;
    try {
      await clearAllTrades();
      toast.success('All trades deleted.');
    } catch (e) {
      toast.error(`Failed to delete: ${e.message}`);
    }
  }, [clearAllTrades, toast]);

  const userObj = {
    name:  profile?.name  || user?.email?.split('@')[0] || 'Trader',
    email: profile?.email || user?.email || '',
    plan:  profile?.plan  || 'free',
  };

  // All pages rendered once and kept alive — switching tabs just shows/hides.
  // This prevents useTrades from refetching on every tab switch.
  const PAGE_LIST = [
    { id:'dashboard', el:<DashboardPage trades={trades}  setPage={setPage} /> },
    { id:'chart',     el:<ChartPage     trades={trades}  setPage={setPage} /> },
    { id:'trades',    el:<PositionsPage trades={trades} setTrades={handleSetTrades} addTrade={addTrade} deleteTrade={deleteTrade} updateTrade={updateTrade} setPage={setPage} /> },
    { id:'analytics', el:<AnalyticsPage trades={trades}  setPage={setPage} /> },
    { id:'journal',   el:<JournalPage   trades={trades}  setTrades={handleSetTrades} setPage={setPage} /> },
    { id:'ai',        el:<AIPage        trades={trades} /> },
    { id:'import',    el:<ImportPage    onImport={handleImport} /> },
    { id:'mt5',       el:<MT5Page       onImport={handleImport} /> },
    { id:'plans',     el:<PlansPage /> },
    { id:'news',      el:<NewsPage /> },
    { id:'settings',  el:<SettingsPage  user={userObj} onClearAll={handleClearAll} /> },
  ];

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar page={page} setPage={setPage} user={userObj} onLogout={signOut} notifications={0} />
      <main style={{
        flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)',
        // On mobile, add padding at bottom for the fixed bottom nav bar
        paddingBottom: 'var(--bottom-nav-height, 0)',
      }}>

        {/* One-time loading screen — only shown on initial data fetch */}
        {tradesLoading && !tradesTimedOut && (
          <div style={{ position:'absolute', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:10 }}>
            <div className="spin" style={{ width:16, height:16, border:'2px solid var(--line)', borderTopColor:'var(--indigo)', borderRadius:'50%' }}/>
            <span style={{ color:'var(--muted)', fontFamily:'var(--fm)', fontSize:12 }}>Loading your trades…</span>
          </div>
        )}

        {/* Error banner */}
        {tradesError && !trades.length && !tradesLoading && (
          <div style={{ margin:16, padding:'10px 16px', background:'rgba(244,63,94,.06)', border:'1px solid rgba(244,63,94,.2)', borderRadius:8, fontSize:12, fontFamily:'var(--fm)', color:'var(--rose)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <span>⚠ Could not load trades: {tradesError}</span>
            <button onClick={() => window.location.reload()} style={{ background:'none', border:'1px solid var(--rose)', borderRadius:5, color:'var(--rose)', cursor:'pointer', fontSize:11, padding:'3px 10px', fontFamily:'var(--fm)' }}>Retry</button>
          </div>
        )}

        {/* All pages rendered — inactive ones hidden with display:none so they keep their state */}
        {PAGE_LIST.map(({ id, el }) => (
          <div
            key={id}
            style={{
              flex: 1,
              display: page === id ? 'flex' : 'none',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            {el}
          </div>
        ))}
      </main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <>
      <GlobalStyles />
      {loading ? <FullScreenSpinner /> : !user ? <AuthPage /> : <InnerApp />}
    </>
  );
}
