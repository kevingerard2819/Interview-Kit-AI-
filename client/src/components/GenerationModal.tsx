'use client';

import React from 'react';
import { Loader2, CheckCircle2, Globe, FileSearch, HelpCircle, Layers, Calendar, ShieldCheck } from 'lucide-react';

interface GenerationModalProps {
  isOpen: boolean;
  activeStep: number;
}

const STEPS = [
  { label: 'Crawling Company Website', desc: 'Discovering hiring paths, engineering blogs, and culture pages', icon: Globe },
  { label: 'Extracting Requirements', desc: 'Separating must-haves from bonus qualifications without hallucination', icon: FileSearch },
  { label: 'Synthesizing Brief & Context', desc: 'Distilling company mission and public interview signals', icon: Layers },
  { label: 'Generating Questions & Cards', desc: 'Deep technical, behavioral STAR, and system design prompts', icon: HelpCircle },
  { label: 'Deterministic Coverage Loop', desc: 'Comparing questions to requirements and executing second pass', icon: ShieldCheck },
  { label: 'Arithmetic Schedule Allocation', desc: 'Distributing topics across days with harder items landing first', icon: Calendar },
];

export default function GenerationModal({ isOpen, activeStep }: GenerationModalProps) {
  if (!isOpen) return null;

  const progressPercent = Math.min(100, Math.round(((activeStep + 1) / STEPS.length) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Generating Interview Prep Kit</h3>
            <p className="text-xs text-slate-400">Executing multi-step research & deterministic allocation pipeline...</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-card rounded-full h-2 mb-6 overflow-hidden border border-surface-border/50">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step list */}
        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < activeStep;
            const isCurrent = idx === activeStep;

            return (
              <div
                key={step.label}
                className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors border ${
                  isCurrent
                    ? 'bg-primary-500/10 border-primary-500/30'
                    : isDone
                    ? 'bg-surface-card/40 border-surface-border/40 opacity-70'
                    : 'bg-transparent border-transparent opacity-40'
                }`}
              >
                <div className="mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold ${isCurrent ? 'text-primary-300' : 'text-slate-200'}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <span className="text-[10px] uppercase tracking-wider font-mono text-primary-400 font-bold animate-pulse">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-surface-border/50 text-center">
          <p className="text-xs text-slate-500">
            Please wait while the AI researches the company and builds your custom preparation kit.
          </p>
        </div>
      </div>
    </div>
  );
}
