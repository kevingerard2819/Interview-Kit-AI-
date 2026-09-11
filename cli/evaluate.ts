import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import dotenv from 'dotenv';
dotenv.config();

import { BatchCaseInput, BatchOutput, BatchKitResult } from '../shared/types';
import { runPrepKitPipeline } from '../server/src/pipeline/runner';
import { validateBatchOutput } from '../server/src/pipeline/validator';

/**
 * Batch Evaluation Entry Point (Trao FS-AI-INTERVIEW-01 Section 9)
 * 
 * Command:
 *   npm run evaluate -- --input <cases.json> --output <kits.json>
 */
async function main() {
  const args = minimist(process.argv.slice(2), {
    string: ['input', 'output'],
    alias: { i: 'input', o: 'output' }
  });

  // Support both named arguments (--input / -i) and positional arguments (<cases.json> <kits.json>)
  const inputPath = args.input || args.i || args._[0];
  const outputPath = args.output || args.o || args._[1];

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  const resolvedInputPath = path.resolve(process.cwd(), inputPath);
  const resolvedOutputPath = path.resolve(process.cwd(), outputPath);

  if (!fs.existsSync(resolvedInputPath)) {
    console.error(`Error: Input file does not exist at "${resolvedInputPath}"`);
    process.exit(1);
  }

  let cases: BatchCaseInput[];
  try {
    const rawContent = fs.readFileSync(resolvedInputPath, 'utf8');
    cases = JSON.parse(rawContent);
    if (!Array.isArray(cases)) {
      throw new Error('Input file must contain a JSON array of case objects.');
    }
  } catch (err: any) {
    console.error(`Error parsing input file: ${err.message}`);
    process.exit(1);
  }

  console.log(`\n=== Starting Trao Evaluation Pipeline ===`);
  console.log(`Cases to process: ${cases.length}`);
  console.log(`Input:  ${resolvedInputPath}`);
  console.log(`Output: ${resolvedOutputPath}\n`);

  const results: BatchKitResult[] = [];

  for (let i = 0; i < cases.length; i++) {
    const item = cases[i];
    console.log(`[Case ${i + 1}/${cases.length}] Processing "${item.id}" (Company: ${item.company_url}, Days: ${item.days})...`);

    try {
      // Run the identical pipeline that the application uses
      const kit = await runPrepKitPipeline({
        jd: item.jd,
        company_url: item.company_url,
        days: item.days
      });

      results.push({
        id: item.id,
        status: 'ok',
        kit,
        error: null
      });

      console.log(`  -> Status: OK (Requirements: ${kit.role.requirements.length}, Questions: ${kit.questions.length}, Days: ${kit.schedule.days.length})\n`);
    } catch (caseError: any) {
      console.error(`  -> Status: FAILED for case "${item.id}": ${caseError.message}\n`);
      results.push({
        id: item.id,
        status: 'failed',
        kit: null,
        error: {
          code: caseError.code || 'PIPELINE_EXECUTION_ERROR',
          message: caseError.message || 'Failed to generate kit for this case.'
        }
      });
    }
  }

  const batchOutput: BatchOutput = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results
  };

  // Validate batch output schema
  const validation = validateBatchOutput(batchOutput);
  if (!validation.valid) {
    console.warn('[Batch Warning] Output has validation issues:', validation.errors);
  }

  // Ensure output directory exists
  const outDir = path.dirname(resolvedOutputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(resolvedOutputPath, JSON.stringify(batchOutput, null, 2), 'utf8');
  console.log(`Successfully wrote evaluation output to ${resolvedOutputPath}`);
  console.log(`Summary: ${results.filter(r => r.status === 'ok').length}/${cases.length} completed successfully.\n`);
}

main().catch(err => {
  console.error('Fatal batch evaluation failure:', err);
  process.exit(1);
});
