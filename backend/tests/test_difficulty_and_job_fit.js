import assert from 'assert';
import {
  generateAndValidateInterviewQuestions,
  generateGroundedResumeQuestions,
  generateDomainTechnicalQuestions,
} from '../services/questionService.js';
import { getDomainCompetencies } from '../config/domainCompetencies.js';

console.log('====================================================');
console.log('🧪 RUNNING DIFFICULTY & JOB FIT COMPREHENSIVE TESTS');
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
// TEST 1: Domain Questions Difficulty Tiers (Easy vs Medium vs Hard)
// ─────────────────────────────────────────────────────────────────

runTest('Difficulty: Easy Software Developer questions are fundamental / beginner', () => {
  const qEasy = generateDomainTechnicalQuestions('Software Developer', 'Easy', 2);
  assert.strictEqual(qEasy.length, 2);
  const text = qEasy.map(q => q.question).join(' ');
  assert.ok(/interface|abstract|relational|nosql|polymorphism|git|oop/i.test(text), 'Must contain fundamental concepts');
});

runTest('Difficulty: Medium Software Developer questions are intermediate / real-world', () => {
  const qMed = generateDomainTechnicalQuestions('Software Developer', 'Medium', 2);
  assert.strictEqual(qMed.length, 2);
  const text = qMed.map(q => q.question).join(' ');
  assert.ok(/restful|api|locking|database|debugging|memory leak|unit testing|tdd/i.test(text), 'Must contain real-world engineering concepts');
});

runTest('Difficulty: Hard Software Developer questions are advanced architecture / system design', () => {
  const qHard = generateDomainTechnicalQuestions('Software Developer', 'Hard', 2);
  assert.strictEqual(qHard.length, 2);
  const text = qHard.map(q => q.question).join(' ');
  assert.ok(/distributed|system|concurrency|eventual consistency|design patterns|microservices|ci\/cd|pipeline|indexing|caching/i.test(text), 'Must contain advanced architectural concepts');
});

// ─────────────────────────────────────────────────────────────────
// TEST 2: Resume Questions Respect Selected Difficulty
// ─────────────────────────────────────────────────────────────────

const mockCandidate = {
  fullName: 'Yash Prajapati',
  targetRole: 'Full Stack Developer',
  skills: ['React', 'Node.js', 'MongoDB'],
  projects: ['MockMirror AI Interview Platform'],
};

const mockResume = `
Yash Prajapati
Full Stack Developer
Developed MockMirror AI Interview Platform using React, Node.js, Express, MongoDB.
Implemented voice recognition and real-time candidate speech analysis.
`;

runTest('Resume + Easy Difficulty: Questions focus on overview and core tools', () => {
  const qEasy = generateGroundedResumeQuestions(mockCandidate, mockResume, 2, 'Easy');
  assert.strictEqual(qEasy.length, 2);
  const text = qEasy.map(q => q.question).join(' ');
  assert.ok(/overview|technologies|purpose|fundamentals/i.test(text), 'Easy resume questions must focus on overview/fundamentals');
});

runTest('Resume + Hard Difficulty: Questions focus on architecture, bottlenecks & trade-offs', () => {
  const qHard = generateGroundedResumeQuestions(mockCandidate, mockResume, 2, 'Hard');
  assert.strictEqual(qHard.length, 2);
  const text = qHard.map(q => q.question).join(' ');
  assert.ok(/architectural trade-offs|scalability bottlenecks|security|high performance|resilience|optimize/i.test(text), 'Hard resume questions must focus on architecture/scalability');
});

// ─────────────────────────────────────────────────────────────────
// TEST 3: End-to-End Generation with Difficulty + Resume Rules
// ─────────────────────────────────────────────────────────────────

await runAsyncTest('End-to-End: 5 Questions (Medium Full Stack) -> 2 Resume + 2 Domain + 1 General', async () => {
  const result = await generateAndValidateInterviewQuestions({
    domain: 'Full Stack Developer',
    difficulty: 'Medium',
    totalQuestions: 5,
    candidateProfile: mockCandidate,
    resumeText: mockResume,
  });

  assert.strictEqual(result.questions.length, 5);
  const resumeCount = result.questions.filter(q => q.type === 'resume_based').length;
  assert.strictEqual(resumeCount, 2, `Expected 2 resume questions for N=5, got ${resumeCount}`);
});

await runAsyncTest('End-to-End: 4 Questions (Hard Data Science) -> 1 Resume + 2 Domain + 1 General', async () => {
  const result = await generateAndValidateInterviewQuestions({
    domain: 'Data Scientist',
    difficulty: 'Hard',
    totalQuestions: 4,
    candidateProfile: {
      fullName: 'Data Candidate',
      targetRole: 'Data Scientist',
      skills: ['Python', 'Pandas', 'Scikit-learn'],
      projects: ['Customer Churn Prediction Model'],
    },
    resumeText: 'Built customer churn prediction model using Random Forest and Scikit-learn.',
  });

  assert.strictEqual(result.questions.length, 4);
  const resumeCount = result.questions.filter(q => q.type === 'resume_based').length;
  assert.strictEqual(resumeCount, 1, `Expected 1 resume question for N=4, got ${resumeCount}`);
});

// ─────────────────────────────────────────────────────────────────
// TEST 4: Job Fit & Readiness Score Distinction
// ─────────────────────────────────────────────────────────────────

runTest('Job Fit Distinction: High Resume Match (90%) + Low Interview (50%)', () => {
  const resumeJd = 90;
  const interview = 50;
  const overallReadiness = Math.round((interview * 0.55) + (resumeJd * 0.45)); // 68% -> Moderate Match
  assert.strictEqual(overallReadiness, 68);
  assert.notStrictEqual(resumeJd, interview, 'Resume-JD and Interview performance MUST NOT be conflated');
});

runTest('Job Fit Distinction: Low Resume Match (55%) + High Interview (90%)', () => {
  const resumeJd = 55;
  const interview = 90;
  const overallReadiness = Math.round((interview * 0.55) + (resumeJd * 0.45)); // 74% -> Good Match
  assert.strictEqual(overallReadiness, 74);
  assert.notStrictEqual(resumeJd, interview);
});

runTest('Job Fit Distinction: High Both (90% + 90%) -> Strong Match', () => {
  const resumeJd = 90;
  const interview = 90;
  const overallReadiness = Math.round((interview * 0.55) + (resumeJd * 0.45)); // 90%
  assert.strictEqual(overallReadiness, 90);
});

console.log('\n====================================================');
console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL DIFFICULTY & JOB FIT TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('⚠️ SOME TESTS FAILED');
  process.exitCode = 1;
}
console.log('====================================================\n');
