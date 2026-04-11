import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import useAuth from '../store/authStore';
import { useApi } from '../hooks/useApi';
import { C, SYNE, Alert, Btn, Input } from '../components/ui';

export default function Auth({ mode }) {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'player', phone: '', address: '' });

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const { execute: doRegister, loading: regLoading, error: regError } = useApi(authAPI.register, {
    showErrorToast: false,
  });
  const { execute: doLogin, loading: loginLoading, error: loginError } = useApi(authAPI.login, {
    showErrorToast: false,
  });

  const loading = mode === 'login' ? loginLoading : regLoading;
  const error   = mode === 'login' ? loginError   : regError;

  const submit = async () => {
    try {
      const data = mode === 'login'
        ? await doLogin({ email: form.email, password: form.password })
        : await doRegister(form);

      setSession(data.user, data.accessToken);
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');

      const r = data.user.role;
      navigate(r === 'owner' ? '/owner' : r === 'admin' ? '/admin' : '/grounds');
    } catch {}
  };

  const handleKey = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 36 }}>
        <h2 style={{ fontFamily: SYNE, fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <Link to={mode === 'login' ? '/register' : '/login'} style={{ color: C.lime, textDecoration: 'none', fontWeight: 600 }}>
            {mode === 'login' ? 'Sign up' : 'Login'}
          </Link>
        </p>

        {error && <Alert type="error">{error}</Alert>}

        {mode === 'register' && (
          <>
            <Input label="Full Name" value={form.name} onChange={set('name')} placeholder="Your name" />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>I am a</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['player','owner'].map(r => (
                  <button key={r} onClick={() => setForm(p => ({ ...p, role: r }))}
                    style={{ flex: 1, padding: 9, borderRadius: 8, border: `1.5px solid ${form.role === r ? C.lime : C.border}`, background: form.role === r ? 'rgba(200,245,0,.08)' : 'transparent', color: form.role === r ? C.lime : C.muted, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", textTransform: 'capitalize' }}>
                    {r === 'player' ? '🎮 Player' : '🏟️ Owner'}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Phone"   value={form.phone}   onChange={set('phone')}   placeholder="01XXXXXXXXX" />
            <Input label="Address" value={form.address} onChange={set('address')} placeholder="Your address" />
          </>
        )}

        <Input label="Email"    type="email"    value={form.email}    onChange={set('email')}    placeholder="you@email.com" onKeyDown={handleKey} />
        <Input label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••"     onKeyDown={handleKey} />

        <Btn onClick={submit} disabled={loading} style={{ width: '100%', marginTop: 4 }}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create Account'}
        </Btn>

        {mode === 'register' && form.role === 'owner' && (
          <p style={{ marginTop: 14, fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 1.6 }}>
            Owner accounts require admin approval before listing grounds.
          </p>
        )}
      </div>
    </div>
  );
}
