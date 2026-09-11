import { Requirement, Question, Coverage } from '../../../shared/types';

/**
 * Deterministic Coverage Engine
 * 
 * Requirement from Trao FS-AI-INTERVIEW-01 Section 3 & 4:
 * "Comparing the extracted requirements against the generated questions to find the gaps is 
 * likewise your code's decision to make, not the model's."
 * 
 * Must-have requirements without at least one mapped question are considered coverage gaps.
 */

export interface CoverageResult {
  uncoveredMustHaveIds: string[];
  uncoveredNiceToHaveIds: string[];
  allUncoveredIds: string[];
  isFullyCovered: boolean;
  coveredRequirementIds: Set<string>;
}

/**
 * Evaluates coverage of requirements against generated questions deterministically.
 */
export function checkCoverage(
  requirements: Requirement[],
  questions: Question[]
): CoverageResult {
  // Collect all requirement IDs covered by at least one question
  const coveredSet = new Set<string>();
  for (const question of questions) {
    if (Array.isArray(question.requirement_ids)) {
      for (const reqId of question.requirement_ids) {
        if (reqId && typeof reqId === 'string') {
          coveredSet.add(reqId.trim());
        }
      }
    }
  }

  const uncoveredMustHaveIds: string[] = [];
  const uncoveredNiceToHaveIds: string[] = [];

  for (const req of requirements) {
    if (!coveredSet.has(req.id)) {
      if (req.priority === 'must') {
        uncoveredMustHaveIds.push(req.id);
      } else {
        uncoveredNiceToHaveIds.push(req.id);
      }
    }
  }

  const allUncoveredIds = [...uncoveredMustHaveIds, ...uncoveredNiceToHaveIds];

  return {
    uncoveredMustHaveIds,
    uncoveredNiceToHaveIds,
    allUncoveredIds,
    // Assessment specifies: "A kit that ships with uncovered must-have requirements has failed at the one job it had."
    isFullyCovered: uncoveredMustHaveIds.length === 0,
    coveredRequirementIds: coveredSet
  };
}

/**
 * Formats the final Appendix A coverage object.
 */
export function buildCoverageObject(
  requirements: Requirement[],
  questions: Question[],
  passesCount: number
): Coverage {
  const result = checkCoverage(requirements, questions);
  return {
    uncovered_requirement_ids: result.uncoveredMustHaveIds,
    passes: Math.max(1, Math.floor(passesCount))
  };
}
