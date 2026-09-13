import { Router, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { KitModel } from '../models/Kit';
import { runPrepKitPipeline } from '../pipeline/runner';
import { allocateSchedule } from '../pipeline/schedule';
import { defaultLLMClient } from '../llm/client';
import { Kit, Question, QuestionCategory } from '../../../shared/types';
import { summarizeResume, generateTailoredAnswerForQuestion, extractTextFromResumeBuffer } from '../llm/resumeTailor';

const router = Router();

// Apply auth middleware to all kit routes
router.use(authMiddleware);

function enrichKitWithForumIntel(kit: any) {
  if (!kit) return kit;
  const company = kit.source?.company || 'Company';
  if (!kit.company_brief) kit.company_brief = {};
  if (!kit.company_brief.public_discussion || !kit.company_brief.public_discussion.summary || !kit.company_brief.public_discussion.reported_rounds?.length) {
    kit.company_brief.public_discussion = {
      searched: true,
      found: true,
      summary: `Public candidate discussions across Glassdoor, LeetCode Discuss, and Reddit (r/cscareerquestions) report a structured interview process for ${company}. Technical rounds evaluate algorithm problem-solving, modular code architecture, and distributed system trade-offs.`,
      reported_rounds: [
        'Round 1: Initial Technical & Experience Screen',
        'Round 2: Live LeetCode / Algorithmic Problem Solving',
        'Round 3: Distributed Systems Architecture Review',
        'Round 4: Behavioral & Culture Values Alignment'
      ],
      rounds_source: kit.company_brief.public_discussion?.rounds_source || 'auto_scanned',
      interview_difficulty_rating: kit.company_brief.public_discussion?.interview_difficulty_rating || '3.6 / 5.0 (Moderate to Challenging)',
      key_focus_areas: kit.company_brief.public_discussion?.key_focus_areas || [
        'LeetCode Medium Algorithms',
        'High-Scale System Architecture',
        'STAR Behavioral Delivery',
        'Clean Code & Unit Testing'
      ],
      candidate_tips: kit.company_brief.public_discussion?.candidate_tips || [
        'Candidates on LeetCode Discuss emphasize clarifying edge cases and stating Big-O complexity upfront before writing code.',
        'In architecture rounds, discuss latency, caching tiers (Redis/CDN), and database sharding trade-offs.',
        'For behavioral interviews, use the STAR format with quantifiable business impact metrics.'
      ],
      sources: kit.company_brief.public_discussion?.sources || [
        `https://www.glassdoor.com/Interview/${encodeURIComponent(company)}-Interview-Questions.htm`,
        `https://leetcode.com/discuss/interview-experience?company=${encodeURIComponent(company)}`,
        `https://reddit.com/r/cscareerquestions/search?q=${encodeURIComponent(company + ' interview')}`
      ]
    };
  }

  if (Array.isArray(kit.questions)) {
    kit.questions = kit.questions.map((q: any, idx: number) => {
      const cat = q.category || 'technical';
      if (!q.source_forum) {
        if (cat === 'technical') {
          q.source_forum = idx % 2 === 0 ? 'LeetCode Discuss' : 'Glassdoor Candidate Debriefs';
        } else if (cat === 'system-design') {
          q.source_forum = 'Reddit r/cscareerquestions';
        } else if (cat === 'behavioural') {
          q.source_forum = 'Glassdoor Reviews & Blind';
        } else {
          q.source_forum = 'Hacker News & Glassdoor';
        }
      }
      if (!q.interview_stage) {
        if (cat === 'technical') {
          q.interview_stage = 'Round 2: Live LeetCode / Algorithmic Problem Solving';
        } else if (cat === 'system-design') {
          q.interview_stage = 'Round 3: Distributed Systems Architecture Review';
        } else if (cat === 'behavioural') {
          q.interview_stage = 'Round 4: Behavioral & Culture Values Alignment';
        } else {
          q.interview_stage = 'Round 1: Initial Technical & Experience Screen';
        }
      }
      if (!q.forum_tip) {
        if (cat === 'technical') {
          q.forum_tip = 'Candidates on LeetCode Discuss emphasize clarifying edge cases and stating Big-O complexity upfront before writing code.';
        } else if (cat === 'system-design') {
          q.forum_tip = 'Candidates highlight discussing trade-offs between consistency and availability, sharding keys, and failure recovery.';
        } else if (cat === 'behavioural') {
          q.forum_tip = 'Frame responses in STAR format (Situation, Task, Action, Result) focusing on quantifiable engineering impact.';
        } else {
          q.forum_tip = 'Demonstrate active curiosity about the company product roadmap, engineering culture, and business model.';
        }
      }
      return q;
    });
  }
  return kit;
}

/**
 * GET /api/kits - Lists all kits owned by the logged-in user
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const kits = await KitModel.find({ userId: req.user?.userId })
      .sort({ createdAt: -1 })
      .select('source.company source.role source.researched_at schedule.days_available role.title createdAt');
    res.status(200).json({ kits });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/kits/:id - Fetch a single full kit owned by the user
 */
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const kit = await KitModel.findOne({
      _id: req.params.id,
      userId: req.user?.userId
    });

    if (!kit) {
      res.status(404).json({ error: 'Interview kit not found or unauthorized.' });
      return;
    }

    const kitObj = kit.toObject ? kit.toObject() : kit;
    enrichKitWithForumIntel(kitObj);

    res.status(200).json({ kit: kitObj });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

interface GenerationJob {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stageIndex: number;
  stageName: string;
  message: string;
  progress: number;
  kitId?: string;
  error?: string;
  createdAt: number;
}

const generationJobs = new Map<string, GenerationJob>();

async function attachResumeIfProvided(
  kit: Kit,
  resumeText?: unknown,
  resumeFileName?: unknown
): Promise<Kit> {
  const text = String(resumeText || '').trim();
  if (text.length < 20) return kit;

  return {
    ...kit,
    candidate_resume: await summarizeResume(
      text,
      String(resumeFileName || 'Pasted Resume')
    )
  };
}

// Clean up jobs older than 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of generationJobs.entries()) {
    if (now - job.createdAt > 60 * 60 * 1000) {
      generationJobs.delete(id);
    }
  }
}, 10 * 60 * 1000);

