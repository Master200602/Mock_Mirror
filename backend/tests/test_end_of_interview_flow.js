import assert from 'assert';
import { conductConversation } from '../controllers/interviewController.js';
import {
  detectCandidateIntent,
  buildInterviewContext,
  buildSystemPrompt,
  generateContextualInterviewTurn,
} from '../services/conversationService.js';
import { determineNextInterviewAction } from '../services/adaptiveIntelligenceService.js';

console.log('====================================================');
console.log('🧪 RUNNING END-OF-INTERVIEW FLOW & TERMINATION TESTS');
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

// Helper to simulate a controller turn
async function executeConversationTurn({
  domain = 'Software Developer',
  difficulty = 'Medium',
  totalQuestions = 3,
  conversationHistory = [],
  userAnswer = '',
  plannedQuestions = [],
}) {
  let responseData = null;
  const req = {
    body: {
      domain,
      difficulty,
      totalQuestions,
      conversationHistory,
      userAnswer,
      candidateProfile: { fullName: 'Alex Candidate', targetRole: 'Software Developer' },
      resumeText: 'Experience in React, Node.js, and REST APIs.',
      plannedQuestions,
      interviewerName: 'Sarah Jenkins',
      interviewerTitle: 'Lead Technical Recruiter',
    },
  };
  const res = {
    status: () => ({
      json: (data) => {
        responseData = data;
      },
    }),
  };
  const next = (err) => {
    if (err) throw err;
  };

  await conductConversation(req, res, next);
  return responseData;
}

// ─────────────────────────────────────────────────────────────────
// TEST SUITE 1: 3-Question Complete Interview Simulation
// ─────────────────────────────────────────────────────────────────

await runAsyncTest('3-Question Interview: Exactly 3 questions asked, naturally concluded after 3rd answer', async () => {
  const plannedQuestions = [
    { question: 'What is a REST API?', type: 'domain_based' },
    { question: 'How do you handle asynchronous operations in Node.js?', type: 'domain_based' },
    { question: 'Describe a challenging bug you debugged recently.', type: 'behavioral' },
  ];

  const history = [];

  // Turn 0: Session Start (Greeting)
  const turn0 = await executeConversationTurn({
    totalQuestions: 3,
    conversationHistory: history,
    userAnswer: '',
    plannedQuestions,
  });
  assert.strictEqual(turn0.isComplete, false, 'Turn 0 must not be complete');
  assert.strictEqual(turn0.shouldAdvance, true);
  assert.ok(turn0.aiResponse.toLowerCase().includes('introduce') || turn0.aiResponse.toLowerCase().includes('welcome'));
  history.push({ role: 'interviewer', text: turn0.aiResponse });

  // Turn 1: Candidate Introduction
  const turn1 = await executeConversationTurn({
    totalQuestions: 3,
    conversationHistory: history,
    userAnswer: 'Hello Sarah, I am Alex, a full-stack engineer with 3 years of experience in React and Node.js.',
    plannedQuestions,
  });
  assert.strictEqual(turn1.isComplete, false, 'Turn 1 must not be complete');
  assert.strictEqual(turn1.shouldAdvance, true);
  assert.strictEqual(turn1.questionNumber, 1, 'Turn 1 should introduce Question 1');
  history.push({ role: 'candidate', text: 'Hello Sarah, I am Alex, a full-stack engineer with 3 years of experience in React and Node.js.' });
  history.push({ role: 'interviewer', text: turn1.aiResponse });

  // Turn 2: Candidate Answers Question 1
  const turn2 = await executeConversationTurn({
    totalQuestions: 3,
    conversationHistory: history,
    userAnswer: 'A REST API is an architectural style using HTTP standard methods like GET, POST, PUT, DELETE with stateless communication.',
    plannedQuestions,
  });
  assert.strictEqual(turn2.isComplete, false, 'Turn 2 must not be complete');
  assert.strictEqual(turn2.shouldAdvance, true);
  assert.strictEqual(turn2.questionNumber, 2, 'Turn 2 should introduce Question 2');
  history.push({ role: 'candidate', text: 'A REST API is an architectural style using HTTP standard methods like GET, POST, PUT, DELETE with stateless communication.' });
  history.push({ role: 'interviewer', text: turn2.aiResponse });

  // Turn 3: Candidate Answers Question 2
  const turn3 = await executeConversationTurn({
    totalQuestions: 3,
    conversationHistory: history,
    userAnswer: 'In Node.js, asynchronous operations are handled using Promises, async/await, and the event loop with non-blocking I/O.',
    plannedQuestions,
  });
  assert.strictEqual(turn3.isComplete, false, 'Turn 3 must not be complete');
  assert.strictEqual(turn3.shouldAdvance, true);
  assert.strictEqual(turn3.questionNumber, 3, 'Turn 3 should introduce Question 3 (the final question)');
  history.push({ role: 'candidate', text: 'In Node.js, asynchronous operations are handled using Promises, async/await, and the event loop with non-blocking I/O.' });
  history.push({ role: 'interviewer', text: turn3.aiResponse });

  // Turn 4: Candidate Answers Question 3 (FINAL QUESTION)
  const turn4 = await executeConversationTurn({
    totalQuestions: 3,
    conversationHistory: history,
    userAnswer: 'I debugged a race condition in authentication token refresh by adding mutex locking and token caching.',
    plannedQuestions,
  });
  assert.strictEqual(turn4.isComplete, true, 'Turn 4 (after 3rd answer) MUST mark isComplete=true');
  assert.strictEqual(turn4.shouldAdvance, false, 'Turn 4 MUST NOT advance to another question');
  assert.strictEqual(turn4.responseType, 'transition', 'Closing turn responseType must be transition');
  assert.strictEqual(turn4.nextQuestion, null, 'nextQuestion must be null on completion');
  
  // Verify closing statement has NO questions
  assert.ok(!turn4.aiResponse.includes('?'), `Closing statement must NOT contain a question mark. Got: "${turn4.aiResponse}"`);
  assert.ok(
    turn4.aiResponse.toLowerCase().includes('conclude') ||
    turn4.aiResponse.toLowerCase().includes('report') ||
    turn4.aiResponse.toLowerCase().includes('thank'),
    `Closing statement should thank candidate or mention report. Got: "${turn4.aiResponse}"`
  );
});

