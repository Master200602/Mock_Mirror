import assert from 'assert';
import { conductConversation } from '../controllers/interviewController.js';

console.log('Testing conductConversation controller directly...');

// Mock Request & Response
const req = {
  body: {
    domain: 'Software Developer',
    difficulty: 'Medium',
    totalQuestions: 5,
    conversationHistory: [
      { role: 'interviewer', text: 'Hello! Please tell me about yourself.' }
    ],
    userAnswer: 'I am a full stack developer with 3 years of experience in React and Node.js.',
    candidateProfile: {
      fullName: 'Alex Candidate',
      targetRole: 'Software Developer',
      skills: ['React', 'Node.js', 'PostgreSQL'],
    },
    resumeText: 'Experience: Full stack developer with React, Node.js, and PostgreSQL.',
    plannedQuestions: [
      { question: 'What is a REST API?', type: 'domain_based' }
    ],
    currentQuestionIndex: 1,
    interviewState: {
      currentDifficultyLevel: 2,
      scoresHistory: [],
      difficultyHistory: [2],
      resumeQuestionsRequired: 2,
      resumeQuestionsAsked: 0,
    },
  },
};

let responseStatus = null;
let responseJson = null;

const res = {
  status: (code) => {
    responseStatus = code;
    return {
      json: (data) => {
        responseJson = data;
      }
    };
  }
};

const next = (err) => {
  if (err) {
    console.error('Controller threw error:', err);
    process.exit(1);
  }
};

await conductConversation(req, res, next);

console.log('Response status:', responseStatus);
console.log('Response AI text:', responseJson?.aiResponse);
console.log('Adaptive state:', responseJson?.adaptiveState);

assert.strictEqual(responseStatus, 200);
assert.ok(responseJson?.aiResponse);
assert.ok(responseJson?.adaptiveState);
console.log('✅ conductConversation controller test passed perfectly!');
