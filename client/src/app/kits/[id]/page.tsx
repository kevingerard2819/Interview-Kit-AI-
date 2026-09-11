'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Kit, Question, Flashcard, QuestionCategory } from '@/types';
import MockInterviewModal from '../../../components/MockInterviewModal';
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
  ChevronUp
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
  const [activeTab, setActiveTab] = useState<'questions' | 'schedule' | 'flashcards' | 'brief' | 'requirements'>('questions');

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

        <div className="flex items-center gap-3">
          <Link
            href={`/kits/${kit._id}/practice`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-card hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-surface-border transition-colors shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-accent-cyan" />
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

      {/* Tabs Navigation */}
      <div className="flex border-b border-surface-border overflow-x-auto gap-1">
        {[
          { id: 'questions', label: `Question Bank (${kit.questions.length})`, icon: HelpCircle },
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
            </button>
          );
        })}
      </div>

      {/* TAB 1: QUESTION BANK & BUILDER */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Categorized Question Bank</h2>
              <p className="text-xs text-slate-400">
                Edit inline, reorder categories, or pin questions to preserve them through category regenerations.
              </p>
            </div>
            <button
              onClick={() => setShowAddQuestion(true)}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card hover:bg-slate-800 text-xs font-medium text-primary-400 border border-surface-border transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Question</span>
            </button>
          </div>

          {/* Render by categories */}
          <div className="space-y-8">
            {CATEGORIES.map((cat) => {
              const catQuestions = kit.questions.filter(q => q.category === cat);

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
                      No questions currently in {cat}. Move questions here or add custom questions.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {catQuestions.map((q) => (
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

                          {/* Editable Answer Outline */}
                          <div className="mt-2">
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Answer Outline & Rubric:</label>
                            <textarea
                              rows={2}
                              value={q.answer_outline}
                              onChange={(e) => updateQuestionField(q.id, 'answer_outline', e.target.value)}
                              className="w-full text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span className="font-mono text-primary-400 font-semibold">{q.id} • {q.category}</span>
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
