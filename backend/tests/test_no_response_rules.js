import assert from 'assert';
import { generateReport, isValidCandidateResponse } from '../controllers/interviewController.js';
import { analyzeFillerWords, estimateSpeakingPace } from '../../frontend/src/utils/speechAnalysis.js';

console.log('====================================================');
console.log('🧪 RUNNING ZERO-RESPONSE & NO-FAKE-SCORE TEST SUITE');
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

// Mock express req/res
function createMockReqRes(body) {
  const req = { body };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };

  const next = (err) => {
    throw err;
  };

  return {
    req,
    res,
    next,
    getData: () => responseData,
    getStatus: () => statusCode,
  };
}

async function runAllTests() {
  runTest('isValidCandidateResponse: Correctly identifies valid vs invalid candidate answers', () => {
    assert.strictEqual(isValidCandidateResponse(null), false, 'null is invalid');
    assert.strictEqual(isValidCandidateResponse({}), false, 'empty object is invalid');
    assert.strictEqual(isValidCandidateResponse({ answer: '' }), false, 'empty string is invalid');
    assert.strictEqual(isValidCandidateResponse({ answer: '   ' }), false, 'whitespace string is invalid');
    assert.strictEqual(isValidCandidateResponse({ answer: 'No answer' }), false, 'No answer placeholder is invalid');
    assert.strictEqual(isValidCandidateResponse({ answer: 'silence' }), false, 'silence placeholder is invalid');
    assert.strictEqual(isValidCandidateResponse({ answer: 'unanswered' }), false, 'unanswered is invalid');
    assert.strictEqual(isValidCandidateResponse({ answer: 'N/A' }), false, 'N/A is invalid');

    assert.strictEqual(isValidCandidateResponse({ answer: 'Yes.' }), true, 'Short genuine answer is valid');
    assert.strictEqual(isValidCandidateResponse({ answer: 'I used React and Node.js to build the architecture.' }), true, 'Valid response is valid');
  });

  await runAsyncTest('Case 1 (Zero Responses): Overall score is null, isEvaluable is false, NO fake 75/82 score', async () => {
    const { req, res, next, getData } = createMockReqRes({
      domain: 'Software Engineering',
      difficulty: 'Medium',
      totalQuestions: 5,
      responses: [],
      candidateProfile: { fullName: 'Silent Candidate', targetRole: 'Software Engineer' },
    });

    await generateReport(req, res, next);
    const data = getData();

    assert.strictEqual(data.isEvaluable, false, 'Must be marked as non-evaluable');
    assert.strictEqual(data.overallScore, null, 'Overall score must be null (NEVER 75 or 82)');
    assert.strictEqual(data.answeredQuestions, 0, 'Answered questions count must be 0');
    assert.strictEqual(data.totalQuestions, 5, 'Total questions must be 5');
    assert.strictEqual(data.categoryScores.technical, null, 'Technical score must be null');
    assert.strictEqual(data.categoryScores.communication, null, 'Communication score must be null');
    assert.strictEqual(data.categoryScores.confidence, null, 'Confidence score must be null');
    assert.strictEqual(data.categoryScores.clarity, null, 'Clarity score must be null');
    assert.ok(data.summary.toLowerCase().includes('no valid candidate responses'), 'Summary must explain no answers were provided');
  });

  await runAsyncTest('Case 1b (Placeholder/Silence Responses): Overall score is null', async () => {
    const { req, res, next, getData } = createMockReqRes({
      domain: 'Software Engineering',
      difficulty: 'Medium',
      totalQuestions: 3,
      responses: [
        { question: 'Q1', answer: '' },
        { question: 'Q2', answer: '   ' },
        { question: 'Q3', answer: 'No answer' },
      ],
      candidateProfile: { fullName: 'Silent Candidate' },
    });

    await generateReport(req, res, next);
    const data = getData();

    assert.strictEqual(data.isEvaluable, false, 'Must be marked as non-evaluable');
    assert.strictEqual(data.overallScore, null, 'Overall score must be null');
    assert.strictEqual(data.answeredQuestions, 0, 'Answered questions count must be 0');
  });

  await runAsyncTest('Case 2 (Partial Answers): Evaluates strictly the 1 actual answer', async () => {
    const { req, res, next, getData } = createMockReqRes({
      domain: 'Software Engineering',
      difficulty: 'Medium',
      totalQuestions: 3,
      responses: [
        {
          question: 'Explain how you design scalable REST APIs with Node.js and MongoDB.',
          answer: 'I design stateless REST APIs using Express.js with JWT authentication, indexed MongoDB schemas, and Redis caching.',
          score: 8,
        },
        { question: 'Q2', answer: '' },
        { question: 'Q3', answer: '   ' },
      ],
      candidateProfile: { fullName: 'Alex Morgan', targetRole: 'Software Engineer' },
    });

    await generateReport(req, res, next);
    const data = getData();

    assert.strictEqual(data.isEvaluable, true, 'Must be marked as evaluable');
    assert.strictEqual(data.answeredQuestions, 1, 'Answered questions must be exactly 1');
    assert.strictEqual(data.totalQuestions, 3, 'Total questions must be 3');
    assert.strictEqual(data.overallScore, 80, 'Overall score must be derived strictly from answered questions (8/10 -> 80)');
    assert.ok(data.categoryScores.technical > 0, 'Technical score must be computed');
  });

  await runAsyncTest('Case 3 (All Answers): Evaluates all responses normally', async () => {
    const { req, res, next, getData } = createMockReqRes({
      domain: 'Software Engineering',
      difficulty: 'Medium',
      totalQuestions: 2,
      responses: [
        { question: 'Q1', answer: 'Answer 1 with technical detail.', score: 8 },
        { question: 'Q2', answer: 'Answer 2 with technical detail.', score: 9 },
      ],
      candidateProfile: { fullName: 'Alex Morgan', targetRole: 'Software Engineer' },
    });

    await generateReport(req, res, next);
    const data = getData();

    assert.strictEqual(data.isEvaluable, true, 'Must be marked as evaluable');
    assert.strictEqual(data.answeredQuestions, 2, 'Answered questions must be 2');
    assert.strictEqual(data.overallScore, 85, 'Average of 8 and 9 is 8.5 -> 85');
  });

  runTest('Speech Analysis: 0 candidate words -> WPM returns null (N/A)', () => {
    const pace = estimateSpeakingPace([], 120);
    assert.strictEqual(pace, null, 'WPM must be null when 0 candidate speech occurred (NEVER 130 or 60)');

    const filler = analyzeFillerWords([]);
    assert.strictEqual(filler.count, 0, 'Filler count must be 0');
    assert.strictEqual(filler.totalWords, 0, 'Total words must be 0');
    assert.strictEqual(filler.densityPct, 0, 'Filler density must be 0%');
  });

  runTest('Speech Analysis: Candidate speech calculates genuine WPM', () => {
    const genuineResponses = [
      { answer: 'This is a genuine answer with ten words spoken in this test.' },
    ];
    const pace = estimateSpeakingPace(genuineResponses, 15);
    assert.ok(typeof pace === 'number' && pace > 0, 'Should calculate real WPM for genuine speech');
  });

  console.log('\n====================================================');
  console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL NO-RESPONSE TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('⚠️ SOME TESTS FAILED');
    process.exitCode = 1;
  }
  console.log('====================================================\n');
}

runAllTests();
