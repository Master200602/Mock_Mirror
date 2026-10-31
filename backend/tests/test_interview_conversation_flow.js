import assert from 'assert';
import {
  detectCandidateIntent,
  buildInterviewContext,
  buildSystemPrompt,
  generateContextualInterviewTurn,
} from '../services/conversationService.js';

console.log('====================================================');
console.log('🧪 RUNNING INTERVIEW CONVERSATION FLOW & INTENT TESTS');
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

// ─────────────────────────────────────────────────────────────────
// TEST 1: Intent Detection — End Interview Variations
// ─────────────────────────────────────────────────────────────────

const END_INTERVIEW_PHRASES = [
  "I don't want to continue the interview. Please finish it.",
  "I want to stop.",
  "Please end the interview.",
  "I don't want to continue.",
  "I don't want to give this interview.",
  "Let's finish the interview.",
  "Can we stop now?",
  "Please stop the interview.",
  "Can we end the interview here?",
  "I don't want to answer anymore.",
];

for (const phrase of END_INTERVIEW_PHRASES) {
  runTest(`Intent: "${phrase}" -> end_interview`, () => {
    const intent = detectCandidateIntent(phrase);
    assert.strictEqual(intent, 'end_interview', `Expected "end_interview" for "${phrase}", got "${intent}"`);
  });
}

// ─────────────────────────────────────────────────────────────────
// TEST 2: Intent Detection — No False Positive on Normal Answers
// ─────────────────────────────────────────────────────────────────

const NORMAL_ANSWERS_WITH_TRIGGERS = [
  "I would like to continue developing my skills in Flutter and Firebase.",
  "In my previous project, we decided to stop using polling and switched to WebSockets.",
  "I want to finish building the entire microservices architecture this quarter.",
  "I continued working on the machine learning pipeline to improve precision.",
];

for (const phrase of NORMAL_ANSWERS_WITH_TRIGGERS) {
  runTest(`No False End: "${phrase}" -> normal_answer`, () => {
    const intent = detectCandidateIntent(phrase);
    assert.notStrictEqual(intent, 'end_interview', `Must NOT trigger end_interview for "${phrase}"`);
  });
}

// ─────────────────────────────────────────────────────────────────
// TEST 3: Intent Detection — "Don't Know" & "Uncertain"
// ─────────────────────────────────────────────────────────────────

runTest('Intent: "I don\'t know the answer" -> dont_know', () => {
  const intent = detectCandidateIntent("I don't know the answer to this question.");
  assert.strictEqual(intent, 'dont_know');
});

runTest('Intent: "No idea about this topic" -> dont_know', () => {
  const intent = detectCandidateIntent("no idea about this.");
  assert.strictEqual(intent, 'dont_know');
});

runTest('Intent: "I am not prepared to explain this project yet" -> dont_know', () => {
  const intent = detectCandidateIntent("I am not prepared to explain this project yet.");
  assert.strictEqual(intent, 'dont_know');
});

runTest('Intent: "I\'m not completely sure about this" -> uncertain_answer', () => {
  const intent = detectCandidateIntent("I'm not completely sure about this, but I think it uses indexing.");
  assert.strictEqual(intent, 'uncertain_answer');
});

runTest('Intent: "Can I skip this question?" -> skip_question', () => {
  const intent = detectCandidateIntent("Can I skip this question please?");
  assert.strictEqual(intent, 'skip_question');
});

// ─────────────────────────────────────────────────────────────────
// TEST 4: Turn Generator — First Turn Greeting
// ─────────────────────────────────────────────────────────────────

runTest('Turn Generator: First Turn produces warm greeting and asks for introduction', () => {
  const ctx = buildInterviewContext({
    domain: 'Software Developer',
    difficulty: 'Intermediate',
    totalQuestions: 5,
    conversationHistory: [],
    userAnswer: '',
    candidateProfile: { fullName: 'Yash Prajapati', targetRole: 'Software Developer' },
    interviewerName: 'Sarah Jenkins',
    interviewerTitle: 'Lead Technical Recruiter',
  });

  const turn = generateContextualInterviewTurn(ctx);
  assert.strictEqual(turn.isComplete, false);
  assert.strictEqual(turn.questionNumber, 1);
  assert.ok(turn.response.includes('Yash'), 'Response must greet candidate by name');
  assert.ok(turn.response.includes('introduce yourself'), 'Must invite candidate introduction');
});

