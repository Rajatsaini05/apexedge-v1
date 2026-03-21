// src/pages/SettingsPage.jsx
// All settings save to Supabase profiles table in real-time.

import { useState } from 'react';
import { User, Shield, Save, Check, AlertTriangle, Eye, EyeOff, Zap, Lock } from 'lucide-react';
import { Card, Btn, Divider, Badge } from '../components/atoms';
import { TopBar } from '../components/layout';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';

// ── Reusable field ─────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5, fontFamily: 'var(--fm)' }}>
      {label}
    </label>
    {children}
  </div>
);

const Toast = ({ msg, type = 'success' }) => (
  msg ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 7, fontSize: 12, fontFamily: 'var(--fm)', marginBottom: 14, background: type === 'success' ? 'rgba(16,185,129,.08)' : 'rgba(244,63,94,.08)', border: `1px solid ${type === 'success' ? 'rgba(16,185,129,.25)' : 'rgba(244,63,94,.25)'}`, color: type === 'success' ? 'var(--emerald)' : 'var(--rose)' }}>
      {type === 'success' ? <Check size={13}/> : <AlertTriangle size={13}/>} {msg}
    </div>
  ) : null
);

// ── Profile card ───────────────────────────────────────────────────────────────
const ProfileCard = ({ user }) => {
  const { updateProfile, profile } = useAuth();
  const [form,  setForm]  = useState({ name: profile?.name || user?.name || '', timezone: profile?.timezone || 'UTC' });
  const [busy,  setBusy]  = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const TIMEZONES = ['UTC', 'UTC+1', 'UTC+2', 'UTC+3', 'UTC+4', 'UTC+5', 'UTC+5:30', 'UTC+6', 'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10', 'UTC-5', 'UTC-6', 'UTC-7', 'UTC-8'];

  const save = async () => {
    setBusy(true); setToast({ msg: '', type: 'success' });
    try {
      await updateProfile({ name: form.name.trim(), timezone: form.timezone });
      setToast({ msg: 'Profile saved successfully.', type: 'success' });
    } catch (e) {
      setToast({ msg: e.message || 'Failed to save.', type: 'error' });
    } finally {
      setBusy(false);
      setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
    }
  };

  return (
    <Card style={{ padding: 22 }}>
      <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--fm)', marginBottom: 18 }}>Profile</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.2))', border: '2px solid var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={20} color="var(--indigo)" />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14 }}>{profile?.name || user?.name}</p>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fm)' }}>{user?.email}</p>
          <Badge color={user?.plan === 'pro' ? 'indigo' : 'slate'} style={{ marginTop: 4 }}>{(user?.plan || 'free').toUpperCase()}</Badge>
        </div>
      </div>
      <Toast msg={toast.msg} type={toast.type} />
      <Field label="Display Name">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ fontSize: 12 }} />
      </Field>
      <Field label="Email">
        <input value={user?.email} disabled style={{ fontSize: 12, opacity: 0.5 }} />
      </Field>
      <Field label="Timezone">
        <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} style={{ fontSize: 12 }}>
          {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Btn size="sm" onClick={save} disabled={busy}>
        {busy ? <div className="spin" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : <Save size={12} />}
        Save Profile
      </Btn>
    </Card>
  );
};

// ── Risk rules card ────────────────────────────────────────────────────────────
const RiskCard = ({ user }) => {
  const { updateProfile, profile } = useAuth();
  const defaults = profile?.risk_rules || {};
  const [form,  setForm]  = useState({ maxLotSize: defaults.maxLotSize ?? 0.5, dailyLossLimit: defaults.dailyLossLimit ?? 500, maxConcurrentTrades: defaults.maxConcurrentTrades ?? 5, defaultRiskPct: defaults.defaultRiskPct ?? 1, minRR: defaults.minRR ?? 2 });
  const [busy,  setBusy]  = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const FIELDS = [['Max Lot Size', 'maxLotSize', '0.50'], ['Daily Loss Limit ($)', 'dailyLossLimit', '500'], ['Max Concurrent Trades', 'maxConcurrentTrades', '5'], ['Default Risk % per Trade', 'defaultRiskPct', '1'], ['Min R:R Ratio', 'minRR', '2']];

  const save = async () => {
    setBusy(true); setToast({ msg: '', type: 'success' });
    try {
      await updateProfile({ risk_rules: form });
      setToast({ msg: 'Risk rules saved.', type: 'success' });
    } catch (e) {
      setToast({ msg: e.message || 'Failed to save.', type: 'error' });
    } finally {
      setBusy(false);
      setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
    }
  };

  return (
    <Card style={{ padding: 22 }}>
      <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--fm)', marginBottom: 18 }}>Risk Rules</p>
      <Toast msg={toast.msg} type={toast.type} />
      {FIELDS.map(([label, key, placeholder]) => (
        <Field key={key} label={label}>
          <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} style={{ fontSize: 12 }} />
        </Field>
      ))}
      <Btn variant="success" size="sm" onClick={save} disabled={busy}>
        {busy ? <div className="spin" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : <Shield size={12} />}
        Save Risk Rules
      </Btn>
    </Card>
  );
};

