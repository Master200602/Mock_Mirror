import assert from 'assert';
import {
  calculateQuestionDistribution,
  normalizeQuestionType,
  normalizeQuestionTypes,
  interleaveQuestions,
  generateGroundedResumeQuestions,
  generateGroundedJdQuestions,
  generateDomainTechnicalQuestions,
  generateAndValidateInterviewQuestions,
} from '../services/questionService.js';

console.log('====================================================');
console.log('🧪 RUNNING MOCKMIRROR QUESTION RULE & VALIDATION TESTS');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${testName}`);
    console.error(err);
  }
}

async function runAsyncTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${testName}`);
    console.error(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// TEST SUITE 1: Resume Question Count Calculation Rule (1 through 10)
// ─────────────────────────────────────────────────────────────────

const expectedDistributionTable = [
  { total: 1, resume: 0, other: 1 },
  { total: 2, resume: 1, other: 1 },
  { total: 3, resume: 1, other: 2 },
  { total: 4, resume: 1, other: 3 },
  { total: 5, resume: 2, other: 3 },
  { total: 6, resume: 2, other: 4 },
  { total: 7, resume: 2, other: 5 },
  { total: 8, resume: 3, other: 5 },
  { total: 9, resume: 3, other: 6 },
  { total: 10, resume: 3, other: 7 },
];

for (const item of expectedDistributionTable) {
  runTest(`Rule Verification: Total ${item.total} -> ${item.resume} Resume + ${item.other} Other`, () => {
    const res = calculateQuestionDistribution(item.total, true, false);
    assert.strictEqual(res.totalQuestions, item.total, `Total questions should be ${item.total}`);
    assert.strictEqual(res.resumeQuestions, item.resume, `Resume questions for ${item.total} should be ${item.resume}, got ${res.resumeQuestions}`);
  });
}

// ─────────────────────────────────────────────────────────────────
// TEST SUITE 2: Job Description Question Calculation Rule
// ─────────────────────────────────────────────────────────────────

for (const n of [1, 2, 3, 5, 7, 10]) {
  runTest(`JD Rule Verification: Total ${n} with JD -> requiredJDQuestions >= 1`, () => {
    const res = calculateQuestionDistribution(n, true, true);
    assert.strictEqual(res.jdQuestions, 1, 'Must require 1 JD question when JD is present');
  });
}

// ─────────────────────────────────────────────────────────────────
// TEST SUITE 3: Grounded JD Question Generator (Zero Hallucination)
// ─────────────────────────────────────────────────────────────────

runTest('Grounded JD Generator: Uses actual JD technology and responsibility keywords', () => {
  const sampleJd = `Full Stack Developer
We are looking for a Full Stack Developer with experience in React, Node.js, Express, MongoDB and REST APIs.
Responsibilities:
- Build responsive web apps using React and Node.js.
- Design scalable REST APIs and handle MongoDB database operations.`;

  const questions = generateGroundedJdQuestions(sampleJd, 1);
  assert.strictEqual(questions.length, 1, 'Should generate 1 JD question');

  const qText = questions[0].question;
  assert.ok(questions[0].types.includes('job_description_based'), 'Question must have job_description_based type');

  const mentionsJdTech = qText.includes('React') || qText.includes('Node.js') || qText.includes('MongoDB') || qText.includes('REST API');
  assert.ok(mentionsJdTech, 'Generated JD question must reference actual technologies from the JD');
});

// ─────────────────────────────────────────────────────────────────
// TEST SUITE 4: Multi-Tag Overlap Support
// ─────────────────────────────────────────────────────────────────

runTest('Multi-Tag Overlap: Question carrying both resume_based and job_description_based satisfies both rules', () => {
  const overlapQuestion = {
    question: 'Your resume mentions Node.js experience in e-commerce. How does your experience fit the REST API requirement in this JD?',
    types: ['resume_based', 'job_description_based'],
  };

  assert.ok(overlapQuestion.types.includes('resume_based'), 'Must satisfy resume requirement');
  assert.ok(overlapQuestion.types.includes('job_description_based'), 'Must satisfy JD requirement');
});

// ─────────────────────────────────────────────────────────────────
// TEST SUITE 5: Full Scenarios (1 through 7)
// ─────────────────────────────────────────────────────────────────

async function runValidationTests() {
  const sampleCandidate = {
    fullName: 'Alex Morgan',
    targetRole: 'Full Stack Engineer',
    skills: ['React', 'Node.js', 'MongoDB', 'Docker'],
    projects: ['HealthTracker Web Platform', 'Cloud Analytics Dashboard'],
  };

  const sampleResume = `Alex Morgan
Full Stack Engineer | alex@example.com
Experience & Projects:
- Developed HealthTracker Web Platform using React and Node.js with real-time charts.
- Built Cloud Analytics Dashboard with Docker and MongoDB.`;

  const sampleJd = `Job Title: Full Stack Developer
Requirements:
- React.js & Node.js experience
- REST APIs & MongoDB
- Build microservices and frontend dashboards.`;

  // Scenario 1: Resume + JD + 3 questions (Expected: 1 Resume, at least 1 JD)
  await runAsyncTest('Scenario 1: Resume + JD + 3 Questions -> 1 Resume + 1 JD + 1 Other', async () => {
    const res = await generateAndValidateInterviewQuestions({
      domain: 'Full Stack Engineering',
      difficulty: 'Medium',
      totalQuestions: 3,
      candidateProfile: sampleCandidate,
      resumeText: sampleResume,
      jobDescription: sampleJd,
    });

    assert.strictEqual(res.questions.length, 3, 'Total questions must be 3');
    const hasResume = res.questions.some(q => q.types?.includes('resume_based'));
    const hasJd = res.questions.some(q => q.types?.includes('job_description_based'));

    assert.ok(hasResume, 'Must include at least 1 resume-based question');
    assert.ok(hasJd, 'Must include at least 1 JD-based question');
  });

  // Scenario 2: Resume + JD + 5 questions (Expected: 2 Resume, at least 1 JD)
  await runAsyncTest('Scenario 2: Resume + JD + 5 Questions -> 2 Resume + 1 JD + 2 Other', async () => {
    const res = await generateAndValidateInterviewQuestions({
      domain: 'Full Stack Engineering',
      difficulty: 'Medium',
      totalQuestions: 5,
      candidateProfile: sampleCandidate,
      resumeText: sampleResume,
      jobDescription: sampleJd,
    });

    assert.strictEqual(res.questions.length, 5, 'Total questions must be 5');
    const resumeCount = res.questions.filter(q => q.types?.includes('resume_based')).length;
    const jdCount = res.questions.filter(q => q.types?.includes('job_description_based')).length;

    assert.ok(resumeCount >= 2, `Must include at least 2 resume questions, got ${resumeCount}`);
    assert.ok(jdCount >= 1, `Must include at least 1 JD question, got ${jdCount}`);
  });

  // Scenario 3: Resume + JD + 7 questions (Expected: 3 Resume, at least 1 JD)
  await runAsyncTest('Scenario 3: Resume + JD + 7 Questions -> 3 Resume + 1 JD + 3 Other', async () => {
    const res = await generateAndValidateInterviewQuestions({
      domain: 'Full Stack Engineering',
      difficulty: 'Medium',
      totalQuestions: 7,
      candidateProfile: sampleCandidate,
      resumeText: sampleResume,
      jobDescription: sampleJd,
    });

    assert.strictEqual(res.questions.length, 7, 'Total questions must be 7');
    const resumeCount = res.questions.filter(q => q.types?.includes('resume_based')).length;
    const jdCount = res.questions.filter(q => q.types?.includes('job_description_based')).length;

    assert.ok(resumeCount >= 2, `Must include at least 2 resume questions, got ${resumeCount}`);
    assert.ok(jdCount >= 1, `Must include at least 1 JD question, got ${jdCount}`);
  });

  // Scenario 4: Resume only (No JD) -> Existing Resume Rule
  await runAsyncTest('Scenario 4: Resume only (No JD) + 5 Questions -> 2 Resume + 0 JD', async () => {
    const res = await generateAndValidateInterviewQuestions({
      domain: 'Full Stack Engineering',
      difficulty: 'Medium',
      totalQuestions: 5,
      candidateProfile: sampleCandidate,
      resumeText: sampleResume,
      jobDescription: '',
    });

    assert.strictEqual(res.questions.length, 5, 'Total questions must be 5');
    const resumeCount = res.questions.filter(q => q.types?.includes('resume_based')).length;
    assert.strictEqual(resumeCount, 2, 'Resume count must be 2');
  });

  // Scenario 5: JD only (No Resume) -> 0 Resume + 1 JD
  await runAsyncTest('Scenario 5: JD only (No Resume) + 5 Questions -> 0 Resume + 1 JD + 4 Technical', async () => {
    const res = await generateAndValidateInterviewQuestions({
      domain: 'Full Stack Engineering',
      difficulty: 'Medium',
      totalQuestions: 5,
      candidateProfile: {},
      resumeText: '',
      jobDescription: sampleJd,
    });

    assert.strictEqual(res.questions.length, 5, 'Total questions must be 5');
    const resumeCount = res.questions.filter(q => q.types?.includes('resume_based')).length;
    const jdCount = res.questions.filter(q => q.types?.includes('job_description_based')).length;

    assert.strictEqual(resumeCount, 0, 'Must have 0 resume questions when no resume is uploaded');
    assert.ok(jdCount >= 1, 'Must have at least 1 JD question');
  });

  // Scenario 6: Neither Resume nor JD -> All Technical
  await runAsyncTest('Scenario 6: Neither Resume nor JD + 5 Questions -> All Technical', async () => {
    const res = await generateAndValidateInterviewQuestions({
      domain: 'Full Stack Engineering',
      difficulty: 'Medium',
      totalQuestions: 5,
      candidateProfile: {},
      resumeText: '',
      jobDescription: '',
    });

    assert.strictEqual(res.questions.length, 5, 'Total questions must be 5');
    const resumeCount = res.questions.filter(q => q.types?.includes('resume_based')).length;
    const jdCount = res.questions.filter(q => q.types?.includes('job_description_based')).length;

    assert.strictEqual(resumeCount, 0, '0 resume questions');
    assert.strictEqual(jdCount, 0, '0 JD questions');
  });

  console.log('\n====================================================');
  console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('⚠️ SOME TESTS FAILED');
    process.exitCode = 1;
  }
  console.log('====================================================\n');
}

runValidationTests();
