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

  const prompt = `You are an honest company research analyst.
Summarize the following retrieved webpage content for an interview candidate.

RETRIEVED CONTENT:
Homepage:
${homepageText}

About / Story:
${aboutText}

Hiring / Careers / Process:
${hiringText}

STRICT HONESTY RULES:
1. Summarize ONLY what is verified in the retrieved text above.
2. If little or no information is provided about what they do or their hiring process, explicitly state so. DO NOT invent fake products, funding, or interview steps.
3. Output the result in this JSON structure:
{
  "summary": "High-level overview of the company, mission, and hiring context",
  "what_they_do": "Clear description of their products, services, or domain"
}`;

  try {
    const res = await llmClient.generateJson<{ summary: string; what_they_do: string }>(prompt);
    return {
      summary: res.summary || `Company based at ${companyUrl}`,
      what_they_do: res.what_they_do || 'Information not explicitly detailed on retrieved pages.',
      sources
    };
  } catch (err) {
    return {
      summary: `Company site crawled at ${companyUrl}`,
      what_they_do: 'Refer to source website for official company overview.',
      sources
    };
  }
}
