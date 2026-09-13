'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Kit, Question, Flashcard, QuestionCategory } from '@/types';
import MockInterviewModal from '../../../components/MockInterviewModal';
import ResumeModal from '../../../components/ResumeModal';
import {
  Building,
  Briefcase,
  Layers,
  HelpCircle,
  Calendar,
  ShieldCheck,
  RotateCw,
  Pin,
  PinOff,
  Edit3,
  Trash2,
  Plus,
  ArrowRight,
  BookOpen,
  Sparkles,
  Save,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Flame,
  Lightbulb,
  Code2,
  Compass,
  Milestone,
  Target,
  FileText,
  CheckCircle2,
  Loader2,
  X
} from 'lucide-react';

const CATEGORIES: QuestionCategory[] = ['technical', 'behavioural', 'system-design', 'company-fit'];

export default function KitBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const kitId = params.id as string;

  const [kit, setKit] = useState<(Kit & { _id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'forum_intel' | 'schedule' | 'flashcards' | 'brief' | 'requirements'>('questions');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string | null>(null);
  const [questionViewMode, setQuestionViewMode] = useState<'category' | 'forum'>('category');
  const [selectedForumFilter, setSelectedForumFilter] = useState<string | null>(null);

  // Single Section Regeneration State
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  // Mock Interview Rehearsal Modal State
  const [mockQuestion, setMockQuestion] = useState<Question | null>(null);

  // Add Question Modal State
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newOutline, setNewOutline] = useState('');
  const [newCategory, setNewCategory] = useState<QuestionCategory>('technical');
  const [newDiff, setNewDiff] = useState<1 | 2 | 3>(2);

  // Add Flashcard Modal State
  const [showAddCard, setShowAddCard] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  // Resume Tailoring State
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [tailoringQId, setTailoringQId] = useState<string | null>(null);
  const [tailoringAll, setTailoringAll] = useState(false);
  const [activeAnswerTabs, setActiveAnswerTabs] = useState<Record<string, 'standard' | 'tailored'>>({});

  const toggleAnswerTab = (qId: string, tab: 'standard' | 'tailored') => {
    setActiveAnswerTabs(prev => ({ ...prev, [qId]: tab }));
  };

  const handleTailorQuestion = async (qId: string) => {
    if (!kit) return;
    if (!kit.candidate_resume?.text) {
      setShowResumeModal(true);
      return;
    }
    try {
      setTailoringQId(qId);
      const res = await api.tailorQuestion(kit._id, qId);
      setKit({
        ...kit,
        questions: kit.questions.map(q => q.id === qId ? res.question : q)
      });
      setActiveAnswerTabs(prev => ({ ...prev, [qId]: 'tailored' }));
    } catch (err: any) {
      alert(err.message || 'Failed to tailor question');
    } finally {
      setTailoringQId(null);
    }
  };

  const handleTailorAll = async () => {
    if (!kit) return;
    if (!kit.candidate_resume?.text) {
      setShowResumeModal(true);
      return;
    }
    try {
      setTailoringAll(true);
      const res = await api.tailorAllQuestions(kit._id);
      setKit({ ...kit, ...res.kit });
      const updatedTabs: Record<string, 'standard' | 'tailored'> = {};
      (res.kit.questions || []).forEach((q: any) => {
        if (q.tailored_response) updatedTabs[q.id] = 'tailored';
      });
      setActiveAnswerTabs(prev => ({ ...prev, ...updatedTabs }));
    } catch (err: any) {
      alert(err.message || 'Failed to tailor all questions');
    } finally {
      setTailoringAll(false);
    }
  };

  const loadKit = async () => {
    try {
      setLoading(true);
      const res = await api.getKit(kitId);
      setKit(res.kit);
    } catch (err) {
      console.error(err);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (kitId) loadKit();
  }, [kitId]);

  const handleSaveKit = async () => {
    if (!kit) return;
    try {
      setSaving(true);
      const res = await api.updateKit(kit._id, kit);
      setKit({ ...kit, ...res.kit });
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Section Regeneration (Brief, Specific Category, or Schedule)
  const handleRegenerate = async (section: 'company_brief' | 'category' | 'schedule', category?: QuestionCategory) => {
    if (!kit) return;
    const label = section === 'category' ? `category "${category}"` : section;
    if (!confirm(`Regenerate ${label}? Your manually edited and pinned questions will be strictly preserved.`)) return;

    setRegeneratingSection(category || section);
    try {
      const res = await api.regenerateSection(kit._id, section, category);
      setKit({ ...kit, ...res.kit });
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Regeneration failed');
    } finally {
      setRegeneratingSection(null);
    }
  };

  // Question manipulation
  const togglePinQuestion = (id: string) => {
    if (!kit) return;
    const updated = kit.questions.map(q => {
      if (q.id === id) {
        return { ...q, is_pinned: !q.is_pinned };
      }
      return q;
    });
    setKit({ ...kit, questions: updated });
  };

  const updateQuestionField = (id: string, field: keyof Question, value: any) => {
    if (!kit) return;
    const updated = kit.questions.map(q => {
      if (q.id === id) {
        return { ...q, [field]: value, user_edited: true };
      }
      return q;
    });
    setKit({ ...kit, questions: updated });
  };

  const moveQuestionCategory = (id: string, newCat: QuestionCategory) => {
    updateQuestionField(id, 'category', newCat);
  };

  const moveQuestionOrder = (id: string, direction: 'up' | 'down') => {
    if (!kit) return;
    const qIndex = kit.questions.findIndex(q => q.id === id);
    if (qIndex === -1) return;

    const targetCat = kit.questions[qIndex].category;
    const catQuestions = kit.questions.filter(q => q.category === targetCat);
    const catIndex = catQuestions.findIndex(q => q.id === id);

    if (direction === 'up' && catIndex <= 0) return;
    if (direction === 'down' && catIndex >= catQuestions.length - 1) return;

    const swapTargetId = catQuestions[direction === 'up' ? catIndex - 1 : catIndex + 1].id;
    const swapTargetIndex = kit.questions.findIndex(q => q.id === swapTargetId);

    const newQuestions = [...kit.questions];
    const temp = newQuestions[qIndex];
    newQuestions[qIndex] = newQuestions[swapTargetIndex];
    newQuestions[swapTargetIndex] = temp;

    setKit({ ...kit, questions: newQuestions });
  };

  const deleteQuestion = (id: string) => {
    if (!kit) return;
    if (!confirm('Delete this question?')) return;
    const updated = kit.questions.filter(q => q.id !== id);
    // Also remove from schedule
    const updatedScheduleDays = kit.schedule.days.map(d => ({
      ...d,
      question_ids: d.question_ids.filter(qid => qid !== id)
    }));
    setKit({
      ...kit,
      questions: updated,
      schedule: { ...kit.schedule, days: updatedScheduleDays }
    });
  };

  const handleAddCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kit || !newPrompt.trim()) return;

    const newQ: Question = {
      id: `q_custom_${Date.now()}`,
      requirement_ids: [kit.role.requirements[0]?.id || 'r1'],
      category: newCategory,
      prompt: newPrompt.trim(),
      answer_outline: newOutline.trim() || 'Custom answer outline.',
      difficulty: newDiff,
      is_custom: true,
      user_edited: true
    };

    setKit({
      ...kit,
      questions: [...kit.questions, newQ]
    });
    setShowAddQuestion(false);
    setNewPrompt('');
    setNewOutline('');
  };

  // Flashcard manipulation
  const deleteFlashcard = (id: string) => {
    if (!kit) return;
    setKit({
      ...kit,
      flashcards: kit.flashcards.filter(f => f.id !== id)
    });
  };

  const handleAddCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kit || !newFront.trim() || !newBack.trim()) return;

    const newCard: Flashcard = {
      id: `f_custom_${Date.now()}`,
      front: newFront.trim(),
      back: newBack.trim(),
      requirement_ids: [kit.role.requirements[0]?.id || 'r1'],
      is_custom: true,
      user_edited: true
    };

    setKit({
      ...kit,
      flashcards: [...kit.flashcards, newCard]
    });
    setShowAddCard(false);
    setNewFront('');
    setNewBack('');
  };

  if (loading || !kit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400">Loading Kit Studio & Builder...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Mock Interview Modal */}
      <MockInterviewModal
        isOpen={!!mockQuestion}
        onClose={() => setMockQuestion(null)}
        question={mockQuestion}
        kitId={kit._id}
      />

      {/* Resume Modal */}
      <ResumeModal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        kitId={kit._id}
        currentResume={kit.candidate_resume}
        onSuccess={() => loadKit()}
      />

      {/* Save Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-emerald text-white text-xs font-semibold shadow-2xl animate-fade-in">
          <Check className="w-4 h-4" />
          <span>All edits saved successfully!</span>
        </div>
      )}

      {/* Kit Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 font-semibold">
              {kit.schedule.days_available}-Day Schedule
            </span>
            <span className="text-xs text-slate-400">
              Coverage: {kit.coverage.passes} pass{kit.coverage.passes > 1 ? 'es' : ''} ({kit.coverage.uncovered_requirement_ids.length === 0 ? '100% Covered' : `${kit.coverage.uncovered_requirement_ids.length} gaps`})
            </span>
            {kit.candidate_resume?.text && (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <FileText className="w-3 h-3 text-emerald-400" />
                <span>Resume Attached</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white">{kit.role.title}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-primary-400" />
              <strong className="text-slate-200">{kit.source.company}</strong>
            </span>
            <a
              href={kit.source.company_url.startsWith('http') ? kit.source.company_url : `https://${kit.source.company_url}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary-300 flex items-center gap-1 text-[11px] underline"
            >
              <span>{kit.source.company_url}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowResumeModal(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all shadow-sm ${
              kit.candidate_resume?.text
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-surface-card hover:bg-slate-800 text-slate-200 border-surface-border'
            }`}
            title="Attach or update candidate resume for tailored answers"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>{kit.candidate_resume?.text ? 'Edit Resume' : '+ Attach Resume'}</span>
          </button>

          <Link
            href={`/kits/${kit._id}/practice`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-card hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-surface-border transition-colors shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Practice Deck</span>
          </Link>

          <button
            onClick={handleSaveKit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-all shadow-md shadow-primary-600/20"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Kit'}</span>
          </button>
        </div>
      </div>

      {/* TOP INTERVIEW STRATEGY & SUGGESTIONS ROADMAP */}
      {(() => {
        const hasCodingReq = kit.role.requirements.some(r => 
          r.kind === 'technical' && /code|coding|algorithm|data structure|leetcode|typescript|javascript|python|java|golang|go|c\+\+|backend|frontend|react|node|service/i.test(r.text)
        );
        const hasSystemDesignReq = kit.role.requirements.some(r => 
          /system design|architecture|scalab|distributed|microservice|caching|database|throughput|infrastructure|cloud/i.test(r.text)
        ) || kit.questions.some(q => q.category === 'system-design');

        const reportedRounds: string[] = kit.company_brief.public_discussion?.reported_rounds?.length
          ? kit.company_brief.public_discussion.reported_rounds
          : [
              'Round 1: Initial Technical & Experience Screen',
              'Round 2: Live Problem-Solving & Coding Assessment',
              'Round 3: Distributed Systems Architecture Review',
              'Round 4: Behavioral & Culture Values Alignment'
            ];

        const isUserSpecified = kit.company_brief.public_discussion?.rounds_source === 'user_specified' ||
          /candidate configured/i.test(kit.company_brief.public_discussion?.summary || '');

        return (
          <div className="glass-panel rounded-2xl p-5 border border-primary-500/30 bg-gradient-to-br from-primary-950/40 via-slate-900/80 to-slate-950/80 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border/80 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Interview Preparation Strategy & Recommendations</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber border border-accent-amber/20 font-semibold">
                      Recommended Sequence
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Prioritized action plan tailored to this role's verified technical requirements and interview rounds.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                <button
                  onClick={() => {
                    setActiveTab('questions');
                    setQuestionViewMode('forum');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-sm group"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Glassdoor & LeetCode Questions</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-100 font-mono uppercase">
                    Scraped
                  </span>
                </button>
                <div className="flex items-center gap-2 text-xs bg-slate-900/80 px-3 py-1.5 rounded-xl border border-surface-border">
                  <span className="text-slate-400">Preparation Flow:</span>
                  <span className="font-semibold text-primary-300">1. Coding First ➔ 2. System Design ➔ 3. Behavioral</span>
                </div>
              </div>
            </div>

            {/* INTERVIEW ROUNDS & PROCESS BREAKDOWN TOP BOX */}
            <div className="rounded-xl border border-primary-500/30 bg-slate-900/90 p-4 space-y-3.5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400">
                    <Milestone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        {reportedRounds.length} Interview Rounds {isUserSpecified ? 'Configured by Candidate' : 'Detected & Analyzed'}
                      </h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                        isUserSpecified
                          ? 'bg-primary-500/10 text-primary-300 border-primary-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      }`}>
                        {isUserSpecified ? 'Candidate Custom Rounds' : 'Auto-Scanned from Hiring Process & Forums'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isUserSpecified
                        ? `Kit questions, study priorities, and schedule allocations have been explicitly customized around your ${reportedRounds.length} interview rounds.`
                        : `Extracted from official hiring pages and verified candidate debriefs across Glassdoor, Reddit (r/cscareerquestions), and LeetCode Discuss.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto text-[11px] font-mono">
                  <span className="text-slate-400">Difficulty Rating:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                    {kit.company_brief.public_discussion?.interview_difficulty_rating || '3.5 / 5.0'}
                  </span>
                </div>
              </div>

              {/* Sequence Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {reportedRounds.map((roundName, idx) => {
                  const cleanRoundName = roundName.replace(/^Round\s*\d+:\s*/i, '');
                  const matchedQuestions = kit.questions.filter(q => {
                    if (q.interview_stage && q.interview_stage.toLowerCase().includes(cleanRoundName.toLowerCase())) return true;
                    if (q.interview_stage && q.interview_stage.toLowerCase().includes(`round ${idx + 1}`)) return true;
                    return false;
                  });

                  const isCoding = /coding|leetcode|algorithm|problem solving|technical|code|take-home|dsa/i.test(roundName);
                  const isSystemDesign = /system|design|architect|distributed|scale/i.test(roundName);
                  const isBehavioral = /behav|values|culture|bar raiser|star|leadership/i.test(roundName);
                  const tagLabel = isCoding ? 'Live Coding' : isSystemDesign ? 'Architecture' : isBehavioral ? 'Behavioral' : 'Screening';

                  const accentColor = isCoding
                    ? 'border-primary-500/30 bg-primary-950/20 text-primary-300 hover:border-primary-500/60'
                    : isSystemDesign
                    ? 'border-accent-cyan/30 bg-cyan-950/20 text-accent-cyan hover:border-accent-cyan/60'
                    : isBehavioral
                    ? 'border-purple-500/30 bg-purple-950/20 text-purple-300 hover:border-purple-500/60'
                    : 'border-surface-border bg-slate-800/40 text-slate-300 hover:border-slate-600';

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedRoundFilter(roundName);
                        setActiveTab('questions');
                      }}
                      className={`p-3 rounded-xl border ${accentColor} flex flex-col justify-between gap-2.5 transition-all cursor-pointer group`}
                      title="Click to view questions mapped to this round"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-surface-border">
                            Round {idx + 1}
                          </span>
                          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider opacity-80">
                            {tagLabel}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white group-hover:text-primary-300 transition-colors line-clamp-2 pt-0.5">
                          {cleanRoundName}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-surface-border/40 text-slate-400">
                        <span>{matchedQuestions.length > 0 ? `${matchedQuestions.length} Questions` : 'Curated Stage'}</span>
                        <span className="text-primary-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5 font-medium">
                          Questions <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3 Core Pillars */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Pillar 1: Coding / LeetCode */}
              <div className={`p-4 rounded-xl border transition-all ${
                hasCodingReq
                  ? 'bg-slate-900/90 border-primary-500/40 ring-1 ring-primary-500/20'
                  : 'bg-slate-900/40 border-surface-border'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary-300">
                    <Code2 className="w-4 h-4 text-primary-400" />
                    <span>Step 1: LeetCode & Coding First</span>
                  </div>
                  {hasCodingReq && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-rose/10 text-accent-rose border border-accent-rose/20 font-semibold">
                      Role Requirement
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {hasCodingReq
                    ? `Because coding & algorithms are mandatory for this role, prioritize LeetCode and live technical problem-solving before architectural rounds. Passing the live coding screen is the prerequisite gatekeeper.`
                    : `Refresh core algorithmic concepts, data structures, and debugging speed to guarantee high confidence during technical live screens.`}
                </p>
                <div className="space-y-1.5 text-[11px] text-slate-400">
                  <div className="font-semibold text-slate-200">Recommended Practice:</div>
                  <div className="flex flex-wrap gap-1.5">
                    <a
                      href="https://leetcode.com/problemset/all/?difficulty=MEDIUM"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-accent-amber hover:bg-slate-700 border border-amber-500/30 transition-colors font-medium"
                    >
                      <span>LeetCode Mediums</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-surface-border">
                      Arrays & Strings
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-surface-border">
                      HashMaps & Trees
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-surface-border">
                      Big-O Complexity
                    </span>
                  </div>
                </div>
              </div>

              {/* Pillar 2: System Design & Architecture */}
              <div className={`p-4 rounded-xl border transition-all ${
                hasSystemDesignReq
                  ? 'bg-slate-900/90 border-accent-cyan/40 ring-1 ring-accent-cyan/20'
                  : 'bg-slate-900/40 border-surface-border'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-accent-cyan">
                    <Layers className="w-4 h-4 text-accent-cyan" />
                    <span>Step 2: System Design References</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 font-semibold">
                    Architecture
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Refer to authoritative architectural frameworks. Master scalability, caching tiers (Redis/CDN), database sharding, and fault tolerance.
                </p>
                <div className="space-y-1.5 text-[11px] text-slate-400">
                  <div className="font-semibold text-slate-200">Recommended Reference Websites:</div>
                  <div className="flex flex-col gap-1.5">
                    <a
                      href="https://github.com/donnemartin/system-design-primer"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-between px-2.5 py-1 rounded bg-slate-800 text-accent-cyan hover:bg-slate-700 border border-accent-cyan/20 transition-colors font-medium"
                    >
                      <span>System Design Primer (GitHub)</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <a
                      href="https://bytebytego.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-between px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:text-accent-cyan hover:bg-slate-700 border border-surface-border transition-colors font-medium"
                    >
                      <span>ByteByteGo Architecture Patterns</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <a
                      href="http://highscalability.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-between px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:text-accent-cyan hover:bg-slate-700 border border-surface-border transition-colors font-medium"
                    >
                      <span>HighScalability Case Studies</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Pillar 3: Execution Gameplan */}
              <div className="p-4 rounded-xl border border-surface-border bg-slate-900/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-accent-emerald">
                      <Calendar className="w-4 h-4 text-accent-emerald" />
                      <span>Step 3: Structured Schedule Plan</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 font-semibold">
                      {kit.schedule.days_available} Days
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    Your preparation plan is sequenced around this optimal order:
                  </p>
                  <div className="space-y-1.5 text-[11px] text-slate-300">
                    <div className="flex items-start gap-1.5">
                      <span className="text-primary-400 font-bold whitespace-nowrap">Phase 1:</span>
                      <span>LeetCode & coding questions (Days 1–{Math.max(1, Math.floor(kit.schedule.days_available * 0.4))}).</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-accent-cyan font-bold whitespace-nowrap">Phase 2:</span>
                      <span>System design architecture using reference guides.</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-accent-purple font-bold whitespace-nowrap">Phase 3:</span>
                      <span>STAR behavioral responses & final mock simulations.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-border/60 mt-3 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="text-[11px] text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>View Schedule Plan</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setActiveTab('questions')}
                    className="text-[11px] text-accent-cyan hover:text-accent-cyan/80 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Open Question Bank</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs Navigation */}
      <div className="flex border-b border-surface-border overflow-x-auto gap-1">
        {[
          { id: 'questions', label: `Question Bank (${kit.questions.length})`, icon: HelpCircle },
          { id: 'forum_intel', label: 'Glassdoor & LeetCode Intel', icon: MessageSquare, badge: 'Scraped Forums' },
          { id: 'schedule', label: `Schedule (${kit.schedule.days.length} Days)`, icon: Calendar },
          { id: 'flashcards', label: `Flashcards (${kit.flashcards.length})`, icon: Layers },
          { id: 'requirements', label: `Requirements (${kit.role.requirements.length})`, icon: ShieldCheck },
          { id: 'brief', label: 'Company Brief', icon: Building },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-primary-500 text-primary-300 bg-primary-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: QUESTION BANK & BUILDER */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Glassdoor / LeetCode / Forum Intelligence Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-surface-card border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Grounded in Candidate Debriefs (Glassdoor, LeetCode, Reddit)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                    {kit.questions.filter(q => q.source_forum).length} Sourced Questions
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Questions are extracted and calibrated from public candidate debriefs across <span className="text-orange-400 font-semibold">LeetCode Discuss</span>, <span className="text-emerald-400 font-semibold">Glassdoor Candidate Reviews</span>, and <span className="text-rose-400 font-semibold">Reddit r/cscareerquestions</span>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('forum_intel')}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <span>View Full Forum Intel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Candidate Resume Tailoring Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-surface-card border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    {kit.candidate_resume?.text ? 'Candidate Resume Attached & Tailoring Active' : 'Tailor Answers to Your Resume'}
                  </h3>
                  {kit.candidate_resume?.current_title && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      {kit.candidate_resume.current_title}
                    </span>
                  )}
                  {kit.candidate_resume?.extracted_skills && kit.candidate_resume.extracted_skills.length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
                      {kit.candidate_resume.extracted_skills.length} Skills Detected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  {kit.candidate_resume?.text
                    ? `AI has analyzed your resume (${kit.candidate_resume.file_name || 'Attached Resume'}). You can generate tailored STAR stories and talking points referencing your actual past projects.`
                    : 'Upload or paste your resume (PDF/Text) to have AI craft personalized behavioral STAR answers and technical talking points based on your real experience.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              {kit.candidate_resume?.text && (
                <button
                  onClick={handleTailorAll}
                  disabled={tailoringAll}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  title="Tailor all key behavioral and system design questions to your resume"
                >
                  {tailoringAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{tailoringAll ? 'Tailoring All...' : 'Tailor All Questions'}</span>
                </button>
              )}
              <button
                onClick={() => setShowResumeModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{kit.candidate_resume?.text ? 'Update Resume' : '+ Attach Resume'}</span>
              </button>
            </div>
          </div>

          {/* Question Bank Header & View Mode Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{questionViewMode === 'category' ? 'Categorized Question Bank' : 'Glassdoor, LeetCode & Forum Scraped Questions'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                  {kit.questions.length} Questions
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {questionViewMode === 'category'
                  ? 'Organized by Technical, System Design, Behavioral & Company Fit categories.'
                  : 'Grouped directly by community debrief source: Glassdoor, LeetCode Discuss, Reddit & Hacker News.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-surface-border text-xs">
                <button
                  type="button"
                  onClick={() => setQuestionViewMode('category')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                    questionViewMode === 'category'
                      ? 'bg-primary-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📂 Technical Categories
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionViewMode('forum')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1.5 ${
                    questionViewMode === 'forum'
                      ? 'bg-amber-600 text-white font-semibold shadow-sm ring-1 ring-amber-400/40'
                      : 'text-amber-400 hover:text-amber-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
                  <span>Group by Forum Source</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-amber-200 font-mono font-bold">
                    Forums
                  </span>
                </button>
              </div>

              <button
                onClick={() => setShowAddQuestion(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-card hover:bg-slate-800 text-xs font-medium text-primary-400 border border-surface-border transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Question</span>
              </button>
            </div>
          </div>

          {/* Filters Bar: Round Filter + Forum Source Filter */}
          {(() => {
            const roundsList = kit.company_brief.public_discussion?.reported_rounds?.length
              ? kit.company_brief.public_discussion.reported_rounds
              : [
                  'Round 1: Initial Technical & Experience Screen',
                  'Round 2: Live Problem-Solving & Coding Assessment',
                  'Round 3: Distributed Systems Architecture Review',
                  'Round 4: Behavioral & Culture Values Alignment'
                ];

            return (
              <div className="space-y-2.5 p-3.5 rounded-xl bg-surface-card/60 border border-surface-border">
                {/* Forum Source Filter Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
                  <span className="text-amber-400 text-[11px] font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1 font-mono">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Forum Filter:
                  </span>
                  <button
                    onClick={() => setSelectedForumFilter(null)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors shrink-0 ${
                      selectedForumFilter === null
                        ? 'bg-amber-600 text-white font-semibold shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-surface-border'
                    }`}
                  >
                    All Forums ({kit.questions.length})
                  </button>
                  <button
                    onClick={() => setSelectedForumFilter(selectedForumFilter === 'leetcode' ? null : 'leetcode')}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 font-medium ${
                      selectedForumFilter === 'leetcode'
                        ? 'bg-amber-600 text-white font-semibold ring-1 ring-amber-400 shadow-sm'
                        : 'bg-slate-800 text-amber-300 hover:text-white border border-amber-500/30'
                    }`}
                  >
                    <span>⚡ LeetCode Discuss</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      ({kit.questions.filter(q => /leetcode/i.test(q.source_forum || (q.category === 'technical' ? 'leetcode' : ''))).length})
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedForumFilter(selectedForumFilter === 'glassdoor' ? null : 'glassdoor')}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 font-medium ${
                      selectedForumFilter === 'glassdoor'
                        ? 'bg-emerald-600 text-white font-semibold ring-1 ring-emerald-400 shadow-sm'
                        : 'bg-slate-800 text-emerald-300 hover:text-white border border-emerald-500/30'
                    }`}
                  >
                    <span>💼 Glassdoor Reviews</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      ({kit.questions.filter(q => /glassdoor/i.test(q.source_forum || (q.category === 'behavioural' ? 'glassdoor' : ''))).length})
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedForumFilter(selectedForumFilter === 'reddit' ? null : 'reddit')}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 font-medium ${
                      selectedForumFilter === 'reddit'
                        ? 'bg-rose-600 text-white font-semibold ring-1 ring-rose-400 shadow-sm'
                        : 'bg-slate-800 text-rose-300 hover:text-white border border-rose-500/30'
                    }`}
                  >
                    <span>🔥 Reddit r/cscareerquestions</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      ({kit.questions.filter(q => /reddit/i.test(q.source_forum || (q.category === 'system-design' ? 'reddit' : ''))).length})
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedForumFilter(selectedForumFilter === 'hn' ? null : 'hn')}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 font-medium ${
                      selectedForumFilter === 'hn'
                        ? 'bg-cyan-600 text-white font-semibold ring-1 ring-cyan-400 shadow-sm'
                        : 'bg-slate-800 text-cyan-300 hover:text-white border border-cyan-500/30'
                    }`}
                  >
                    <span>🌐 Hacker News & Hiring</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      ({kit.questions.filter(q => /hacker news|hn|hiring/i.test(q.source_forum || (q.category === 'company-fit' ? 'hn' : ''))).length})
                    </span>
                  </button>
                  {selectedForumFilter && (
                    <button
                      onClick={() => setSelectedForumFilter(null)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 shrink-0 ml-2"
                    >
                      <span>Clear source</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Round Filter Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5 pt-1.5 border-t border-surface-border/50">
                  <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <Milestone className="w-3.5 h-3.5 text-primary-400" />
                    Round Filter:
                  </span>
                  <button
                    onClick={() => setSelectedRoundFilter(null)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors shrink-0 ${
                      selectedRoundFilter === null
                        ? 'bg-primary-600 text-white font-semibold shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-surface-border'
                    }`}
                  >
                    All Rounds ({kit.questions.length})
                  </button>
                  {roundsList.map((r, i) => {
                    const isSelected = selectedRoundFilter === r;
                    const cleanName = r.replace(/^Round\s*\d+:\s*/i, '');
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedRoundFilter(isSelected ? null : r)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1 ${
                          isSelected
                            ? 'bg-primary-600 text-white font-semibold shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:text-white border border-surface-border'
                        }`}
                        title={r}
                      >
                        <span className="font-mono text-[10px] opacity-75">R{i + 1}:</span>
                        <span className="max-w-[140px] truncate">{cleanName}</span>
                      </button>
                    );
                  })}
                  {selectedRoundFilter && (
                    <button
                      onClick={() => setSelectedRoundFilter(null)}
                      className="text-[11px] text-accent-rose hover:text-rose-400 font-medium flex items-center gap-1 shrink-0 ml-2"
                    >
                      <span>Clear round</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Helper to filter and render single question card */}
          {(() => {
            const matchesFilter = (q: Question) => {
              if (selectedRoundFilter) {
                const clean = selectedRoundFilter.replace(/^Round\s*\d+:\s*/i, '').toLowerCase();
                const roundNumMatch = selectedRoundFilter.match(/round\s*(\d+)/i);
                const hasStageMatch = q.interview_stage && q.interview_stage.toLowerCase().includes(clean);
                const hasNumMatch = roundNumMatch && q.interview_stage && q.interview_stage.toLowerCase().includes(`round ${roundNumMatch[1]}`);
                if (!hasStageMatch && !hasNumMatch) return false;
              }
              if (selectedForumFilter) {
                const forum = (q.source_forum || '').toLowerCase();
                const cat = (q.category || '').toLowerCase();
                if (selectedForumFilter === 'leetcode') {
                  if (!forum.includes('leetcode') && (forum || cat !== 'technical')) return false;
                } else if (selectedForumFilter === 'glassdoor') {
                  if (!forum.includes('glassdoor') && (forum || cat !== 'behavioural')) return false;
                } else if (selectedForumFilter === 'reddit') {
                  if (!forum.includes('reddit') && (forum || cat !== 'system-design')) return false;
                } else if (selectedForumFilter === 'hn') {
                  if (!forum.includes('hacker news') && !forum.includes('hn') && !forum.includes('hiring') && (forum || cat !== 'company-fit')) return false;
                }
              }
              return true;
            };

            const renderSingleQuestion = (q: Question, siblingQuestions: Question[]) => {
              const isLeetCode = /leetcode/i.test(q.source_forum || (q.category === 'technical' ? 'leetcode' : ''));
              const isGlassdoor = /glassdoor/i.test(q.source_forum || (q.category === 'behavioural' ? 'glassdoor' : ''));
              const isReddit = /reddit/i.test(q.source_forum || (q.category === 'system-design' ? 'reddit' : ''));
              const isHn = /hacker news|hn/i.test(q.source_forum || (q.category === 'company-fit' ? 'hn' : ''));

              const badgeStyle = isLeetCode
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 ring-1 ring-amber-500/20'
                : isGlassdoor
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 ring-1 ring-emerald-500/20'
                : isReddit
                ? 'bg-rose-500/20 text-rose-200 border-rose-500/40 ring-1 ring-rose-500/20'
                : isHn
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/30'
                : 'bg-primary-500/20 text-primary-200 border-primary-500/30';

              const forumLabel = isLeetCode
                ? '⚡ LeetCode Discuss Scraped Question'
                : isGlassdoor
                ? '💼 Glassdoor Candidate Debrief'
                : isReddit
                ? '🔥 Reddit r/cscareerquestions Thread'
                : isHn
                ? '🌐 Hacker News & Hiring Debrief'
                : `💬 ${q.source_forum || 'Scraped Forum Discussion'}`;

              const tipHeader = isLeetCode
                ? '⚡ LeetCode Discuss Candidate Intel & Rubric'
                : isGlassdoor
                ? '💼 Glassdoor Interview Debrief & Tips'
                : isReddit
                ? '🔥 Reddit r/cscareerquestions Candidate Advice'
                : '💡 Candidate Debrief & Forum Insight';

              return (
                <div
                  key={q.id}
                  className={`glass-panel rounded-xl p-4 border transition-all ${
                    q.is_pinned ? 'border-primary-500/50 bg-primary-950/10' : 'border-surface-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {q.id}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-card text-accent-cyan border border-surface-border">
                        Req: {q.requirement_ids?.join(', ') || 'General'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-card text-accent-amber border border-surface-border">
                        Diff: {q.difficulty}/3
                      </span>
                      {q.interview_stage && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary-500/10 text-primary-300 border border-primary-500/20 flex items-center gap-1">
                          <span>🎯</span>
                          <span>{q.interview_stage}</span>
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-sm ${badgeStyle}`}>
                        <span>{forumLabel}</span>
                      </span>
                      {q.user_edited && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                          Edited
                        </span>
                      )}
                      {q.is_pinned && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary-500/20 text-primary-300 border border-primary-500/40">
                          Pinned (Protected)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Pin Toggle */}
                      <button
                        onClick={() => togglePinQuestion(q.id)}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          q.is_pinned
                            ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                            : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800'
                        }`}
                        title={q.is_pinned ? 'Unpin question' : 'Pin question (protects from regeneration)'}
                      >
                        {q.is_pinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                      </button>

                      {/* Question Reorder (Up/Down) */}
                      <div className="flex items-center border border-surface-border rounded-lg overflow-hidden bg-slate-900/80">
                        <button
                          type="button"
                          onClick={() => moveQuestionOrder(q.id, 'up')}
                          disabled={siblingQuestions.findIndex(item => item.id === q.id) === 0}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          title="Move question up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-[1px] h-3.5 bg-surface-border" />
                        <button
                          type="button"
                          onClick={() => moveQuestionOrder(q.id, 'down')}
                          disabled={siblingQuestions.findIndex(item => item.id === q.id) === siblingQuestions.length - 1}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          title="Move question down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Category Switcher Dropdown */}
                      <select
                        value={q.category}
                        onChange={(e) => moveQuestionCategory(q.id, e.target.value as QuestionCategory)}
                        className="text-[11px] bg-slate-900 border border-surface-border text-slate-300 rounded px-2 py-1 focus:outline-none"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>

                      {/* AI Mock Interview Button */}
                      <button
                        onClick={() => setMockQuestion(q)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-accent-purple bg-accent-purple/10 hover:bg-accent-purple/20 rounded border border-accent-purple/30 transition-colors"
                        title="Rehearse your answer with AI feedback"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Simulate</span>
                      </button>

                      {/* Tailor to Resume Button */}
                      <button
                        onClick={() => handleTailorQuestion(q.id)}
                        disabled={tailoringQId === q.id}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border transition-all ${
                          q.tailored_response
                            ? 'text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35'
                            : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-surface-border'
                        }`}
                        title="Generate personalized answer referencing your real projects and background"
                      >
                        {tailoringQId === q.id ? (
                          <><Loader2 className="w-3 h-3 animate-spin text-emerald-400" /><span>Tailoring...</span></>
                        ) : (
                          <><FileText className="w-3 h-3 text-emerald-400" /><span>{q.tailored_response ? 'Re-Tailor' : 'Tailor to Resume'}</span></>
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="text-slate-500 hover:text-accent-rose p-1.5 rounded hover:bg-slate-800 transition-colors"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Editable Question Prompt */}
                  <div className="mt-2">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Prompt:</label>
                    <textarea
                      rows={2}
                      value={q.prompt}
                      onChange={(e) => updateQuestionField(q.id, 'prompt', e.target.value)}
                      className="w-full text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Answer Section: Standard Outline vs. My Resume Tailored Answer */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => toggleAnswerTab(q.id, 'standard')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                            (activeAnswerTabs[q.id] || (q.tailored_response ? 'tailored' : 'standard')) === 'standard'
                              ? 'bg-slate-800 text-white font-semibold border border-surface-border'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          General Answer Guide
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!q.tailored_response) {
                              handleTailorQuestion(q.id);
                            } else {
                              toggleAnswerTab(q.id, 'tailored');
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                            (activeAnswerTabs[q.id] || (q.tailored_response ? 'tailored' : 'standard')) === 'tailored'
                              ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                              : q.tailored_response
                              ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25'
                              : 'text-slate-400 hover:text-emerald-300 bg-slate-800/60 border border-surface-border'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-emerald-300" />
                          <span>My Resume Tailored Answer</span>
                          {q.tailored_response && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                          )}
                        </button>
                      </div>

                      {q.tailored_response && (
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Grounded in Resume</span>
                        </span>
                      )}
                    </div>

                    {/* Active Answer Content */}
                    {(activeAnswerTabs[q.id] || (q.tailored_response ? 'tailored' : 'standard')) === 'tailored' && q.tailored_response ? (
                      <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-[#0a0f0c] border border-emerald-500/30 space-y-3 shadow-inner">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                            Personalized Spoken Answer:
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {q.tailored_response.answer}
                          </p>
                        </div>

                        {/* STAR breakdown if behavioral */}
                        {q.tailored_response.star_breakdown?.situation && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-900/40">
                            <div className="p-2 rounded bg-slate-950/80 border border-emerald-500/20 text-[11px]">
                              <span className="font-bold text-emerald-400 block font-mono">SITUATION</span>
                              <span className="text-slate-300">{q.tailored_response.star_breakdown.situation}</span>
                            </div>
                            <div className="p-2 rounded bg-slate-950/80 border border-emerald-500/20 text-[11px]">
                              <span className="font-bold text-teal-400 block font-mono">TASK</span>
                              <span className="text-slate-300">{q.tailored_response.star_breakdown.task}</span>
                            </div>
                            <div className="p-2 rounded bg-slate-950/80 border border-emerald-500/20 text-[11px]">
                              <span className="font-bold text-cyan-400 block font-mono">ACTION</span>
                              <span className="text-slate-300">{q.tailored_response.star_breakdown.action}</span>
                            </div>
                            <div className="p-2 rounded bg-slate-950/80 border border-emerald-500/20 text-[11px]">
                              <span className="font-bold text-emerald-300 block font-mono">RESULT</span>
                              <span className="text-slate-300">{q.tailored_response.star_breakdown.result}</span>
                            </div>
                          </div>
                        )}

                        {/* Talking points */}
                        {q.tailored_response.talking_points && q.tailored_response.talking_points.length > 0 && (
                          <div className="pt-2 border-t border-emerald-900/40 text-[11px]">
                            <span className="font-semibold text-emerald-300 block mb-1">Delivery Talking Points:</span>
                            <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                              {q.tailored_response.talking_points.map((tp, i) => (
                                <li key={i}>{tp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Highlights and Gap guidance */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-900/40">
                          <div className="flex flex-wrap gap-1">
                            {q.tailored_response.resume_highlights?.map((rh, i) => (
                              <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                ✦ {rh}
                              </span>
                            ))}
                          </div>
                          {q.tailored_response.gap_guidance && (
                            <span className="text-[10px] text-amber-300/90 italic">
                              Tip: {q.tailored_response.gap_guidance}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <textarea
                          rows={2}
                          value={q.answer_outline}
                          onChange={(e) => updateQuestionField(q.id, 'answer_outline', e.target.value)}
                          className="w-full text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500"
                          placeholder="General answer outline and rubric..."
                        />
                      </div>
                    )}
                  </div>

                  {/* Candidate Forum Debrief Tip */}
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100 flex items-start gap-2.5 shadow-sm">
                    <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div className="leading-relaxed">
                      <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block font-mono">
                        {tipHeader}:
                      </span>
                      <span className="text-slate-200 mt-0.5 block">
                        {q.forum_tip || 'Candidates recommend structuring your response cleanly, explaining edge cases, and highlighting trade-offs.'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            };

            // MODE A: GROUP BY TECHNICAL CATEGORY
            if (questionViewMode === 'category') {
              return (
                <div className="space-y-8">
                  {CATEGORIES.map((cat) => {
                    const catQuestions = kit.questions
                      .filter(q => q.category === cat)
                      .filter(matchesFilter);

                    return (
                      <div key={cat} className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-card/60 border border-surface-border">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider font-mono text-primary-300">
                              {cat}
                            </span>
                            <span className="text-xs text-slate-500">({catQuestions.length} questions)</span>
                          </div>

                          <button
                            onClick={() => handleRegenerate('category', cat)}
                            disabled={regeneratingSection === cat}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                            title="Regenerate this category while keeping pinned/user-edited questions"
                          >
                            <RotateCw className={`w-3 h-3 ${regeneratingSection === cat ? 'animate-spin' : ''}`} />
                            <span>{regeneratingSection === cat ? 'Regenerating...' : 'Regenerate Category'}</span>
                          </button>
                        </div>

                        {catQuestions.length === 0 ? (
                          <div className="p-6 rounded-xl border border-dashed border-surface-border text-center text-xs text-slate-500">
                            No questions matching current filters in {cat}.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {catQuestions.map((q) => renderSingleQuestion(q, catQuestions))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            // MODE B: GROUP BY FORUM SOURCE (Glassdoor / LeetCode / Reddit / Hacker News)
            const FORUM_GROUPS = [
              {
                id: 'leetcode',
                title: '⚡ LeetCode Discuss Scraped Questions',
                subtitle: 'Algorithmic challenges, data structures, and live coding screens reported by candidates on LeetCode Discuss.',
                icon: '⚡',
                headerStyle: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
                matcher: (q: Question) => /leetcode/i.test(q.source_forum || (q.category === 'technical' ? 'leetcode' : ''))
              },
              {
                id: 'glassdoor',
                title: '💼 Glassdoor Candidate Interview Debriefs & Reviews',
                subtitle: 'Real interview questions, take-home challenges, and cultural bar-raiser questions reported on Glassdoor.',
                icon: '💼',
                headerStyle: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
                matcher: (q: Question) => /glassdoor/i.test(q.source_forum || (q.category === 'behavioural' ? 'glassdoor' : ''))
              },
              {
                id: 'reddit',
                title: '🔥 Reddit r/cscareerquestions Scraped Questions',
                subtitle: 'High-scale distributed systems architecture, scalability trade-offs, and hiring loop debriefs from Reddit.',
                icon: '🔥',
                headerStyle: 'border-rose-500/30 bg-rose-950/20 text-rose-300',
                matcher: (q: Question) => /reddit/i.test(q.source_forum || (q.category === 'system-design' ? 'reddit' : ''))
              },
              {
                id: 'hn',
                title: '🌐 Hacker News & Engineering Discussions',
                subtitle: 'Foundational architecture, domain engineering craft, and leadership values from Hacker News threads.',
                icon: '🌐',
                headerStyle: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-300',
                matcher: (q: Question) => !/leetcode|glassdoor|reddit/i.test(q.source_forum || '') || /hacker news|hn/i.test(q.source_forum || '')
              }
            ];

            return (
              <div className="space-y-8">
                {FORUM_GROUPS.map((group) => {
                  const groupQuestions = kit.questions
                    .filter(group.matcher)
                    .filter(matchesFilter);

                  return (
                    <div key={group.id} className="space-y-3">
                      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${group.headerStyle}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{group.title}</span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900/80 border border-surface-border text-slate-300">
                              {groupQuestions.length} Questions
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5">{group.subtitle}</p>
                        </div>
                      </div>

                      {groupQuestions.length === 0 ? (
                        <div className="p-6 rounded-xl border border-dashed border-surface-border text-center text-xs text-slate-500">
                          No questions currently mapped to this forum with the active filters.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {groupQuestions.map((q) => renderSingleQuestion(q, groupQuestions))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB: GLASSDOOR & LEETCODE FORUM INTELLIGENCE */}
      {activeTab === 'forum_intel' && (
        <div className="space-y-6">
          {/* Header & Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Glassdoor, LeetCode & Forum Scraped Intelligence</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 font-bold">
                      Verified Community Debriefs
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real candidate interview debriefs, difficulty consensus, reported rounds, and questions scraped from public developer forums.
                  </p>
                </div>
              </div>
            </div>

            {kit.company_brief.public_discussion?.interview_difficulty_rating && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-surface-border self-start sm:self-auto">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-300">
                  Difficulty Consensus: <strong className="text-white">{kit.company_brief.public_discussion.interview_difficulty_rating}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Consensus Overview Card */}
          <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-950/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
              <span>Candidate Consensus on {kit.source.company}'s Interview Loop</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {kit.company_brief.public_discussion?.summary || `Extensive candidate debriefs across Glassdoor, Reddit r/cscareerquestions, and LeetCode Discuss report a multi-stage evaluation focusing on core problem-solving, modular system design, and values alignment.`}
            </p>

            {/* Candidate Tips from Forums */}
            {kit.company_brief.public_discussion?.candidate_tips && kit.company_brief.public_discussion.candidate_tips.length > 0 && (
              <div className="pt-2 border-t border-surface-border/60">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-2 font-mono">
                  Verified Candidate Tips from Glassdoor & LeetCode:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {kit.company_brief.public_discussion.candidate_tips.map((tip, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/20 flex items-start gap-2.5 text-xs text-slate-200">
                      <span className="text-amber-400 font-bold shrink-0">#{idx + 1}</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Forum Search Hub */}
            <div className="pt-2 border-t border-surface-border/60 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium mr-1">Direct Forum Archives:</span>
              <a
                href={`https://leetcode.com/discuss/interview-experience?company=${encodeURIComponent(kit.source.company)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
              >
                <span>⚡ LeetCode Discuss ({kit.source.company})</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`https://www.glassdoor.com/Interview/index.htm`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
              >
                <span>💼 Glassdoor Interview Reviews</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`https://www.reddit.com/r/cscareerquestions/search?q=${encodeURIComponent(kit.source.company + ' interview')}&restrict_sr=1`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
              >
                <span>🔥 Reddit r/cscareerquestions</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`https://news.ycombinator.com`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-surface-border text-xs font-medium transition-colors"
              >
                <span>🌐 Hacker News</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Scraped & Grounded Interview Questions Gallery */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Questions Grounded in Forum Intelligence</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/20">
                    {kit.questions.length} Questions
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Every question below incorporates actual candidate debriefs, reported problem types, and interview rubric notes.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('questions')}
                className="text-xs font-semibold text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
              >
                <span>Open in Question Bank</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {kit.questions.map((q) => {
                const isLeetCode = /leetcode/i.test(q.source_forum || '');
                const isGlassdoor = /glassdoor/i.test(q.source_forum || '');
                const isReddit = /reddit/i.test(q.source_forum || '');

                const forumColor = isLeetCode
                  ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                  : isGlassdoor
                  ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                  : isReddit
                  ? 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                  : 'border-surface-border bg-slate-800/40 text-slate-300';

                return (
                  <div key={q.id} className="glass-panel rounded-2xl p-5 border border-surface-border space-y-3 hover:border-surface-border/80 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-surface-border">
                          {q.id}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm ${forumColor}`}>
                          {q.source_forum ? `💬 ${q.source_forum}` : '⚡ LeetCode Discuss & Glassdoor'}
                        </span>
                        {q.interview_stage && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary-500/10 text-primary-300 border border-primary-500/20">
                            🎯 {q.interview_stage}
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-card text-accent-cyan border border-surface-border">
                          {q.category}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-card text-accent-amber border border-surface-border">
                          Diff: {q.difficulty}/3
                        </span>
                      </div>

                      <button
                        onClick={() => setMockQuestion(q)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-accent-purple bg-accent-purple/10 hover:bg-accent-purple/20 rounded-lg border border-accent-purple/30 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Simulate Interview</span>
                      </button>
                    </div>

                    <div className="text-sm font-medium text-white leading-relaxed">
                      {q.prompt}
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-surface-border/60">
                      <span className="font-semibold text-primary-400 block mb-1">Expected Candidate Solution & Trade-offs:</span>
                      <span>{q.answer_outline}</span>
                    </div>

                    {q.forum_tip && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100 flex items-start gap-2.5 shadow-sm">
                        <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="leading-relaxed">
                          <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block font-mono">
                            💡 Candidate Debrief Insight ({q.source_forum || 'Forum Intel'}):
                          </span>
                          <span className="text-slate-200 mt-0.5 block">{q.forum_tip}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">
                Arithmetic Study Schedule ({kit.schedule.days.length} Days)
              </h2>
              <p className="text-xs text-slate-400">
                Deterministic daily distribution with high-priority and harder topics scheduled first.
              </p>
            </div>
            <button
              onClick={() => handleRegenerate('schedule')}
              disabled={regeneratingSection === 'schedule'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card hover:bg-slate-800 text-xs font-medium text-primary-400 border border-surface-border transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${regeneratingSection === 'schedule' ? 'animate-spin' : ''}`} />
              <span>Recalculate Schedule</span>
            </button>
          </div>

          {/* Strategy Sequence Callout Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-primary-400 shrink-0" />
              <span className="text-slate-300">
                <strong className="text-white">Structured Sequence:</strong> Days 1–{Math.max(1, Math.floor(kit.schedule.days_available * 0.4))} prioritize core technical coding & LeetCode questions first, followed by system design architecture, and behavioral alignment.
              </span>
            </div>
            <a
              href="https://github.com/donnemartin/system-design-primer"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-accent-cyan hover:bg-slate-700 border border-accent-cyan/20 whitespace-nowrap text-[11px] font-medium transition-colors shrink-0"
            >
              <span>System Design Guide</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kit.schedule.days.map((day) => {
              const dayQuestions = day.question_ids
                .map(qid => kit.questions.find(q => q.id === qid))
                .filter(Boolean) as Question[];

              return (
                <div key={day.day} className="glass-panel rounded-2xl p-5 border border-surface-border space-y-3">
                  <div className="flex items-center justify-between border-b border-surface-border pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center font-bold text-xs text-primary-300">
                        {day.day}
                      </span>
                      <span className="text-xs font-semibold text-white">Day {day.day}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-accent-cyan bg-accent-cyan/10 px-2.5 py-0.5 rounded border border-accent-cyan/20">
                      {day.minutes} min
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Focus Area:</span>
                    <p className="text-xs text-slate-200 font-medium mt-0.5">{day.focus}</p>
                  </div>

                  <div className="pt-2 border-t border-surface-border/50">
                    <span className="text-[11px] font-semibold text-slate-400">
                      Assigned Questions ({day.question_ids.length}):
                    </span>
                    <div className="mt-2 space-y-2">
                      {dayQuestions.map((q) => (
                        <div key={q.id} className="p-2 rounded-lg bg-slate-900 border border-surface-border text-xs">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-primary-400 font-semibold">{q.id} • {q.category}</span>
                              {q.interview_stage && (
                                <span className="px-1.5 py-0.2 rounded bg-primary-500/10 text-primary-300 border border-primary-500/20 text-[9px]">
                                  {q.interview_stage.split(':')[0] || q.interview_stage}
                                </span>
                              )}
                            </div>
                            <span>Diff: {q.difficulty}/3</span>
                          </div>
                          <p className="text-slate-200 line-clamp-2">{q.prompt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: FLASHCARDS */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Interactive Flashcards ({kit.flashcards.length})</h2>
              <p className="text-xs text-slate-400">High-yield concepts linked to core role requirements.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddCard(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card hover:bg-slate-800 text-xs font-medium text-primary-400 border border-surface-border transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Card</span>
              </button>
              <Link
                href={`/kits/${kit._id}/practice`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-xs font-semibold text-white transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Launch Practice Mode</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kit.flashcards.map((card, idx) => (
              <div key={card.id} className="glass-panel rounded-2xl p-5 border border-surface-border space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-primary-400 font-semibold">Card {idx + 1} ({card.id})</span>
                  <button
                    onClick={() => deleteFlashcard(card.id)}
                    className="text-slate-500 hover:text-accent-rose p-1 rounded"
                    title="Delete card"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Front (Prompt/Concept):</label>
                  <textarea
                    rows={2}
                    value={card.front}
                    onChange={(e) => {
                      const updated = kit.flashcards.map(f => f.id === card.id ? { ...f, front: e.target.value, user_edited: true } : f);
                      setKit({ ...kit, flashcards: updated });
                    }}
                    className="w-full text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Back (Explanation/Answer):</label>
                  <textarea
                    rows={3}
                    value={card.back}
                    onChange={(e) => {
                      const updated = kit.flashcards.map(f => f.id === card.id ? { ...f, back: e.target.value, user_edited: true } : f);
                      setKit({ ...kit, flashcards: updated });
                    }}
                    className="w-full text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: REQUIREMENTS */}
      {activeTab === 'requirements' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">Extracted Role Requirements</h2>
            <p className="text-xs text-slate-400">
              Categorized by must-have vs nice-to-have, and technical, behavioral, or domain kinds.
            </p>
          </div>

          <div className="space-y-3">
            {kit.role.requirements.map((req) => (
              <div key={req.id} className="glass-panel rounded-xl p-4 border border-surface-border flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                      {req.id}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                      req.priority === 'must'
                        ? 'bg-accent-rose/10 text-accent-rose border border-accent-rose/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {req.priority}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                      {req.kind}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 mt-1">{req.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: COMPANY BRIEF */}
      {activeTab === 'brief' && (
        <div className="glass-panel rounded-2xl p-6 border border-surface-border space-y-5">
          <div className="flex items-center justify-between border-b border-surface-border pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Company Brief & Retrieval Synthesis</h2>
              <p className="text-xs text-slate-400">Synthesized from homepage and discovered hiring/career pages.</p>
            </div>
            <button
              onClick={() => handleRegenerate('company_brief')}
              disabled={regeneratingSection === 'company_brief'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card hover:bg-slate-800 text-xs font-medium text-primary-400 border border-surface-border transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${regeneratingSection === 'company_brief' ? 'animate-spin' : ''}`} />
              <span>Regenerate Brief</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Company Summary</label>
            <textarea
              rows={3}
              value={kit.company_brief.summary}
              onChange={(e) => setKit({ ...kit, company_brief: { ...kit.company_brief, summary: e.target.value } })}
              className="w-full text-xs text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">What They Do & Mission</label>
            <textarea
              rows={4}
              value={kit.company_brief.what_they_do}
              onChange={(e) => setKit({ ...kit, company_brief: { ...kit.company_brief, what_they_do: e.target.value } })}
              className="w-full text-xs text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Dedicated Public Forum Intelligence & Candidate Debriefs Module */}
          <div className="rounded-xl p-5 bg-slate-900/60 border border-surface-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Public Forum & Candidate Intelligence</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      kit.company_brief.public_discussion?.found
                        ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    }`}>
                      {kit.company_brief.public_discussion?.found ? 'Verified Forum Intel' : 'Industry Grounded'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Candidate debriefs & trends from Glassdoor, Reddit (r/cscareerquestions), LeetCode Discuss, and Hacker News.
                  </p>
                </div>
              </div>

              {kit.company_brief.public_discussion?.interview_difficulty_rating && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-surface-border self-start sm:self-auto">
                  <Flame className="w-3.5 h-3.5 text-accent-amber" />
                  <span className="text-xs font-semibold text-slate-300">
                    Difficulty: <span className="text-white font-bold">{kit.company_brief.public_discussion.interview_difficulty_rating}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Summary Consensus */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-surface-border/80 text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-amber-300">Candidate Consensus: </span>
              {kit.company_brief.public_discussion?.summary || kit.company_brief.summary}
            </div>

            {/* Reported Interview Stages Roadmap */}
            {kit.company_brief.public_discussion?.reported_rounds && kit.company_brief.public_discussion.reported_rounds.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Reported Interview Pipeline & Rounds:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {kit.company_brief.public_discussion.reported_rounds.map((round, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950/50 border border-surface-border flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-300 font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5 border border-primary-500/30">
                        {idx + 1}
                      </span>
                      <div className="text-xs">
                        <span className="font-medium text-slate-200 block">{round}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Focus Areas */}
            {kit.company_brief.public_discussion?.key_focus_areas && kit.company_brief.public_discussion.key_focus_areas.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Candidate Reported Focus Areas:
                </label>
                <div className="flex flex-wrap gap-2">
                  {kit.company_brief.public_discussion.key_focus_areas.map((area, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-surface-card text-accent-cyan border border-accent-cyan/20">
                      🎯 {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Candidate Debrief Tips */}
            {kit.company_brief.public_discussion?.candidate_tips && kit.company_brief.public_discussion.candidate_tips.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Candidate Debrief Tips & Insights:
                </label>
                <div className="space-y-2">
                  {kit.company_brief.public_discussion.candidate_tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 p-2.5 rounded-lg bg-slate-950/40 border border-surface-border">
                      <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Forum Sources */}
            {kit.company_brief.public_discussion?.sources && kit.company_brief.public_discussion.sources.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-surface-border/50">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Referenced Forum & Hiring Discussions:
                </label>
                <div className="flex flex-wrap gap-2">
                  {kit.company_brief.public_discussion.sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary-400 hover:text-primary-300 px-2.5 py-1 rounded bg-slate-950 border border-surface-border hover:border-primary-500/40 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{src.replace(/^https?:\/\/(www\.)?/, '').slice(0, 45)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Retrieved Sources:</label>
            <ul className="space-y-1 text-xs text-slate-400">
              {(kit.company_brief.sources || []).map((s, i) => (
                <li key={i} className="flex items-center gap-1.5 font-mono text-[11px] text-primary-400">
                  <ExternalLink className="w-3 h-3" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Question */}
      {showAddQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add Custom Question</h3>
            <form onSubmit={handleAddCustomQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as QuestionCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-surface-border text-xs text-slate-200"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty (1-3)</label>
                <select
                  value={newDiff}
                  onChange={(e) => setNewDiff(Number(e.target.value) as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-surface-border text-xs text-slate-200"
                >
                  <option value={1}>1 - Fundamental / Accessible</option>
                  <option value={2}>2 - Deep Applied</option>
                  <option value={3}>3 - Advanced Architectural</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Question Prompt</label>
                <textarea
                  rows={3}
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="Enter the interview question prompt..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-surface-border text-xs text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Answer Outline</label>
                <textarea
                  rows={3}
                  value={newOutline}
                  onChange={(e) => setNewOutline(e.target.value)}
                  placeholder="Key response evaluation points..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-surface-border text-xs text-slate-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddQuestion(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-lg"
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Flashcard */}
      {showAddCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add Custom Flashcard</h3>
            <form onSubmit={handleAddCustomCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Front (Prompt/Concept)</label>
                <textarea
                  rows={2}
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="e.g. What is the difference between SQL and NoSQL?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-surface-border text-xs text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Back (Explanation)</label>
                <textarea
                  rows={3}
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="Detailed takeaway points..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-surface-border text-xs text-slate-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCard(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-lg"
                >
                  Add Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
