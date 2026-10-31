import assert from 'assert';
import {
  parseDifficultyToLevel,
  parseLevelToDifficultyName,
  calculatePerformanceTrend,
  determineNextInterviewAction,
  evaluateAnswerQuality,
  generateAdaptiveNextQuestion,
} from '../services/adaptiveIntelligenceService.js';

console.log('====================================================');
console.log('🧪 RUNNING AI ADAPTIVE INTERVIEW INTELLIGENCE TESTS');
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
// TEST 1: Difficulty Level Normalization & Clamping
// ─────────────────────────────────────────────────────────────────

runTest('Level Parsing: "Easy" -> 1, "Medium" -> 2, "Hard" -> 3, "Expert" -> 4', () => {
  assert.strictEqual(parseDifficultyToLevel('Easy'), 1);
  assert.strictEqual(parseDifficultyToLevel('Beginner'), 1);
  assert.strictEqual(parseDifficultyToLevel('Medium'), 2);
  assert.strictEqual(parseDifficultyToLevel('Intermediate'), 2);
  assert.strictEqual(parseDifficultyToLevel('Hard'), 3);
  assert.strictEqual(parseDifficultyToLevel('Advanced'), 3);
  assert.strictEqual(parseDifficultyToLevel('Expert'), 4);
});

runTest('Level Names: 1 -> "Easy", 2 -> "Medium", 3 -> "Hard", 4 -> "Expert"', () => {
  assert.strictEqual(parseLevelToDifficultyName(1), 'Easy');
  assert.strictEqual(parseLevelToDifficultyName(2), 'Medium');
  assert.strictEqual(parseLevelToDifficultyName(3), 'Hard');
  assert.strictEqual(parseLevelToDifficultyName(4), 'Expert');
});

// ─────────────────────────────────────────────────────────────────
// TEST 2: Performance Trend Calculation
// ─────────────────────────────────────────────────────────────────

runTest('Performance Trend: [6, 7, 9] -> "improving"', () => {
  assert.strictEqual(calculatePerformanceTrend([6, 7, 9]), 'improving');
});

runTest('Performance Trend: [9, 8, 5] -> "declining"', () => {
  assert.strictEqual(calculatePerformanceTrend([9, 8, 5]), 'declining');
});

runTest('Performance Trend: [7, 7, 7] -> "stable"', () => {
  assert.strictEqual(calculatePerformanceTrend([7, 7, 7]), 'stable');
});

// ─────────────────────────────────────────────────────────────────
// TEST 3: Adaptive Difficulty Transitions
// ─────────────────────────────────────────────────────────────────

runTest('Adaptive Increase: Level 2 (Medium) + Score 9.0 -> Level 3 (Hard)', () => {
  const result = determineNextInterviewAction({
    interviewState: {
      totalQuestions: 5,
      currentQuestionNumber: 1,
      currentDifficultyLevel: 2,
      resumeQuestionsRequired: 2,
      resumeQuestionsAsked: 0,
      scoresHistory: [],
    },
    answerEvaluation: { answerScore: 9.0, extractedTopics: [] },
  });

  assert.strictEqual(result.difficultyAction, 'increase');
  assert.strictEqual(result.recommendedDifficultyLevel, 3);
  assert.strictEqual(result.difficultyName, 'Hard');
});

runTest('Adaptive Maintain: Level 2 (Medium) + Score 7.0 -> Level 2 (Medium)', () => {
  const result = determineNextInterviewAction({
    interviewState: {
      totalQuestions: 5,
      currentQuestionNumber: 1,
      currentDifficultyLevel: 2,
      resumeQuestionsRequired: 2,
      resumeQuestionsAsked: 0,
      scoresHistory: [],
    },
    answerEvaluation: { answerScore: 7.0, extractedTopics: [] },
  });

  assert.strictEqual(result.difficultyAction, 'maintain');
  assert.strictEqual(result.recommendedDifficultyLevel, 2);
  assert.strictEqual(result.difficultyName, 'Medium');
});

