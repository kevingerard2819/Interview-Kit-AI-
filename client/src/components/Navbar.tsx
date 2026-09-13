'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { api, User } from '../lib/api';
import { Sparkles, LogOut, User as UserIcon } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api.getMe()
      .then(res => setUser(res.user))
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#070c09] border-b border-[#1b2720] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 60%, #065f46 100%)',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            <Sparkles className="w-4.5 h-4.5 text-white relative z-10" />
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)',
              }}
            />
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-1.5">
              <span
                className="font-bold text-[1.05rem] tracking-tight"
                style={{
                  background: 'linear-gradient(90deg, #f8fafc 0%, #cbd5e1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                PrepKit
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
              >
                AI
              </span>
            </div>
          </div>
        </Link>

        {/* Right Navigation */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              {/* User pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-[#0a0f0c] border border-[#1b2720] text-slate-300">
                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500/15">
                  <UserIcon className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="max-w-[160px] truncate">{user.email}</span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-white hover:bg-[#1b2720]/60 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="btn-primary text-xs px-4 py-1.5"
                style={{ fontSize: '0.75rem', padding: '0.4rem 1rem', borderRadius: '0.6rem' }}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
