/**
 * Shared Type Definitions conforming to Trao FS-AI-INTERVIEW-01 Specification
 * Appendix A and Appendix B
 */

export type RequirementKind = 'technical' | 'behavioural' | 'domain';
export type RequirementPriority = 'must' | 'nice';

export interface Requirement {
  id: string; // e.g., "r1", "r2"
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export type QuestionCategory = 'technical' | 'behavioural' | 'system-design' | 'company-fit';

export interface Question {
  id: string; // e.g., "q1", "q2"
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  // UI metadata (optional extensions for Builder edit preservation)
  is_custom?: boolean;
  is_pinned?: boolean;
  user_edited?: boolean;
}

export interface Flashcard {
  id: string; // e.g., "f1", "f2"
  front: string;
  back: string;
  requirement_ids: string[];
  // UI metadata
  is_custom?: boolean;
  user_edited?: boolean;
  confidence?: 1 | 2 | 3; // For practice mode (1 = hard, 2 = medium, 3 = mastered)
  last_practiced?: string;
}

export interface ScheduleDay {
  day: number; // 1 to days_available
  focus: string;
  question_ids: string[];
  minutes: number; // Integer minutes
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface Coverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface SourceInfo {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string;
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export interface RoleInfo {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

/**
 * Strict Kit Structure (Appendix A)
 */
export interface Kit {
  source: SourceInfo;
  company_brief: CompanyBrief;
  role: RoleInfo;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
}

/**
 * Appendix B - Batch Input and Output Types
 */
export interface BatchCaseInput {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

export interface BatchError {
  code: string;
  message: string;
}

export interface BatchKitResult {
  id: string;
  status: 'ok' | 'failed';
  kit: Kit | null;
  error: BatchError | null;
}

export interface BatchOutput {
  version: string; // e.g. "1.0"
  generated_at: string; // ISO 8601 string
  kits: BatchKitResult[];
}
