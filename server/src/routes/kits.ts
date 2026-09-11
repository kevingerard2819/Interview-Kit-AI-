import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { KitModel } from '../models/Kit';
import { runPrepKitPipeline } from '../pipeline/runner';
import { allocateSchedule } from '../pipeline/schedule';
import { defaultLLMClient } from '../llm/client';
import { Question, QuestionCategory } from '../../../shared/types';

const router = Router();

// Apply auth middleware to all kit routes
router.use(authMiddleware);

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

    res.status(200).json({ kit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/kits/generate - Generates a new kit using the full pipeline
 */
router.post('/generate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jd, company_url, days } = req.body;

    if (!jd || !company_url) {
      res.status(400).json({ error: 'Job description and company URL are required.' });
      return;
    }

    const numDays = Math.max(1, Math.round(Number(days) || 5));

    // Run the pipeline
    const generatedKit = await runPrepKitPipeline({
      jd: String(jd).trim(),
      company_url: String(company_url).trim(),
      days: numDays
    });

    // Save kit scoped to user
    const saved = await KitModel.create({
      userId: req.user?.userId,
      ...generatedKit
    });

    res.status(201).json({
      message: 'Kit generated successfully',
      kit: saved
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Generation failed' });
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
        days: numDays
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

      const prompt = `Generate 2 new high-quality interview questions for role "${kit.role.title}" in category "${category}".
Requirements: ${kit.role.requirements.map(r => `[${r.id}] ${r.text}`).join('; ')}
Output JSON: { "questions": [ { "id": "q_new", "requirement_ids": ["r1"], "category": "${category}", "prompt": "...", "answer_outline": "...", "difficulty": 2 } ] }`;
      
      const newQuestionsRes = await defaultLLMClient.generateJson<any>(prompt);
      const startIdx = kit.questions.length + 1;
      const freshQuestions: Question[] = (newQuestionsRes.questions || []).map((q: any, i: number) => ({
        id: `q${startIdx + i}`,
        requirement_ids: Array.isArray(q.requirement_ids) ? q.requirement_ids : [kit.role.requirements[0]?.id || 'r1'],
        category: category as QuestionCategory,
        prompt: q.prompt,
        answer_outline: q.answer_outline,
        difficulty: [1, 2, 3].includes(q.difficulty) ? q.difficulty : 2,
        user_edited: false,
        is_pinned: false
      }));

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
 * POST /api/kits/:id/mock-interview-eval (Creative Feature)
 * Real-time diagnostic evaluation of a candidate's answer against the question outline.
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

    const prompt = `You are a senior hiring manager conducting a mock interview assessment.
Role: ${kit.role.title} at ${kit.source.company}
Question: "${question.prompt}"
Expected Answer Outline: "${question.answer_outline}"
Candidate's Response:
"""
${candidate_answer}
"""

Evaluate the candidate's answer with honesty, rigor, and actionable coaching.
Output JSON schema:
{
  "readiness_score": 85, // integer 0-100
  "strengths": ["Clear articulation of...", "Addressed..."],
  "weak_spots": ["Missed discussing...", "Did not cover edge case..."],
  "coaching_tip": "Concrete 1-2 sentence recommendation for the live interview"
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