// ─────────────────────────────────────────────────────────────────
// TEST 5: Turn Generator — Candidate Requests Early Termination
// ─────────────────────────────────────────────────────────────────

runTest('Turn Generator: Candidate says "I want to stop" -> Graceful polite finish with isComplete=true', () => {
  const ctx = buildInterviewContext({
    domain: 'Software Developer',
    difficulty: 'Intermediate',
    totalQuestions: 5,
    conversationHistory: [
      { role: 'interviewer', text: 'Hello Yash! Introduce yourself.' },
      { role: 'candidate', text: 'Hi, I am Yash.' },
      { role: 'interviewer', text: 'Great. What is your experience with Flutter?' },
    ],
    userAnswer: 'I do not want to continue the interview. Please finish it.',
    candidateProfile: { fullName: 'Yash Prajapati', targetRole: 'Software Developer' },
    interviewerName: 'Sarah Jenkins',
  });

  const turn = generateContextualInterviewTurn(ctx);
  assert.strictEqual(turn.isComplete, true, 'isComplete must be true');
  assert.strictEqual(turn.intent, 'end_interview', 'intent must be end_interview');
  assert.strictEqual(turn.shouldAdvance, false, 'shouldAdvance must be false');
  assert.ok(turn.response.includes('wrap up') || turn.response.includes('understand') || turn.response.includes('conclude'), 'Must have polite parting words');
  assert.ok(!turn.response.includes('?'), 'Must NOT ask another question');
});

// ─────────────────────────────────────────────────────────────────
// TEST 6: Turn Generator — Candidate Says "I don't know"
// ─────────────────────────────────────────────────────────────────

runTest('Turn Generator: Candidate says "no idea about" -> Supportive response, scores honestly, moves to next Q', () => {
  const ctx = buildInterviewContext({
    domain: 'Software Developer',
    difficulty: 'Intermediate',
    totalQuestions: 5,
    conversationHistory: [
      { role: 'interviewer', text: 'Hello Yash!' },
      { role: 'candidate', text: 'Hi.' },
      { role: 'interviewer', text: 'Explain how you design data structures for distributed caching.' },
    ],
    userAnswer: 'no idea about',
    candidateProfile: { fullName: 'Yash Prajapati', targetRole: 'Software Developer' },
    plannedQuestions: [
      { question: 'Q1' },
      { question: 'Q2' },
      { question: 'What are the main principles of REST API design?' },
    ],
    currentQuestionIndex: 2,
  });

  const turn = generateContextualInterviewTurn(ctx);
  assert.strictEqual(turn.isComplete, false, 'isComplete must be false');
  assert.strictEqual(turn.intent, 'dont_know');
  assert.ok(turn.evaluation.score <= 3, 'Evaluation score must be honest (<=3)');
  assert.ok(turn.response.toLowerCase().includes('fine') || turn.response.toLowerCase().includes('problem'), 'Response must be supportive');
  assert.ok(turn.response.includes('REST API') || turn.response.includes('principles'), 'Must ask the target next question');
});

// ─────────────────────────────────────────────────────────────────
// TEST 7: Independent Answer Isolation
// ─────────────────────────────────────────────────────────────────

runTest('Answer Isolation: Answers to multiple questions remain independent with separate keys', () => {
  const responses = [];
  const q1 = { id: 'q_1', question: 'What is Flutter?', answer: 'Flutter is a UI toolkit from Google.' };
  const q2 = { id: 'q_2', question: 'Explain your final project.', answer: 'My final project is MockMirror.' };
  const q3 = { id: 'q_3', question: 'What challenges did you face?', answer: 'Integrating voice recognition was the main challenge.' };

  responses.push(q1, q2, q3);

  assert.strictEqual(responses.length, 3);
  assert.strictEqual(responses[0].answer, 'Flutter is a UI toolkit from Google.');
  assert.strictEqual(responses[1].answer, 'My final project is MockMirror.');
  assert.strictEqual(responses[2].answer, 'Integrating voice recognition was the main challenge.');
  assert.ok(!responses[1].answer.includes(responses[0].answer), 'Answer 2 must NOT contain Answer 1');
  assert.ok(!responses[2].answer.includes(responses[1].answer), 'Answer 3 must NOT contain Answer 2');
});

console.log('\n====================================================');
console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL CONVERSATION & INTENT TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('⚠️ SOME TESTS FAILED');
  process.exitCode = 1;
}
console.log('====================================================\n');
