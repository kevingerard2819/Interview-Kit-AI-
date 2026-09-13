# The AI Interview Prep Kit
> **Trao Full-Stack Engineering Assessment Submission**  
> **Assessment ID**: `FS-AI-INTERVIEW-01` | **Author**: Trao Candidate

An intelligent, full-stack application and batch evaluation pipeline that transforms any job description (JD) and company website URL into a personalized, structured interview preparation kit—complete with an honest company research brief, role requirements breakdown, difficulty-calibrated question bank, interactive flashcards, and a deterministically allocated study schedule.

---

## 1. Project Overview & Chosen Tech Stack

The system is designed with a strict separation between stochastic reasoning (LLM synthesis) and deterministic guarantees (schedule allocation, coverage verification, and schema validation).

| Component | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14 (App Router) + Tailwind CSS** | Server-side rendering, instant page navigation, and modern dark-mode aesthetics with high accessibility. |
| **Backend** | **Node.js + Express + TypeScript** | Clean layered architecture separating crawlers, LLM pipelines, deterministic math, and API persistence. |
| **Database** | **MongoDB (with Mongoose)** | Flexible JSON document schema conforming natively to the Appendix A Kit structure, with zero-friction in-memory fallback (`mongodb-memory-server`) for offline/eval execution. |
| **Retrieval & Scraping** | **Axios + Cheerio + Semantic Link Ranker** | Fast, lightweight DOM parsing; dynamically discovers and ranks hiring/careers/about links; respects `robots.txt` and enforces SSRF protection. |
| **LLM Provider** | **Google Gemini (gemini-2.0-flash / gemini-1.5-flash) with Free-Tier Backoff** | Rapid response latency, generous token limits, with built-in exponential backoff, jitter, and deterministic offline mock fallback. |

---

## 2. Setup Instructions

### Prerequisites
- Node.js `>= 18.0.0` (Tested on Node v22.14.0)
- npm `>= 9.0.0`

### Step 1: Install Dependencies
From the repository root:
```bash
npm install
npm --prefix client install
```

### Step 2: Configure Environment Variables
Copy the provided `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key configuration options in `.env`:
```ini
PORT=5000
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/interview_prep_kit
JWT_SECRET=trao-assessment-secure-jwt-secret-key-32chars
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
LLM_PROVIDER=auto
```
*(Note: If `GEMINI_API_KEY` is not provided or MongoDB is not running locally, the system automatically falls back to an in-memory database and deterministic generator so tests and batch commands run cleanly out-of-the-box).*

### Step 3: Run the Development Servers
```bash
npm run dev
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

### Step 4: Run Automated Tests
```bash
npm test
```
Executes 15 comprehensive unit tests covering deterministic arithmetic schedule allocation, coverage gap detection, crawler SSRF guards, and Appendix A/B schema conformance.

---

## 3. Mandatory Batch Entry Point (Section 9)

Run the full evaluation pipeline directly from the command line over an array of cases:
```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

### Example:
```bash
npm run evaluate -- --input tests/fixtures/sample_cases.json --output tests/fixtures/output_kits.json
```

- **Input Format**: JSON array conforming to Section 9 (`id`, `jd`, `company_url`, `days`).
- **Output Format**: JSON object conforming to Appendix B (`version`, `generated_at`, `kits` array).
- **Resilience**: Continues on individual case failures without aborting the batch run.
- **Local Host Support**: Accurately resolves relative URLs and local servers (e.g. `http://localhost:8099/acme/`).

---

## 4. High-Level Architecture & Pipeline Sequencing

```
                           +------------------------+
                           |  User Input / Batch    |
                           | (JD, Company URL, Days)|
                           +-----------+------------+
                                       |
                                       v
         +-------------------------------------------------------------+
         | Step 1: Secure Web Crawler & Link Ranker                    |
         | - SSRF safety checks (rejects private IPs in production)    |
         | - Checks robots.txt                                         |
         | - Extracts links & scores /careers, /jobs, /about, handbook |
         | - Cleans HTML to text (safe delimiter sanitization)         |
         +-----------------------------+-------------------------------+
                                       |
                                       v
         +-------------------------------------------------------------+
         | Step 2: Requirement Extraction (LLM Stage 1)                |
         | - Must-have vs Nice-to-have priority classification         |
         | - Technical vs Behavioural vs Domain categorization         |
         | - Strict Anti-Hallucination: Honest 2-line stub handling    |
         | - Sequential Stable IDs: r1, r2, ...                        |
         +-----------------------------+-------------------------------+
                                       |
                                       v
         +-------------------------------------------------------------+
         | Step 3: Company Brief Synthesis (LLM Stage 2)               |
         | - Distills what the company does and verified hiring info   |
         | - Reports unretrievable sites honestly rather than failing  |
         +-----------------------------+-------------------------------+
                                       |
                                       v
         +-------------------------------------------------------------+
         | Step 4: Category-Specific Question Generation (LLM Stage 3) |
         | - Technical / Behavioural STAR / System Design / Company Fit|
         | - Maps every question to requirement_ids                    |
         | - High-yield flashcards with front/back concepts            |
         +-----------------------------+-------------------------------+
                                       |
                                       v
         +-------------------------------------------------------------+
         | Step 5: Deterministic Coverage Check (NO LLM)               |
         | - Verifies if every must-have requirement has a question    |
         | - Returns list of uncovered_requirement_ids                 |
         +-----------------------------+-------------------------------+
                                       |
                   [Gaps Exist?] <-----+-----> [100% Covered]
                         |                            |
                         v                            |
         +-------------------------------+            |
         | Step 6: Second Pass Loop      |            |
         | - Targeted generation for gaps|            |
         | - Increment passes count      |            |
         +---------------+---------------+            |
                         |                            |
                         +------------+---------------+
                                      |
                                      v
         +-------------------------------------------------------------+
         | Step 7: Deterministic Arithmetic Schedule Allocator         |
         | - Exactly N days in schedule for N requested days           |
         | - Front-loads harder & must-have questions earlier          |
         | - Integer duration in minutes (no floats)                   |
         +-----------------------------+-------------------------------+
                                      |
                                      v
         +-------------------------------------------------------------+
         | Step 8: Appendix A Schema Validator & Persistence           |
         | - Strictly verifies schema, enum values, and references     |
         +-------------------------------------------------------------+
```

