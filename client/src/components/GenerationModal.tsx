'use client';

import React, { useEffect, useState } from 'react';
import {
  Globe,
  FileSearch,
  Layers,
  HelpCircle,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Sparkles,
  Zap,
  AlertTriangle,
  RotateCcw,
  X
} from 'lucide-react';

interface GenerationModalProps {
  isOpen: boolean;
  activeStep: number;
  error?: string | null;
  onRetry?: () => void;
  onClose?: () => void;
}

const STEPS = [
  {
    icon: Globe,
    label: 'Crawling Company Infrastructure',
    sub: 'Scraping official pages, architecture signals, and cultural requirements.',
  },
  {
    icon: FileSearch,
    label: 'Parsing Role Requirements',
    sub: 'Extracting must-have technical competencies and domain proficiencies.',
  },
  {
    icon: Layers,
    label: 'Synthesizing Company Brief',
    sub: 'Distilling verified business model, engineering challenges, and culture.',
  },
  {
    icon: HelpCircle,
    label: 'Generating Targeted Question Bank',
    sub: 'Architecting deep system-design, technical coding, and STAR questions.',
  },
  {
    icon: ShieldCheck,
    label: 'Deterministic Coverage Verification',
    sub: 'Running multi-pass verification to guarantee 100% must-have coverage.',
  },
  {
    icon: Calendar,
    label: 'Allocating Arithmetic Schedule',
    sub: 'Distributing topics chronologically — front-loading harder concepts.',
  },
];