// ─────────────────────────────────────────────────────────────────
// TEST SUITE 2: 5-Question Complete Interview Simulation
// ─────────────────────────────────────────────────────────────────

await runAsyncTest('5-Question Interview: Concludes cleanly on the 5th answer without asking Question 6', async () => {
  const plannedQuestions = [
    { question: 'Q1: What is a REST API?', type: 'domain_based' },
    { question: 'Q2: How does React Virtual DOM work?', type: 'domain_based' },
    { question: 'Q3: Explain indexing in databases.', type: 'domain_based' },
    { question: 'Q4: How do you secure endpoints?', type: 'domain_based' },
    { question: 'Q5: Tell me about a time you led a team.', type: 'behavioral' },
  ];

  const history = [];

  // Start (Greeting)
  const t0 = await executeConversationTurn({ totalQuestions: 5, conversationHistory: history, userAnswer: '', plannedQuestions });
  history.push({ role: 'interviewer', text: t0.aiResponse });

  // Intro
  const t1 = await executeConversationTurn({ totalQuestions: 5, conversationHistory: history, userAnswer: 'I am Alex.', plannedQuestions });
  history.push({ role: 'candidate', text: 'I am Alex.' });
  history.push({ role: 'interviewer', text: t1.aiResponse });

  // Answers 1 through 4
  for (let q = 1; q <= 4; q++) {
    const t = await executeConversationTurn({
      totalQuestions: 5,
      conversationHistory: history,
      userAnswer: `This is my technical answer to question ${q} with detailed engineering explanations.`,
      plannedQuestions,
    });
    assert.strictEqual(t.isComplete, false, `Turn after answer ${q} must NOT be complete`);
    assert.strictEqual(t.shouldAdvance, true);
    history.push({ role: 'candidate', text: `Answer to question ${q}` });
    history.push({ role: 'interviewer', text: t.aiResponse });
  }

  // Answer 5 (FINAL QUESTION)
  const finalTurn = await executeConversationTurn({
    totalQuestions: 5,
    conversationHistory: history,
    userAnswer: 'I led our backend migration team by establishing daily standups and code review standards.',
    plannedQuestions,
  });

  assert.strictEqual(finalTurn.isComplete, true, 'After answering Q5, interview MUST be complete');
  assert.strictEqual(finalTurn.shouldAdvance, false, 'MUST NOT advance to Q6');
  assert.strictEqual(finalTurn.nextQuestion, null, 'nextQuestion must be null');
  assert.ok(!finalTurn.aiResponse.includes('?'), `Closing statement must NOT ask another question. Got: "${finalTurn.aiResponse}"`);
});

