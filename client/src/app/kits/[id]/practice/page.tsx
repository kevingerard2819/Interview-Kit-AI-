'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { Kit, Flashcard } from '@/types';
import {
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const kitId = params.id as string;

  const [kit, setKit] = useState<(Kit & { _id: string }) | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<'confidence' | 'default'>('confidence');

  // Load Kit
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.getKit(kitId);
        setKit(res.kit);

        const initialCards = (res.kit.flashcards || []).map((c: any) => ({
          ...c,
          confidence: c.confidence || 1 // Default to 1 (needs review)
        }));

        setCards(initialCards);
      } catch (err) {
        console.error(err);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    if (kitId) load();
  }, [kitId, router]);

  // Apply sorting
  useEffect(() => {
    if (cards.length === 0) return;
    const cardsCopy = [...cards];

    if (sortMode === 'confidence') {
      // Ascending confidence: 1 (hardest/least confident) first, then 2, then 3 (mastered)
      cardsCopy.sort((a, b) => (a.confidence || 1) - (b.confidence || 1));
    }
    setCards(cardsCopy);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [sortMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '1') {
        handleRateConfidence(1);
      } else if (e.key === '2') {
        handleRateConfidence(2);
      } else if (e.key === '3') {
        handleRateConfidence(3);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards, isFlipped]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleRateConfidence = async (level: 1 | 2 | 3) => {
    if (!kit || cards.length === 0) return;
    const currentCard = cards[currentIndex];

    const updatedCards = cards.map((c, i) => {
      if (i === currentIndex) {
        return { ...c, confidence: level, last_practiced: new Date().toISOString() };
      }
      return c;
    });

    setCards(updatedCards);

    // Persist card confidence update to backend
    const updatedKitCards = kit.flashcards.map(c => {
      if (c.id === currentCard.id) {
        return { ...c, confidence: level, last_practiced: new Date().toISOString() };
      }
      return c;
    });

    api.updateKit(kit._id, { flashcards: updatedKitCards }).catch(console.error);

    // Auto-advance to next card
    if (currentIndex < cards.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
      }, 300);
    }
  };

  if (loading || !kit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400">Loading Practice Deck...</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const masteredCount = cards.filter(c => c.confidence === 3).length;
  const inProgressCount = cards.filter(c => c.confidence === 2).length;
  const needsReviewCount = cards.filter(c => c.confidence === 1 || !c.confidence).length;
  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/kits/${kit._id}`}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Kit Studio</span>
        </Link>

        {/* Sort Filter */}
        <div className="flex items-center gap-2 bg-surface-card border border-surface-border p-1 rounded-xl text-xs">
          <button
            onClick={() => setSortMode('confidence')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              sortMode === 'confidence'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Least Confident First
          </button>
          <button
            onClick={() => setSortMode('default')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              sortMode === 'default'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Default Order
          </button>
        </div>
      </div>

      {/* Mastery Stats Banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-surface-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-rose/10 border border-accent-rose/20 flex items-center justify-center text-accent-rose">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-400">Needs Review</p>
            <p className="text-base font-bold text-white">{needsReviewCount}</p>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-surface-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center text-accent-amber">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-400">Learning</p>
            <p className="text-base font-bold text-white">{inProgressCount}</p>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-surface-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20 flex items-center justify-center text-accent-emerald">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-400">Mastered</p>
            <p className="text-base font-bold text-white">{masteredCount}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Card {currentIndex + 1} of {cards.length}</span>
          <span>{progressPercent}% Completed</span>
        </div>
        <div className="w-full bg-surface-card rounded-full h-1.5 overflow-hidden border border-surface-border">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* The 3D Flashcard */}
      {currentCard ? (
        <div className="perspective-1000">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`cursor-pointer min-h-[300px] w-full rounded-2xl p-8 border transition-all duration-500 transform-style-3d relative flex flex-col justify-between select-none ${
              isFlipped
                ? 'bg-gradient-to-br from-slate-900 via-surface-card to-slate-900 border-accent-cyan/40 shadow-2xl shadow-accent-cyan/5'
                : 'glass-panel border-surface-border hover:border-primary-500/40 shadow-xl'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-primary-400 bg-primary-500/10 px-2.5 py-0.5 rounded border border-primary-500/20">
                {isFlipped ? 'ANSWER / TAKEAWAY' : 'PROMPT / CONCEPT'}
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Click or press Spacebar to flip</span>
              </div>
            </div>

            {/* Card Body */}
            <div className="my-8 text-center px-4">
              <p className={`text-lg sm:text-xl font-medium leading-relaxed ${isFlipped ? 'text-slate-100 font-normal' : 'text-white font-semibold'}`}>
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-surface-border/40">
              <span>Req ID: {currentCard.requirement_ids?.join(', ') || 'r1'}</span>
              <span>
                Current Status:{' '}
                <strong className={
                  currentCard.confidence === 3 ? 'text-accent-emerald' :
                  currentCard.confidence === 2 ? 'text-accent-amber' : 'text-accent-rose'
                }>
                  {currentCard.confidence === 3 ? 'Mastered' : currentCard.confidence === 2 ? 'Learning' : 'Needs Review'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-2xl text-center text-slate-400">
          <p>No flashcards found in this kit.</p>
        </div>
      )}

      {/* Rating & Action Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => handleRateConfidence(1)}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
              currentCard?.confidence === 1
                ? 'bg-accent-rose/20 text-accent-rose border-accent-rose/40'
                : 'bg-surface-card hover:bg-slate-800 text-slate-300 border-surface-border'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-accent-rose" />
            <span>Hard (1)</span>
          </button>

          <button
            onClick={() => handleRateConfidence(2)}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
              currentCard?.confidence === 2
                ? 'bg-accent-amber/20 text-accent-amber border-accent-amber/40'
                : 'bg-surface-card hover:bg-slate-800 text-slate-300 border-surface-border'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-accent-amber" />
            <span>Medium (2)</span>
          </button>

          <button
            onClick={() => handleRateConfidence(3)}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
              currentCard?.confidence === 3
                ? 'bg-accent-emerald/20 text-accent-emerald border-accent-emerald/40'
                : 'bg-surface-card hover:bg-slate-800 text-slate-300 border-surface-border'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
            <span>Mastered (3)</span>
          </button>
        </div>

        {/* Carousel Prev / Next Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-surface-card disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous (Left Arrow)</span>
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-surface-card disabled:opacity-30 transition-colors"
          >
            <span>Next (Right Arrow)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