export default function GenerationModal({
  isOpen,
  activeStep,
  error,
  onRetry,
  onClose
}: GenerationModalProps) {
  const [visible, setVisible] = useState(false);
  const [displayStep, setDisplayStep] = useState(activeStep);
  const [transitioning, setTransitioning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Fade modal in & start elapsed timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  // Smooth cross-fade when step changes
  useEffect(() => {
    if (activeStep === displayStep) return;
    setTransitioning(true);
    const t = setTimeout(() => {
      setDisplayStep(activeStep);
      setTransitioning(false);
    }, 180);
    return () => clearTimeout(t);
  }, [activeStep, displayStep]);

  if (!isOpen) return null;

  const step = STEPS[Math.min(displayStep, STEPS.length - 1)];
  const progressPercent = Math.min(100, Math.round(((activeStep + 0.5) / STEPS.length) * 100));
  const Icon = step.icon;

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}s`;
  };

  // Dedicated Failure State (Section 2 & 12)
  if (error) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 transition-opacity duration-150 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="w-full max-w-lg bg-[#0d0708] border border-rose-500/30 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(244,63,94,0.15)] overflow-hidden">
          {/* Top failure laser bar */}
          <div className="h-1 w-full bg-rose-500/30">
            <div className="h-full bg-rose-500 w-full shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
          </div>

          <div className="px-8 pt-8 pb-7">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-rose-950/60 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="text-rose-400 font-bold uppercase tracking-wider text-[11px]">
                  Generation Interrupted
                </span>
              </div>
              <span className="text-rose-400/80 font-mono text-[11px]">Failed at Stage {Math.min(displayStep + 1, STEPS.length)}/{STEPS.length}</span>
            </div>

            {/* Error Icon */}
            <div className="relative flex items-center justify-center my-6">
              <div className="w-20 h-20 rounded-2xl bg-rose-950/40 border border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.25)] flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-rose-400" />
              </div>
            </div>

            {/* Error Details */}
            <div className="text-center mt-4">
              <h3 className="text-lg font-bold text-white mb-2">Generation Failed</h3>
              <p className="text-xs text-rose-300/90 leading-relaxed max-w-md mx-auto bg-rose-950/30 border border-rose-900/40 p-3.5 rounded-xl font-mono">
                {error}
              </p>
              <p className="text-[11px] text-slate-400 mt-2.5">
                Stage interrupted: <span className="text-slate-300 font-medium">{step.label}</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 mt-7">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-surface-border hover:bg-slate-800 transition-colors"
                >
                  Dismiss
                </button>
              )}
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/30"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 transition-opacity duration-150 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`w-full max-w-lg bg-[#070b08] border border-emerald-500/20 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.15)] overflow-hidden transition-all duration-300 ${
          visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-3'
        }`}
      >
        {/* Top laser shimmer progress bar */}
        <div className="relative h-1 w-full bg-emerald-950/40 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(16,185,129,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="px-8 pt-8 pb-7">
          {/* Header Status Bar */}
          <div className="flex items-center justify-between mb-8 pb-3 border-b border-emerald-950/60 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                Active Pipeline Synthesis
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <span className="text-emerald-500/80">STAGE {Math.min(displayStep + 1, STEPS.length)}/{STEPS.length}</span>
              <span className="text-emerald-800">•</span>
              <span className="text-emerald-300 font-semibold">{formatSeconds(elapsedSeconds)}</span>
            </div>
          </div>

          {/* HIGH-TECH CYBER ORBITAL LOADER */}
          <div className="relative flex items-center justify-center my-6">
            {/* Ambient Radial Glow */}
            <div className="absolute w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Outer Counter-Rotating Dashed Orbit */}
              <svg className="absolute inset-0 w-full h-full animate-spin-slow" viewBox="0 0 144 144">
                <circle
                  cx="72"
                  cy="72"
                  r="66"
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.25)"
                  strokeWidth="1.5"
                  strokeDasharray="6 10"
                />
                {/* Orbital Particle Node 1 */}
                <circle cx="72" cy="6" r="3.5" fill="#34d399" className="shadow-[0_0_8px_#34d399]" />
                <circle cx="72" cy="138" r="2.5" fill="#10b981" />
              </svg>

              {/* Inner Reverse Spinning Orbit */}
              <svg className="absolute inset-2 w-[128px] h-[128px] animate-spin-reverse-slow" viewBox="0 0 128 128">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="rgba(52, 211, 153, 0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="18 14"
                />
                {/* Orbital Particle Node 2 */}
                <circle cx="120" cy="64" r="3" fill="#6ee7b7" />
                <circle cx="8" cy="64" r="3" fill="#34d399" />
              </svg>

              {/* Pulsing Concentric Radar Rings */}
              <div className="absolute inset-4 rounded-full border border-emerald-500/30 animate-ping opacity-25" />

              {/* Center Core Glass Bubble */}
              <div
                className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-[#0a140d] to-black border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center transition-all duration-300 ${
                  transitioning ? 'scale-90 opacity-40' : 'scale-100 opacity-100'
                }`}
              >
                <Icon className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
              </div>
            </div>
          </div>

          {/* Active Step Information */}
          <div
            className={`text-center mt-6 transition-all duration-200 ${
              transitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
            }`}
          >
            <h3 className="text-lg font-bold text-white mb-1.5 flex items-center justify-center gap-2">
              <span>{step.label}</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {step.sub}
            </p>
          </div>

          {/* Neural Equalizer Simulation Wave */}
          <div className="flex items-center justify-center gap-1 mt-6 h-5">
            {[40, 75, 100, 50, 85, 60, 95, 45, 70, 90, 55, 35].map((height, i) => (
              <div
                key={i}
                className="w-1 bg-emerald-500/60 rounded-full transition-all duration-300"
                style={{
                  height: `${height * 0.2}px`,
                  animation: `pulse-glow ${1 + (i % 4) * 0.3}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>

          {/* Step Progress Indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {STEPS.map((_, idx) => {
              const done = idx < activeStep;
              const active = idx === activeStep;
              return (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    done
                      ? 'bg-emerald-400 w-5'
                      : active
                      ? 'bg-emerald-300 w-7 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                      : 'bg-emerald-950/80 w-2'
                  }`}
                />
              );
            })}
          </div>

          {/* Completed Steps Log */}
          {activeStep > 0 && (
            <div className="mt-6 pt-4 border-t border-emerald-950/70">
              <div className="flex flex-col gap-1.5">
                {STEPS.slice(0, activeStep).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-300 font-medium text-[11px]">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-3.5 bg-black/60 border-t border-emerald-950/50 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-emerald-500/70">
            <Zap className="w-3 h-3" />
            Zero-hallucination grounded pipeline
          </span>
          <span className="font-mono text-slate-400">Do not close window</span>
        </div>
      </div>
    </div>
  );
}
