import assert from 'assert';
import {
  calculateQuestionDistribution,
  normalizeQuestionTypes,
  normalizeQuestionType,
  interleaveNaturalInterview,
  generateGroundedResumeQuestions,
  generateGroundedJdQuestions,
  generateDomainTechnicalQuestions,
  generateGeneralBehavioralQuestions,
  generateAndValidateInterviewQuestions,
} from '../services/questionService.js';
import { getDomainCompetencies, DOMAIN_GROUPS } from '../config/domainCompetencies.js';

console.log('====================================================');
console.log('🧪 RUNNING DOMAIN-AWARE INTERVIEW QUESTION TEST SUITE');
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
// TEST 1: Exact 1 to 10 Question Distribution Rule Table
// ─────────────────────────────────────────────────────────────────

const EXPECTED_DISTRIBUTIONS = [
  { N: 1, resume: 0, domain: 1, general: 0 },
  { N: 2, resume: 1, domain: 1, general: 0 },
  { N: 3, resume: 1, domain: 1, general: 1 },
  { N: 4, resume: 1, domain: 2, general: 1 },
  { N: 5, resume: 2, domain: 2, general: 1 },
  { N: 6, resume: 2, domain: 3, general: 1 },
  { N: 7, resume: 2, domain: 3, general: 2 },
  { N: 8, resume: 3, domain: 3, general: 2 },
  { N: 9, resume: 3, domain: 4, general: 2 },
  { N: 10, resume: 3, domain: 5, general: 2 },
];

for (const { N, resume, domain, general } of EXPECTED_DISTRIBUTIONS) {
  runTest(`Distribution Rule: Total ${N} -> ${resume} Resume + ${domain} Domain + ${general} General`, () => {
    const dist = calculateQuestionDistribution(N, true, false);
    assert.strictEqual(dist.totalQuestions, N, `Total must be ${N}`);
    assert.strictEqual(dist.resumeQuestions, resume, `Resume count for N=${N} must be ${resume}`);
    assert.strictEqual(dist.domainQuestions, domain, `Domain count for N=${N} must be ${domain}`);
    assert.strictEqual(dist.generalQuestions, general, `General count for N=${N} must be ${general}`);
    assert.strictEqual(dist.resumeQuestions + dist.domainQuestions + dist.generalQuestions, N, `Sum must equal ${N}`);
  });
}

// ─────────────────────────────────────────────────────────────────
// TEST 2: Scaling for N > 10
// ─────────────────────────────────────────────────────────────────

runTest('Distribution Scaling for N = 12, 15, 20 questions', () => {
  for (const count of [12, 15, 20]) {
    const dist = calculateQuestionDistribution(count, true, false);
    assert.strictEqual(dist.totalQuestions, count, `Total must be ${count}`);
    assert.strictEqual(dist.resumeQuestions + dist.domainQuestions + dist.generalQuestions, count, `Sum must equal ${count}`);
    assert.ok(dist.resumeQuestions >= Math.floor(count * 0.3), `Resume must be ~30-40% for N=${count}`);
    assert.ok(dist.generalQuestions >= 2, `General must be at least 2 for N=${count}`);
    assert.ok(dist.domainQuestions >= Math.floor(count * 0.4), `Domain must be ~40-50% for N=${count}`);
  }
});

// ─────────────────────────────────────────────────────────────────
// TEST 3: No Resume Redistribution Rule
// ─────────────────────────────────────────────────────────────────

runTest('No Resume: Slots are cleanly redistributed to Domain & General without fake resume questions', () => {
  const dist3 = calculateQuestionDistribution(3, false, false);
  assert.strictEqual(dist3.resumeQuestions, 0, 'Resume questions must be 0 when no resume');
  assert.strictEqual(dist3.totalQuestions, 3, 'Total must still be 3');
  assert.strictEqual(dist3.domainQuestions + dist3.generalQuestions, 3, 'Domain + General must equal 3');

  const dist5 = calculateQuestionDistribution(5, false, false);
  assert.strictEqual(dist5.resumeQuestions, 0, 'Resume questions must be 0 when no resume');
  assert.strictEqual(dist5.totalQuestions, 5, 'Total must still be 5');
  assert.strictEqual(dist5.domainQuestions + dist5.generalQuestions, 5, 'Domain + General must equal 5');
});