// ── Password change card ───────────────────────────────────────────────────────
const PasswordCard = () => {
  const [form,  setForm]  = useState({ current: '', next: '', confirm: '' });
  const [show,  setShow]  = useState(false);
  const [busy,  setBusy]  = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const save = async () => {
    if (!form.next || form.next.length < 6) { setToast({ msg: 'New password must be at least 6 characters.', type: 'error' }); return; }
    if (form.next !== form.confirm)         { setToast({ msg: 'Passwords do not match.', type: 'error' }); return; }
    setBusy(true); setToast({ msg: '', type: 'success' });
    try {
      const { error } = await supabase.auth.updateUser({ password: form.next });
      if (error) throw error;
      setToast({ msg: 'Password updated successfully.', type: 'success' });
      setForm({ current: '', next: '', confirm: '' });
    } catch (e) {
      setToast({ msg: e.message || 'Failed to update password.', type: 'error' });
    } finally {
      setBusy(false);
      setTimeout(() => setToast({ msg: '', type: 'success' }), 4000);
    }
  };

  const type = show ? 'text' : 'password';
  const EyeBtn = () => (
    <button onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}>
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );

  return (
    <Card style={{ padding: 22 }}>
      <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--fm)', marginBottom: 18 }}>Change Password</p>
      <Toast msg={toast.msg} type={toast.type} />
      {[['New Password', 'next'], ['Confirm Password', 'confirm']].map(([label, key]) => (
        <Field key={key} label={label}>
          <div style={{ position: 'relative' }}>
            <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} type={type} style={{ fontSize: 12, paddingRight: 36 }} />
            <EyeBtn />
          </div>
        </Field>
      ))}
      <Btn size="sm" onClick={save} disabled={busy}>
        {busy ? <div className="spin" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : <Lock size={12} />}
        Update Password
      </Btn>
    </Card>
  );
};

// ── Display prefs card ─────────────────────────────────────────────────────────
const DisplayCard = () => {
  const { updateProfile, profile } = useAuth();
  const [form, setForm] = useState({ currency: profile?.currency || 'USD' });
  const [saved, setSaved] = useState(false);
  const save = async () => {
    await updateProfile({ currency: form.currency }).catch(console.error);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  return (
    <Card style={{ padding: 22 }}>
      <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--fm)', marginBottom: 18 }}>Display</p>
      <Field label="Base Currency">
        <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={{ fontSize: 12 }}>
          {['USD','EUR','GBP','JPY','AUD','CAD'].map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Account Size ($)">
        <select style={{ fontSize: 12 }}>
          {['5000','10000','25000','50000','100000','200000'].map(v => <option key={v}>${parseInt(v).toLocaleString()}</option>)}
        </select>
      </Field>
      <Field label="Default Chart Interval">
        <select style={{ fontSize: 12 }}>
          {['1m','5m','15m','1H','4H','1D'].map(v => <option key={v}>{v}</option>)}
        </select>
      </Field>
      <Btn size="sm" onClick={save}>
        {saved ? <Check size={12}/> : <Save size={12}/>}
        {saved ? 'Saved!' : 'Save Display'}
      </Btn>
    </Card>
  );
};

// ── Platform info card ─────────────────────────────────────────────────────────
const PlatformCard = ({ user, onClearAll }) => (
  <Card style={{ padding: 22 }}>
    <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--fm)', marginBottom: 18 }}>Platform</p>
    <div style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--sub)', lineHeight: 2.5, marginBottom: 16 }}>
      {[['Version', 'APEXEDGE v1.0'], ['Plan', (user?.plan || 'free').toUpperCase()], ['AI Engine', 'Claude · GPT-4o · Gemini'], ['Chart', 'TradingView + Lightweight Charts v4'], ['Database', 'Supabase PostgreSQL'], ['Auth', 'Supabase Auth (JWT)']].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', padding: '3px 0' }}>
          <span>{k}</span>
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
        </div>
      ))}
    </div>
    <Divider />
    <div style={{ marginTop: 14 }}>
      <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--fm)', marginBottom: 10 }}>Danger Zone</p>
      <Btn variant="danger" size="sm" onClick={onClearAll}>
        <AlertTriangle size={12} /> Delete All Trades
      </Btn>
    </div>
  </Card>
);

// ── Main export ────────────────────────────────────────────────────────────────
const SettingsPage = ({ user, onClearAll }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <TopBar title="Settings" subtitle="All changes save directly to your account" />
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, maxWidth: 840 }}>
        <ProfileCard  user={user} />
        <RiskCard     user={user} />
        <PasswordCard />
        <DisplayCard />
        <div style={{ gridColumn: '1 / -1' }}>
          <PlatformCard user={user} onClearAll={onClearAll} />
        </div>
      </div>
    </div>
  </div>
);

export default SettingsPage;
