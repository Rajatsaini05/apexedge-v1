// src/pages/AuthPage.jsx
// Real Supabase sign-in / sign-up. No more fake auth.

import { useState } from 'react';
import { Zap, CheckCircle } from 'lucide-react';
import { Btn } from '../components/atoms';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';

const FEATURES = [
  'Full P&L analytics & equity curve',
  'AI Coach — Claude, GPT-4o, Gemini',
  'MT5 auto-sync & CSV import',
  'Trade journal with mistake tracking',
  'All data saved & synced via Supabase',
];

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' });
  const [err,  setErr]  = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(''); setInfo('');
    if (!form.email || !form.password) { setErr('Email and password are required.'); return; }
    if (mode === 'signup') {
      if (!form.name.trim())               { setErr('Name is required.'); return; }
      if (form.password.length < 6)        { setErr('Password must be at least 6 characters.'); return; }
      if (form.password !== form.confirm)  { setErr('Passwords do not match.'); return; }
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn({ email: form.email, password: form.password });
      } else {
        await signUp({ name: form.name, email: form.email, password: form.password });
        setInfo('Check your email to confirm your account, then sign in.');
        setMode('login');
        setForm(f => ({ ...f, password:'', confirm:'' }));
      }
    } catch (e) {
      setErr(e.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    const email = form.email.trim();
    if (!email) { setErr('Enter your email address first.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?reset=true`,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setInfo('Password reset email sent — check your inbox.');
  };

  const LabelInput = ({ k, label, type='text', ph='' }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:6, fontFamily:'var(--fm)' }}>{label}</label>
      <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} type={type} onKeyDown={e=>e.key==='Enter'&&submit()} />
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'var(--bg)', overflow:'hidden' }}>
      {/* Left */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 80px', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 30% 50%, rgba(99,102,241,.07) 0%, transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:48 }}>
            <div style={{ width:36,height:36,borderRadius:9,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center' }}><Zap size={17} color="#fff"/></div>
            <span style={{ fontFamily:'var(--fh)', fontSize:20, fontWeight:800, letterSpacing:'.5px' }}>APEXEDGE</span>
          </div>
          <h1 style={{ fontFamily:'var(--fh)', fontSize:42, fontWeight:800, lineHeight:1.15, marginBottom:20, maxWidth:420 }}>
            Trade smarter.<br/><span style={{ color:'var(--indigo)' }}>Know every edge.</span>
          </h1>
          <p style={{ color:'var(--sub)', fontSize:15, maxWidth:380, lineHeight:1.7, marginBottom:40 }}>
            Professional backtesting & trade journal with built-in AI coaching.
          </p>
          {FEATURES.map(f => (
            <div key={f} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, color:'var(--sub)', fontSize:13 }}>
              <CheckCircle size={14} color="var(--emerald)"/>{f}
            </div>
          ))}
        </div>
      </div>

      {/* Right */}
      <div style={{ width:460, background:'var(--surface)', borderLeft:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 48px' }}>
        <div style={{ width:'100%' }} className="fade-up">
          <h2 style={{ fontFamily:'var(--fh)', fontSize:22, fontWeight:700, marginBottom:4 }}>{mode==='login'?'Welcome back':'Create account'}</h2>
          <p style={{ color:'var(--sub)', fontSize:13, marginBottom:28 }}>{mode==='login'?'Sign in to your trading dashboard':'Start your trading journal today'}</p>

          <div style={{ display:'flex', gap:4, background:'var(--card2)', borderRadius:8, padding:4, marginBottom:24 }}>
            {['login','signup'].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setErr('');setInfo('');}} style={{ flex:1,padding:'7px',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'var(--fb)',fontSize:13,transition:'all .15s',background:mode===m?'var(--card)':'transparent',color:mode===m?'var(--text)':'var(--muted)',fontWeight:mode===m?500:400 }}>
                {m==='login'?'Sign In':'Sign Up'}
              </button>
            ))}
          </div>

          {mode==='signup' && <LabelInput k="name"    label="Full Name"        ph="John Trader"/>}
          <LabelInput k="email"    label="Email"            type="email"    ph="you@example.com"/>
          <LabelInput k="password" label="Password"         type="password" ph="••••••••"/>
          {mode==='signup' && <LabelInput k="confirm" label="Confirm Password" type="password" ph="••••••••"/>}

          {err  && <p style={{ color:'var(--rose)',    fontSize:12, fontFamily:'var(--fm)', marginBottom:14, lineHeight:1.5 }}>{err}</p>}
          {info && <p style={{ color:'var(--emerald)', fontSize:12, fontFamily:'var(--fm)', marginBottom:14, lineHeight:1.5 }}>{info}</p>}

          <Btn onClick={submit} disabled={busy} style={{ width:'100%', justifyContent:'center', padding:'11px', fontSize:14, fontWeight:600, marginBottom:12 }}>
            {busy
              ? <><div className="spin" style={{ width:15,height:15,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%' }}/>Please wait…</>
              : mode==='login'?'Sign In':'Create Account'
            }
          </Btn>

          {mode==='login' && (
            <p style={{ textAlign:'center', marginBottom:16 }}>
              <button onClick={forgotPassword} disabled={busy} style={{ background:'none', border:'none', color:'var(--indigo)', cursor:'pointer', fontSize:12, fontFamily:'var(--fm)' }}>
                Forgot password?
              </button>
            </p>
          )}

          <p style={{ textAlign:'center', color:'var(--muted)', fontSize:11, fontFamily:'var(--fm)' }}>
            Powered by Supabase · Data encrypted at rest
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

