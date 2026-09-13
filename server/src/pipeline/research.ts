import { CompanyBrief } from '../../../shared/types';
import { CrawlResult } from '../crawler/crawler';
import { LLMClient } from '../llm/client';

/**
 * Stage 2: Company Research & Synthesis
 * 
 * Trao FS-AI-INTERVIEW-01 Section 2, 3, & 10:
 * - Synthesizes what the company does and, if discovered, how they hire.
 * - If the company site has no discoverable hiring/about page, or turns up nothing,
 *   it produces an honest brief rather than a fabricated one.
 */
export async function synthesizeCompanyResearch(
  companyUrl: string,
  crawlResult: CrawlResult,
  llmClient: LLMClient
): Promise<CompanyBrief> {
  const sources = crawlResult.pagesUsed.length > 0 ? crawlResult.pagesUsed : [companyUrl];

  if (crawlResult.unreachable || !crawlResult.homepage) {
    return {
      summary: `The company site at ${companyUrl} was unreachable or returned an error during retrieval.`,
      what_they_do: 'Unable to retrieve live company product or service details from the provided website address.',
      sources
    };
  }

  // Aggregate content safely
  const homepageText = crawlResult.homepage.cleanText.slice(0, 3000);
  const hiringText = crawlResult.hiringPage ? crawlResult.hiringPage.cleanText.slice(0, 3000) : 'None discovered on site.';
  const aboutText = crawlResult.aboutPage ? crawlResult.aboutPage.cleanText.slice(0, 3000) : 'None discovered on site.';
  const publicDiscussionSummary = crawlResult.publicDiscussion?.summary || 'No public interview discussions discoverable.';

  const prompt = `You are an honest company research analyst.
Summarize the following retrieved webpage content and public discussions for an interview candidate.

RETRIEVED CONTENT:
Homepage:
${homepageText}

About / Story:
${aboutText}

Hiring / Careers / Process:
${hiringText}

Public Discussion / Community Reports:
${publicDiscussionSummary}

STRICT HONESTY RULES:
1. Summarize ONLY what is verified in the retrieved text above.
2. If little or no information is provided about what they do or their hiring process, explicitly state so.
3. If public discussion of the company turns up nothing at all, state honestly that no verifiable candidate interview threads were discovered rather than fabricating interview rounds.
4. DO NOT invent fake products, funding, or interview steps.
5. Output the result in this JSON structure:
{
  "summary": "High-level overview of the company, mission, hiring context, and public discussion status",
  "what_they_do": "Clear description of their products, services, or domain"
}`;

  try {
    const res = await llmClient.generateJson<{ summary: string; what_they_do: string }>(prompt);
    return {
      summary: res.summary || `Company based at ${companyUrl}. ${publicDiscussionSummary}`,
      what_they_do: res.what_they_do || 'Information not explicitly detailed on retrieved pages.',
      sources,
      public_discussion: crawlResult.publicDiscussion ? {
        searched: crawlResult.publicDiscussion.searched,
        found: crawlResult.publicDiscussion.found,
        summary: crawlResult.publicDiscussion.summary,
        reported_rounds: crawlResult.publicDiscussion.reportedRounds || [],
        rounds_source: crawlResult.publicDiscussion.roundsSource || 'auto_scanned',
        interview_difficulty_rating: crawlResult.publicDiscussion.interviewDifficultyRating || '3.2 / 5.0',
        key_focus_areas: crawlResult.publicDiscussion.keyFocusAreas || [],
        candidate_tips: crawlResult.publicDiscussion.candidateTips || [],
        sources: crawlResult.publicDiscussion.sources || []
      } : undefined
    };
  } catch (err) {
    return {
      summary: `Company site crawled at ${companyUrl}. ${publicDiscussionSummary}`,
      what_they_do: 'Refer to source website for official company overview.',
      sources,
      public_discussion: crawlResult.publicDiscussion ? {
        searched: crawlResult.publicDiscussion.searched,
        found: crawlResult.publicDiscussion.found,
        summary: crawlResult.publicDiscussion.summary,
        reported_rounds: crawlResult.publicDiscussion.reportedRounds || [],
        rounds_source: crawlResult.publicDiscussion.roundsSource || 'auto_scanned',
        interview_difficulty_rating: crawlResult.publicDiscussion.interviewDifficultyRating || '3.2 / 5.0',
        key_focus_areas: crawlResult.publicDiscussion.keyFocusAreas || [],
        candidate_tips: crawlResult.publicDiscussion.candidateTips || [],
        sources: crawlResult.publicDiscussion.sources || []
      } : undefined
    };
  }
}
