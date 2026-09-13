import { Kit, BatchCaseInput, Question } from '../../../shared/types';
import { crawlCompanySite } from '../crawler/crawler';
import { extractRequirementsFromJD } from './extract';
import { synthesizeCompanyResearch } from './research';
import { generateInitialDraft, generateGapQuestions } from './generate';
import { checkCoverage, buildCoverageObject } from './coverage';
import { allocateSchedule } from './schedule';
import { validateKitStructure } from './validator';
import { LLMClient, defaultLLMClient } from '../llm/client';

export type PipelineStage = 
  | 'crawling' 
  | 'extracting' 
  | 'researching' 
  | 'generating_draft' 
  | 'coverage_check' 
  | 'second_pass' 
  | 'scheduling' 
  | 'validating' 
  | 'completed';

export interface PipelineProgress {
  stage: PipelineStage;
  message: string;
  progressPercent: number;
}

export interface PipelineOptions {
  llmClient?: LLMClient;
  maxPasses?: number;
  onProgress?: (progress: PipelineProgress) => void;
}

/**
 * Executes the complete AI Interview Prep Kit generation pipeline.
 * Shared between the web API and the batch evaluation CLI.
 */
export async function runPrepKitPipeline(
  input: {
    jd: string;
    company_url: string;
    days: number;
    custom_rounds?: string[];
  },
  options: PipelineOptions = {}
): Promise<Kit> {
  const llm = options.llmClient || defaultLLMClient;
  const maxPasses = options.maxPasses || 3;
  const notify = (stage: PipelineStage, message: string, progressPercent: number) => {
    if (options.onProgress) {
      options.onProgress({ stage, message, progressPercent });
    }
  };

  const researchedAt = new Date().toISOString();
  const jdChars = (input.jd || '').length;

  const rawCustomRounds = Array.isArray(input.custom_rounds) ? input.custom_rounds : [];
  const formattedCustomRounds = rawCustomRounds
    .map(r => String(r || '').trim())
    .filter(r => r.length > 0)
    .map((r, i) => /^round\s*\d+/i.test(r) ? r : `Round ${i + 1}: ${r}`);

  const hasCustomRounds = formattedCustomRounds.length > 0;

  // Step 1 & 2: Crawl company website & extract requirements concurrently
  notify('crawling', `Researching ${input.company_url} and analyzing job requirements...`, 25);
  const [crawlResult, roleInfo] = await Promise.all([
    crawlCompanySite(input.company_url),
    extractRequirementsFromJD(input.jd, llm)
  ]);

  // Infer company name from title, url, or fallback
  let inferredCompanyName = 'Company';
  if (crawlResult.homepage?.title) {
    inferredCompanyName = crawlResult.homepage.title.split(/[-–|]/)[0].trim() || 'Company';
  } else {
    try {
      const parsed = new URL(input.company_url.startsWith('http') ? input.company_url : `https://${input.company_url}`);
      inferredCompanyName = parsed.hostname.replace(/^www\./, '').split('.')[0];
      inferredCompanyName = inferredCompanyName.charAt(0).toUpperCase() + inferredCompanyName.slice(1);
    } catch {
      inferredCompanyName = 'Target Organization';
    }
  }

  // Step 3: Synthesize company research
  notify('researching', 'Synthesizing company brief and hiring practices...', 45);
  const companyBrief = await synthesizeCompanyResearch(input.company_url, crawlResult, llm);

  if (hasCustomRounds) {
    companyBrief.public_discussion = {
      searched: true,
      found: true,
      rounds_source: 'user_specified',
      reported_rounds: formattedCustomRounds,
      summary: `Candidate configured a tailored ${formattedCustomRounds.length}-round interview loop: ${formattedCustomRounds.join(', ')}. Question bank, preparation sequence, and study schedule are directly calibrated to these stages.`,
      interview_difficulty_rating: companyBrief.public_discussion?.interview_difficulty_rating || '3.5 / 5.0 (Custom Candidate Loop)',
      key_focus_areas: companyBrief.public_discussion?.key_focus_areas || ['Targeted Round Mastery', 'Core Problem Solving', 'STAR Behavioral Alignment'],
      candidate_tips: companyBrief.public_discussion?.candidate_tips || [
        'Focus preparation according to your configured interview sequence.',
        'Practice live coding and system design under realistic time constraints.'
      ],
      sources: companyBrief.public_discussion?.sources || [input.company_url]
    };
  } else if (companyBrief.public_discussion) {
    companyBrief.public_discussion.rounds_source = 'auto_scanned';
  }

  // Step 4: Generate initial draft questions and flashcards
  notify('generating_draft', 'Generating initial question bank and study flashcards...', 60);
  const draft = await generateInitialDraft(
    roleInfo.title,
    inferredCompanyName,
    roleInfo.requirements,
    companyBrief.summary,
    llm,
    {
      ...crawlResult,
      customRounds: hasCustomRounds ? formattedCustomRounds : undefined
    }
  );

  let currentQuestions = [...draft.questions];
  let passes = 1;

  // Step 5 & 6: Deterministic Coverage Check and Second Pass Loop
  notify('coverage_check', 'Checking requirement coverage across question bank...', 75);
  let coverageResult = checkCoverage(roleInfo.requirements, currentQuestions);

  while (!coverageResult.isFullyCovered && passes < maxPasses) {
    passes++;
    notify('second_pass', `Coverage pass ${passes}: Generating targeted questions for ${coverageResult.uncoveredMustHaveIds.length} uncovered must-have requirement(s)...`, 80);

    const missingReqs = roleInfo.requirements.filter(r => 
      coverageResult.uncoveredMustHaveIds.includes(r.id)
    );

    const gapQuestions = await generateGapQuestions(
      roleInfo.title,
      missingReqs,
      currentQuestions.length + 1,
      currentQuestions,
      llm
    );

    currentQuestions = [...currentQuestions, ...gapQuestions];
    coverageResult = checkCoverage(roleInfo.requirements, currentQuestions);
  }

  // Deduplicate any repeated questions (by prompt text similarity) and re-index IDs cleanly
  const uniqueQuestions: Question[] = [];
  const seenTexts = new Set<string>();

  for (const q of currentQuestions) {
    const key = q.prompt.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      uniqueQuestions.push({
        ...q,
        id: `q${uniqueQuestions.length + 1}`
      });
    }
  }
  currentQuestions = uniqueQuestions;

  const coverage = buildCoverageObject(roleInfo.requirements, currentQuestions, passes);

  // Step 7: Deterministic Arithmetic Schedule Allocation
  notify('scheduling', `Distributing study topics and allocating questions across ${input.days} days...`, 90);
  const schedule = allocateSchedule(input.days, roleInfo.requirements, currentQuestions);

  // Construct Appendix A Kit
  const kit: Kit = {
    source: {
      company: inferredCompanyName,
      company_url: input.company_url,
      role: roleInfo.title,
      location: 'Remote / Unspecified',
      jd_chars: jdChars,
      researched_at: researchedAt,
      pages_used: crawlResult.pagesUsed.length > 0 ? crawlResult.pagesUsed : [input.company_url]
    },
    company_brief: companyBrief,
    role: roleInfo,
    questions: currentQuestions,
    flashcards: draft.flashcards,
    schedule,
    coverage
  };

  // Step 8: Schema Validation
  notify('validating', 'Validating kit conformance against Appendix A schema...', 98);
  const validation = validateKitStructure(kit);
  if (!validation.valid) {
    console.warn('[Validation] Kit had schema warnings:', validation.errors);
  }

  notify('completed', 'Interview prep kit generation complete!', 100);
  return kit;
}
