import { allocateSchedule } from '../server/src/pipeline/schedule';
import { Requirement, Question } from '../shared/types';

describe('Deterministic Arithmetic Schedule Allocator (Section 8)', () => {
  const sampleRequirements: Requirement[] = [
    { id: 'r1', text: 'Proficiency with distributed systems and microservices', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Deep knowledge of React and frontend performance', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Experience mentoring junior software developers', kind: 'behavioural', priority: 'must' },
    { id: 'r4', text: 'Exposure to Kubernetes and container orchestration', kind: 'domain', priority: 'nice' }
  ];

  const sampleQuestions: Question[] = [
    { id: 'q1', requirement_ids: ['r1'], category: 'system-design', prompt: 'Design a distributed rate limiter', answer_outline: 'Token bucket / Redis', difficulty: 3 },
    { id: 'q2', requirement_ids: ['r2'], category: 'technical', prompt: 'Optimizing React rendering with useMemo/useCallback', answer_outline: 'Virtual DOM diffing', difficulty: 2 },
    { id: 'q3', requirement_ids: ['r3'], category: 'behavioural', prompt: 'How do you mentor an underperforming junior engineer?', answer_outline: 'Feedback frameworks', difficulty: 2 },
    { id: 'q4', requirement_ids: ['r4'], category: 'technical', prompt: 'Kubernetes Pod lifecycle and health probes', answer_outline: 'liveness and readiness probes', difficulty: 1 },
    { id: 'q5', requirement_ids: ['r1'], category: 'technical', prompt: 'Handling eventual consistency in distributed transactions', answer_outline: 'Saga pattern / outbox', difficulty: 3 }
  ];

  test('generates exactly the number of days requested for standard case (5 days)', () => {
    const schedule = allocateSchedule(5, sampleRequirements, sampleQuestions);
    expect(schedule.days_available).toBe(5);
    expect(schedule.days.length).toBe(5);
    schedule.days.forEach((day, idx) => {
      expect(day.day).toBe(idx + 1);
      expect(Number.isInteger(day.minutes)).toBe(true);
      expect(day.minutes).toBeGreaterThan(0);
      expect(typeof day.focus).toBe('string');
      expect(day.focus.length).toBeGreaterThan(0);
      expect(Array.isArray(day.question_ids)).toBe(true);
    });
  });

  test('handles 1-day crash course edge case correctly', () => {
    const schedule = allocateSchedule(1, sampleRequirements, sampleQuestions);
    expect(schedule.days_available).toBe(1);
    expect(schedule.days.length).toBe(1);
    expect(schedule.days[0].day).toBe(1);
    expect(Number.isInteger(schedule.days[0].minutes)).toBe(true);
    expect(schedule.days[0].question_ids.length).toBeGreaterThanOrEqual(sampleQuestions.length);
  });

  test('handles large schedule edge case (60 days)', () => {
    const schedule = allocateSchedule(60, sampleRequirements, sampleQuestions);
    expect(schedule.days_available).toBe(60);
    expect(schedule.days.length).toBe(60);
    schedule.days.forEach(day => {
      expect(Number.isInteger(day.minutes)).toBe(true);
      expect(day.question_ids.length).toBeGreaterThan(0);
    });
  });

  test('ensures every must-have requirement appears in the schedule', () => {
    const schedule = allocateSchedule(4, sampleRequirements, sampleQuestions);
    const scheduledQuestionIds = new Set<string>();
    schedule.days.forEach(d => d.question_ids.forEach(qid => scheduledQuestionIds.add(qid)));

    const mustHaveIds = sampleRequirements.filter(r => r.priority === 'must').map(r => r.id);
    const scheduledRequirements = new Set<string>();

    for (const qid of scheduledQuestionIds) {
      const q = sampleQuestions.find(sq => sq.id === qid);
      if (q) {
        q.requirement_ids.forEach(rid => scheduledRequirements.add(rid));
      }
    }

    for (const mustId of mustHaveIds) {
      expect(scheduledRequirements.has(mustId)).toBe(true);
    }
  });

  test('allocates harder/higher-priority questions earlier, not on the final night', () => {
    const schedule = allocateSchedule(3, sampleRequirements, sampleQuestions);
    const day1Questions = schedule.days[0].question_ids.map(qid => sampleQuestions.find(q => q.id === qid)!);
    const day3Questions = schedule.days[2].question_ids.map(qid => sampleQuestions.find(q => q.id === qid)!);

    // Day 1 average difficulty should be higher or equal to Day 3
    const avgDiffDay1 = day1Questions.reduce((sum, q) => sum + (q?.difficulty || 2), 0) / (day1Questions.length || 1);
    const avgDiffDay3 = day3Questions.reduce((sum, q) => sum + (q?.difficulty || 1), 0) / (day3Questions.length || 1);

    expect(avgDiffDay1).toBeGreaterThanOrEqual(avgDiffDay3);
  });
});