---

## 5. Representation of Generated, Edited, and Pinned State (Section 6)

One of the hardest state problems highlighted in the brief is:
> *"Regenerating one section must not discard edits the user has made elsewhere, and a question the user wrote or edited by hand must survive a regeneration of its category."*

### State Architecture:
Every question and card in the kit schema maintains explicit provenance flags:
```typescript
interface Question {
  id: string;                    // Stable identifier (e.g. q1, q_custom_172)
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  
  // Provenance & Edit Protection Flags
  user_edited?: boolean;         // Set to true upon any inline edit
  is_pinned?: boolean;           // User explicitly pinned to preserve
  is_custom?: boolean;           // Manually created by user
}
```

### Preservation Invariant:
When `/api/kits/:id/regenerate-section` is called for category $C$:
1. The server partitions existing questions:
   $$\text{Preserved} = \{ q \in \text{Questions} \mid q.\text{category} \neq C \lor q.\text{user\_edited} = \text{true} \lor q.\text{is\_pinned} = \text{true} \lor q.\text{is\_custom} = \text{true} \}$$
2. Fresh questions are generated only for the non-pinned slots.
3. The resulting set is combined and the schedule is recalculated without mutating any manual user text.

---

## 6. How the Schedule is Allocated (Section 8)

The schedule is computed purely through deterministic arithmetic in `server/src/pipeline/schedule.ts`:
1. **Day Count Invariant**: `schedule.days.length === schedule.days_available`.
2. **Prioritization Score**:
   $$\text{Score}(q) = 100 \cdot \mathbb{I}(q \text{ covers a must-have requirement}) + 10 \cdot \text{difficulty} + \text{CategoryWeight}$$
   - *System Design* and *Deep Technical* receive higher category weight than *Company-Fit*.
3. **Front-Loaded Distribution**:
   - Scored questions are sorted descending.
   - Questions with the highest score are placed into earlier days (Day 1, Day 2).
   - Behavioral STAR and cultural alignment land on the final day.
4. **Time & Integer Arithmetic**:
   - Difficulty weights: 3 = 25m, 2 = 18m, 1 = 12m.
   - Daily totals are rounded to strict integer minutes (e.g. 30, 45, 60 minutes).
5. **Edge Cases Handled**:
   - **1-Day Schedule**: Consolidates all high-priority must-haves into an intensive Day 1 crash course.
   - **60-Day Schedule**: When days exceed questions, primary questions are spread across early days, and subsequent days are scheduled with focused mock reviews and deep rehearsal drills referencing valid existing question IDs.

---

## 7. Creative Feature: AI Mock Interview Diagnostic

Under **Creativity Requirement (Section 14)**, we implemented the **AI Mock Interview Simulator & Weak Spot Diagnostic**:
- **Problem It Solves**: Reading an answer outline is passive; candidates struggle with active retrieval and understanding what a hiring manager actually thinks of their verbal answer.
- **How It Works**:
  - In the Kit Builder, candidates can click **"Simulate"** on any question.
  - The candidate types or dictates their answer as if in a live interview.
  - The backend evaluates the candidate's answer against the generated `answer_outline`, returning:
    - **Readiness Score** (0–100%).
    - **Strengths Highlighted**: Specific architectural concepts or STAR elements the candidate communicated well.
    - **Identified Weak Spots**: Missing edge cases, unmentioned trade-offs, or unquantified results.
    - **Coaching Tip**: Actionable advice for the interview room.

---

## 8. Edge Cases & Security (Section 10 & 11)

- **Unreachable Sites (404/Timeout)**: Rather than crashing, the crawler flags `unreachable: true`, records the status cleanly, and the company brief documents the missing website honestly.
- **Two-Line Stub JDs**: The LLM prompt explicitly forbids hallucinating unmentioned skills. A thin JD yields an honest, focused kit.
- **SSRF Guard**: External URLs are validated against loopback, private IPv4/IPv6, and cloud metadata endpoints (`169.254.169.254`) in production mode, while permitting `localhost` in local evaluation mode.
- **Untrusted Content Processing**: Fetched HTML and pasted JDs are isolated within clear semantic delimiters to protect against prompt injection instructions.
- **Rate-Limit Backoff**: Automatic exponential backoff with randomized jitter handles HTTP 429 and `RESOURCE_EXHAUSTED` responses gracefully.

---

