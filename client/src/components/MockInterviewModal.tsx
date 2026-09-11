'use client';

import React, { useState } from 'react';
import { api } from '../lib/api';
import { Question } from '@/types';
import { X, Sparkles, Loader2, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';

interface MockInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  kitId: string;
}

export default function MockInterviewModal({ isOpen, onClose, question, kitId }: MockInterviewModalProps) {
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !question) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateAnswer.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.evaluateMockAnswer(kitId, question.id, candidateAnswer);
      setEvaluation(res.evaluation);
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate mock answer.');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setCandidateAnswer('');
    setEvaluation(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl relative my-8">
        <button
          onClick={resetModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">AI Mock Interview Simulator</h3>
            <p className="text-xs text-slate-400">Rehearse your live answer and receive instant diagnostic feedback</p>
          </div>
        </div>

        {/* Question Prompt Card */}
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20 uppercase font-semibold">
              {question.category}
            </span>
            <span className="text-[11px] text-slate-400">Difficulty: {question.difficulty}/3</span>
          </div>
          <p className="text-sm font-medium text-slate-200">{question.prompt}</p>
        </div>

        {!evaluation ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Answer (Type or paste how you would answer in the interview):
              </label>
              <textarea
                rows={6}
                value={candidateAnswer}
                onChange={(e) => setCandidateAnswer(e.target.value)}
                placeholder="Structure your answer (e.g. explain your technical rationale, architecture patterns, or use the STAR method for behavioral questions)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-y placeholder:text-slate-600"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-accent-rose/10 border border-accent-rose/20 text-xs text-accent-rose">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetModal}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !candidateAnswer.trim()}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-lg transition-colors shadow-md shadow-primary-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Answer...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Evaluate My Answer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* Score Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary-950/40 via-surface-card to-primary-950/40 border border-primary-500/30 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-mono text-primary-400 font-semibold">
                  Readiness Score
                </p>
                <p className="text-2xl font-black text-white mt-0.5">
                  {evaluation.readiness_score} <span className="text-xs font-normal text-slate-400">/ 100</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-primary-500/50 flex items-center justify-center font-bold text-sm text-primary-300">
                {evaluation.readiness_score}%
              </div>
            </div>

            {/* Strengths */}
            <div className="p-4 rounded-xl bg-accent-emerald/5 border border-accent-emerald/20">
              <div className="flex items-center gap-2 mb-2 text-accent-emerald text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Strengths Highlighted</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {(evaluation.strengths || []).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Weak Spots */}
            <div className="p-4 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
              <div className="flex items-center gap-2 mb-2 text-accent-amber text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Identified Weak Spots & Missing Concepts</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {(evaluation.weak_spots || []).map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>

            {/* Coaching Tip */}
            {evaluation.coaching_tip && (
              <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20">
                <div className="flex items-center gap-2 mb-1.5 text-primary-400 text-xs font-bold uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4" />
                  <span>Key Interview Coaching Tip</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{evaluation.coaching_tip}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEvaluation(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg bg-surface-card border border-surface-border transition-colors"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={resetModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