runTest('Adaptive Decrease: Level 3 (Hard) + Score 4.0 -> Level 2 (Medium)', () => {
  const result = determineNextInterviewAction({
    interviewState: {
      totalQuestions: 5,
      currentQuestionNumber: 2,
      currentDifficultyLevel: 3,
      resumeQuestionsRequired: 2,
      resumeQuestionsAsked: 0,
      scoresHistory: [9.0],
    },
    answerEvaluation: { answerScore: 4.0, extractedTopics: [] },
  });

  assert.strictEqual(result.difficultyAction, 'decrease');
  assert.strictEqual(result.recommendedDifficultyLevel, 2);
  assert.strictEqual(result.difficultyName, 'Medium');
});

// ─────────────────────────────────────────────────────────────────
// TEST 4: Boundary Clamping & Max 1-Level Jump
// ─────────────────────────────────────────────────────────────────

runTest('Level 4 (Expert) + Score 10.0 -> Level 5 (Master)', () => {
  const result = determineNextInterviewAction({
    interviewState: {
      totalQuestions: 5,
      currentQuestionNumber: 3,
      currentDifficultyLevel: 4,
      resumeQuestionsRequired: 2,
      resumeQuestionsAsked: 1,
      scoresHistory: [9.0, 9.0],
    },
    answerEvaluation: { answerScore: 10.0, extractedTopics: [] },
  });

  assert.strictEqual(result.recommendedDifficultyLevel, 5);
  assert.strictEqual(result.difficultyAction, 'increase');
});

runTest('Maximum Boundary: Level 5 (Master) + Score 10.0 -> Level 5 (No Level 6)', () => {
  const result = determineNextInterviewAction({
    interviewState: {
      totalQuestions: 5,
      currentQuestionNumber: 3,
      currentDifficultyLevel: 5,
      resumeQuestionsRequired: 2,
      resumeQuestionsAsked: 1,
      scoresHistory: [9.0, 9.0],
    },
    answerEvaluation: { answerScore: 10.0, extractedTopics: [] },
  });

  assert.strictEqual(result.recommendedDifficultyLevel, 5);
  assert.strictEqual(result.difficultyAction, 'maintain');
});

runTest('Minimum Boundary: Level 1 (Easy) + Score 2.0 -> Level 1 (No Level 0)', () => {
  const result = determineNextInterviewAction({
    interviewState: {
      totalQuestions: 5,
      currentQuestionNumber: 1,
      currentDifficultyLevel: 1,
      resumeQuestionsRequired: 2,
      resumeQuestionsAsked: 0,
      scoresHistory: [],
    },
    answerEvaluation: { answerScore: 2.0, extractedTopics: [] },
  });

  assert.strictEqual(result.recommendedDifficultyLevel, 1);
  assert.strictEqual(result.difficultyAction, 'maintain');
});

runTest('Single Level Jump: Level 1 (Easy) + Perfect Score 10.0 -> Level 2 (Never jumps directly to 3 or 4)', () => {
  const result = determineNextInterviewAction({
    interviewState: {
      totalQuestions: 5,
      currentQuestionNumber: 1,
      currentDifficultyLevel: 1,
      resumeQuestionsRequired: 2,
      resumeQuestionsAsked: 0,
      scoresHistory: [],
    },
    answerEvaluation: { answerScore: 10.0, extractedTopics: [] },
  });

  assert.strictEqual(result.recommendedDifficultyLevel, 2, 'Must strictly increment by exactly +1 level per turn');
});

// ─────────────────────────────────────────────────────────────────
// TEST 5: Mandatory Resume Question Quota Guarantee
// ─────────────────────────────────────────────────────────────────

