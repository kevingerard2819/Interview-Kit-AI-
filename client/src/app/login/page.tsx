'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { Sparkles, Loader2, ArrowRight, AlertCircle } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-fade-up">
      {/* Glow blob */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)',
        }}
      />

      <div
        className="w-full max-w-md rounded-2xl p-8 relative overflow-hidden"
        style={{
          background: '#0a0f0c',
          border: '1px solid rgba(27, 39, 32, 0.9)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.06)',
        }}
      >
        {/* Inner top glow */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)' }}
        />

        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 relative"
            style={{
              background: 'linear-gradient(135deg, #059669, #047857)',
              boxShadow: '0 8px 24px rgba(5, 150, 105, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to PrepKit</h1>
          <p className="text-xs mt-1.5" style={{ color: '#64748b' }}>
            Access your personalised AI interview kits
          </p>
        </div>

        {error && (
          <div
            className="mb-5 p-3.5 rounded-xl flex items-start gap-2.5 text-xs"
            style={{
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              color: '#fda4af',
            }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#f43f5e' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#94a3b8' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#94a3b8' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
            style={{ width: '100%' }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div
          className="mt-6 pt-6 flex flex-col items-center gap-3"
          style={{ borderTop: '1px solid rgba(27, 39, 32, 0.8)' }}
        >
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.18)',
            }}
          >
            ✦ Fill Demo Credentials
          </button>
          <p className="text-xs" style={{ color: '#64748b' }}>
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold" style={{ color: '#34d399' }}>
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