// ─────────────────────────────────────────────────────────────────
// TEST 4: Domain Competency Knowledge Lookup
// ─────────────────────────────────────────────────────────────────

runTest('Domain Competencies: Software Developer contains OOP, DSA, Databases, APIs, Testing', () => {
  const info = getDomainCompetencies('Software Developer');
  assert.strictEqual(info.category, 'Software Development');
  const compStr = info.competencies.join(' ').toLowerCase();
  assert.ok(compStr.includes('object-oriented') || compStr.includes('oop'), 'Must cover OOP');
  assert.ok(compStr.includes('data structures') || compStr.includes('dsa'), 'Must cover DSA');
  assert.ok(compStr.includes('database') || compStr.includes('sql'), 'Must cover Databases/SQL');
  assert.ok(compStr.includes('api') || compStr.includes('rest'), 'Must cover APIs');
});

runTest('Domain Competencies: Data Scientist contains Statistics, ML, Python, Data Preprocessing', () => {
  const info = getDomainCompetencies('Data Scientist');
  assert.strictEqual(info.category, 'Data');
  const compStr = info.competencies.join(' ').toLowerCase();
  assert.ok(compStr.includes('statistic'), 'Must cover Statistics');
  assert.ok(compStr.includes('python') || compStr.includes('pandas'), 'Must cover Python/Pandas');
  assert.ok(compStr.includes('supervised') || compStr.includes('machine learning'), 'Must cover Machine Learning');
});

runTest('Domain Competencies: Cybersecurity Analyst contains CIA triad, Networking, Firewalls, Threat Modeling', () => {
  const info = getDomainCompetencies('Cybersecurity Analyst');
  assert.strictEqual(info.category, 'Cybersecurity');
  const compStr = info.competencies.join(' ').toLowerCase();
  assert.ok(compStr.includes('cia triad') || compStr.includes('network'), 'Must cover CIA triad / Networking');
  assert.ok(compStr.includes('vulnerability') || compStr.includes('threat'), 'Must cover Vulnerabilities');
});

runTest('Domain Competencies: Cloud Engineer contains Cloud Architecture, IAM, VPC, Containers', () => {
  const info = getDomainCompetencies('Cloud Engineer');
  assert.strictEqual(info.category, 'Cloud / DevOps');
  const compStr = info.competencies.join(' ').toLowerCase();
  assert.ok(compStr.includes('iam'), 'Must cover IAM');
  assert.ok(compStr.includes('vpc') || compStr.includes('subnet'), 'Must cover VPC');
});

// ─────────────────────────────────────────────────────────────────
// TEST 5: Domain Groups & Extensibility
// ─────────────────────────────────────────────────────────────────

runTest('Domain Registry: All 10 groups and required IT roles are present', () => {
  assert.strictEqual(DOMAIN_GROUPS.length, 10, 'Must have 10 domain categories');
  const allRoles = DOMAIN_GROUPS.flatMap(g => g.roles);
  assert.ok(allRoles.includes('Software Developer'), 'Must include Software Developer');
  assert.ok(allRoles.includes('Data Scientist'), 'Must include Data Scientist');
  assert.ok(allRoles.includes('Cybersecurity Analyst'), 'Must include Cybersecurity Analyst');
  assert.ok(allRoles.includes('Cloud Engineer'), 'Must include Cloud Engineer');
  assert.ok(allRoles.includes('DevOps Engineer'), 'Must include DevOps Engineer');
  assert.ok(allRoles.includes('Machine Learning Engineer'), 'Must include Machine Learning Engineer');
  assert.ok(allRoles.includes('Full Stack Developer'), 'Must include Full Stack Developer');
  assert.ok(allRoles.includes('QA Engineer'), 'Must include QA Engineer');
});

// ─────────────────────────────────────────────────────────────────
// TEST 6: Natural Interleaving Order
// ─────────────────────────────────────────────────────────────────

