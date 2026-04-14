import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useThemeColors } from '../hooks/useTheme';

export default function AuthModal({ onClose }) {
  const C = useThemeColors();
  const [mode, setMode]         = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) { setError('Cloud sync is not configured.'); return; }
    setError('');
    setLoading(true);

    const { error: authError } = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (authError) { setError(authError.message); return; }

    if (mode === 'signup') {
      setDone(true); // "check your email" state
    } else {
      onClose();
    }
  }

  async function handleGoogle() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  }

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(0,0,0,0.72)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  };
  const sheet = {
    background: C.low,
    borderRadius: '20px 20px 0 0',
    padding: '2rem 1.5rem 2.5rem',
    width: '100%',
    maxWidth: '480px',
    animation: 'slideUp 0.22s ease',
  };

  if (done) return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: '1.25rem', fontWeight: 800, color: C.text, marginBottom: '0.5rem' }}>Check your email</p>
        <p style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.6 }}>
          We sent a confirmation link to <strong style={{ color: C.text }}>{email}</strong>. Click it to activate your account, then sign in.
        </p>
        <button onClick={onClose} style={{ marginTop: '1.5rem', width: '100%', padding: '0.85rem', borderRadius: '10px', background: C.primary, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          Got it
        </button>
      </div>
    </div>
  );

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <p style={{ fontSize: '1.15rem', fontWeight: 800, color: C.text, marginBottom: '0.25rem' }}>
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </p>
        <p style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '1.5rem' }}>
          {mode === 'signup' ? 'Save your progress and sync across devices.' : 'Welcome back.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.container, color: C.text, fontSize: '0.95rem', outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.container, color: C.text, fontSize: '0.95rem', outline: 'none' }}
          />
          {error && <p style={{ color: C.red, fontSize: '0.82rem' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0.85rem', borderRadius: '10px', background: C.primary, color: '#fff', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          style={{ marginTop: '0.75rem', width: '100%', padding: '0.8rem', borderRadius: '10px', background: C.container, color: C.text, fontWeight: 600, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: '0.9rem' }}
        >
          Continue with Google
        </button>

        {/* Toggle mode */}
        <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.82rem', color: C.muted }}>
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }}
            style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', padding: 0 }}
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
