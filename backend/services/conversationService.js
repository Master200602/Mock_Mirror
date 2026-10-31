import { GoogleGenerativeAI } from '@google/generative-ai';

export const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-3.6-flash',
].filter(Boolean);

let cachedWorkingModel = null;

/**
 * Returns the GoogleGenerativeAI client instance or null if key is missing/invalid.
 */
export function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === '' || key === 'your_gemini_api_key_here') return null;
  return new GoogleGenerativeAI(key.trim());
}

/**
 * Returns an active Gemini model with fallback capability.
 */
export function getGeminiModel(modelName) {
  const genAI = getGeminiClient();
  if (!genAI) return null;
  const target = modelName || cachedWorkingModel || GEMINI_MODELS[0] || 'gemini-flash-lite-latest';
  return genAI.getGenerativeModel({ model: target });
}

/**
 * Executes generateContent with an automatic multi-model fallback cascade.
 * If a model fails due to 429 Quota Exceeded, 404, or 503, it transparently
 * tries the next available model in the cascade.
 *
 * @param {string} prompt
 * @param {Object} [generationConfig]
 * @returns {Promise<{text: string, modelUsed: string}>}
 */
export async function generateWithGeminiFallback(prompt, generationConfig = {}) {
  const genAI = getGeminiClient();
  if (!genAI) {
    throw new Error('GEMINI_NOT_CONFIGURED');
  }

  // Prioritize previously working model, then the full list
  const modelList = [
    cachedWorkingModel,
    ...GEMINI_MODELS.filter(m => m !== cachedWorkingModel),
  ].filter(Boolean);

  let lastError = null;

  for (const modelName of modelList) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, ...generationConfig });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      cachedWorkingModel = modelName;
      return { text, modelUsed: modelName };
    } catch (err) {
      console.warn(`[Gemini Cascade] Model ${modelName} failed: ${err.message?.split('\n')[0]}`);
      lastError = err;
      // If error is invalid API key altogether (not model quota), we can break early
      const msg = err.message || '';
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('All Gemini models exhausted');
}

// ─────────────────────────────────────────────────────────────────
// SAFE JSON EXTRACTION
// ─────────────────────────────────────────────────────────────────

/**
 * Extracts and parses JSON from raw Gemini output, handling code fences.
 */
export function extractJSON(text) {
  let s = (text || '').trim();
  if (s.includes('```json')) s = s.split('```json')[1].split('```')[0].trim();
  else if (s.includes('```')) s = s.split('```')[1].split('```')[0].trim();
  const match = s.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  return JSON.parse(s);
}

// ─────────────────────────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────────────────────────

/**
 * Builds the minimum relevant context for a Gemini call.
 * Limits conversation history to avoid excessive token usage.
 */
export function buildInterviewContext({
  domain = 'Software Engineering',
  difficulty = 'Medium',
  totalQuestions = 5,
  conversationHistory = [],
  userAnswer = '',
  candidateProfile = {},
  resumeText = '',
  interviewerName = 'Sarah Jenkins',
  interviewerTitle = 'Lead Technical Recruiter',
  plannedQuestions = [],
  currentQuestionIndex = 0,
  isComplete = false,
}) {
  const candidateName = candidateProfile?.fullName || 'Candidate';
  const targetRole = candidateProfile?.targetRole || domain;
  const skillsList = candidateProfile?.skills?.join(', ') || '';
  const projectsList = candidateProfile?.projects?.join(', ') || '';

  // Count questions asked (interviewer messages after the initial greeting)
  const questionsAsked = conversationHistory
    ? conversationHistory.filter((m, i) => m.role === 'interviewer' && i > 0).length
    : 0;

  const isFirstTurn = !conversationHistory?.length && !userAnswer;

  // Determine if this turn completes the interview
  const isConcluded = Boolean(isComplete || (questionsAsked >= totalQuestions && !!userAnswer));

  // Identify current planned question if available (only if NOT concluded)
  const plannedIdx = typeof currentQuestionIndex === 'number' ? currentQuestionIndex : questionsAsked;
  const currentPlannedQuestion = (!isConcluded && plannedQuestions && plannedQuestions[plannedIdx])
    ? plannedQuestions[plannedIdx]
    : null;

  // Limit conversation history to last 12 turns to manage tokens
  const MAX_HISTORY_TURNS = 12;
  const recentHistory = conversationHistory.length > MAX_HISTORY_TURNS
    ? conversationHistory.slice(-MAX_HISTORY_TURNS)
    : conversationHistory;

  // Format history as readable text
  const historyText = recentHistory.length > 0
    ? recentHistory.map(m =>
        `${m.role === 'interviewer' ? interviewerName : candidateName}: ${m.text}`
      ).join('\n')
    : '(No history yet)';

  // Identify the current question being discussed
  const lastInterviewerMsg = [...(conversationHistory || [])].reverse().find(m => m.role === 'interviewer');
  const currentQuestion = lastInterviewerMsg?.text || '(First turn — no question yet)';

  // Trim resume to reasonable size
  const resumeExcerpt = resumeText ? resumeText.slice(0, 1500) : '';

  return {
    domain,
    difficulty,
    totalQuestions,
    questionsAsked,
    isFirstTurn,
    candidateName,
    targetRole,
    skillsList,
    projectsList,
    resumeExcerpt,
    interviewerName,
    interviewerTitle,
    historyText,
    currentQuestion,
    currentPlannedQuestion,
    plannedQuestions,
    userAnswer: userAnswer || '',
    isComplete: isConcluded,
  };
}

