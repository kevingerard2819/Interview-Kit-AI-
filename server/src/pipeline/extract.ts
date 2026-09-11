import { RoleInfo, Requirement } from '../../../shared/types';
import { LLMClient } from '../llm/client';

/**
 * Stage 1: Requirement Extraction from Job Description
 * 
 * Trao FS-AI-INTERVIEW-01 Section 3 & 10:
 * - Extract relevant requirements from JD.
 * - Distinguish must vs nice-to-have ("A 'required' line and a 'bonus points for' line are not the same thing").
 * - Assign kind: 'technical' | 'behavioural' | 'domain'.
 * - Stable IDs: r1, r2, ...
 * - For thin / two-line stubs: DO NOT invent requirements. Produce an honest reflection of what is actually present.
 */
export async function extractRequirementsFromJD(
  jdText: string,
  llmClient: LLMClient
): Promise<RoleInfo> {
  const jdTrimmed = (jdText || '').trim();
  const isThinJd = jdTrimmed.length < 200 || jdTrimmed.split('\n').filter(l => l.trim().length > 0).length <= 3;

  const prompt = `You are an expert technical hiring analyst.
Extract role information and structured requirements from the job description below.

CRITICAL INSTRUCTIONS:
1. Every requirement must be classified into kind: "technical", "behavioural", or "domain".
2. Every requirement must be classified into priority: "must" (core / mandatory / required qualifications) or "nice" (preferred, bonus points, nice-to-have).
3. Assign a sequential, stable id: "r1", "r2", "r3", etc.
4. HONESTY RULE: Do NOT hallucinate or invent requirements. If the job description is short, vague, or only two lines, extract ONLY what is explicitly stated or directly implied. A thin job description MUST produce a concise list.

Job Description:
"""
${jdTrimmed}
"""

${isThinJd ? 'NOTE: This is a very brief/stub posting. Extract only what is present; do NOT fabricate unlisted skills.' : ''}

Respond with a JSON object in this exact schema:
{
  "title": "Role title (e.g. Senior Backend Engineer)",
  "seniority": "e.g. Senior, Mid-Level, Junior, Lead",
  "responsibilities": ["Array of core responsibilities extracted from text"],
  "requirements": [
    {
      "id": "r1",
      "text": "Specific requirement text",
      "kind": "technical", // "technical" | "behavioural" | "domain"
      "priority": "must"   // "must" | "nice"
    }
  ]
}`;

  try {
    const parsed = await llmClient.generateJson<RoleInfo>(prompt);

    // Sanitize and ensure stable IDs & exact types
    const requirements: Requirement[] = (parsed.requirements || []).map((req, index) => {
      const allowedKinds = ['technical', 'behavioural', 'domain'];
      const allowedPriorities = ['must', 'nice'];
      const kind = allowedKinds.includes(req.kind) ? req.kind : 'technical';
      const priority = allowedPriorities.includes(req.priority) ? req.priority : 'must';

      return {
        id: `r${index + 1}`,
        text: String(req.text || '').trim(),
        kind: kind as any,
        priority: priority as any
      };
    });

    // Fallback if none extracted (e.g., extremely obscure 1-liner)
    if (requirements.length === 0) {
      requirements.push({
        id: 'r1',
        text: jdTrimmed || 'General software engineering responsibilities',
        kind: 'technical',
        priority: 'must'
      });
    }

    return {
      title: parsed.title || 'Software Engineer',
      seniority: parsed.seniority || 'Mid-Level',
      responsibilities: Array.isArray(parsed.responsibilities) && parsed.responsibilities.length > 0
        ? parsed.responsibilities
        : ['Execute software engineering and development duties.'],
      requirements
    };
  } catch (err) {
    console.warn('[Extraction] Error parsing LLM response, using fallback extraction:', err);
    return {
      title: 'Software Engineer',
      seniority: 'Mid-Level',
      responsibilities: ['Deliver software solutions and maintain codebase.'],
      requirements: [
        {
          id: 'r1',
          text: jdTrimmed.slice(0, 100) || 'Core role requirements',
          kind: 'technical',
          priority: 'must'
        }
      ]
    };
  }
}
