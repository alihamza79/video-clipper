import React, { useState } from 'react';
import { getApiUrl } from '../config';

function ResetPasswordForm({ token, onSuccess, onError }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    onError?.('');
    setDoneMessage('');

    if (newPassword.length < 8) {
      onError?.('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      onError?.('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to reset password');
      setDoneMessage(data.detail || 'Password reset complete');
      onSuccess?.();
    } catch (error) {
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <input
        type="password"
        required
        minLength={8}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password"
        className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/40"
      />
      <input
        type="password"
        required
        minLength={8}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm new password"
        className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/40"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary/90 hover:bg-primary text-white text-sm font-medium py-2.5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Please wait...' : 'Reset password'}
      </button>
      {doneMessage ? <p className="text-emerald-400 text-xs">{doneMessage}</p> : null}
    </form>
  );
}

export default ResetPasswordForm;