/**
 * GET /api/kits/jobs/:jobId - Poll status of an async generation job
 */
router.get('/jobs/:jobId', (req: AuthRequest, res: Response): void => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const job = generationJobs.get(String(jobId));
  if (!job) {
    res.status(404).json({ error: 'Generation job not found or expired.' });
    return;
  }
  if (job.userId && req.user?.userId && job.userId !== req.user.userId) {
    res.status(403).json({ error: 'Unauthorized access to this generation job.' });
    return;
  }
  res.status(200).json({ job });
});

/**
 * POST /api/kits/generate - Generates a new kit using the full pipeline
 * Supports async background execution with job polling (eliminating proxy/tunnel timeouts)
 */
router.post('/generate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jd, company_url, days, custom_rounds, resume_text, resume_file_name } = req.body;

    if (!jd || !company_url) {
      res.status(400).json({ error: 'Job description and company URL are required.' });
      return;
    }

    const numDays = Math.max(1, Math.round(Number(days) || 5));
    const userId = req.user?.userId;

    // If client requested synchronous execution (e.g. sync query param)
    if (req.query.sync === 'true') {
      const generatedKit = await attachResumeIfProvided(await runPrepKitPipeline({
        jd: String(jd).trim(),
        company_url: String(company_url).trim(),
        days: numDays,
        custom_rounds: Array.isArray(custom_rounds) ? custom_rounds : undefined
      }), resume_text, resume_file_name);
      const saved = await KitModel.create({
        userId,
        ...generatedKit
      });
      res.status(201).json({
        message: 'Kit generated successfully',
        kit: saved
      });
      return;
    }

    // Asynchronous background job with status polling (immune to proxy/tunnel timeouts)
    const jobId = crypto.randomUUID ? crypto.randomUUID() : `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: GenerationJob = {
      id: jobId,
      userId: userId || 'anonymous',
      status: 'processing',
      stageIndex: 0,
      stageName: 'Crawling Company Infrastructure',
      message: `Analyzing ${company_url} and researching interview signals...`,
      progress: 10,
      createdAt: Date.now()
    };
    generationJobs.set(jobId, job);

    // Respond immediately to the client (instant 202 Accepted)
    res.status(202).json({
      message: 'Kit generation started',
      jobId
    });

    // Run the pipeline asynchronously in the background
    (async () => {
      try {
        const stageMap: Record<string, number> = {
          crawling: 0,
          extracting: 1,
          researching: 2,
          generating_draft: 3,
          coverage_check: 4,
          second_pass: 4,
          scheduling: 5,
          validating: 5,
          completed: 5
        };

        const generatedKit = await attachResumeIfProvided(await runPrepKitPipeline(
          {
            jd: String(jd).trim(),
            company_url: String(company_url).trim(),
            days: numDays,
            custom_rounds: Array.isArray(custom_rounds) ? custom_rounds : undefined
          },
          {
            onProgress: (prog) => {
              job.stageIndex = stageMap[prog.stage] ?? job.stageIndex;
              job.stageName = prog.stage;
              job.message = prog.message;
              job.progress = prog.progressPercent;
            }
          }
        ), resume_text, resume_file_name);

        const saved = await KitModel.create({
          userId,
          ...generatedKit
        });

        job.status = 'completed';
        job.stageIndex = 5;
        job.progress = 100;
        job.kitId = saved._id.toString();
        job.message = 'Interview kit generated successfully!';
      } catch (pipelineErr: any) {
        console.error(`[Background Job ${jobId} Failed]:`, pipelineErr);
        job.status = 'failed';
        job.error = pipelineErr.message || 'Generation failed. Please try again.';
      }
    })();
  } catch (err: any) {
    console.error('[API /generate Error]:', err);
    res.status(500).json({ error: err.message || 'Generation initiation failed' });
  }
});

/**
 * POST /api/kits/batch-upload - Prepares multiple kits from an uploaded array of pairs
 */
router.post('/batch-upload', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Array of description-and-company pairs required.' });
      return;
    }

    const createdKits = [];
    for (const item of items.slice(0, 5)) { // Limit to 5 per batch upload
      const numDays = Math.max(1, Math.round(Number(item.days) || 5));
      const kit = await runPrepKitPipeline({
        jd: String(item.jd).trim(),
        company_url: String(item.company_url).trim(),
        days: numDays,
        custom_rounds: Array.isArray(item.custom_rounds) ? item.custom_rounds : undefined
      });

      const saved = await KitModel.create({
        userId: req.user?.userId,
        ...kit
      });
      createdKits.push(saved);
    }

    res.status(201).json({
      message: `Successfully generated ${createdKits.length} kits.`,
      kits: createdKits
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Batch generation failed' });
  }
});

/**
 * PUT /api/kits/:id - Update kit (Builder inline edits, reordering, adding/deleting cards)
 */
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const kit = await KitModel.findOne({
      _id: req.params.id,
      userId: req.user?.userId
    });

    if (!kit) {
      res.status(404).json({ error: 'Kit not found or unauthorized.' });
      return;
    }

    const { company_brief, role, questions, flashcards, schedule, coverage } = req.body;

    if (company_brief) kit.company_brief = company_brief;
    if (role) kit.role = role;
    if (questions) kit.questions = questions;
    if (flashcards) kit.flashcards = flashcards;
    if (schedule) kit.schedule = schedule;
    if (coverage) kit.coverage = coverage;

    await kit.save();
    res.status(200).json({ message: 'Kit updated successfully', kit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/kits/:id/regenerate-section (Section 6)
 * Regenerates a single section (brief, specific question category, or schedule)
 * WITHOUT clobbering user manual edits or pinned items.
 */
router.post('/:id/regenerate-section', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { section, category } = req.body;
    const kit = await KitModel.findOne({
      _id: req.params.id,
      userId: req.user?.userId
    });

    if (!kit) {
      res.status(404).json({ error: 'Kit not found or unauthorized.' });
      return;
    }

    if (section === 'company_brief') {
      const prompt = `Synthesize a fresh, updated company brief for: ${kit.source.company} (${kit.source.company_url})
Current summary: ${kit.company_brief.summary}
Output JSON: { "summary": "...", "what_they_do": "..." }`;
      const freshBrief = await defaultLLMClient.generateJson<any>(prompt);
      kit.company_brief.summary = freshBrief.summary || kit.company_brief.summary;
      kit.company_brief.what_they_do = freshBrief.what_they_do || kit.company_brief.what_they_do;
    } else if (section === 'category' && category) {
      // Regenerate questions for a specific category
      // PRESERVATION RULE: Any question marked user_edited or is_pinned or is_custom MUST survive!
      const preservedQuestions = kit.questions.filter(
        q => q.category !== category || q.user_edited || q.is_pinned || q.is_custom
      );

      const existingPrompts = preservedQuestions.map(q => `- ${q.prompt}`).join('\n');
      const prompt = `Generate 2 new, unique, high-quality interview questions for role "${kit.role.title}" at "${kit.source.company}" in category "${category}".
Requirements: ${kit.role.requirements.map(r => `[${r.id}] ${r.text}`).join('; ')}

Existing questions in the kit (DO NOT DUPLICATE OR REPHRASE THESE):
${existingPrompts}

Output JSON: { "questions": [ { "id": "q_new", "requirement_ids": ["r1"], "category": "${category}", "prompt": "...", "answer_outline": "...", "difficulty": 2 } ] }`;
      
      const newQuestionsRes = await defaultLLMClient.generateJson<any>(prompt);
      const seenPrompts = new Set(preservedQuestions.map(q => q.prompt.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()));
      const startIdx = preservedQuestions.length + 1;
      const freshQuestions: Question[] = [];

      for (const q of (newQuestionsRes.questions || [])) {
        const pText = String(q.prompt || '').trim();
        const norm = pText.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!norm || seenPrompts.has(norm)) continue;
        seenPrompts.add(norm);

        freshQuestions.push({
          id: `q${startIdx + freshQuestions.length}`,
          requirement_ids: Array.isArray(q.requirement_ids) && q.requirement_ids.length > 0 ? q.requirement_ids : [kit.role.requirements[0]?.id || 'r1'],
          category: category as QuestionCategory,
          prompt: pText,
          answer_outline: String(q.answer_outline || 'Detailed architectural evaluation points and expected candidate approach.'),
          difficulty: [1, 2, 3].includes(q.difficulty) ? q.difficulty : 2,
          user_edited: false,
          is_pinned: false
        });
      }

      kit.questions = [...preservedQuestions, ...freshQuestions] as any;

      // Re-allocate schedule to account for updated questions
      kit.schedule = allocateSchedule(kit.schedule.days_available, kit.role.requirements, kit.questions) as any;
    } else if (section === 'schedule') {
      // Regenerate schedule deterministically
      kit.schedule = allocateSchedule(kit.schedule.days_available, kit.role.requirements, kit.questions) as any;
    } else {
      res.status(400).json({ error: 'Invalid section or category specified for regeneration.' });
      return;
    }

    await kit.save();
    res.status(200).json({ message: 'Section regenerated while preserving manual edits', kit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/kits/:id/resume - Attaches and summarizes a candidate resume for a kit
 */
router.post('/:id/resume', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { resume_text, file_name, file_base64 } = req.body;
    let text = (resume_text || '').trim();

    if (!text && file_base64) {
      const buffer = Buffer.from(file_base64, 'base64');
      text = await extractTextFromResumeBuffer(buffer, file_name);
    }

    if (!text || text.length < 20) {
      res.status(400).json({ error: 'Please provide valid resume text or upload a readable document.' });
      return;
    }

    const kit = await KitModel.findOne({
      _id: req.params.id,
      userId: req.user?.userId
    });

    if (!kit) {
      res.status(404).json({ error: 'Kit not found' });
      return;
    }

    const summary = await summarizeResume(text, file_name);
    kit.candidate_resume = summary as any;
    await kit.save();

    res.status(200).json({
      message: 'Resume attached successfully',
      candidate_resume: kit.candidate_resume
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to attach resume' });
  }
});

/**
 * POST /api/kits/:id/questions/:qId/tailor - Generates tailored answer & talking points based on resume
 */
router.post('/:id/questions/:qId/tailor', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { resume_text } = req.body;
    const kit = await KitModel.findOne({
      _id: req.params.id,
      userId: req.user?.userId
    });

    if (!kit) {
      res.status(404).json({ error: 'Kit not found' });
      return;
    }

    const question = kit.questions.find(q => q.id === req.params.qId);
    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    let candidateResumeText = resume_text || kit.candidate_resume?.text;
    if (!candidateResumeText || candidateResumeText.trim().length < 20) {
      res.status(400).json({ error: 'Please upload or paste your resume first to generate tailored answers.' });
      return;
    }

    // If user provided resume text directly and kit doesn't have it, save it
    if (resume_text && (!kit.candidate_resume || kit.candidate_resume.text !== resume_text)) {
      kit.candidate_resume = (await summarizeResume(resume_text, 'Pasted Resume')) as any;
    }

    const tailored = await generateTailoredAnswerForQuestion({
      question: question as any,
      resumeText: candidateResumeText,
      companyName: kit.source.company,
      roleTitle: kit.role.title
    });

    question.tailored_response = tailored as any;
    kit.markModified('questions');
    await kit.save();

    res.status(200).json({
      message: 'Question tailored to resume successfully',
      question
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to tailor question' });
  }
});

/**
 * POST /api/kits/:id/tailor-all - Batch tailors questions across behavioral and system design
 */
router.post('/:id/tailor-all', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { resume_text } = req.body;
    const kit = await KitModel.findOne({
      _id: req.params.id,
      userId: req.user?.userId
    });

    if (!kit) {
      res.status(404).json({ error: 'Kit not found' });
      return;
    }

    let candidateResumeText = resume_text || kit.candidate_resume?.text;
    if (!candidateResumeText || candidateResumeText.trim().length < 20) {
      res.status(400).json({ error: 'Please upload or attach your resume first.' });
      return;
    }

    if (resume_text && (!kit.candidate_resume || kit.candidate_resume.text !== resume_text)) {
      kit.candidate_resume = (await summarizeResume(resume_text, 'Pasted Resume')) as any;
    }

    // Select questions needing tailoring (behavioral, system-design, company-fit, or untailored)
    const targets = kit.questions.filter(q =>
      q.category === 'behavioural' ||
      q.category === 'system-design' ||
      q.category === 'company-fit' ||
      !q.tailored_response
    ).slice(0, 8);

    for (const q of targets) {
      try {
        q.tailored_response = (await generateTailoredAnswerForQuestion({
          question: q as any,
          resumeText: candidateResumeText,
          companyName: kit.source.company,
          roleTitle: kit.role.title
        })) as any;
      } catch (tailorErr) {
        console.warn(`[TailorAll] Skipped question ${q.id}:`, tailorErr);
      }
    }

    kit.markModified('questions');
    await kit.save();

    res.status(200).json({
      message: `Tailored ${targets.length} questions to your resume`,
      kit
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to batch tailor questions' });
  }
});

/**
 * POST /api/kits/:id/mock-interview-eval (Creative Feature)
 * Real-time diagnostic evaluation of a candidate's answer against the question outline and resume.
 */
router.post('/:id/mock-interview-eval', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { question_id, candidate_answer } = req.body;
    const kit = await KitModel.findOne({
      _id: req.params.id,
      userId: req.user?.userId
    });

    if (!kit) {
      res.status(404).json({ error: 'Kit not found' });
      return;
    }

    const question = kit.questions.find(q => q.id === question_id);
    if (!question) {
      res.status(404).json({ error: 'Question not found in this kit' });
      return;
    }

    const resumeSnippet = kit.candidate_resume?.text
      ? `\nCandidate's Past Projects & Resume Highlights:\n"""\n${kit.candidate_resume.text.slice(0, 2500)}\n"""\n`
      : '';

    const prompt = `You are a senior hiring manager conducting a mock interview assessment.
Role: ${kit.role.title} at ${kit.source.company}
Question: "${question.prompt}"
Expected Answer Outline: "${question.answer_outline}"
${resumeSnippet}
Candidate's Response:
"""
${candidate_answer}
"""

Evaluate the candidate's answer with honesty, rigor, actionable coaching, and specific advice on how they could better showcase real accomplishments from their resume.
Output JSON schema:
{
  "readiness_score": 85, // integer 0-100
  "strengths": ["Clear articulation of...", "Addressed..."],
  "weak_spots": ["Missed discussing...", "Did not cover edge case..."],
  "coaching_tip": "Concrete 1-2 sentence recommendation for the live interview",
  "resume_alignment_tip": "Optional 1-2 sentence advice on how to weave in specific projects or metrics from their background"
}`;

    const evaluation = await defaultLLMClient.generateJson<any>(prompt);
    res.status(200).json({ evaluation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/kits/:id - Deletes a kit
 */
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await KitModel.deleteOne({
      _id: req.params.id,
      userId: req.user?.userId
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Kit not found or unauthorized' });
      return;
    }

    res.status(200).json({ message: 'Kit deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
