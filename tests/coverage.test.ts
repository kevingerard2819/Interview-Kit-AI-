import { checkCoverage, buildCoverageObject } from '../server/src/pipeline/coverage';
import { Requirement, Question } from '../shared/types';

describe('Deterministic Coverage Engine (Section 3 & 4)', () => {
  const requirements: Requirement[] = [
    { id: 'r1', text: '5+ years Node.js experience', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Proficiency with GraphQL and REST', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Mentorship and leadership experience', kind: 'behavioural', priority: 'must' },
    { id: 'r4', text: 'Docker and containerization', kind: 'domain', priority: 'nice' }
  ];

  test('accurately flags uncovered must-have requirements as gaps', () => {
    // Only r1 is covered
    const draftQuestions: Question[] = [
      { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Explain Node.js event loop', answer_outline: 'libuv', difficulty: 2 }
    ];

    const result = checkCoverage(requirements, draftQuestions);
    expect(result.isFullyCovered).toBe(false);
    expect(result.uncoveredMustHaveIds).toEqual(['r2', 'r3']);
    expect(result.uncoveredNiceToHaveIds).toEqual(['r4']);
  });

  test('confirms full coverage when all must-have requirements are mapped', () => {
    const fullQuestions: Question[] = [
      { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Node.js performance tuning', answer_outline: 'clustering', difficulty: 2 },
      { id: 'q2', requirement_ids: ['r2'], category: 'technical', prompt: 'GraphQL vs REST trade-offs', answer_outline: 'over-fetching', difficulty: 2 },
      { id: 'q3', requirement_ids: ['r3'], category: 'behavioural', prompt: 'Mentoring an engineer', answer_outline: 'STAR response', difficulty: 2 }
    ];

    const result = checkCoverage(requirements, fullQuestions);
    expect(result.isFullyCovered).toBe(true);
    expect(result.uncoveredMustHaveIds.length).toBe(0);
  });

  test('buildCoverageObject produces valid Appendix A structure', () => {
    const questions: Question[] = [
      { id: 'q1', requirement_ids: ['r1', 'r2', 'r3'], category: 'technical', prompt: 'Full-stack problem', answer_outline: 'Steps', difficulty: 3 }
    ];

    const coverage = buildCoverageObject(requirements, questions, 2);
    expect(coverage.passes).toBe(2);
    expect(coverage.uncovered_requirement_ids).toEqual([]);
  });
});
