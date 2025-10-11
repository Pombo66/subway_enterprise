'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr(error.message);
    else router.replace('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="card p-6 w-80 space-y-4">
        <h1 className="text-xl font-semibold">Admin Login</h1>
        {err && <div className="text-sm text-red-400">{err}</div>}
        <label className="text-sm block">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded bg-card border border-white/10 px-2 py-1"
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="text-sm block">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded bg-card border border-white/10 px-2 py-1"
            placeholder="••••••••"
            required
          />
        </label>
        <button 
          type="submit"
          disabled={loading}
          className="s-btn s-btn--md w-full rounded bg-white/10 border border-white/20 px-3 py-2 text-sm hover:opacity-80"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}