runTest('Mandatory Resume Quota: Questions Remaining == Resume Questions Needed -> Forces resume_based', () => {
  const result = determineNextInterviewAction({
    interviewState: {
      totalQuestions: 5,
      currentQuestionNumber: 3, // 5 - 3 = 2 questions remaining
      currentDifficultyLevel: 3,
      resumeQuestionsRequired: 2,
      resumeQuestionsAsked: 0, // 2 resume questions still needed
      scoresHistory: [8.5, 9.0],
    },
    answerEvaluation: { answerScore: 9.0, extractedTopics: [] },
  });

  assert.strictEqual(result.nextQuestionType, 'resume_based', 'Priority rule must enforce resume_based question quota');
});

// ─────────────────────────────────────────────────────────────────
// TEST 6: Complete Adaptive Interview Simulation
// ─────────────────────────────────────────────────────────────────

runTest('Simulation: 5-Question Interview adapts across all turns', () => {
  let currentLevel = 2; // Start Medium
  const trajectory = [];
  const scores = [9.0, 9.5, 4.5, 8.0]; // Q1 (9.0), Q2 (9.5), Q3 (4.5), Q4 (8.0)
  const scoresHistory = [];

  for (let q = 1; q <= 4; q++) {
    const score = scores[q - 1];
    scoresHistory.push(score);
    const action = determineNextInterviewAction({
      interviewState: {
        totalQuestions: 5,
        currentQuestionNumber: q,
        currentDifficultyLevel: currentLevel,
        resumeQuestionsRequired: 2,
        resumeQuestionsAsked: q === 2 ? 1 : 0,
        scoresHistory,
      },
      answerEvaluation: { answerScore: score, extractedTopics: [] },
    });

    trajectory.push({
      question: q,
      fromLevel: currentLevel,
      toLevel: action.recommendedDifficultyLevel,
      action: action.difficultyAction,
      score,
    });

    currentLevel = action.recommendedDifficultyLevel;
  }

  // Verification of trajectory:
  // Q1 (Score 9.0) -> Level 2 to Level 3 (increase)
  assert.strictEqual(trajectory[0].fromLevel, 2);
  assert.strictEqual(trajectory[0].toLevel, 3);
  assert.strictEqual(trajectory[0].action, 'increase');

  // Q2 (Score 9.5) -> Level 3 to Level 4 (increase)
  assert.strictEqual(trajectory[1].fromLevel, 3);
  assert.strictEqual(trajectory[1].toLevel, 4);
  assert.strictEqual(trajectory[1].action, 'increase');

  // Q3 (Score 4.5) -> Level 4 to Level 3 (decrease)
  assert.strictEqual(trajectory[2].fromLevel, 4);
  assert.strictEqual(trajectory[2].toLevel, 3);
  assert.strictEqual(trajectory[2].action, 'decrease');

  // Q4 (Score 8.0) -> Level 3 to Level 4 (increase)
  assert.strictEqual(trajectory[3].fromLevel, 3);
  assert.strictEqual(trajectory[3].toLevel, 4);
  assert.strictEqual(trajectory[3].action, 'increase');
});

// ─────────────────────────────────────────────────────────────────
// TEST 7: Dynamic Next Adaptive Question Construction
// ─────────────────────────────────────────────────────────────────

await runAsyncTest('Dynamic Adaptive Question Generation for Level 3 Hard', async () => {
  const adaptiveQ = await generateAdaptiveNextQuestion({
    domain: 'Software Developer',
    targetDifficultyLevel: 3,
    nextQuestionType: 'scenario_based',
    previousQuestion: 'What is a REST API?',
    previousAnswer: 'A REST API uses HTTP methods like GET and POST for communication.',
    existingQuestions: [],
  });

  assert.ok(adaptiveQ.question && adaptiveQ.question.length > 15);
  assert.strictEqual(adaptiveQ.difficultyLevel, 3);
  assert.strictEqual(adaptiveQ.difficultyName, 'Hard');
});

console.log('\n====================================================');
console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL AI ADAPTIVE INTELLIGENCE TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('⚠️ SOME TESTS FAILED');
  process.exitCode = 1;
}
console.log('====================================================\n');