// ─────────────────────────────────────────────────────────────────
// CANDIDATE INTENT DETECTION HELPER
// ─────────────────────────────────────────────────────────────────

export function detectCandidateIntent(userAnswer = '') {
  if (!userAnswer || typeof userAnswer !== 'string') return 'normal_answer';
  const lower = userAnswer.toLowerCase().trim();

  // 1. End interview phrases
  const endPatterns = [
    /\b(don't|do not) want to (continue|give|do|finish|answer)\b/i,
    /\b(please|can we|let's) (finish|stop|end|quit|terminate) (the|this)?\s*(interview|session)?\b/i,
    /\b(i want to|i'd like to|i wish to) (stop|quit|end|exit|leave)\b/i,
    /\b(stop the interview|end the interview|finish the interview)\b/i,
    /\b(can we stop|can we end|can we finish|i don't want to answer anymore|can we stop now)\b/i,
    /\b(not giving this interview|i want to leave|please finish it|i want to stop)\b/i,
  ];
  if (endPatterns.some(p => p.test(lower)) && !/continue (with|to work|developing|learning|building)/i.test(lower)) {
    return 'end_interview';
  }

  // 2. Skip question
  const skipPatterns = [
    /\b(can i|please|let's|can we) skip\b/i,
    /\bskip (this|the) question\b/i,
    /\bpass on this\b/i,
    /\bnext question please\b/i,
  ];
  if (skipPatterns.some(p => p.test(lower))) {
    return 'skip_question';
  }

  // 3. Don't know / no idea
  const dontKnowPatterns = [
    /\b(i don't know|i do not know|no idea|have no idea|don't have any idea|no idea about)\b/i,
    /\b(haven't studied|haven't worked on|not familiar with|not aware of|cannot recall)\b/i,
    /\b(i am not sure|i'm not sure|not prepared to explain)\b/i,
  ];
  if (dontKnowPatterns.some(p => p.test(lower)) && lower.length < 90) {
    return 'dont_know';
  }

  // 4. Uncertain / partial
  const uncertainPatterns = [
    /\b(not completely sure|not totally sure|not 100% sure|i might be wrong|if i recall correctly)\b/i,
  ];
  if (uncertainPatterns.some(p => p.test(lower))) {
    return 'uncertain_answer';
  }

  return 'normal_answer';
}

// ─────────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────

/**
 * Builds the complete Gemini system prompt from structured context.
 */
export function buildSystemPrompt(ctx) {
  const detectedIntent = detectCandidateIntent(ctx.userAnswer);
  const isConcluded = ctx.isComplete || detectedIntent === 'end_interview';

  return `You are ${ctx.interviewerName}, a friendly, senior ${ctx.interviewerTitle} conducting a live ${ctx.domain} mock interview at ${ctx.difficulty} difficulty level for MockMirror.

CORE IDENTITY — READ CAREFULLY:
You are a warm, professional, encouraging human-like AI interviewer. You are NOT a robotic chatbot.
You must reason about the candidate's actual message, conversation history, and emotional state/confidence.
Respond naturally with empathetic, authentic conversation.

CANDIDATE CONTEXT:
- Name: ${ctx.candidateName}
- Target Role: ${ctx.targetRole}
${ctx.skillsList ? `- Skills from resume: ${ctx.skillsList}` : ''}
${ctx.projectsList ? `- Projects from resume: ${ctx.projectsList}` : ''}
${ctx.resumeExcerpt ? `- Resume excerpt:\n${ctx.resumeExcerpt}` : '- Resume: Not provided'}

INTERVIEW STATE:
- Domain: ${ctx.domain} | Difficulty: ${ctx.difficulty}
- Questions answered / asked so far: ${ctx.questionsAsked} / ${ctx.totalQuestions}
- Current question being discussed: "${ctx.currentQuestion}"
- Interview Status: ${isConcluded ? 'CONCLUDING / COMPLETED (NO MORE QUESTIONS)' : 'ACTIVE'}
${(!isConcluded && ctx.currentPlannedQuestion) ? `- TARGET NEXT QUESTION TO ASK: "${ctx.currentPlannedQuestion.question}" (Type: ${ctx.currentPlannedQuestion.type})` : ''}

CONVERSATION HISTORY:
${ctx.historyText}

${ctx.userAnswer ? `CANDIDATE'S LATEST MESSAGE: "${ctx.userAnswer}" (Detected Intent: ${detectedIntent})` : '(First turn — candidate has not spoken yet)'}

${ctx.isFirstTurn ? `FIRST TURN INSTRUCTION: This is the very first turn. Greet ${ctx.candidateName} warmly by name and invite them to introduce themselves, their background, and what they have been working on. Do NOT ask a technical question yet.` : ''}

CRITICAL INTENT & INTERACTION RULES:
${isConcluded ? `1. FINAL QUESTION ANSWERED / INTERVIEW COMPLETION:
   - The candidate has completed the final configured question (or requested to stop).
   - Give a warm, concise, professional CLOSING STATEMENT (1-2 sentences).
     Example: "Thank you for your time, ${ctx.candidateName}. That concludes our interview today. We'll now prepare your performance report."
   - STRICT REQUIREMENT: The closing statement is NOT a question.
     You MUST NOT ask any question whatsoever.
     Do NOT ask "Do you have any questions for me?", "Is there anything else?", "Would you like to add anything?", or any other open-ended question.
   - Set "responseType": "transition", "shouldAdvance": false, "isComplete": true.
   - In "evaluation", evaluate their final answer accurately.` : `1. IF CANDIDATE WANTS TO END/STOP THE INTERVIEW (e.g. "I don't want to continue", "Please finish the interview", "Can we stop?"):
   - Respond warmly and professionally: Acknowledge their decision respectfully, thank them for their time, and reassure them that their performance report will compile the feedback from the questions covered so far.
   - Set "isComplete": true, "shouldAdvance": false, "intent": "end_interview", "responseType": "transition".
   - Do NOT ask another technical question.

2. IF CANDIDATE SAYS "I DON'T KNOW" / "NO IDEA" / "NOT PREPARED":
   - Respond with friendly reassurance (e.g. "That's completely fine, it's always great to be upfront about unfamiliar areas. Let's move forward.").
   - In "evaluation", score honestly (e.g. 1-3/10) with constructive feedback, and smoothly transition to ask the TARGET NEXT QUESTION.
   - Set "intent": "dont_know".

3. IF CANDIDATE ASKS TO SKIP:
   - Politely acknowledge (e.g. "No problem at all, let's skip ahead.") and introduce the TARGET NEXT QUESTION.
   - Set "intent": "skip_question".

4. IF CANDIDATE GIVES A NORMAL OR UNCERTAIN ANSWER:
   - React in 1 brief conversational sentence acknowledging their specific answer details before transitioning.
   - NATURAL INTERVIEWER FEEDBACK (Phase 4):
     * If the answer was strong/insightful: Acknowledge naturally (e.g., "Excellent. That's a strong explanation.", "Good. That's a solid approach.", "Exactly right."). Do NOT over-praise or sound robotic.
     * If the answer was average/satisfactory: Acknowledge modestly (e.g., "Good. Let's explore this next.", "Understood. Moving forward.").
     * If the answer was weak/incomplete: Be supportive and redirect smoothly (e.g., "Let's approach this from another angle.", "Fair enough. Let's look at the next area.").
   - STRICT DIFFICULTY LEVEL COMPLIANCE:
     * EASY (Level 1): Ask very basic, foundational questions (simple concepts, definitions, syntax). Never ask complex system architecture.
     * MEDIUM (Level 2): Ask intermediate, practical real-world development questions (debugging, APIs, state management).
     * HARD / MASTER (Levels 3-5): Ask advanced, difficult questions (concurrency, distributed systems, scalability bottlenecks, trade-offs).
   - Smoothly introduce and ask the TARGET NEXT QUESTION.
   - In "evaluation", evaluate their answer quality fairly.`}

BEHAVIORAL RULES:
- 2–4 natural spoken sentences per turn (1-2 sentences for closing statement).
- Conversational, supportive tone. No bullet points or markdown fences in response text.
- Never repeat earlier questions.

Respond with ONLY raw valid JSON:
{
  "response": "your natural spoken response",
  "responseType": "${isConcluded ? 'transition' : 'interview_question|transition|feedback|clarification'}",
  "shouldAdvance": ${isConcluded ? 'false' : 'true'},
  "questionNumber": ${ctx.isFirstTurn ? 1 : Math.min(ctx.totalQuestions, ctx.questionsAsked + 1)},
  "isComplete": ${isConcluded ? 'true' : 'false'},
  "intent": "${detectedIntent}",
  "evaluation": ${!ctx.isFirstTurn && ctx.userAnswer ? '{"score":1-10,"feedback":"honest 1-line assessment","suggestedAnswer":"concise 1-2 sentence ideal answer highlighting core concepts and best practices","strengths":["..."],"improvements":["..."]}' : 'null'}
}`;
}

// ─────────────────────────────────────────────────────────────────
// RESILIENT INTERVIEW TURN GENERATOR (Emergency Offline Fallback)
// ─────────────────────────────────────────────────────────────────

export function generateContextualInterviewTurn(ctx) {
  const name = ctx.candidateName || 'Candidate';
  const role = ctx.targetRole || ctx.domain || 'Software Developer';
  const qNum = ctx.questionsAsked + 1;
  const intent = detectCandidateIntent(ctx.userAnswer);

  if (ctx.isFirstTurn) {
    return {
      response: `Hello ${name}! Welcome to your ${role} interview. I'm ${ctx.interviewerName}, your interviewer today. To get started, could you briefly introduce yourself, your background, and what you have been working on recently?`,
      responseType: 'interview_question',
      shouldAdvance: true,
      questionNumber: 1,
      isComplete: false,
      intent: 'greeting',
      evaluation: null,
    };
  }

  // 1. Candidate wants to end interview early
  if (intent === 'end_interview') {
    return {
      response: `I completely understand, ${name}. We'll wrap up the interview here. Thank you for your time and participation today. I will compile your performance report based on the questions we covered.`,
      responseType: 'transition',
      shouldAdvance: false,
      questionNumber: ctx.questionsAsked,
      isComplete: true,
      intent: 'end_interview',
      evaluation: {
        score: 0,
        feedback: "Interview concluded early at candidate's request.",
        suggestedAnswer: "In full interviews, provide a structured technical answer highlighting core architecture and trade-offs.",
        strengths: [],
        improvements: ["Aim to complete the full session in future interviews to demonstrate perseverance."],
      },
    };
  }

  const isLastQuestion = Boolean(ctx.isComplete);
  const nextQ = ctx.currentPlannedQuestion?.question || `In ${role}, what are the most critical architectural decisions and performance trade-offs you evaluate?`;

  // 2. Candidate doesn't know or wants to skip
  if (intent === 'dont_know' || intent === 'skip_question') {
    if (isLastQuestion) {
      return {
        response: `That's completely fine, ${name}. Thank you for being honest about that. That concludes our interview session today. We'll now prepare your performance report.`,
        responseType: 'transition',
        shouldAdvance: false,
        questionNumber: ctx.totalQuestions,
        isComplete: true,
        intent,
        evaluation: {
          score: intent === 'dont_know' ? 2 : 0,
          feedback: intent === 'dont_know' ? "Candidate acknowledged unfamiliarity with the topic." : "Question skipped by candidate.",
          suggestedAnswer: `A comprehensive answer for ${role} should outline foundational principles, common patterns, and practical trade-offs.`,
          strengths: ["Honest communication"],
          improvements: ["Strengthen foundational knowledge in this area."],
        },
      };
    }

    return {
      response: `No problem at all, ${name}. It's always best to be upfront about unfamiliar topics. Let's move on to the next question: ${nextQ}`,
      responseType: 'interview_question',
      shouldAdvance: true,
      questionNumber: qNum,
      isComplete: false,
      intent,
      evaluation: {
        score: intent === 'dont_know' ? 2 : 0,
        feedback: intent === 'dont_know' ? "Candidate acknowledged unfamiliarity with the topic." : "Question skipped by candidate.",
        suggestedAnswer: `A strong answer should explain the core concepts of this topic and provide a real-world example from ${role}.`,
        strengths: ["Honest communication"],
        improvements: ["Review concepts in this domain area."],
      },
    };
  }

  // 3. Normal or uncertain answer
  let acknowledgment = "Thank you for walking me through that.";
  if (ctx.userAnswer.length > 70) {
    acknowledgment = "That's a thorough explanation — I appreciate the clear breakdown.";
  } else if (intent === 'uncertain_answer') {
    acknowledgment = "Thanks for sharing your thoughts on that.";
  }

  if (isLastQuestion) {
    return {
      response: `${acknowledgment} That concludes our interview today, ${name}. We'll now prepare your performance report.`,
      responseType: 'transition',
      shouldAdvance: false,
      questionNumber: ctx.totalQuestions,
      isComplete: true,
      intent,
      evaluation: {
        score: Math.min(9, Math.max(5, Math.round(ctx.userAnswer.length / 25) + 5)),
        feedback: "Clear communication with relevant technical concepts demonstrated.",
        suggestedAnswer: `An ideal answer explains core architecture, implementation details, and concrete metrics achieved in ${role}.`,
        strengths: ["Structured explanation", "Relevant technical terms"],
        improvements: ["Include quantitative benchmarks and edge case considerations"],
      },
    };
  }

  return {
    response: `${acknowledgment} Let's move on to the next topic: ${nextQ}`,
    responseType: 'interview_question',
    shouldAdvance: true,
    questionNumber: qNum,
    isComplete: false,
    intent,
    evaluation: {
      score: Math.min(9, Math.max(5, Math.round(ctx.userAnswer.length / 30) + 5)),
      feedback: "Answer addressed the question with appropriate domain context.",
      suggestedAnswer: `A strong response describes technical architecture, design patterns applied, and measurable engineering trade-offs.`,
      strengths: ["Relevant technical terminology", "Good response flow"],
      improvements: ["Provide more architectural trade-offs and quantitative results"],
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// GEMINI CALLER WITH RESILIENT FALLBACK
// ─────────────────────────────────────────────────────────────────

/**
 * Calls Gemini with the built context and returns the parsed response.
 * Seamlessly handles model rate limits and outages via cascading fallbacks.
 *
 * @param {Object} ctx - context object from buildInterviewContext()
 * @returns {Promise<Object>} parsed JSON response from Gemini or fallback engine
 */
export async function callGeminiConversation(ctx) {
  const prompt = buildSystemPrompt(ctx);

  try {
    const { text, modelUsed } = await generateWithGeminiFallback(prompt);
    const data = extractJSON(text);

    return {
      response: String(data.response || data.aiResponse || ''),
      responseType: String(data.responseType || 'general'),
      shouldAdvance: data.shouldAdvance !== false,
      questionNumber: Number(data.questionNumber) || ctx.questionsAsked + 1,
      isComplete: Boolean(data.isComplete),
      evaluation: data.evaluation ? {
        score: Number(data.evaluation.score) || 7,
        feedback: String(data.evaluation.feedback || ''),
        strengths: Array.isArray(data.evaluation.strengths) ? data.evaluation.strengths : [],
        improvements: Array.isArray(data.evaluation.improvements) ? data.evaluation.improvements : [],
      } : null,
      modelUsed,
    };
  } catch (err) {
    console.warn(`[callGeminiConversation] External Gemini cascade unavailable (${err.message}). Using intelligent contextual backup.`);
    return generateContextualInterviewTurn(ctx);
  }
}

// ─────────────────────────────────────────────────────────────────
// ERROR FALLBACK
// ─────────────────────────────────────────────────────────────────

/**
 * Returns an error state object when Gemini is unavailable.
 */
export function getErrorFallback(errorCode, questionsAsked = 0) {
  const messages = {
    GEMINI_NOT_CONFIGURED:
      "The AI interviewer isn't configured yet. Please set a valid GEMINI_API_KEY in the backend .env file to start your interview.",
    GEMINI_API_ERROR:
      "I'm experiencing a brief technical issue connecting to the AI service. Please continue or try sending your message again.",
    GEMINI_QUOTA_EXCEEDED:
      "The AI service has reached its usage limit on the primary model. Falling back to alternative model.",
  };

  return {
    validationStatus: 'ERROR',
    shouldAdvance: true,
    aiResponse: messages[errorCode] || messages.GEMINI_API_ERROR,
    responseType: 'error',
    questionNumber: questionsAsked,
    isComplete: false,
    evaluation: null,
    error: false, // Don't crash frontend with blocking error
    errorCode,
  };
}

