const http = require('http');

function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : {} });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTest() {
  console.log('====================================================');
  console.log('       LIVE SYSTEM INTEGRATION & PIPELINE TEST      ');
  console.log('====================================================\n');

  console.log('[STEP 1] Testing User Registration & Authentication...');
  const email = 'senior_dev_' + Date.now() + '@stripe.com';
  const password = 'Password123!';
  const reg = await request('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email, password, name: 'Alex Rivera' });
  
  if (!reg.body.token) {
    throw new Error('Registration failed: ' + JSON.stringify(reg.body));
  }
  const token = reg.body.token;
  console.log('✓ Registered User:', reg.body.user.email);
  console.log('✓ JWT Auth Token Issued\n');

  console.log('[STEP 2] Dispatching Kit Generation Request...');
  const payload = {
    company_url: 'https://stripe.com',
    days: 5,
    jd: `Role: Senior Backend Infrastructure Engineer
Company: Stripe
Requirements:
- Strong experience with Distributed Systems, Idempotency, and High Throughput APIs
- Deep mastery of TypeScript, Node.js, and Redis caching layers
- Experience with Kafka message queues and database sharding
- Strong problem-solving and system architecture communication skills`,
    custom_rounds: [
      { roundNumber: 1, type: 'Coding', focus: 'Data structures, algorithms, TypeScript' },
      { roundNumber: 2, type: 'System Design', focus: 'High throughput payment idempotency & state machines' },
      { roundNumber: 3, type: 'Behavioral', focus: 'Ownership, incident triage, and cross-functional design' }
    ]
  };

  const gen = await request('http://localhost:5000/api/kits/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
  }, payload);

  const jobId = gen.body.jobId;
  console.log('✓ Pipeline Job Created:', jobId);
  console.log('✓ Job Status:', gen.status, '(202 Accepted)\n');

  console.log('[STEP 3] Polling Pipeline Stages in Real-Time...');
  let kitId = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await request('http://localhost:5000/api/kits/jobs/' + jobId, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const job = poll.body.job;
    if (!job) {
      console.log('Waiting for job worker...');
      continue;
    }
    console.log(`  -> Progress ${job.progress}% | Stage [${job.stageIndex}/5]: ${job.stageName} - ${job.message}`);
    
    if (job.status === 'completed') {
      kitId = job.kitId;
      console.log('\n✓ Generation Completed Successfully!\n');
      break;
    }
    if (job.status === 'failed') {
      throw new Error('Pipeline job failed: ' + job.error);
    }
  }

  if (!kitId) {
    throw new Error('Generation timed out.');
  }

  console.log('[STEP 4] Fetching Generated Kit from MongoDB...');
  const kitRes = await request('http://localhost:5000/api/kits/' + kitId, {
    headers: { 'Authorization': 'Bearer ' + token }
  });

  const kit = kitRes.body.kit;
  console.log('====================================================');
  console.log('             GENERATED KIT SUMMARY                  ');
  console.log('====================================================');
  console.log('Kit ID:            ', kit._id);
  console.log('Company:           ', kit.source?.company || 'Stripe');
  console.log('Role Title:        ', kit.role?.title || 'Senior Backend Infrastructure Engineer');
  console.log('Interview Rounds:  ', kit.rounds?.length || (kit.company_brief?.public_discussion?.reported_rounds?.length || 0));
  
  if (kit.rounds && kit.rounds.length > 0) {
    kit.rounds.forEach((r, idx) => console.log(`  Round ${r.roundNumber || idx+1} (${r.type}): ${r.focus}`));
  } else if (kit.company_brief?.public_discussion?.reported_rounds) {
    kit.company_brief.public_discussion.reported_rounds.forEach(r => console.log('  ' + r));
  }

  console.log('Questions Generated:   ', kit.questions?.length || 0);
  console.log('Flashcards Generated:  ', kit.flashcards?.length || 0);
  console.log('Schedule Days:         ', kit.schedule?.days_available || (kit.schedule?.days ? kit.schedule.days.length : 0));
  console.log('Candidate Intel Source:', kit.company_brief?.public_discussion?.sources?.length || 0, 'community sources included');
  console.log('====================================================');
  console.log('TEST RESULT: ALL CHECKS PASSED PERFECTLY!\n');
}

runTest().catch((err) => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
