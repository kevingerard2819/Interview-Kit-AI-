'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import GenerationModal from '../components/GenerationModal';
import {
  Sparkles,
  Plus,
  Upload,
  Calendar,
  Building,
  Briefcase,
  Layers,
  ArrowRight,
  BookOpen,
  Trash2,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [kits, setKits] = useState<any[]>([]);
  const [loadingKits, setLoadingKits] = useState(true);

  // Form State
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Batch Upload Modal / Tab
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchJson, setBatchJson] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  const fetchKits = async () => {
    try {
      setLoadingKits(true);
      const res = await api.getKits();
      setKits(res.kits || []);
    } catch {
      // If unauthenticated, redirect to login
      router.push('/login');
    } finally {
      setLoadingKits(false);
    }
  };

  useEffect(() => {
    fetchKits();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jd.trim() || !companyUrl.trim()) return;

    setError(null);
    setGenerating(true);
    setActiveStep(0);

    // Simulated progress stepper ticks while the backend pipeline runs
    const interval = setInterval(() => {
      setActiveStep((prev) => Math.min(prev + 1, 5));
    }, 1200);

    try {
      const res = await api.generateKit({
        jd,
        company_url: companyUrl,
        days: Number(days)
      });
      clearInterval(interval);
      setGenerating(false);
      // Navigate to the kit builder
      router.push(`/kits/${res.kit._id}`);
    } catch (err: any) {
      clearInterval(interval);
      setGenerating(false);
      setError(err.message || 'Failed to generate preparation kit. Please try again.');
    }
  };

  const handleBatchUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);
    setBatchLoading(true);

    try {
      const parsed = JSON.parse(batchJson);
      if (!Array.isArray(parsed)) {
        throw new Error('Input must be a JSON array of cases.');
      }

      await api.batchUpload(parsed);
      setShowBatchModal(false);
      setBatchJson('');
      await fetchKits();
    } catch (err: any) {
      setBatchError(err.message || 'Failed to process batch upload.');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this prep kit?')) {
      try {
        await api.deleteKit(id);
        setKits(kits.filter(k => k._id !== id));
      } catch (err: any) {
        alert(err.message || 'Could not delete kit');
      }
    }
  };

  const fillSampleData = () => {
    setCompanyUrl('https://stripe.com');
    setDays(4);
    setJd(`Senior Backend Engineer - Platform & Payments

About the Role:
We are looking for a Senior Backend Engineer to join our Core Payments team. You will architect and scale high-throughput payment transaction pipelines with 99.999% reliability.

Requirements:
- 5+ years of experience designing and operating distributed systems with Java, Go, or Node.js.
- Strong knowledge of relational and distributed databases, ACID guarantees, and idempotency.
- Demonstrated experience mentoring junior engineers and leading system architecture decisions.
- Bonus: Familiarity with PCI-DSS compliance, Kafka, and cloud infrastructure.`);
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Generation Stepper Modal */}
      <GenerationModal isOpen={generating} activeStep={activeStep} />

      {/* Hero Header */}
      <div className="relative rounded-3xl p-8 sm:p-10 bg-gradient-to-br from-surface via-surface-card to-primary-950/40 border border-surface-border overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-xs font-mono text-primary-400 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trao Assessment Engine FS-AI-INTERVIEW-01</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Turn any Job Description into an Intelligent Interview Kit
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Crawls company hiring pages, extracts must-have requirements without hallucinations, generates targeted question banks & flashcards, and deterministically allocates your day-by-day study schedule.
          </p>
        </div>
      </div>

      {/* Main Generator Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 sm:p-8 border border-surface-border relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary-400" />
                <span>Create New Prep Kit</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Paste the role details and let the research pipeline execute</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fillSampleData}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-surface-card border border-surface-border text-slate-300 hover:text-white hover:border-primary-500/40 transition-colors"
              >
                Sample Data
              </button>
              <button
                type="button"
                onClick={() => setShowBatchModal(true)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-surface-card border border-surface-border text-slate-300 hover:text-white hover:border-primary-500/40 flex items-center gap-1.5 transition-colors"
                title="Prepare for multiple roles at once"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Batch Upload</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-xs text-accent-rose flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-primary-400" />
                  <span>Company Website Address</span>
                </label>
                <input
                  type="text"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://company.com or company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-slate-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary-400" />
                  <span>Days to Prepare</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={days}
                  onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary-400" />
                <span>Job Description Text</span>
              </label>
              <textarea
                rows={7}
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description here (or brief stub for testing edge cases)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-y placeholder:text-slate-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={generating || !jd.trim() || !companyUrl.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 transition-all shadow-lg shadow-primary-600/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate My Interview Prep Kit</span>
            </button>
          </form>
        </div>

        {/* Feature Highlights Card */}
        <div className="glass-panel rounded-2xl p-6 border border-surface-border flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 text-primary-400">
              Pipeline Guarantees
            </h3>
            <ul className="space-y-3.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan mt-1.5 shrink-0" />
                <span><strong className="text-white">Deterministic Coverage:</strong> Automated multi-pass loop guarantees every must-have requirement has mapped questions.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald mt-1.5 shrink-0" />
                <span><strong className="text-white">Arithmetic Schedule:</strong> Exactly distributes study time across the requested days with harder material landing earlier.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-amber mt-1.5 shrink-0" />
                <span><strong className="text-white">Honest Retrieval:</strong> If a company site has no hiring page or is a 2-line stub, it reports honestly without fabricating facts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-purple mt-1.5 shrink-0" />
                <span><strong className="text-white">Reshapeable Builder:</strong> Edit inline, reorder questions, or regenerate individual sections without clobbering manual edits.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-surface-card border border-surface-border text-xs text-slate-400">
            <span className="font-semibold text-slate-200">Tip:</span> Use Practice Mode on mobile or desktop to flip through flashcards and train on low-confidence topics!
          </div>
        </div>
      </div>

      {/* Your Kits List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-400" />
            <span>Your Interview Kits ({kits.length})</span>
          </h2>
        </div>

        {loadingKits ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading your kits...</p>
          </div>
        ) : kits.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 border border-surface-border">
            <Briefcase className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-200">No Interview Kits Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Create your first kit above by pasting a job description and company URL.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {kits.map((kit) => (
              <div
                key={kit._id}
                onClick={() => router.push(`/kits/${kit._id}`)}
                className="glass-panel glass-panel-hover rounded-2xl p-5 border border-surface-border cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20">
                      {kit.schedule?.days_available || 5}-Day Schedule
                    </span>
                    <button
                      onClick={(e) => handleDelete(kit._id, e)}
                      className="text-slate-500 hover:text-accent-rose p-1 rounded hover:bg-slate-800 transition-colors"
                      title="Delete kit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                    {kit.role?.title || kit.source?.role || 'Software Engineer'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Building className="w-3 h-3 text-slate-500" />
                    <span>{kit.source?.company || 'Company'}</span>
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-surface-border/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {new Date(kit.createdAt || kit.source?.researched_at || Date.now()).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/kits/${kit._id}/practice`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1 rounded-lg bg-surface-card hover:bg-slate-800 text-primary-400 font-medium text-[11px] flex items-center gap-1 border border-surface-border transition-colors"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Practice</span>
                    </Link>
                    <span className="text-primary-400 group-hover:translate-x-0.5 transition-transform">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch Upload Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Batch Prepare Multiple Roles</h3>
            <p className="text-xs text-slate-400 mb-4">
              Paste a JSON array of description-and-company pairs (matching Appendix B case structure).
            </p>

            {batchError && (
              <div className="mb-4 p-3 rounded-lg bg-accent-rose/10 border border-accent-rose/20 text-xs text-accent-rose">
                {batchError}
              </div>
            )}

            <form onSubmit={handleBatchUpload} className="space-y-4">
              <textarea
                rows={8}
                value={batchJson}
                onChange={(e) => setBatchJson(e.target.value)}
                placeholder={`[
  { "jd": "Backend Engineer...", "company_url": "https://stripe.com", "days": 5 },
  { "jd": "Frontend Developer...", "company_url": "https://vercel.com", "days": 3 }
]`}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-xs font-mono text-slate-200 focus:outline-none focus:border-primary-500"
                required
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors"
                >
                  {batchLoading ? 'Processing Batch...' : 'Generate All Kits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
