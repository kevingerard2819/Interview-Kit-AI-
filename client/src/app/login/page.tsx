'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('candidate@trao.ai');
    setPassword('Candidate123!');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4">
      <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-cyan flex items-center justify-center shadow-lg shadow-primary-500/20 mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to PrepKit</h1>
          <p className="text-xs text-slate-400 mt-1">Access your generated personalized interview kits</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-xs text-accent-rose">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 transition-all shadow-md shadow-primary-600/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-surface-border flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Fill Demo Credentials
          </button>
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary-400 hover:underline font-medium">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
