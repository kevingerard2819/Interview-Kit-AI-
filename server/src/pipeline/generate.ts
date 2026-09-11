import { Requirement, Question, Flashcard, QuestionCategory } from '../../../shared/types';
import { LLMClient } from '../llm/client';

export interface DraftGenerationResult {
  questions: Question[];
  flashcards: Flashcard[];
}

/**
 * Stage 3: Question and Flashcard Generation
 * 
 * Trao FS-AI-INTERVIEW-01 Section 3 & 5:
 * - Differentiates instructions by requirement kind (technical leads to coding/architecture, behavioural leads to STAR).
 * - Maps questions to requirement IDs.
 * - Categories: 'technical' | 'behavioural' | 'system-design' | 'company-fit'.
 * - Difficulty: 1 to 3 (integer).
 */
export async function generateInitialDraft(
  roleTitle: string,
  companyName: string,
  requirements: Requirement[],
  companySummary: string,
  llmClient: LLMClient
): Promise<DraftGenerationResult> {
  const reqSummary = requirements.map(r => `[${r.id}] (${r.kind}, ${r.priority}): ${r.text}`).join('\n');

  const prompt = `You are a principal engineer and hiring committee lead preparing an interview prep kit.
Role: ${roleTitle}
Company: ${companyName} (${companySummary})

Target Requirements to test:
${reqSummary}

INSTRUCTIONS:
1. Generate an initial bank of realistic, high-signal interview questions covering the requirements above.
2. For technical requirements, generate deep technical or system design questions.
3. For behavioural/mentorship requirements, generate STAR behavioural scenario questions.
4. For company context, include relevant company-fit questions.
5. EVERY question MUST include "requirement_ids": ["r1", ...] linking to the requirements it validates.
6. "difficulty" must be an integer: 1 (fundamental/accessible), 2 (deep applied), or 3 (advanced/architectural).
7. "category" must be one of: "technical", "behavioural", "system-design", "company-fit".
8. Generate corresponding flashcards with "front" (question/prompt), "back" (concise high-yield concept), and "requirement_ids".

Respond with ONLY this JSON schema:
{
  "questions": [
    {
      "id": "q1",
      "requirement_ids": ["r1"],
      "category": "technical",
      "prompt": "Interview question text",
      "answer_outline": "Key points, trade-offs, and expected candidate insights",
      "difficulty": 2
    }
  ],
  "flashcards": [
    {
      "id": "f1",
      "front": "Prompt or concept definition",
      "back": "Key answer outline or technical takeaway",
      "requirement_ids": ["r1"]
    }
  ]
}`;

  try {
    const res = await llmClient.generateJson<{ questions: any[]; flashcards: any[] }>(prompt);
    if (!res.questions || res.questions.length === 0) {
      throw new Error('LLM returned empty questions array');
    }

    const questions: Question[] = (res.questions || []).map((q, idx) => ({
      id: `q${idx + 1}`,
      requirement_ids: Array.isArray(q.requirement_ids) && q.requirement_ids.length > 0 ? q.requirement_ids : [requirements[0]?.id || 'r1'],
      category: ['technical', 'behavioural', 'system-design', 'company-fit'].includes(q.category) ? q.category : 'technical',
      prompt: String(q.prompt || 'Explain your technical approach.'),
      answer_outline: String(q.answer_outline || 'Provide a structured solution detailing architectural trade-offs.'),
      difficulty: [1, 2, 3].includes(q.difficulty) ? q.difficulty : 2
    }));

    let flashcards: Flashcard[] = (res.flashcards || []).map((f, idx) => ({
      id: `f${idx + 1}`,
      front: String(f.front || 'Core concept'),
      back: String(f.back || 'Core explanation'),
      requirement_ids: Array.isArray(f.requirement_ids) && f.requirement_ids.length > 0 ? f.requirement_ids : [requirements[0]?.id || 'r1']
    }));

    if (flashcards.length === 0) {
      flashcards = requirements.map((req, idx) => ({
        id: `f${idx + 1}`,
        front: `Key principles of ${req.text.slice(0, 80)}`,
        back: `Core operational fundamentals, trade-offs, and best practices for ${req.text.slice(0, 80)}.`,
        requirement_ids: [req.id]
      }));
    }

    return { questions, flashcards };
  } catch (err) {
    console.warn('[Generation] Error generating draft questions, using fallback generation:', err);
    // Deterministic fallback
    const fallbackQuestions: Question[] = requirements.map((req, idx) => {
      let category: QuestionCategory = 'technical';
      if (req.kind === 'behavioural') category = 'behavioural';
      else if (req.text.toLowerCase().includes('scale') || req.text.toLowerCase().includes('architecture')) category = 'system-design';

      return {
        id: `q${idx + 1}`,
        requirement_ids: [req.id],
        category,
        prompt: `How have you demonstrated mastery and overcome key challenges with ${req.text}?`,
        answer_outline: `Detail architectural experience, core concepts, and trade-offs regarding ${req.text}.`,
        difficulty: 2
      };
    });

    const fallbackCards: Flashcard[] = requirements.map((req, idx) => ({
      id: `f${idx + 1}`,
      front: `Key principles of ${req.text}`,
      back: `Core operational fundamentals, trade-offs, and best practices for ${req.text}.`,
      requirement_ids: [req.id]
    }));

    return { questions: fallbackQuestions, flashcards: fallbackCards };
  }
}

