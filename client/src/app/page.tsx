'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import GenerationModal from '../components/GenerationModal';
import {
  Sparkles,
  Plus,
  Layers,
  Calendar,
  Building,
  Briefcase,
  ArrowRight,
  BookOpen,
  Trash2,
  FileText,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  ListPlus,
  ListOrdered,
  ShieldCheck,
  BarChart3,
  Search,
  PenLine,
  Zap,
  Upload
} from 'lucide-react';

interface BatchRole {
  id: string;
  company_url: string;
  days: number;
  jd: string;
}

function BatchModal({
  onClose,
  onDone
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [roles, setRoles] = useState<BatchRole[]>([
    { id: crypto.randomUUID(), company_url: '', days: 5, jd: '' }
  ]);
  const [expandedId, setExpandedId] = useState<string>(roles[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        let parsedRoles: any[] = [];

        if (file.name.endsWith('.json')) {
          const json = JSON.parse(text);
          parsedRoles = Array.isArray(json) ? json : json.cases || json.items || [];
        } else {
          // Parse CSV
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length > 1) {
            const header = lines[0].toLowerCase().split(',');
            const urlIdx = header.findIndex(h => h.includes('url') || h.includes('company'));
            const jdIdx = header.findIndex(h => h.includes('jd') || h.includes('desc'));
            const daysIdx = header.findIndex(h => h.includes('day'));

            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',');
              parsedRoles.push({
                company_url: cols[urlIdx] || '',
                jd: cols[jdIdx] || '',
                days: parseInt(cols[daysIdx]) || 5
              });
            }
          }
        }

        if (parsedRoles.length === 0) {
          throw new Error('No valid pairs found in file. Expected JSON array or CSV with company_url and jd.');
        }

        const formatted: BatchRole[] = parsedRoles.slice(0, 5).map(item => ({
          id: crypto.randomUUID(),
          company_url: String(item.company_url || item.url || '').trim(),
          jd: String(item.jd || item.job_description || item.description || '').trim(),
          days: Math.max(1, parseInt(item.days) || 5)
        }));

        setRoles(formatted);
        setExpandedId(formatted[0]?.id || '');
        setError(null);
      } catch (err: any) {
        setError(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const addRole = () => {
    const newRole = { id: crypto.randomUUID(), company_url: '', days: 5, jd: '' };
    setRoles(prev => [...prev, newRole]);
    setExpandedId(newRole.id);
  };

  const removeRole = (id: string) => {
    if (roles.length === 1) return;
    setRoles(prev => prev.filter(r => r.id !== id));
    if (expandedId === id) {
      setExpandedId(roles[0].id !== id ? roles[0].id : roles[1]?.id ?? '');
    }
  };

  const updateRole = (id: string, field: keyof BatchRole, value: string | number) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const incomplete = roles.find(r => !r.company_url.trim() || !r.jd.trim());
    if (incomplete) {
      setExpandedId(incomplete.id);
      setError('Please fill in Company URL and Job Description for every role.');
      return;
    }

    setLoading(true);
    try {
      await api.batchUpload(roles.map(r => ({
        jd: r.jd.trim(),
        company_url: r.company_url.trim(),
        days: r.days
      })));
      setDone(true);
      setTimeout(() => {
        onDone();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to generate kits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isRoleComplete = (r: BatchRole) => r.company_url.trim() && r.jd.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85">
      <div className="w-full sm:max-w-2xl bg-surface border border-surface-border sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-border shrink-0">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-primary-400" />
              Prepare for Multiple Roles at Once
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste or upload a file of company and description pairs to generate personalized kits.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.csv"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-surface-card border border-surface-border text-primary-400 hover:text-white hover:border-primary-500/50 flex items-center gap-1.5 transition-colors"
              title="Upload .json or .csv of description-and-company pairs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Role List */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-xs text-accent-rose">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-emerald/10 border border-accent-emerald/20 text-xs text-accent-emerald font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>All kits generated! Redirecting to your dashboard…</span>
            </div>
          )}

          {roles.map((role, idx) => {
            const isOpen = expandedId === role.id;
            const complete = isRoleComplete(role);

            return (
              <div
                key={role.id}
                className={`rounded-xl border transition-all ${
                  isOpen
                    ? 'border-primary-500/40 bg-primary-950/10'
                    : complete
                    ? 'border-accent-emerald/30 bg-accent-emerald/5'
                    : 'border-surface-border bg-surface-card/60'
                }`}
              >
                {/* Role header row — always visible */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? '' : role.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                      complete
                        ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {complete ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {role.company_url.trim()
                          ? role.company_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
                          : <span className="text-slate-400 font-normal">Role {idx + 1} — click to fill in details</span>
                        }
                      </p>
                      {role.jd.trim() && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{role.jd.slice(0, 70)}…</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {role.days && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                        {role.days}d
                      </span>
                    )}
                    {roles.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeRole(role.id); }}
                        className="text-slate-500 hover:text-accent-rose p-1 rounded hover:bg-slate-800 transition-colors"
                        title="Remove this role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </button>

                {/* Expanded form */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-surface-border/50 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                          <Building className="w-3 h-3 text-primary-400" />
                          Company Website
                        </label>
                        <input
                          type="text"
                          value={role.company_url}
                          onChange={e => updateRole(role.id, 'company_url', e.target.value)}
                          placeholder="https://stripe.com"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-surface-border text-sm text-slate-200 focus:outline-none focus:border-primary-500 placeholder:text-slate-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary-400" />
                          Days to Prep
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={role.days}
                          onChange={e => updateRole(role.id, 'days', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-surface-border text-sm text-slate-200 focus:outline-none focus:border-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-primary-400" />
                        Job Description
                      </label>
                      <textarea
                        rows={4}
                        value={role.jd}
                        onChange={e => updateRole(role.id, 'jd', e.target.value)}
                        placeholder="Paste the full job description for this role…"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-surface-border text-xs text-slate-200 focus:outline-none focus:border-primary-500 resize-y placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add another role button */}
          {roles.length < 5 && (
            <button
              type="button"
              onClick={addRole}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-surface-border text-xs font-medium text-slate-400 hover:text-primary-400 hover:border-primary-500/40 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add another role ({roles.length}/5)
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border shrink-0 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            {roles.filter(isRoleComplete).length} of {roles.length} role{roles.length !== 1 ? 's' : ''} ready
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || done || roles.every(r => !isRoleComplete(r))}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-primary-600/20"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Generating…</span></>
              ) : done ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /><span>Done!</span></>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /><span>Generate {roles.filter(isRoleComplete).length || ''} Kit{roles.filter(isRoleComplete).length !== 1 ? 's' : ''}</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [kits, setKits] = useState<any[]>([]);
  const [loadingKits, setLoadingKits] = useState(true);

  // Single-kit form
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [hasCustomRounds, setHasCustomRounds] = useState(false);
  const [customRounds, setCustomRounds] = useState<string[]>([
    'Live Coding / Problem Solving Screen',
    'Distributed System Design & Architecture',
    'STAR Behavioral & Values Alignment'
  ]);
  const [generating, setGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Batch modal
  const [showBatchModal, setShowBatchModal] = useState(false);

  const fetchKits = async () => {
    try {
      setLoadingKits(true);
      const res = await api.getKits();
      setKits(res.kits || []);
    } catch {
      router.push('/login');
    } finally {
      setLoadingKits(false);
    }
  };

  useEffect(() => { fetchKits(); }, []);

  // Resume option
  const [hasResume, setHasResume] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const resumeFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleResumeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setResumeText(String(reader.result || ''));
      setHasResume(true);
    };
    reader.readAsText(file);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!jd.trim() || !companyUrl.trim()) return;
    setError(null);
    setGenerationError(null);
    setGenerating(true);
    setActiveStep(0);

    const activeCustomRounds = hasCustomRounds
      ? customRounds.map(r => r.trim()).filter(r => r.length > 0)
      : undefined;

    try {
      const res = await api.generateKit({
        jd,
        company_url: companyUrl,
        days: Number(days),
        custom_rounds: activeCustomRounds && activeCustomRounds.length > 0 ? activeCustomRounds : undefined,
        resume_text: hasResume && resumeText.trim() ? resumeText.trim() : undefined,
        resume_file_name: hasResume && resumeFileName ? resumeFileName : undefined
      });

      // If server responded synchronously with kit
      if (res.kit?._id) {
        setGenerating(false);
        router.push(`/kits/${res.kit._id}`);
        return;
      }

      // Asynchronous Job Polling (immune to proxy / tunnel timeouts)
      const jobId = res.jobId;
      if (!jobId) {
        throw new Error('Generation started but no job identifier received.');
      }

      let consecutivePollErrors = 0;
      const pollInterval = setInterval(async () => {
        try {
          const { job } = await api.getGenerationJob(jobId);
          consecutivePollErrors = 0;

          if (typeof job.stageIndex === 'number') {
            setActiveStep(job.stageIndex);
          }

          if (job.status === 'completed' && job.kitId) {
            clearInterval(pollInterval);
            setActiveStep(5);
            setTimeout(() => {
              setGenerating(false);
              router.push(`/kits/${job.kitId}`);
            }, 500);
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            setGenerating(false);
            const msg = job.error || 'Generation failed. Please try again.';
            setGenerationError(msg);
            setError(msg);
          }
        } catch (pollErr: any) {
          consecutivePollErrors++;
          console.warn(`[Job Poll Retry ${consecutivePollErrors}/15]:`, pollErr.message);
          // Only abort if 15 consecutive poll attempts fail (>15 seconds of complete disconnect)
          if (consecutivePollErrors >= 15) {
            clearInterval(pollInterval);
            setGenerating(false);
            const msg = 'Connection to generation server timed out. Please check your network and try again.';
            setGenerationError(msg);
            setError(msg);
          }
        }
      }, 1000);
    } catch (err: any) {
      setGenerating(false);
      const msg = err.message || 'Failed to start generation. Please check your connection and try again.';
      setGenerationError(msg);
      setError(msg);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this prep kit?')) {
      try {
        await api.deleteKit(id);
        setKits(kits.filter(k => k._id !== id));
      } catch (err: any) {
        alert(err.message || 'Could not delete kit');
      }
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <GenerationModal
        isOpen={generating || !!generationError}
        activeStep={activeStep}
        error={generationError}
        onRetry={() => {
          setGenerationError(null);
          handleGenerate();
        }}
        onClose={() => {
          setGenerating(false);
          setGenerationError(null);
        }}
      />

      {showBatchModal && (
        <BatchModal
          onClose={() => setShowBatchModal(false)}
          onDone={fetchKits}
        />
      )}

      {/* Hero */}
      <div className="relative rounded-2xl px-8 py-10 sm:px-12 sm:py-14 bg-gradient-to-br from-[#060b07] via-[#0a120c] to-primary-950/40 border border-emerald-500/20 overflow-hidden animate-fade-up">
        {/* Background glows */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-64 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(20, 184, 166, 0.08) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-2xl">
          {/* Subtle pill — no internal ref */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 mb-5 tracking-wide">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="font-medium">AI-Powered Interview Prep</span>
          </div>

          <h1 className="text-3xl sm:text-[2.6rem] font-extrabold text-white tracking-tight leading-[1.15]">
            Turn any job description into a{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
              personalised interview kit
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-[0.95rem] text-slate-400 leading-relaxed max-w-xl">
            Paste a job description, give us the company URL, and tell us how many days you have.
            We'll do the research, figure out what actually matters for this role, and hand you a ready-to-use study plan — no guessing, no fluff.
          </p>
        </div>
      </div>

      {/* Generator + Feature card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up animate-fade-up-delay-1">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 sm:p-8 border border-surface-border relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary-400" />
                Create New Prep Kit
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Paste the role details and let the AI pipeline research and build your kit</p>
            </div>
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-surface-card border border-surface-border text-slate-300 hover:text-white hover:border-primary-500/40 flex items-center gap-1.5 transition-colors"
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Multiple Roles</span>
            </button>
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
                  Company Website
                </label>
                <input
                  type="text"
                  value={companyUrl}
                  onChange={e => setCompanyUrl(e.target.value)}
                  placeholder="https://company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-slate-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary-400" />
                  Days to Prepare
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={days}
                  onChange={e => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary-400" />
                Job Description
              </label>
              <textarea
                rows={7}
                value={jd}
                onChange={e => setJd(e.target.value)}
                placeholder="Paste the full job description here…"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-y placeholder:text-slate-600"
                required
              />
            </div>

            {/* Interview Rounds & Process Options */}
            <div className="rounded-xl border border-surface-border bg-slate-900/60 p-4 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <ListOrdered className="w-4 h-4 text-primary-400" />
                    <span>Interview Rounds & Format</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/20">
                      {hasCustomRounds ? `${customRounds.length} Custom Rounds` : 'Auto-Detect'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {hasCustomRounds
                      ? 'Questions, study flashcards, and schedule will be specifically calibrated to your rounds.'
                      : 'AI will scan company hiring pages & forums (Glassdoor, Reddit, LeetCode) to identify rounds.'}
                  </p>
                </div>

                {/* Mode Selector Toggle */}
                <div className="flex items-center p-0.5 rounded-lg bg-slate-800 border border-surface-border self-start sm:self-auto text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setHasCustomRounds(false)}
                    className={`px-3 py-1 rounded-md transition-all ${
                      !hasCustomRounds
                        ? 'bg-primary-600 text-white shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Auto-Detect Rounds
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasCustomRounds(true)}
                    className={`px-3 py-1 rounded-md transition-all ${
                      hasCustomRounds
                        ? 'bg-primary-600 text-white shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    I Know My Rounds
                  </button>
                </div>
              </div>

              {!hasCustomRounds ? (
                <div className="p-3 rounded-lg bg-surface-card/60 border border-surface-border/80 flex items-start gap-2.5 text-xs text-slate-300">
                  <Search className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-semibold text-white">Automated Hiring Process Scan: </span>
                    Don't know the rounds yet? No problem! The pipeline will crawl official hiring pages and candidate debriefs across Glassdoor, Reddit, and LeetCode Discuss to automatically identify the interview stages and display them in a top box in your kit.
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Interview stages in sequence ({customRounds.length} rounds configured):</span>
                    {customRounds.length < 6 && (
                      <button
                        type="button"
                        onClick={() => setCustomRounds(prev => [...prev, 'Technical Problem Solving'])}
                        className="text-[11px] text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Stage</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {customRounds.map((roundText, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[11px] font-mono px-2.5 py-2 rounded-lg bg-slate-800 text-primary-400 border border-surface-border font-semibold shrink-0">
                          Round {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={roundText}
                          onChange={(e) => {
                            const next = [...customRounds];
                            next[idx] = e.target.value;
                            setCustomRounds(next);
                          }}
                          placeholder={`e.g. Live LeetCode Coding Screen, System Design, or Bar Raiser`}
                          className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-surface-border text-xs text-slate-200 focus:outline-none focus:border-primary-500"
                        />
                        {customRounds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setCustomRounds(prev => prev.filter((_, i) => i !== idx))}
                            className="p-2 rounded-lg text-slate-500 hover:text-accent-rose hover:bg-slate-800 transition-colors"
                            title="Remove this round"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Quick Add Presets */}
                  <div className="pt-1 border-t border-surface-border/50 mt-2">
                    <span className="text-[11px] text-slate-500">Quick Add Stages:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {[
                        'Live LeetCode Coding Screen',
                        'Practical Take-Home Challenge',
                        'Distributed System Design',
                        'Low-Level Object-Oriented Design',
                        'STAR Behavioral & Values',
                        'Hiring Manager & Team Fit'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            if (customRounds.length < 6) {
                              setCustomRounds(prev => [...prev, preset]);
                            }
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-surface-border transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-2.5 h-2.5 text-primary-400" />
                          <span>{preset}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Candidate Resume (Optional) */}
            <div className="rounded-xl border border-surface-border bg-slate-900/60 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Candidate Resume & Background</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Optional
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Attach your resume to get tailored STAR answers and talking points grounded in your actual projects.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setHasResume(!hasResume)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors border self-start sm:self-auto ${
                    hasResume
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:text-white border-surface-border'
                  }`}
                >
                  {hasResume ? '✓ Resume Enabled' : '+ Attach Resume'}
                </button>
              </div>

              {hasResume && (
                <div className="pt-2 space-y-2 border-t border-surface-border/50 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <input
                      type="file"
                      ref={resumeFileInputRef}
                      onChange={handleResumeFileUpload}
                      accept=".txt,.json,.docx,.pdf"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => resumeFileInputRef.current?.click()}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-surface-card border border-surface-border text-emerald-400 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{resumeFileName ? `Change (${resumeFileName})` : 'Upload Resume File'}</span>
                    </button>
                    {resumeFileName && (
                      <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {resumeFileName}
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Or paste your resume text here (work experience, technologies, achievements)..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-surface-border text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 font-mono"
                  />
                </div>
              )}
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

        {/* Feature highlights */}
        <div className="glass-panel rounded-2xl border border-surface-border flex flex-col overflow-hidden">
          {/* Card header */}
          <div className="px-5 pt-5 pb-4 border-b border-surface-border/60">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="p-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20">
                <Zap className="w-3.5 h-3.5 text-primary-400" />
              </div>
              <h3 className="text-xs font-bold text-primary-400 uppercase tracking-widest font-mono">
                How it works
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Every kit is built by a deterministic pipeline — not a single prompt.
            </p>
          </div>

          {/* Guarantee tiles */}
          <div className="flex flex-col divide-y divide-surface-border/40 flex-1">
            {([
              {
                icon: ShieldCheck,
                iconBg: 'bg-cyan-500/10 border-cyan-500/20',
                iconColor: 'text-cyan-400',
                accentBar: 'bg-cyan-500',
                title: 'Deterministic Coverage',
                body: 'Multi-pass loop runs until every must-have requirement maps to at least one question — zero gaps shipped.',
                chip: '2-pass min',
                chipColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
              },
              {
                icon: BarChart3,
                iconBg: 'bg-emerald-500/10 border-emerald-500/20',
                iconColor: 'text-emerald-400',
                accentBar: 'bg-emerald-500',
                title: 'Arithmetic Schedule',
                body: 'Pure code distributes study time across exactly the days you asked for — hardest topics always land on day one.',
                chip: 'No LLM math',
                chipColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              },
              {
                icon: Search,
                iconBg: 'bg-amber-500/10 border-amber-500/20',
                iconColor: 'text-amber-400',
                accentBar: 'bg-amber-500',
                title: 'Honest Retrieval',
                body: 'Sparse site? 2-line JD? The brief says so plainly — we never invent facts the research didn\'t find.',
                chip: 'Grounded only',
                chipColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              },
              {
                icon: PenLine,
                iconBg: 'bg-violet-500/10 border-violet-500/20',
                iconColor: 'text-violet-400',
                accentBar: 'bg-violet-500',
                title: 'Reshapeable Builder',
                body: 'Pin any question you\'ve written. Regenerate a single section. Your edits survive — always.',
                chip: 'Pinned state',
                chipColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
              },
            ] as const).map(f => (
              <div key={f.title} className="flex items-start gap-3 px-4 py-3.5 group hover:bg-white/[0.02] transition-colors relative overflow-hidden">
                {/* left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${f.accentBar} opacity-0 group-hover:opacity-100 transition-opacity`} />
                {/* icon */}
                <div className={`shrink-0 mt-0.5 p-1.5 rounded-lg border ${f.iconBg}`}>
                  <f.icon className={`w-3.5 h-3.5 ${f.iconColor}`} />
                </div>
                {/* text */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-semibold text-white">{f.title}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${f.chipColor}`}>{f.chip}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tip footer */}
          <div className="px-4 py-3 bg-primary-500/5 border-t border-primary-500/10">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <span className="font-semibold text-primary-300">Pro tip:</span> Use{' '}
              <button
                type="button"
                onClick={() => setShowBatchModal(true)}
                className="font-semibold text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors"
              >
                Multiple Roles
              </button>{' '}
              to prep for up to 5 companies in one go.
            </p>
          </div>
        </div>
      </div>

      {/* Your Kits */}
      <div className="animate-fade-up animate-fade-up-delay-2">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-primary-400" />
              Your Interview Kits
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{kits.length === 0 ? 'None yet' : `${kits.length} kit${kits.length !== 1 ? 's' : ''} saved`}</p>
          </div>
        </div>

        {loadingKits ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 border border-surface-border">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading your kits…</p>
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
            {kits.map(kit => (
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
                      onClick={e => handleDelete(kit._id, e)}
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
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold flex items-center gap-1">
                      <span>⚡</span>
                      <span>Glassdoor & LeetCode Sourced</span>
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-surface-border/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {new Date(kit.createdAt || kit.source?.researched_at || Date.now()).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/kits/${kit._id}/practice`}
                      onClick={e => e.stopPropagation()}
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
    </div>
  );
}
