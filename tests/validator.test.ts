import { validateKitStructure, validateBatchOutput } from '../server/src/pipeline/validator';
import { Kit, BatchOutput } from '../shared/types';

describe('Appendix A and Appendix B Structure Validator', () => {
  const validKit: Kit = {
    source: {
      company: 'Acme Corp',
      company_url: 'https://acme.com',
      role: 'Senior Backend Engineer',
      location: 'Remote',
      jd_chars: 1250,
      researched_at: '2026-09-01T10:00:00.000Z',
      pages_used: ['https://acme.com', 'https://acme.com/careers']
    },
    company_brief: {
      summary: 'Acme develops cloud infrastructure.',
      what_they_do: 'Cloud management platforms.',
      sources: ['https://acme.com/about']
    },
    role: {
      title: 'Senior Backend Engineer',
      seniority: 'Senior',
      responsibilities: ['Build scalable APIs', 'Mentor engineers'],
      requirements: [
        { id: 'r1', text: '5+ years Go / Node', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Team leadership', kind: 'behavioural', priority: 'must' }
      ]
    },
    questions: [
      { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Concurrency in Go', answer_outline: 'Goroutines and channels', difficulty: 2 },
      { id: 'q2', requirement_ids: ['r2'], category: 'behavioural', prompt: 'Conflict resolution', answer_outline: 'STAR example', difficulty: 2 }
    ],
    flashcards: [
      { id: 'f1', front: 'What is a goroutine?', back: 'A lightweight thread managed by Go runtime.', requirement_ids: ['r1'] }
    ],
    schedule: {
      days_available: 2,
      days: [
        { day: 1, focus: 'Technical Mastery', question_ids: ['q1'], minutes: 45 },
        { day: 2, focus: 'Behavioural and Leadership', question_ids: ['q2'], minutes: 40 }
      ]
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 2
    }
  };

  test('validates a complete, correctly formatted Kit (Appendix A)', () => {
    const result = validateKitStructure(validKit);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('flags missing required fields or invalid types in Kit', () => {
    const brokenKit = JSON.parse(JSON.stringify(validKit));
    delete brokenKit.source.company;
    brokenKit.questions[0].difficulty = 5; // Invalid difficulty (must be 1, 2, or 3)
    brokenKit.schedule.days[0].minutes = 45.5; // Invalid minutes (must be integer)

    const result = validateKitStructure(brokenKit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('source.company'))).toBe(true);
    expect(result.errors.some(e => e.path.includes('difficulty'))).toBe(true);
    expect(result.errors.some(e => e.path.includes('minutes'))).toBe(true);
  });

  test('validates batch output conforms to Appendix B format', () => {
    const batchOutput: BatchOutput = {
      version: '1.0',
      generated_at: '2026-09-01T09:12:44Z',
      kits: [
        {
          id: 'case-01',
          status: 'ok',
          kit: validKit,
          error: null
        },
        {
          id: 'case-04',
          status: 'failed',
          kit: null,
          error: {
            code: 'COMPANY_UNREACHABLE',
            message: 'Company site unreachable after 3 retries.'
          }
        }
      ]
    };

    const result = validateBatchOutput(batchOutput);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});