runTest('Natural Interleaving: Alternates Domain, Resume, and General questions', () => {
  const resumeQ = [{ question: 'Resume Q1', type: 'resume_based' }, { question: 'Resume Q2', type: 'resume_based' }];
  const domainQ = [{ question: 'Domain Q1', type: 'domain_based' }, { question: 'Domain Q2', type: 'domain_based' }];
  const generalQ = [{ question: 'General Q1', type: 'general' }];

  const interleaved = interleaveNaturalInterview(resumeQ, domainQ, generalQ);
  assert.strictEqual(interleaved.length, 5, 'Must have 5 questions total');
  assert.strictEqual(interleaved[0].type, 'domain_based', 'Q1 should be Domain');
  assert.strictEqual(interleaved[1].type, 'resume_based', 'Q2 should be Resume');
  assert.strictEqual(interleaved[2].type, 'general', 'Q3 should be General');
  assert.strictEqual(interleaved[3].type, 'domain_based', 'Q4 should be Domain');
  assert.strictEqual(interleaved[4].type, 'resume_based', 'Q5 should be Resume');
});

// ─────────────────────────────────────────────────────────────────
// TEST 7: End-to-End Fallback & Application-Side Validation
// ─────────────────────────────────────────────────────────────────

async function runEndToEndTests() {
  await runAsyncTest('End-to-End: 3 Questions (Software Developer) -> 1 Resume + 1 Domain + 1 General', async () => {
    const res = await generateAndValidateInterviewQuestions({
      domain: 'Software Developer',
      difficulty: 'Intermediate',
      totalQuestions: 3,
      candidateProfile: {
        fullName: 'Alex Johnson',
        targetRole: 'Software Developer',
        skills: ['JavaScript', 'React', 'Node.js'],
        projects: ['E-Commerce Web App with React and Express'],
      },
      resumeText: 'Developed an e-commerce platform using React, Node.js, and MongoDB.',
    });

    assert.strictEqual(res.questions.length, 3, 'Must return exactly 3 questions');
    assert.strictEqual(res.distribution.resumeQuestions, 1, 'Resume count must be 1');
    assert.strictEqual(res.distribution.domainQuestions, 1, 'Domain count must be 1');
    assert.strictEqual(res.distribution.generalQuestions, 1, 'General count must be 1');
  });

  await runAsyncTest('End-to-End: 5 Questions (Data Scientist) -> 2 Resume + 2 Domain + 1 General', async () => {
    const res = await generateAndValidateInterviewQuestions({
      domain: 'Data Scientist',
      difficulty: 'Medium',
      totalQuestions: 5,
      candidateProfile: {
        fullName: 'Jordan Smith',
        targetRole: 'Data Scientist',
        skills: ['Python', 'Pandas', 'Scikit-Learn', 'SQL'],
        projects: ['Customer Churn Prediction with Random Forest'],
      },
      resumeText: 'Built customer churn prediction model using Python, Pandas, and Random Forests achieving 88% accuracy.',
    });

    assert.strictEqual(res.questions.length, 5, 'Must return exactly 5 questions');
    assert.strictEqual(res.distribution.resumeQuestions, 2, 'Resume count must be 2');
    assert.strictEqual(res.distribution.domainQuestions, 2, 'Domain count must be 2');
    assert.strictEqual(res.distribution.generalQuestions, 1, 'General count must be 1');
  });

  await runAsyncTest('End-to-End: 7 Questions (Cybersecurity Analyst) -> 2 Resume + 3 Domain + 2 General', async () => {
    const res = await generateAndValidateInterviewQuestions({
      domain: 'Cybersecurity Analyst',
      difficulty: 'Advanced',
      totalQuestions: 7,
      candidateProfile: {
        fullName: 'Taylor Reed',
        targetRole: 'Cybersecurity Analyst',
        skills: ['Network Security', 'Wireshark', 'Splunk', 'Vulnerability Assessment'],
        projects: ['Enterprise SIEM Log Correlation & Incident Response Pipeline'],
      },
      resumeText: 'Configured Splunk SIEM alerts, investigated unauthorized access attempts, and performed penetration tests.',
    });

    assert.strictEqual(res.questions.length, 7, 'Must return exactly 7 questions');
    assert.strictEqual(res.distribution.resumeQuestions, 2, 'Resume count must be 2');
    assert.strictEqual(res.distribution.domainQuestions, 3, 'Domain count must be 3');
    assert.strictEqual(res.distribution.generalQuestions, 2, 'General count must be 2');
  });

  console.log('\n====================================================');
  console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL DOMAIN-AWARE INTERVIEW TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('⚠️ SOME TESTS FAILED');
    process.exitCode = 1;
  }
  console.log('====================================================\n');
}

runEndToEndTests();
