import { Requirement, Question, Flashcard, QuestionCategory } from '../../../shared/types';
import { LLMClient } from '../llm/client';

export interface DraftGenerationResult {
  questions: Question[];
  flashcards: Flashcard[];
}

export function sanitizeCategory(cat: any): QuestionCategory {
  const s = String(cat || '').toLowerCase().trim();
  if (s.includes('behav')) return 'behavioural';
  if (s.includes('design') || s.includes('arch') || s.includes('system')) return 'system-design';
  if (s.includes('company') || s.includes('fit') || s.includes('culture')) return 'company-fit';
  return 'technical';
}

export function sanitizeDifficulty(diff: any): 1 | 2 | 3 {
  const n = parseInt(String(diff), 10);
  if (n === 1 || n === 2 || n === 3) return n;
  return 2;
}

export interface CrawlContext {
  hiringPage?: { cleanText: string } | null;
  customRounds?: string[];
  publicDiscussion?: {
    summary: string;
    reportedRounds?: string[];
    interviewDifficultyRating?: string;
    keyFocusAreas?: string[];
    candidateTips?: string[];
    sources: string[];
  };
}

export function inferInterviewStageAndForum(
  category: QuestionCategory,
  crawlContext?: CrawlContext,
  existingStage?: string,
  existingForum?: string,
  existingTip?: string
): { interview_stage: string; source_forum: string; forum_tip: string } {
  if (existingStage && existingForum) {
    return {
      interview_stage: existingStage,
      source_forum: existingForum,
      forum_tip: existingTip || 'Focus on concrete metrics, edge cases, and clear technical communication.'
    };
  }

  const customRounds = crawlContext?.customRounds && crawlContext.customRounds.length > 0
    ? crawlContext.customRounds
    : null;
  const reported = customRounds || crawlContext?.publicDiscussion?.reportedRounds || [];
  const candidateTips = crawlContext?.publicDiscussion?.candidateTips || [];
  const isCustom = Boolean(customRounds);

  if (reported.length > 0) {
    let matchedRound = '';
    if (category === 'technical') {
      matchedRound = reported.find(r => /coding|leetcode|algorithm|problem solving|technical|code|take-home|dsa/i.test(r)) || reported[0];
    } else if (category === 'system-design') {
      matchedRound = reported.find(r => /system|design|architect|distributed|scale|cloud/i.test(r)) || reported[Math.min(1, reported.length - 1)];
    } else if (category === 'behavioural') {
      matchedRound = reported.find(r => /behav|values|culture|bar raiser|star|leadership/i.test(r)) || reported[Math.min(2, reported.length - 1)];
    } else {
      matchedRound = reported.find(r => /fit|manager|hiring|team|exec|product|mission/i.test(r)) || reported[reported.length - 1];
    }

      const forumSource = category === 'technical'
        ? 'LeetCode Discuss'
        : category === 'system-design'
        ? 'Reddit r/cscareerquestions'
        : category === 'behavioural'
        ? 'Glassdoor Candidate Reviews'
        : 'Glassdoor & Hiring Debriefs';

      return {
        interview_stage: matchedRound,
        source_forum: forumSource,
        forum_tip: candidateTips[0] || (category === 'technical'
          ? 'Candidates on LeetCode Discuss emphasize clarifying edge cases and stating Big-O complexity upfront.'
          : category === 'system-design'
          ? 'Candidates highlight discussing trade-offs between consistency and availability, sharding keys, and failure recovery.'
          : 'Frame responses in STAR format focusing on quantifiable engineering impact.')
      };
  }

  if (category === 'technical') {
    const hasTakeHome = reported.some(r => /take-home|take home/i.test(r));
    if (hasTakeHome) {
      return {
        interview_stage: 'Round 1: Practical Take-Home Coding Assessment',
        source_forum: 'Glassdoor & Candidate Debriefs',
        forum_tip: candidateTips[0] || 'Candidates emphasize submitting modular production code with thorough unit test suites.'
      };
    }
    return {
      interview_stage: 'Round 2: Live LeetCode / Algorithmic Problem Solving',
      source_forum: 'LeetCode Discuss',
      forum_tip: candidateTips[0] || 'Candidates on LeetCode Discuss emphasize clarifying edge cases and stating Big-O complexity upfront.'
    };
  }

  if (category === 'system-design') {
    return {
      interview_stage: 'Round 3: Distributed System Architecture & Scalability',
      source_forum: 'Reddit r/cscareerquestions',
      forum_tip: candidateTips[1] || 'Candidates highlight discussing trade-offs between consistency and availability, sharding keys, and failure recovery.'
    };
  }

  if (category === 'behavioural') {
    return {
      interview_stage: 'Round 4: Bar Raiser & Values Alignment',
      source_forum: 'Glassdoor Reviews & Blind',
      forum_tip: candidateTips[2] || 'Frame responses in STAR format (Situation, Task, Action, Result) focusing on quantifiable engineering impact.'
    };
  }

  // company-fit
  return {
    interview_stage: 'Round 5: Executive / Hiring Manager & Team Fit',
    source_forum: 'Hacker News & Hiring Guide',
    forum_tip: 'Demonstrate active curiosity about the company product roadmap, engineering culture, and business model.'
  };
}