/**
 * Stage 4 / Second Pass: Generates targeted questions for coverage gaps
 * 
 * Trao FS-AI-INTERVIEW-01 Section 4:
 * "The coverage check exists to force a loop rather than a single shot.
 * After the first draft, the system compares the questions against the requirements,
 * and any requirement with no question against it comes back as a gap.
 * It must then act on those gaps — generating the missing questions — and check again."
 */
export async function generateGapQuestions(
  roleTitle: string,
  uncoveredRequirements: Requirement[],
  startIndex: number,
  llmClient: LLMClient
): Promise<Question[]> {
  if (uncoveredRequirements.length === 0) return [];

  const gapsDescription = uncoveredRequirements
    .map(r => `[${r.id}] (${r.kind}, ${r.priority}): ${r.text}`)
    .join('\n');

  const prompt = `You are an interview designer filling identified COVERAGE GAPS.
The following MUST-HAVE requirements currently lack corresponding interview questions:
${gapsDescription}

Generate one dedicated, rigorous interview question for EACH uncovered requirement.
Ensure the "requirement_ids" field explicitly contains the target requirement ID (e.g. ["r2"]).
Category must be: "technical", "behavioural", "system-design", or "company-fit".
Difficulty must be an integer: 1, 2, or 3.

Respond with ONLY this JSON schema:
{
  "questions": [
    {
      "requirement_id": "r2",
      "category": "technical",
      "prompt": "Deep interview question directly assessing the requirement",
      "answer_outline": "Expected candidate response points and evaluation rubric",
      "difficulty": 2
    }
  ]
}`;

  try {
    const res = await llmClient.generateJson<{ questions: any[] }>(prompt);
    let nextId = startIndex;
    const newQuestions: Question[] = [];

    for (const q of (res.questions || [])) {
      const targetReqId = q.requirement_id || uncoveredRequirements[0].id;
      newQuestions.push({
        id: `q${nextId++}`,
        requirement_ids: [targetReqId],
        category: ['technical', 'behavioural', 'system-design', 'company-fit'].includes(q.category) ? q.category : 'technical',
        prompt: String(q.prompt || `Explain your experience with ${targetReqId}.`),
        answer_outline: String(q.answer_outline || 'Structured response covering implementation and trade-offs.'),
        difficulty: [1, 2, 3].includes(q.difficulty) ? q.difficulty : 2
      });
    }

    return newQuestions;
  } catch (err) {
    // Deterministic fallback for gaps
    let nextId = startIndex;
    return uncoveredRequirements.map(req => ({
      id: `q${nextId++}`,
      requirement_ids: [req.id],
      category: req.kind === 'behavioural' ? 'behavioural' : 'technical',
      prompt: `In-depth evaluation: How do you practically apply ${req.text} in production?`,
      answer_outline: `Key design patterns, edge cases, and architectural best practices for ${req.text}.`,
      difficulty: 2
    }));
  }
}
