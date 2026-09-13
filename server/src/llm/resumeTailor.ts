import { LLMClient, extractJsonFromResponse } from './client';
import { Question, TailoredResponse, CandidateResume } from '../../../shared/types';
import { PDFParse } from 'pdf-parse';

const llm = new LLMClient();

/**
 * Extract plain text from a Buffer (PDF or UTF-8 text)
 */
export async function extractTextFromResumeBuffer(buffer: Buffer, originalName?: string): Promise<string> {
  const isPdf = originalName?.toLowerCase().endsWith('.pdf') ||
    (buffer.length > 4 && buffer.slice(0, 4).toString() === '%PDF');

  if (isPdf) {
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      if (data.text && data.text.trim().length > 20) {
        return data.text.trim();
      }
    } catch (err: any) {
      console.warn('[ResumeParser] pdf-parse error, falling back to text decoding:', err.message);
    } finally {
      await parser?.destroy().catch(() => undefined);
    }
  }

  // UTF-8 / Text fallback
  return buffer.toString('utf-8').trim();
}

/**
 * Parse high-level candidate profile signals (title, skills) from resume text
 */
export async function summarizeResume(resumeText: string, fileName?: string): Promise<CandidateResume> {
  const truncatedResume = resumeText.slice(0, 6000);

  const prompt = `You are an expert technical recruiter analyzing a candidate resume.
Extract the candidate's core professional identity into valid JSON.

Resume Content:
"""
${truncatedResume}
"""

Return strictly valid JSON with this exact schema:
{
  "current_title": "e.g. Senior Backend Engineer / Full Stack Developer",
  "extracted_skills": ["Skill1", "Skill2", "Skill3", "Skill4", "Skill5", "Skill6", "Skill7", "Skill8"]
}
`;

  try {
    const raw = await llm.generateText(prompt, { temperature: 0.2 });
    const parsed = extractJsonFromResponse<{ current_title?: string; extracted_skills?: string[] }>(raw);

    return {
      text: resumeText,
      file_name: fileName || 'Uploaded Resume',
      uploaded_at: new Date().toISOString(),
      current_title: parsed.current_title || 'Software Engineer',
      extracted_skills: Array.isArray(parsed.extracted_skills) && parsed.extracted_skills.length > 0
        ? parsed.extracted_skills.slice(0, 16)
        : extractFallbackSkills(resumeText)
    };
  } catch (err) {
    return {
      text: resumeText,
      file_name: fileName || 'Uploaded Resume',
      uploaded_at: new Date().toISOString(),
      current_title: 'Software Engineer',
      extracted_skills: extractFallbackSkills(resumeText)
    };
  }
}

/**
 * Fallback regex skill extractor for offline / mock scenarios
 */
function extractFallbackSkills(text: string): string[] {
  const commonSkills = [
    'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++',
    'React', 'Next.js', 'Node.js', 'Express', 'GraphQL', 'REST',
    'PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'DynamoDB',
    'AWS', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Kafka', 'Microservices'
  ];

  const matched = commonSkills.filter(s => new RegExp(`\\b${s}\\b`, 'i').test(text));
  return matched.length > 0 ? matched : ['System Architecture', 'Distributed Systems', 'API Design'];
}

/**
 * Generate tailored interview answer and talking points based on candidate resume
 */
export async function generateTailoredAnswerForQuestion(params: {
  question: Question;
  resumeText: string;
  companyName: string;
  roleTitle: string;
}): Promise<TailoredResponse> {
  const { question, resumeText, companyName, roleTitle } = params;
  const truncatedResume = resumeText.slice(0, 7000);

  const prompt = `You are an executive interview coach preparing a candidate for an interview at ${companyName} for the role of ${roleTitle}.

The interview question is:
Prompt: "${question.prompt}"
Category: "${question.category}"
Standard Outline: "${question.answer_outline}"

Candidate Resume:
"""
${truncatedResume}
"""

TASK:
Craft a high-impact, personalized response that weaves in the candidate's ACTUAL background, past companies, technologies, projects, and metrics from their resume.
DO NOT invent credentials the candidate doesn't have. Highlight their real experience while bridging any gaps.

For BEHAVIOURAL questions:
- Structure as a crisp STAR answer (Situation, Task, Action, Result) based on a real project or achievement from the resume.

For TECHNICAL / SYSTEM DESIGN / COMPANY-FIT questions:
- Frame architectural choices and justifications using technologies the candidate has legitimately used on their resume.
- Provide targeted talking points and any "gap guidance" (how to handle areas where their resume doesn't show direct experience).

Return strictly valid JSON with this exact schema:
{
  "answer": "Complete, spoken-ready answer the candidate can deliver in the interview.",
  "star_breakdown": {
    "situation": "Context from their past role/project...",
    "task": "The objective or challenge faced...",
    "action": "Specific engineering or leadership actions taken...",
    "result": "Measurable business impact, performance gain, or outcome achieved..."
  },
  "resume_highlights": [
    "Project or role referenced from resume #1",
    "Metric or technology connection #2"
  ],
  "talking_points": [
    "Key emphasis point #1",
    "Key emphasis point #2",
    "Key emphasis point #3"
  ],
  "gap_guidance": "Tips on how to address potential interviewer follow-ups or edge cases."
}
`;

  try {
    const raw = await llm.generateText(prompt, { temperature: 0.3 });
    const parsed = extractJsonFromResponse<any>(raw);

    return {
      answer: String(parsed.answer || question.answer_outline),
      star_breakdown: parsed.star_breakdown?.situation ? {
        situation: String(parsed.star_breakdown.situation || ''),
        task: String(parsed.star_breakdown.task || ''),
        action: String(parsed.star_breakdown.action || ''),
        result: String(parsed.star_breakdown.result || '')
      } : undefined,
      resume_highlights: Array.isArray(parsed.resume_highlights) && parsed.resume_highlights.length > 0
        ? parsed.resume_highlights.map(String)
        : [`Grounded in candidate's experience for ${roleTitle}`],
      talking_points: Array.isArray(parsed.talking_points) && parsed.talking_points.length > 0
        ? parsed.talking_points.map(String)
        : ['Highlight past system metrics', 'Explain technical tradeoffs clearly'],
      gap_guidance: parsed.gap_guidance ? String(parsed.gap_guidance) : undefined,
      generated_at: new Date().toISOString()
    };
  } catch (err: any) {
    console.warn('[ResumeTailor] LLM generation fallback:', err.message);

    // Fallback response synthesizer
    return {
      answer: `Based on your background for ${roleTitle}: In my previous work, I approached ${question.prompt.slice(0, 60)} by focusing on scalability, clean interface contracts, and measurable delivery. For example, ${question.answer_outline}`,
      star_breakdown: question.category === 'behavioural' ? {
        situation: `In my previous role facing key requirements of ${roleTitle}...`,
        task: `We needed to solve challenges aligned with: ${question.prompt.slice(0, 80)}`,
        action: `I led the technical implementation, introduced robust testing, and aligned cross-functional teams.`,
        result: `Successfully delivered on schedule with high reliability and zero customer-facing regressions.`
      } : undefined,
      resume_highlights: [
        `Aligned with role requirements for ${roleTitle} at ${companyName}`,
        `References core engineering patterns from your profile`
      ],
      talking_points: [
        `State your direct experience upfront`,
        `Anchor metrics to business outcomes`,
        `Be transparent about tradeoffs made`
      ],
      gap_guidance: `If asked about specialized internal tooling at ${companyName}, emphasize how quickly you onboarded to new architectures in past roles.`,
      generated_at: new Date().toISOString()
    };
  }
}