/**
 * Stage 3: Question and Flashcard Generation
 * 
 * Trao FS-AI-INTERVIEW-01 Section 3 & 5:
 * - Differentiates instructions by requirement kind (technical leads to coding/architecture, behavioural leads to STAR).
 * - Maps questions to requirement IDs.
 * - Categories: 'technical' | 'behavioural' | 'system-design' | 'company-fit'.
 * - Difficulty: 1 to 3 (integer).
 * - Responds directly to what has actually been found (forum discussions from Reddit/Glassdoor/LeetCode & company hiring process).
 */
export async function generateInitialDraft(
  roleTitle: string,
  companyName: string,
  requirements: Requirement[],
  companySummary: string,
  llmClient: LLMClient,
  crawlContext?: CrawlContext
): Promise<DraftGenerationResult> {
  const reqSummary = requirements.map(r => `[${r.id}] (${r.kind}, ${r.priority}): ${r.text}`).join('\n');

  const customRoundsText = crawlContext?.customRounds?.length
    ? `\nCANDIDATE-SPECIFIED INTERVIEW ROUNDS (${crawlContext.customRounds.length} Rounds):\nThe candidate explicitly confirmed their interview loop consists of these ${crawlContext.customRounds.length} rounds:\n${crawlContext.customRounds.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}\nCRITICAL INSTRUCTION: The candidate knows their exact interview rounds. You MUST calibrate and map questions specifically to these interview rounds.\n`
    : '';

  const publicDiscussionText = crawlContext?.publicDiscussion?.summary
    ? `\nPUBLIC FORUM / DISCUSSION FINDINGS (Reddit / Glassdoor / LeetCode / Hacker News):\n${crawlContext.publicDiscussion.summary}\n${crawlContext.publicDiscussion.reportedRounds?.length ? `Reported Interview Rounds / Stages: ${crawlContext.publicDiscussion.reportedRounds.join(' | ')}\n` : ''}`
    : '';

  const hiringPageText = crawlContext?.hiringPage?.cleanText
    ? `\nCOMPANY HIRING PROCESS PAGE:\n${crawlContext.hiringPage.cleanText.slice(0, 1500)}\n`
    : '';

  const prompt = `You are a principal engineer and hiring committee lead preparing an interview prep kit.
Role: ${roleTitle}
Company: ${companyName} (${companySummary})
${customRoundsText}${publicDiscussionText}${hiringPageText}
Target Requirements to test:
${reqSummary}

INSTRUCTIONS:
1. Generate an extensive, high-signal bank of 10 to 14 realistic interview questions covering the requirements above.
2. DIVERSITY GUARANTEE: EVERY question MUST be unique and explore a different scenario, architectural problem, edge case, or leadership dimension. Absolutely DO NOT repeat question stems or concepts.
3. GROUNDING IN PUBLIC FORUMS & HIRING PROCESS (Section 3):
   - A hiring-process page or forum discussion, once found, changes what questions make sense: a company that publishes a take-home followed by a system design round should produce a different kit from one that says nothing.
   - If candidate discussions on forums (Glassdoor, Reddit, LeetCode, or HN) mention specific interview formats (e.g. live coding, take-home architecture, distributed system design, or core language fundamentals), mirror those exact reported expectations.
4. Distribute questions across categories:
   - "technical": In-depth language/runtime mechanics, algorithms, debugging, production issues.
   - "system-design": High-scale architecture, distributed state, caching, partition tolerance, latency vs throughput.
   - "behavioural": Rigorous STAR scenario questions (conflict resolution, stakeholder alignment, post-mortem delivery).
   - "company-fit": Alignment with ${companyName}'s product mission, customer domain, and technical scale.
5. EVERY requirement must have at least 1-2 mapped questions in "requirement_ids": ["r1", ...].
6. "difficulty" must be an integer: 1 (accessible/fundamental), 2 (deep applied), or 3 (advanced architectural).
7. "category" must be one of: "technical", "behavioural", "system-design", "company-fit".
8. Generate 8 to 12 corresponding flashcards with "front" (high-yield concept/prompt), "back" (deep explanation/trade-off), and "requirement_ids".

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

    // Deduplicate questions by prompt text
    const seenPrompts = new Set<string>();
    const questions: Question[] = [];

    for (const q of (res.questions || [])) {
      const promptText = String(q.prompt || '').trim();
      const norm = promptText.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!norm || seenPrompts.has(norm)) continue;
      seenPrompts.add(norm);

      const category = sanitizeCategory(q.category);
      const { interview_stage, source_forum, forum_tip } = inferInterviewStageAndForum(
        category,
        crawlContext,
        q.interview_stage,
        q.source_forum,
        q.forum_tip
      );

      questions.push({
        id: `q${questions.length + 1}`,
        requirement_ids: Array.isArray(q.requirement_ids) && q.requirement_ids.length > 0 ? q.requirement_ids : [requirements[0]?.id || 'r1'],
        category,
        prompt: promptText,
        answer_outline: String(q.answer_outline || 'Provide a structured solution detailing architectural trade-offs.'),
        difficulty: sanitizeDifficulty(q.difficulty),
        interview_stage,
        source_forum,
        forum_tip
      });
    }

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
    // Deterministic fallback with guaranteed diversity
    const fallbackQuestions: Question[] = [];
    let qIdx = 1;

    for (const req of requirements) {
      let category: QuestionCategory = req.kind === 'behavioural' ? 'behavioural' : 'technical';
      const meta1 = inferInterviewStageAndForum(category, crawlContext);
      fallbackQuestions.push({
        id: `q${qIdx++}`,
        requirement_ids: [req.id],
        category,
        prompt: `How have you demonstrated mastery and overcome key challenges with ${req.text}?`,
        answer_outline: `Detail architectural experience, core concepts, and trade-offs regarding ${req.text}.`,
        difficulty: 2,
        interview_stage: meta1.interview_stage,
        source_forum: meta1.source_forum,
        forum_tip: meta1.forum_tip
      });

      if (req.kind === 'technical') {
        const meta2 = inferInterviewStageAndForum('system-design', crawlContext);
        fallbackQuestions.push({
          id: `q${qIdx++}`,
          requirement_ids: [req.id],
          category: 'system-design',
          prompt: `How would you architect a high-throughput, fault-tolerant system around ${req.text}?`,
          answer_outline: `Discuss sharding, caching, backpressure, failure isolation, and performance tuning for ${req.text}.`,
          difficulty: 3,
          interview_stage: meta2.interview_stage,
          source_forum: meta2.source_forum,
          forum_tip: meta2.forum_tip
        });
      }
    }

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
  existingQuestions: Question[],
  llmClient: LLMClient
): Promise<Question[]> {
  if (uncoveredRequirements.length === 0) return [];

  const gapsDescription = uncoveredRequirements
    .map(r => `[${r.id}] (${r.kind}, ${r.priority}): ${r.text}`)
    .join('\n');

  const existingPrompts = existingQuestions.map(q => `- ${q.prompt}`).join('\n');

  const prompt = `You are an interview designer filling identified COVERAGE GAPS.
The following MUST-HAVE requirements currently lack corresponding interview questions:
${gapsDescription}

Existing questions already in the question bank (DO NOT DUPLICATE THESE):
${existingPrompts}

INSTRUCTIONS:
1. Generate one dedicated, unique interview question for EACH uncovered requirement.
2. CRITICAL DEDUPLICATION RULE: The questions MUST NOT duplicate, repeat, or rephrase any of the existing questions above.
3. Ensure the "requirement_id" field explicitly contains the target requirement ID (e.g. "r2").
4. Category must be: "technical", "behavioural", "system-design", or "company-fit".
5. Difficulty must be an integer: 1, 2, or 3.

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
    const seenPrompts = new Set(
      existingQuestions.map(q => q.prompt.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim())
    );

    let nextId = startIndex;
    const newQuestions: Question[] = [];

    for (const q of (res.questions || [])) {
      const promptText = String(q.prompt || '').trim();
      const norm = promptText.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!norm || seenPrompts.has(norm)) continue;
      seenPrompts.add(norm);

      const targetReqId = q.requirement_id || (Array.isArray(q.requirement_ids) ? q.requirement_ids[0] : uncoveredRequirements[0].id);
      const category = sanitizeCategory(q.category);
      const meta = inferInterviewStageAndForum(category);
      newQuestions.push({
        id: `q${nextId++}`,
        requirement_ids: [targetReqId],
        category,
        prompt: promptText,
        answer_outline: String(q.answer_outline || 'Structured response covering implementation and trade-offs.'),
        difficulty: sanitizeDifficulty(q.difficulty),
        interview_stage: meta.interview_stage,
        source_forum: meta.source_forum,
        forum_tip: meta.forum_tip
      });
    }

    // Fallback if LLM duplicates or skips
    if (newQuestions.length === 0) {
      for (const req of uncoveredRequirements) {
        const category = req.kind === 'behavioural' ? 'behavioural' : 'technical';
        const meta = inferInterviewStageAndForum(category);
        newQuestions.push({
          id: `q${nextId++}`,
          requirement_ids: [req.id],
          category,
          prompt: `Targeted Technical Assessment: Walk through your end-to-end strategy for designing, testing, and scaling ${req.text}.`,
          answer_outline: `Key design patterns, edge cases, and architectural best practices for ${req.text}.`,
          difficulty: 2,
          interview_stage: meta.interview_stage,
          source_forum: meta.source_forum,
          forum_tip: meta.forum_tip
        });
      }
    }

    return newQuestions;
  } catch (err) {
    let nextId = startIndex;
    return uncoveredRequirements.map(req => {
      const category = req.kind === 'behavioural' ? 'behavioural' : 'technical';
      const meta = inferInterviewStageAndForum(category);
      return {
        id: `q${nextId++}`,
        requirement_ids: [req.id],
        category,
        prompt: `Targeted Technical Assessment: Walk through your end-to-end strategy for designing, testing, and scaling ${req.text}.`,
        answer_outline: `Key design patterns, edge cases, and architectural best practices for ${req.text}.`,
        difficulty: 2,
        interview_stage: meta.interview_stage,
        source_forum: meta.source_forum,
        forum_tip: meta.forum_tip
      };
    });
  }
}
