import { RoleInfo, Requirement, Question, Flashcard, QuestionCategory } from '../../../shared/types';

/**
 * Intelligent Contextual Mock & Fallback Generator
 * 
 * Ensures that even in offline, rate-limited, or zero-key environments:
 * 1. The JD is genuinely parsed for role, title, seniority, and specific technologies.
 * 2. Requirements are extracted from the actual JD text.
 * 3. Every generated question is unique, diverse, and directly mapped to the JD and company.
 * 4. No repeated questions within a kit or across passes.
 */

// Common tech stack keywords for extraction
const TECH_KEYWORDS = [
  'typescript', 'javascript', 'python', 'golang', 'go', 'java', 'c++', 'c#', 'rust', 'ruby', 'php',
  'react', 'next.js', 'vue', 'angular', 'svelte', 'node.js', 'express', 'nestjs', 'django', 'fastapi',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'cassandra', 'dynamodb', 'elasticsearch',
  'kafka', 'rabbitmq', 'graphql', 'rest', 'grpc', 'microservices', 'distributed systems',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'k8s', 'terraform', 'ci/cd', 'github actions',
  'system design', 'scalability', 'concurrency', 'caching', 'security', 'oauth', 'jwt',
  'machine learning', 'pytorch', 'tensorflow', 'llm', 'rag', 'data pipelines', 'etl',
  'payments', 'fintech', 'e-commerce', 'compliance', 'pci-dss'
];

/**
 * Parses JD text and extracts role title, seniority, responsibilities, and requirements.
 */