// ─────────────────────────────────────────────────────────────────
// TEST SUITE 3: Closing Statement Quality & Strict No-Question Rule
// ─────────────────────────────────────────────────────────────────

runTest('Offline Concluding Fallback: Produces natural closing statement with isComplete=true and NO questions', () => {
  const ctx = buildInterviewContext({
    domain: 'Software Developer',
    difficulty: 'Medium',
    totalQuestions: 5,
    conversationHistory: [
      { role: 'interviewer', text: 'Greeting' },
      { role: 'candidate', text: 'Intro' },
      { role: 'interviewer', text: 'Q1' },
      { role: 'candidate', text: 'Ans 1' },
      { role: 'interviewer', text: 'Q2' },
      { role: 'candidate', text: 'Ans 2' },
      { role: 'interviewer', text: 'Q3' },
      { role: 'candidate', text: 'Ans 3' },
      { role: 'interviewer', text: 'Q4' },
      { role: 'candidate', text: 'Ans 4' },
      { role: 'interviewer', text: 'Q5' },
    ],
    userAnswer: 'Here is my final answer to question 5 detailing our microservice resilience patterns.',
    candidateProfile: { fullName: 'Alex Candidate' },
    interviewerName: 'Sarah Jenkins',
    isComplete: true,
  });

  const turn = generateContextualInterviewTurn(ctx);
  assert.strictEqual(turn.isComplete, true);
  assert.strictEqual(turn.shouldAdvance, false);
  assert.strictEqual(turn.responseType, 'transition');
  assert.ok(!turn.response.includes('?'), 'Closing statement MUST NOT contain any question mark');
  assert.ok(turn.response.includes('concludes') || turn.response.includes('report'), 'Must mention conclusion or report');
});

// ─────────────────────────────────────────────────────────────────
// TEST SUITE 4: Early Termination Flow
// ─────────────────────────────────────────────────────────────────

await runAsyncTest('Candidate requests early termination: Immediately finishes without asking more questions', async () => {
  const history = [
    { role: 'interviewer', text: 'Welcome! Please introduce yourself.' },
    { role: 'candidate', text: 'Hi, I am Alex.' },
    { role: 'interviewer', text: 'Great. Can you explain REST API design?' },
  ];

  const res = await executeConversationTurn({
    totalQuestions: 5,
    conversationHistory: history,
    userAnswer: "I don't want to continue the interview. Please stop here.",
    plannedQuestions: [{ question: 'Q1' }, { question: 'Q2' }, { question: 'Q3' }, { question: 'Q4' }, { question: 'Q5' }],
  });

  assert.strictEqual(res.isComplete, true, 'Must mark isComplete=true on early stop');
  assert.strictEqual(res.shouldAdvance, false);
  assert.strictEqual(res.intent, 'end_interview');
  assert.strictEqual(res.nextQuestion, null);
  assert.ok(!res.aiResponse.includes('?'), 'Must NOT ask another question');
});

console.log('\n====================================================');
console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL END-OF-INTERVIEW FLOW TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('⚠️ SOME TESTS FAILED');
  process.exitCode = 1;
}
console.log('====================================================\n');
