import { Requirement, Question, Schedule, ScheduleDay } from '../../../shared/types';

/**
 * Deterministic Arithmetic Schedule Allocator
 * 
 * Trao FS-AI-INTERVIEW-01 Section 8 Requirements:
 * - Distributes material across EXACTLY the requested number of days.
 * - Every day has a focus, a set of question ids, and an integer duration in minutes.
 * - Every must-have requirement appears somewhere in the schedule.
 * - Number of days in schedule equals the number of days requested.
 * - Harder and higher-priority material lands earlier, not the night before.
 * - Arithmetic and allocation done in code, NOT by an LLM prompt.
 * - Durations are integer minutes (no floats, no strings).
 * - Handles edge cases: 1-day crash course, 60-day marathon, more days than questions, etc.
 */

// Difficulty baseline time in integer minutes
const DIFFICULTY_BASE_MINUTES: Record<1 | 2 | 3, number> = {
  3: 25, // Hard / System Design / Deep architecture
  2: 18, // Medium / Core Implementation / Behavioral STAR
  1: 12  // Standard / Domain Basics / Company Fit
};

export function allocateSchedule(
  daysAvailable: number,
  requirements: Requirement[],
  questions: Question[]
): Schedule {
  // Normalize days: minimum 1 day, positive integer
  const totalDays = Math.max(1, Math.round(Number(daysAvailable) || 1));

  if (!questions || questions.length === 0) {
    // If no questions exist, return minimal empty days satisfying days_available
    const emptyDays: ScheduleDay[] = [];
    for (let d = 1; d <= totalDays; d++) {
      emptyDays.push({
        day: d,
        focus: totalDays === 1 ? 'Preparation & Role Research' : `Day ${d}: Role Preparation & Domain Research`,
        question_ids: [],
        minutes: 30
      });
    }
    return {
      days_available: totalDays,
      days: emptyDays
    };
  }

  // Create lookup for requirement priorities
  const mustHaveReqIds = new Set(
    requirements.filter(r => r.priority === 'must').map(r => r.id)
  );

  // Score questions for early landing:
  // 1. Must-have coverage: +100
  // 2. Difficulty: +30 for diff 3, +20 for diff 2, +10 for diff 1
  // 3. Category weighting: system-design (40), technical (30), domain (20), behavioural (10), company-fit (5)
  const categoryWeight: Record<string, number> = {
    'system-design': 40,
    'technical': 30,
    'behavioural': 15,
    'company-fit': 5
  };

  const scoredQuestions = questions.map(q => {
    const coversMustHave = (q.requirement_ids || []).some(id => mustHaveReqIds.has(id));
    const catWeight = categoryWeight[q.category] || 10;
    const diffScore = (q.difficulty || 2) * 10;
    const mustScore = coversMustHave ? 100 : 0;
    const totalScore = mustScore + diffScore + catWeight;

    return {
      question: q,
      coversMustHave,
      totalScore
    };
  });

  // Sort descending by priority score (harder & must-haves land first)
  scoredQuestions.sort((a, b) => b.totalScore - a.totalScore);

  const days: ScheduleDay[] = [];

  if (totalDays === 1) {
    // Single Day Intensive Crash-Course
    const allQIds = scoredQuestions.map(sq => sq.question.id);
    const totalMinutes = scoredQuestions.reduce(
      (sum, sq) => sum + (DIFFICULTY_BASE_MINUTES[sq.question.difficulty] || 15),
      0
    );

    days.push({
      day: 1,
      focus: 'Comprehensive Role Mastery: Core Must-Haves, Technicals & Cultural Alignment',
      question_ids: allQIds,
      minutes: Math.max(45, Math.round(totalMinutes))
    });

    return {
      days_available: 1,
      days
    };
  }

  // Multi-day distribution
  // Initialize buckets for each day
  const dayBuckets: {
    questionIds: string[];
    minutes: number;
    categories: Set<string>;
    coveredReqs: Set<string>;
  }[] = Array.from({ length: totalDays }, () => ({
    questionIds: [],
    minutes: 0,
    categories: new Set<string>(),
    coveredReqs: new Set<string>()
  }));

  // Step 1: Ensure EVERY must-have requirement appears in the schedule as early as possible
  const assignedQuestionIds = new Set<string>();

  // Prioritized question distribution across days
  // We distribute questions across days 1 to totalDays (bias earlier days for harder items)
  if (scoredQuestions.length <= totalDays) {
    // Fewer or equal questions than days:
    // Place primary questions into early/mid days, and assign revision/mock drill focus for remaining days
    for (let i = 0; i < scoredQuestions.length; i++) {
      const q = scoredQuestions[i].question;
      const targetDay = i; // 0-indexed
      dayBuckets[targetDay].questionIds.push(q.id);
      dayBuckets[targetDay].minutes += DIFFICULTY_BASE_MINUTES[q.difficulty] || 15;
      dayBuckets[targetDay].categories.add(q.category);
      (q.requirement_ids || []).forEach(id => dayBuckets[targetDay].coveredReqs.add(id));
      assignedQuestionIds.add(q.id);
    }

    // For any remaining days without questions, assign targeted review of existing questions
    // so no day has empty question_ids and all question_ids point to valid questions
    for (let dayIdx = scoredQuestions.length; dayIdx < totalDays; dayIdx++) {
      // Pick questions to review (e.g. cyclically review hardest or must-have questions)
      const reviewQuestion = scoredQuestions[dayIdx % scoredQuestions.length].question;
      dayBuckets[dayIdx].questionIds.push(reviewQuestion.id);
      dayBuckets[dayIdx].minutes += Math.round((DIFFICULTY_BASE_MINUTES[reviewQuestion.difficulty] || 15) * 0.8);
      dayBuckets[dayIdx].categories.add(reviewQuestion.category);
    }
  } else {
    // More questions than days:
    // Distribute using a weighted front-loaded partition
    // Calculate weights such that Day 1 gets slightly more focus or equal weight, but harder items stay in early days
    const totalQuestions = scoredQuestions.length;
    let currentQIndex = 0;

    for (let day = 0; day < totalDays; day++) {
      // Determine how many questions to allocate to this day
      const remainingQuestions = totalQuestions - currentQIndex;
      const remainingDays = totalDays - day;
      const countForDay = Math.ceil(remainingQuestions / remainingDays);

      for (let c = 0; c < countForDay && currentQIndex < totalQuestions; c++) {
        const sq = scoredQuestions[currentQIndex];
        const q = sq.question;
        dayBuckets[day].questionIds.push(q.id);
        dayBuckets[day].minutes += DIFFICULTY_BASE_MINUTES[q.difficulty] || 15;
        dayBuckets[day].categories.add(q.category);
        (q.requirement_ids || []).forEach(id => dayBuckets[day].coveredReqs.add(id));
        assignedQuestionIds.add(q.id);
        currentQIndex++;
      }
    }
  }

  // Step 2: Build descriptive day focuses reflecting early hard technicals -> behavioural/review at the end
  for (let d = 0; d < totalDays; d++) {
    const dayNumber = d + 1;
    const bucket = dayBuckets[d];
    const isFirstDay = dayNumber === 1;
    const isLastDay = dayNumber === totalDays;
    const isEarlyDay = dayNumber <= Math.ceil(totalDays / 2);

    let focus = '';
    const cats = Array.from(bucket.categories);

    if (isFirstDay) {
      focus = 'Core Must-Haves: Deep Architecture & High-Priority Technical Competencies';
    } else if (isLastDay) {
      focus = 'Final Polish: Behavioral Alignment, Company-Fit & Mock Rehearsal';
    } else if (isEarlyDay) {
      focus = cats.includes('system-design') 
        ? 'System Design, Scalability & Advanced Engineering Deep Dive'
        : 'Technical Deep Dive: Hands-on Problem Solving & Core Algorithms';
    } else {
      focus = cats.includes('behavioural')
        ? 'Leadership, Behavioral STAR Scenarios & Cross-Functional Collaboration'
        : 'Domain Knowledge, Operational Reliability & Comprehensive Review';
    }

    // Minimum sensible practice duration per day: 30-45 mins
    const dayMinutes = Math.max(30, Math.round(bucket.minutes));

    days.push({
      day: dayNumber,
      focus,
      question_ids: bucket.questionIds,
      minutes: dayMinutes
    });
  }

  return {
    days_available: totalDays,
    days
  };
}