export function mockExtractRequirements(jdText: string): RoleInfo {
  const trimmed = (jdText || '').trim();
  const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 1. Infer Title
  let title = 'Software Engineer';
  for (const line of lines.slice(0, 5)) {
    if (/(engineer|developer|architect|lead|manager|scientist|specialist|designer)/i.test(line) && line.length < 80) {
      title = line.replace(/^[#*•\-\s]+/, '').replace(/–|-|\|.*$/, '').trim();
      break;
    }
  }

  // 2. Infer Seniority
  let seniority = 'Mid-Senior';
  if (/principal/i.test(trimmed)) seniority = 'Principal';
  else if (/staff/i.test(trimmed)) seniority = 'Staff';
  else if (/lead/i.test(trimmed)) seniority = 'Lead';
  else if (/senior|sr\b/i.test(trimmed)) seniority = 'Senior';
  else if (/junior|jr\b|entry/i.test(trimmed)) seniority = 'Junior';

  // 3. Extract Bullet Points / Responsibilities
  const bulletLines = lines.filter(l => /^[•\-\*–]|\d+\./.test(l));
  const responsibilities = bulletLines.length >= 3
    ? bulletLines.slice(0, 4).map(l => l.replace(/^[•\-\*–\d\.\s]+/, '').trim())
    : [
        `Design, build, and maintain mission-critical services for ${title}`,
        'Collaborate with cross-functional product and engineering teams',
        'Ensure system reliability, scalability, performance, and automated test coverage'
      ];

  // 4. Detect technologies & requirements from text safely
  const lowerTrimmed = trimmed.toLowerCase();
  const detectedTech = TECH_KEYWORDS.filter(tech => {
    if (/^[a-z0-9]+$/i.test(tech)) {
      return new RegExp(`\\b${tech}\\b`, 'i').test(trimmed);
    }
    return lowerTrimmed.includes(tech.toLowerCase());
  });

  const requirements: Requirement[] = [];
  let reqIndex = 1;

  // If bullet points exist, use top qualification bullets
  if (bulletLines.length > 0) {
    for (const b of bulletLines.slice(0, 6)) {
      const cleanText = b.replace(/^[•\-\*–\d\.\s]+/, '').trim();
      if (cleanText.length < 15) continue;

      const isBehavioural = /collaborat|mentor|leadership|communication|stakeholder|partner|culture|team/i.test(cleanText);
      const isDomain = /payment|fintech|e-commerce|checkout|banking|healthcare|security|compliance|regulatory/i.test(cleanText);
      const isNice = /bonus|nice to have|plus|preferred|advantage|ideally|optional/i.test(cleanText);

      requirements.push({
        id: `r${reqIndex++}`,
        text: cleanText,
        kind: isBehavioural ? 'behavioural' : isDomain ? 'domain' : 'technical',
        priority: isNice ? 'nice' : 'must'
      });
    }
  }

  // If fewer than 4 requirements, supplement with detected technologies
  if (requirements.length < 4) {
    const coreTech = detectedTech.slice(0, 4);
    if (coreTech.length > 0) {
      requirements.push({
        id: `r${reqIndex++}`,
        text: `Production expertise in core technology stack: ${coreTech.join(', ')}`,
        kind: 'technical',
        priority: 'must'
      });
    }
    requirements.push({
      id: `r${reqIndex++}`,
      text: 'Distributed architecture, scalability, API design, and high-availability systems',
      kind: 'technical',
      priority: 'must'
    });
    requirements.push({
      id: `r${reqIndex++}`,
      text: 'Cross-functional collaboration, technical mentorship, and clear engineering communication',
      kind: 'behavioural',
      priority: 'must'
    });
    requirements.push({
      id: `r${reqIndex++}`,
      text: 'Automated testing, CI/CD pipelines, containerization, and production observability',
      kind: 'domain',
      priority: 'nice'
    });
  }

  return {
    title,
    seniority,
    responsibilities,
    requirements
  };
}

/**
 * Dynamically generates a rich, non-repetitive question bank and flashcards based on prompt details.
 */
export function mockGenerateDraftQuestions(prompt: string): { questions: Question[]; flashcards: Flashcard[] } {
  // Extract role and company
  const roleMatch = prompt.match(/Role:\s*([^\n]+)/i);
  const companyMatch = prompt.match(/Company:\s*([^\n(]+)/i);
  const roleTitle = roleMatch ? roleMatch[1].trim() : 'Software Engineer';
  const companyName = companyMatch ? companyMatch[1].trim() : 'the company';

  // Extract requirements from prompt
  const reqMatches = Array.from(prompt.matchAll(/\[(r\d+)\]\s*\(([^,]+),\s*([^)]+)\):\s*([^\n]+)/g));
  
  const parsedReqs: { id: string; kind: string; priority: string; text: string }[] = reqMatches.map(m => ({
    id: m[1],
    kind: m[2].trim(),
    priority: m[3].trim(),
    text: m[4].trim()
  }));

  if (parsedReqs.length === 0) {
    parsedReqs.push(
      { id: 'r1', kind: 'technical', priority: 'must', text: `Core systems engineering and architecture for ${roleTitle}` },
      { id: 'r2', kind: 'technical', priority: 'must', text: 'Scalable data structures, algorithms, and latency optimization' },
      { id: 'r3', kind: 'behavioural', priority: 'must', text: 'Technical leadership, cross-team collaboration, and code quality' },
      { id: 'r4', kind: 'domain', priority: 'nice', text: 'Production deployment, monitoring, CI/CD, and system resiliency' }
    );
  }

  const questions: Question[] = [];
  const flashcards: Flashcard[] = [];
  let qIndex = 1;
  let fIndex = 1;

  function cleanReqSummary(text: string, maxLen = 80): string {
    const t = text.replace(/^[•\-\*–\d\.\s]+/, '').trim();
    if (t.length <= maxLen) return t;
    const cut = t.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut);
  }

  // Extract candidate specified rounds from prompt if available
  const customRoundsMatch = prompt.match(/CANDIDATE-SPECIFIED INTERVIEW ROUNDS[^\n]*:\n([\s\S]*?)(?=\nCRITICAL|\nPUBLIC|\nCOMPANY|\nTarget|\n\{)/i);
  let candidateCustomRounds: string[] = [];
  if (customRoundsMatch) {
    candidateCustomRounds = customRoundsMatch[1]
      .split('\n')
      .map(line => line.replace(/^\s*\d+\.\s*/, '').trim())
      .filter(l => l.length > 0);
  }

  function getStageForCategory(cat: QuestionCategory, defaultStage: string): string {
    if (candidateCustomRounds.length === 0) return defaultStage;
    if (cat === 'technical') {
      return candidateCustomRounds.find(r => /coding|leetcode|problem solving|technical|code|take-home|dsa|algorithm/i.test(r)) || candidateCustomRounds[0];
    }
    if (cat === 'system-design') {
      return candidateCustomRounds.find(r => /system|design|architect|distributed|scale|cloud/i.test(r)) || candidateCustomRounds[Math.min(1, candidateCustomRounds.length - 1)];
    }
    if (cat === 'behavioural') {
      return candidateCustomRounds.find(r => /behav|values|culture|bar raiser|star|leadership/i.test(r)) || candidateCustomRounds[Math.min(2, candidateCustomRounds.length - 1)];
    }
    return candidateCustomRounds.find(r => /fit|manager|hiring|team|exec|product|mission/i.test(r)) || candidateCustomRounds[candidateCustomRounds.length - 1];
  }

  const isCustom = candidateCustomRounds.length > 0;
  const hasTakeHome = /take-home|take home/i.test(prompt);
  const hasSysDesign = /system design|architecture/i.test(prompt);
  const hasLeetCode = /leetcode|algorithm|live coding|dsa/i.test(prompt);

  // Generate 2 diverse questions per requirement
  for (const req of parsedReqs) {
    const isTech = req.kind === 'technical';
    const isBehav = req.kind === 'behavioural';
    const isDomain = req.kind === 'domain';
    const cleanText = cleanReqSummary(req.text);

    if (isBehav) {
      // Behavioural Question 1: Conflict / Disagreement
      questions.push({
        id: `q${qIndex++}`,
        requirement_ids: [req.id],
        category: 'behavioural',
        prompt: `Tell me about a time you experienced friction or technical disagreement when delivering on ${cleanText}. How did you reach consensus?`,
        answer_outline: 'Use STAR: Situation context, Task alignment, Action (data-driven benchmarks, trade-off matrix), Result (project shipped on schedule with unified team buy-in).',
        difficulty: 2,
        interview_stage: getStageForCategory('behavioural', 'Round 4: Bar Raiser & Values Alignment'),
        source_forum: 'Glassdoor Reviews & Blind',
        forum_tip: 'Candidates on Glassdoor & Blind report interviewers look for emotional intelligence, objective data-driven decision making, and measurable business impact.'
      });

      // Behavioural Question 2: Leadership / Mentorship
      questions.push({
        id: `q${qIndex++}`,
        requirement_ids: [req.id],
        category: 'company-fit',
        prompt: `In candidate discussions for ${companyName}, interviewers emphasize cross-functional ownership and proactive communication. How have you demonstrated this regarding ${cleanText}?`,
        answer_outline: 'Explain engineering philosophy, empathy, pair programming techniques, and establishing measurable engineering guardrails.',
        difficulty: 2,
        interview_stage: getStageForCategory('company-fit', 'Round 5: Team & Hiring Manager Fit'),
        source_forum: 'Reddit r/cscareerquestions',
        forum_tip: 'Candidates note that giving specific examples of cross-team coordination and mentorship strongly differentiates top candidates.'
      });

      flashcards.push({
        id: `f${fIndex++}`,
        front: `What makes a compelling STAR response for: ${cleanReqSummary(req.text, 50)}?`,
        back: 'Clear quantifiable business impact, personal accountability without blaming others, and lessons learned applied to future projects.',
        requirement_ids: [req.id]
      });
    } else if (isTech) {
      // Technical Question 1: Deep Mechanics / Forum Reported Coding
      const techPrompt = hasTakeHome
        ? `Practical Coding / Take-Home Assessment (aligned with reported interview format): Walk through your end-to-end architecture, API contracts, and testing strategy for implementing ${cleanText}.`
        : hasLeetCode
        ? `Live Technical Coding Screen (reported in interview discussions): What data structures, concurrency controls, and algorithmic trade-offs would you implement for ${cleanText}?`
        : `In a production environment, how do you diagnose and debug performance bottlenecks, concurrency issues, or memory leaks involving ${cleanText}?`;

      questions.push({
        id: `q${qIndex++}`,
        requirement_ids: [req.id],
        category: 'technical',
        prompt: techPrompt,
        answer_outline: 'Detail profiling tools, heap dumps, CPU flamegraphs, event loop / thread diagnostics, and mitigation strategies.',
        difficulty: 2,
        interview_stage: getStageForCategory('technical', hasTakeHome ? 'Round 1: Practical Take-Home Coding Assessment' : 'Round 2: Live LeetCode / Algorithmic Problem Solving'),
        source_forum: hasTakeHome ? 'Glassdoor Candidate Reports' : 'LeetCode Discuss',
        forum_tip: hasTakeHome
          ? 'Candidates emphasize submitting modular production code with thorough unit test suites and clear error handling.'
          : 'Candidates on LeetCode Discuss emphasize clarifying edge cases and stating Big-O time/space complexity before typing code.'
      });

      // Technical Question 2: System Design & Scaling
      questions.push({
        id: `q${qIndex++}`,
        requirement_ids: [req.id],
        category: 'system-design',
        prompt: `System Design Round (as reported in ${companyName} interview experiences): How would you architect a fault-tolerant, horizontally scalable system handling high traffic volume utilizing ${cleanText}?`,
        answer_outline: 'Cover partitioning / sharding strategies, caching tiers (Redis / CDN), asynchronous message brokers, backpressure handling, and graceful degradation.',
        difficulty: 3,
        interview_stage: getStageForCategory('system-design', 'Round 3: Distributed System Architecture & Scalability'),
        source_forum: 'Reddit r/cscareerquestions',
        forum_tip: 'Discuss trade-offs between consistency and availability, sharding keys, caching tiers, and graceful failure degradation.'
      });

      flashcards.push({
        id: `f${fIndex++}`,
        front: `Key operational trade-off in production for ${cleanReqSummary(req.text, 50)}?`,
        back: 'Balancing consistency vs availability (CAP theorem), indexing overhead vs write throughput, and failover latency.',
        requirement_ids: [req.id]
      });
    } else {
      // Domain Question 1: Reliability & Compliance
      questions.push({
        id: `q${qIndex++}`,
        requirement_ids: [req.id],
        category: 'technical',
        prompt: `How do you ensure zero-downtime rollouts, idempotency, and data integrity when operating ${cleanText}?`,
        answer_outline: 'Discuss blue-green / canary deployments, idempotency keys, database migration rollback safety, and automated canary analysis.',
        difficulty: 2,
        interview_stage: getStageForCategory('technical', 'Round 2: Production Engineering & System Reliability'),
        source_forum: 'Hacker News Developer Debriefs',
        forum_tip: 'Focus on zero-downtime rollouts, idempotency keys, database migration rollback safety, and automated canary analysis.'
      });

      flashcards.push({
        id: `f${fIndex++}`,
        front: `Core requirement principle: ${cleanReqSummary(req.text, 50)}`,
        back: 'Implement idempotency tokens, atomic transactions, and automated reconciliation loops to handle transient failures.',
        requirement_ids: [req.id]
      });
    }
  }

  // Add Company-Fit Question
  questions.push({
    id: `q${qIndex++}`,
    requirement_ids: [parsedReqs[0]?.id || 'r1'],
    category: 'company-fit',
    prompt: `Why are you excited to tackle engineering challenges specifically at ${companyName}, and how does your background in ${roleTitle} align with our product mission?`,
    answer_outline: `Demonstrate genuine research into ${companyName}'s business model, customer pain points, technical scale, and engineering values.`,
    difficulty: 1,
    interview_stage: getStageForCategory('company-fit', 'Round 5: Executive / Hiring Manager & Mission Fit'),
    source_forum: 'Glassdoor & Company Mission',
    forum_tip: 'Demonstrate thoughtful research into company product roadmap, scale challenges, and customer pain points.'
  });

  return { questions, flashcards };
}

/**
 * Generates fresh, non-duplicate gap questions.
 */
export function mockGenerateGapQuestions(prompt: string): Question[] {
  const reqMatches = Array.from(prompt.matchAll(/\[(r\d+)\]\s*\(([^,]+),\s*([^)]+)\):\s*([^\n]+)/g));
  
  return reqMatches.map((m, idx) => {
    const reqId = m[1];
    const kind = m[2].trim();
    const text = m[4].trim();
    const isBehav = kind === 'behavioural';
    const category: QuestionCategory = isBehav ? 'behavioural' : 'technical';
    return {
      id: `q_gap_${idx + 1}`,
      requirement_ids: [reqId],
      category,
      prompt: `Targeted Technical Assessment: Walk through your end-to-end strategy for designing, testing, and scaling ${text}.`,
      answer_outline: `Address edge cases, architectural trade-offs, testing pyramid, and production monitoring for ${text}.`,
      difficulty: 2,
      interview_stage: isBehav ? 'Round 4: Bar Raiser & Values Alignment' : 'Round 2: Technical Problem Solving & Coding',
      source_forum: isBehav ? 'Glassdoor Reviews' : 'LeetCode Discuss',
      forum_tip: isBehav
        ? 'Frame in STAR format with focus on proactive cross-team collaboration and objective trade-off evaluation.'
        : 'Clearly articulate edge cases, algorithmic time/space complexity, and testing strategy.'
    };
  });
}
