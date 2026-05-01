import React, { useState } from 'react';
import { getApiUrl } from '../config';

function EmailAuthForm({ onAuthSuccess, onError }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    onError?.('');
    setInfoMessage('');
    try {
      let payload = { email, password };
      let endpoint = '/api/auth/login';
      if (mode === 'signup') {
        payload = { email, password, name };
        endpoint = '/api/auth/signup';
      } else if (mode === 'forgot') {
        payload = { email };
        endpoint = '/api/auth/forgot-password';
      }
      const res = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');
      if (mode === 'forgot') {
        setInfoMessage(data.detail || 'If an account exists, reset email sent.');
      } else {
        onAuthSuccess?.(data);
      }
    } catch (error) {
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      {mode === 'signup' && (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name (optional)"
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/40"
        />
      )}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/40"
      />
      {mode !== 'forgot' && (
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/40"
        />
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary/90 hover:bg-primary text-white text-sm font-medium py-2.5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Login'}
      </button>
      {mode === 'login' && (
        <button
          type="button"
          onClick={() => setMode('forgot')}
          className="w-full text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Forgot password?
        </button>
      )}
      {mode !== 'forgot' && (
        <button
          type="button"
          onClick={() => setMode((prev) => (prev === 'signup' ? 'login' : 'signup'))}
          className="w-full text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {mode === 'signup' ? 'Already have an account? Login' : "Don't have an account? Sign up"}
        </button>
      )}
      {mode === 'forgot' && (
        <button
          type="button"
          onClick={() => setMode('login')}
          className="w-full text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Back to login
        </button>
      )}
      {infoMessage ? <p className="text-emerald-400 text-xs">{infoMessage}</p> : null}
    </form>
  );
}

export default EmailAuthForm;
