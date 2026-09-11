import { Kit, BatchOutput, BatchKitResult } from '../../../shared/types';

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
}

/**
 * Validates that a kit strictly conforms to Appendix A of Trao FS-AI-INTERVIEW-01.
 */
export function validateKitStructure(kit: any): ValidationResult {
  const errors: ValidationIssue[] = [];

  if (!kit || typeof kit !== 'object') {
    return { valid: false, errors: [{ path: 'kit', message: 'Kit must be an object' }] };
  }

  // 1. source
  if (!kit.source || typeof kit.source !== 'object') {
    errors.push({ path: 'source', message: 'Missing or invalid source object' });
  } else {
    if (typeof kit.source.company !== 'string') errors.push({ path: 'source.company', message: 'Must be a string' });
    if (typeof kit.source.company_url !== 'string') errors.push({ path: 'source.company_url', message: 'Must be a string' });
    if (typeof kit.source.role !== 'string') errors.push({ path: 'source.role', message: 'Must be a string' });
    if (typeof kit.source.location !== 'string') errors.push({ path: 'source.location', message: 'Must be a string' });
    if (typeof kit.source.jd_chars !== 'number') errors.push({ path: 'source.jd_chars', message: 'Must be a number' });
    if (typeof kit.source.researched_at !== 'string') errors.push({ path: 'source.researched_at', message: 'Must be an ISO string' });
    if (!Array.isArray(kit.source.pages_used)) errors.push({ path: 'source.pages_used', message: 'Must be an array of strings' });
  }

  // 2. company_brief
  if (!kit.company_brief || typeof kit.company_brief !== 'object') {
    errors.push({ path: 'company_brief', message: 'Missing or invalid company_brief object' });
  } else {
    if (typeof kit.company_brief.summary !== 'string') errors.push({ path: 'company_brief.summary', message: 'Must be a string' });
    if (typeof kit.company_brief.what_they_do !== 'string') errors.push({ path: 'company_brief.what_they_do', message: 'Must be a string' });
    if (!Array.isArray(kit.company_brief.sources)) errors.push({ path: 'company_brief.sources', message: 'Must be an array of strings' });
  }

  // 3. role
  if (!kit.role || typeof kit.role !== 'object') {
    errors.push({ path: 'role', message: 'Missing or invalid role object' });
  } else {
    if (typeof kit.role.title !== 'string') errors.push({ path: 'role.title', message: 'Must be a string' });
    if (typeof kit.role.seniority !== 'string') errors.push({ path: 'role.seniority', message: 'Must be a string' });
    if (!Array.isArray(kit.role.responsibilities)) errors.push({ path: 'role.responsibilities', message: 'Must be an array' });
    if (!Array.isArray(kit.role.requirements)) {
      errors.push({ path: 'role.requirements', message: 'Must be an array' });
    } else {
      const allowedKinds = ['technical', 'behavioural', 'domain'];
      const allowedPriorities = ['must', 'nice'];
      kit.role.requirements.forEach((req: any, index: number) => {
        if (!req.id || typeof req.id !== 'string') errors.push({ path: `role.requirements[${index}].id`, message: 'Must be a non-empty string' });
        if (!req.text || typeof req.text !== 'string') errors.push({ path: `role.requirements[${index}].text`, message: 'Must be a string' });
        if (!allowedKinds.includes(req.kind)) errors.push({ path: `role.requirements[${index}].kind`, message: `Must be one of ${allowedKinds.join(', ')}` });
        if (!allowedPriorities.includes(req.priority)) errors.push({ path: `role.requirements[${index}].priority`, message: `Must be one of ${allowedPriorities.join(', ')}` });
      });
    }
  }

  // 4. questions
  const questionIdSet = new Set<string>();
  if (!Array.isArray(kit.questions)) {
    errors.push({ path: 'questions', message: 'Must be an array' });
  } else {
    const allowedCategories = ['technical', 'behavioural', 'system-design', 'company-fit'];
    kit.questions.forEach((q: any, index: number) => {
      if (!q.id || typeof q.id !== 'string') {
        errors.push({ path: `questions[${index}].id`, message: 'Must be a non-empty string' });
      } else {
        questionIdSet.add(q.id);
      }
      if (!Array.isArray(q.requirement_ids)) errors.push({ path: `questions[${index}].requirement_ids`, message: 'Must be an array of strings' });
      if (!allowedCategories.includes(q.category)) errors.push({ path: `questions[${index}].category`, message: `Must be one of ${allowedCategories.join(', ')}` });
      if (typeof q.prompt !== 'string') errors.push({ path: `questions[${index}].prompt`, message: 'Must be a string' });
      if (typeof q.answer_outline !== 'string') errors.push({ path: `questions[${index}].answer_outline`, message: 'Must be a string' });
      if (typeof q.difficulty !== 'number' || ![1, 2, 3].includes(q.difficulty)) {
        errors.push({ path: `questions[${index}].difficulty`, message: 'Difficulty must be integer 1, 2, or 3' });
      }
    });
  }

  // 5. flashcards
  if (!Array.isArray(kit.flashcards)) {
    errors.push({ path: 'flashcards', message: 'Must be an array' });
  } else {
    kit.flashcards.forEach((f: any, index: number) => {
      if (!f.id || typeof f.id !== 'string') errors.push({ path: `flashcards[${index}].id`, message: 'Must be a string' });
      if (typeof f.front !== 'string') errors.push({ path: `flashcards[${index}].front`, message: 'Must be a string' });
      if (typeof f.back !== 'string') errors.push({ path: `flashcards[${index}].back`, message: 'Must be a string' });
      if (!Array.isArray(f.requirement_ids)) errors.push({ path: `flashcards[${index}].requirement_ids`, message: 'Must be an array of strings' });
    });
  }

  // 6. schedule
  if (!kit.schedule || typeof kit.schedule !== 'object') {
    errors.push({ path: 'schedule', message: 'Missing or invalid schedule object' });
  } else {
    if (typeof kit.schedule.days_available !== 'number' || kit.schedule.days_available < 1) {
      errors.push({ path: 'schedule.days_available', message: 'Must be a positive number' });
    }
    if (!Array.isArray(kit.schedule.days)) {
      errors.push({ path: 'schedule.days', message: 'Must be an array of days' });
    } else {
      if (kit.schedule.days.length !== kit.schedule.days_available) {
        errors.push({
          path: 'schedule.days.length',
          message: `Number of days in schedule (${kit.schedule.days.length}) must equal days_available (${kit.schedule.days_available})`
        });
      }

      kit.schedule.days.forEach((day: any, index: number) => {
        if (typeof day.day !== 'number' || day.day !== index + 1) {
          errors.push({ path: `schedule.days[${index}].day`, message: `Day number must be sequential integer starting from 1` });
        }
        if (typeof day.focus !== 'string') errors.push({ path: `schedule.days[${index}].focus`, message: 'Must be a string' });
        if (!Array.isArray(day.question_ids)) {
          errors.push({ path: `schedule.days[${index}].question_ids`, message: 'Must be an array' });
        } else {
          // Verify that every question_ids entry in the schedule refers to a question that exists
          day.question_ids.forEach((qid: string) => {
            if (!questionIdSet.has(qid)) {
              errors.push({
                path: `schedule.days[${index}].question_ids`,
                message: `Referenced question_id "${qid}" does not exist in questions list`
              });
            }
          });
        }
        if (typeof day.minutes !== 'number' || !Number.isInteger(day.minutes)) {
          errors.push({ path: `schedule.days[${index}].minutes`, message: 'Minutes must be an integer' });
        }
      });
    }
  }

  // 7. coverage
  if (!kit.coverage || typeof kit.coverage !== 'object') {
    errors.push({ path: 'coverage', message: 'Missing or invalid coverage object' });
  } else {
    if (!Array.isArray(kit.coverage.uncovered_requirement_ids)) {
      errors.push({ path: 'coverage.uncovered_requirement_ids', message: 'Must be an array of strings' });
    }
    if (typeof kit.coverage.passes !== 'number' || !Number.isInteger(kit.coverage.passes)) {
      errors.push({ path: 'coverage.passes', message: 'Must be an integer' });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates batch output against Appendix B.
 */
export function validateBatchOutput(output: any): ValidationResult {
  const errors: ValidationIssue[] = [];

  if (!output || typeof output !== 'object') {
    return { valid: false, errors: [{ path: 'output', message: 'Batch output must be an object' }] };
  }

  if (typeof output.version !== 'string') errors.push({ path: 'version', message: 'Must be a string version' });
  if (typeof output.generated_at !== 'string') errors.push({ path: 'generated_at', message: 'Must be an ISO timestamp' });
  if (!Array.isArray(output.kits)) {
    errors.push({ path: 'kits', message: 'Must be an array of kits' });
  } else {
    output.kits.forEach((entry: any, index: number) => {
      if (!entry.id || typeof entry.id !== 'string') errors.push({ path: `kits[${index}].id`, message: 'Must be string' });
      if (!['ok', 'failed'].includes(entry.status)) errors.push({ path: `kits[${index}].status`, message: 'Status must be "ok" or "failed"' });
      if (entry.status === 'ok') {
        if (!entry.kit) errors.push({ path: `kits[${index}].kit`, message: 'Must contain kit object when status is ok' });
      } else {
        if (!entry.error || typeof entry.error.code !== 'string') errors.push({ path: `kits[${index}].error`, message: 'Must contain error object with code when status is failed' });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
