/**
 * Interview Controller
 * Handles live interview turns, adaptive difficulty progression,
 * question generation, answer evaluation, performance reports, and JD alignment.
 */

import {
  buildInterviewContext,
  callGeminiConversation,
  detectCandidateIntent,
  generateContextualInterviewTurn,
  getGeminiClient,
} from '../services/conversationService.js';
import {
  determineNextInterviewAction,
  evaluateAnswerQuality,
  parseDifficultyToLevel,
  parseLevelToDifficultyName,
} from '../services/adaptiveIntelligenceService.js';
import {
  generateAndValidateInterviewQuestions,
} from '../services/questionService.js';

/**
 * Validates whether a response object contains genuine candidate speech.
 */
export function isValidCandidateResponse(r) {
  if (!r || typeof r !== 'object') return false;
  const answer = typeof r.answer === 'string' ? r.answer.trim() : '';
  if (!answer || answer.length === 0) return false;
  const lower = answer.toLowerCase();
  const invalidPlaceholders = ['no answer', 'silence', 'unanswered', 'n/a', 'na'];
  if (invalidPlaceholders.includes(lower)) return false;
  return /[a-zA-Z0-9]/.test(answer);
}

/**
 * Conducts one turn of an interview conversation.
 */
export async function conductConversation(req, res, next) {
  try {
    const {
      domain = 'Software Developer',
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
      voiceMetrics = null,
      faceMetrics = null,
      interviewState = {},
    } = req.body;

    const intent = detectCandidateIntent(userAnswer);

    // Count technical interviewer questions asked so far (excluding greeting at index 0)
    const questionsAsked = Array.isArray(conversationHistory)
      ? conversationHistory.filter((m, i) => m.role === 'interviewer' && i > 0).length
      : 0;

    const isFirstTurn = (!conversationHistory || conversationHistory.length === 0) && !userAnswer;
    const isConcluded = Boolean(
      intent === 'end_interview' ||
      (!isFirstTurn && questionsAsked >= totalQuestions && Boolean(userAnswer))
    );

    // Build context for AI conversation
    const ctx = buildInterviewContext({
      domain,
      difficulty,
      totalQuestions,
      conversationHistory,
      userAnswer,
      candidateProfile,
      resumeText,
      interviewerName,
      interviewerTitle,
      plannedQuestions,
      currentQuestionIndex: typeof currentQuestionIndex === 'number' ? currentQuestionIndex : questionsAsked,
      isComplete: isConcluded,
    });

    // Generate conversation response
    let turnResult;
    const geminiClient = getGeminiClient();
    if (geminiClient && !isConcluded) {
      try {
        turnResult = await callGeminiConversation(ctx);
      } catch (err) {
        turnResult = generateContextualInterviewTurn(ctx);
      }
    } else {
      turnResult = generateContextualInterviewTurn(ctx);
    }

    // Force strict termination safety
    if (isConcluded) {
      turnResult.isComplete = true;
      turnResult.shouldAdvance = false;
      turnResult.responseType = 'transition';
      // Ensure closing statement does NOT end with a question mark
      if (turnResult.response && turnResult.response.includes('?')) {
        turnResult.response = `Thank you for your time today, ${candidateProfile?.fullName || 'Candidate'}. That concludes our interview session. We will now prepare your performance report.`;
      }
    }

    // Evaluate answer and determine adaptive progression
    let answerEval = turnResult.evaluation;
    if (!isFirstTurn && userAnswer && !answerEval) {
      answerEval = await evaluateAnswerQuality({
        question: ctx.currentQuestion,
        answer: userAnswer,
        domain,
        currentDifficultyLevel: interviewState.currentDifficultyLevel || 2,
        candidateProfile,
        resumeText,
      });
    }

    // Calculate next adaptive state
    const adaptiveAction = determineNextInterviewAction({
      interviewState: {
        totalQuestions,
        currentQuestionNumber: Math.min(totalQuestions, questionsAsked + 1),
        currentDifficultyLevel: interviewState.currentDifficultyLevel || parseDifficultyToLevel(difficulty),
        resumeQuestionsRequired: interviewState.resumeQuestionsRequired ?? Math.floor(totalQuestions / 2),
        resumeQuestionsAsked: interviewState.resumeQuestionsAsked ?? 0,
        scoresHistory: interviewState.scoresHistory || [],
      },
      answerEvaluation: answerEval || {},
      candidateIntent: intent,
      domain,
      voiceMetrics,
      faceMetrics,
    });

    const updatedScoresHistory = [
      ...(interviewState.scoresHistory || []),
      ...(answerEval?.answerScore != null ? [answerEval.answerScore] : []),
    ];

    const currentDiffLevel = parseDifficultyToLevel(interviewState.currentDifficultyLevel || difficulty);
    const nextDiffLevel = adaptiveAction.recommendedDifficultyLevel || currentDiffLevel;

    const adaptiveState = {
      currentDifficultyLevel: currentDiffLevel,
      currentDifficultyName: parseLevelToDifficultyName(currentDiffLevel),
      nextDifficultyLevel: nextDiffLevel,
      nextDifficultyName: parseLevelToDifficultyName(nextDiffLevel),
      difficultyAction: adaptiveAction.difficultyAction,
      reason: adaptiveAction.reason,
      performanceTrend: adaptiveAction.performanceTrend,
      scoresHistory: updatedScoresHistory,
      difficultyHistory: [
        ...(interviewState.difficultyHistory || [currentDiffLevel]),
        nextDiffLevel,
      ],
      nextQuestionType: adaptiveAction.nextQuestionType,
    };

    const nextQObj = (!turnResult.isComplete && plannedQuestions && plannedQuestions[questionsAsked])
      ? plannedQuestions[questionsAsked]
      : null;

    res.status(200).json({
      success: true,
      aiResponse: turnResult.response || turnResult.aiResponse,
      responseType: turnResult.responseType,
      shouldAdvance: turnResult.shouldAdvance,
      questionNumber: isFirstTurn ? 1 : Math.min(totalQuestions, questionsAsked + 1),
      isComplete: turnResult.isComplete,
      intent: turnResult.intent || intent,
      evaluation: answerEval,
      nextQuestion: turnResult.isComplete ? null : nextQObj,
      adaptiveState,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generates and validates an interview question plan.
 */
export async function generateQuestions(req, res, next) {
  try {
    const {
      domain = 'Software Developer',
      difficulty = 'Medium',
      totalQuestions = 5,
      count,
      candidateProfile = {},
      resumeText = '',
      jobDescription = '',
    } = req.body;

    const questionsCount = parseInt(totalQuestions || count, 10) || 5;

    const result = await generateAndValidateInterviewQuestions({
      domain,
      difficulty,
      totalQuestions: questionsCount,
      candidateProfile,
      resumeText,
      jobDescription,
    });

    res.status(200).json({
      success: true,
      questions: result.questions,
      distribution: result.distribution,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Evaluates an individual interview answer.
 */
export async function evaluateAnswer(req, res, next) {
  try {
    const {
      question = '',
      answer = '',
      domain = 'Software Developer',
      difficulty = 'Medium',
    } = req.body;

    const evalResult = await evaluateAnswerQuality({
      question,
      answer,
      domain,
      currentDifficultyLevel: parseDifficultyToLevel(difficulty),
    });

    res.status(200).json({
      success: true,
      evaluation: {
        score: evalResult.answerScore,
        feedback: evalResult.reason,
        strengths: evalResult.keyStrengths,
        improvements: evalResult.improvements,
        suggestedAnswer: evalResult.suggestedAnswer,
        metrics: {
          correctness: evalResult.correctness,
          depth: evalResult.depth,
          relevance: evalResult.relevance,
          communication: evalResult.communication,
          confidence: evalResult.confidence,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generates a comprehensive performance report.
 */
export async function generateReport(req, res, next) {
  try {
    const {
      domain = 'Software Developer',
      difficulty = 'Medium',
      responses = [],
      totalQuestions,
      candidateProfile = {},
      behaviorMetrics = null,
    } = req.body;

    const safeResponses = Array.isArray(responses) ? responses : [];
    const validResponses = safeResponses.filter(isValidCandidateResponse);
    const plannedTotal = totalQuestions ? parseInt(totalQuestions, 10) : Math.max(safeResponses.length, 1);

    if (validResponses.length === 0) {
      const emptyReport = {
        isEvaluable: false,
        overallScore: null,
        answeredQuestions: 0,
        totalQuestions: plannedTotal,
        candidateName: candidateProfile?.fullName || 'Candidate',
        targetRole: candidateProfile?.targetRole || domain,
        domain,
        difficulty,
        status: 'not_completed',
        summary: 'No valid candidate responses were recorded. A performance score cannot be calculated because no answers were provided.',
        categoryScores: {
          technical: null,
          communication: null,
          confidence: null,
          clarity: null,
        },
        strengths: [],
        improvements: [
          'No answers were recorded during the interview session.',
          'Ensure your microphone is properly connected and permission is granted.',
          'Start a new interview session and answer the questions aloud to receive a comprehensive AI performance evaluation.',
        ],
        recommendations: [
          'Complete a practice interview session by speaking clearly into the microphone.',
          'Review the target role concepts before beginning.',
        ],
        detailedFeedback: 'The interview concluded without evaluable candidate answers.',
      };

      return res.status(200).json({
        success: true,
        ...emptyReport,
        report: emptyReport,
      });
    }

    // Calculate score based strictly on valid answers
    const scores = validResponses.map(r => {
      if (typeof r.score === 'number') return r.score;
      if (r.evaluation && typeof r.evaluation.score === 'number') return r.evaluation.score;
      return 7;
    });

    const averageRawScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const overallScore = Math.round(averageRawScore * 10); // Scale to 0-100

    const techScore = Math.min(100, Math.round(averageRawScore * 10));
    const commScore = Math.min(100, Math.max(40, Math.round(averageRawScore * 9.5)));
    const confScore = Math.min(100, Math.max(40, Math.round(averageRawScore * 9.2)));
    const clarityScore = Math.min(100, Math.max(40, Math.round(averageRawScore * 9.4)));

    const report = {
      isEvaluable: true,
      overallScore,
      answeredQuestions: validResponses.length,
      totalQuestions: plannedTotal,
      candidateName: candidateProfile?.fullName || 'Candidate',
      targetRole: candidateProfile?.targetRole || domain,
      domain,
      difficulty,
      status: 'completed',
      summary: `${candidateProfile?.fullName || 'Candidate'} completed ${validResponses.length} answered questions in ${domain} demonstrating solid technical grasp.`,
      categoryScores: {
        technical: techScore,
        communication: commScore,
        confidence: confScore,
        clarity: clarityScore,
      },
      detailedFeedback: `Demonstrated good domain understanding across ${validResponses.length} answered questions. Continue providing structured responses with real-world architecture examples.`,
      strengths: [
        'Structured explanation of core technical concepts',
        'Direct answering to technical interview questions',
      ],
      improvements: [
        'Provide more architectural trade-offs and quantitative benchmarks',
        'Incorporate edge-case handling into technical answers',
      ],
      recommendations: [
        'Practice explaining complex system design trade-offs with structured frameworks',
        'Review advanced performance tuning and database indexing techniques',
      ],
    };

    res.status(200).json({
      success: true,
      ...report,
      report,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generates Resume vs Job Description alignment match analysis.
 */
export async function generateResumeJdAnalysis(req, res, next) {
  try {
    const {
      domain = 'Software Developer',
      candidateProfile = {},
      resumeText = '',
      jobDescription = '',
    } = req.body;

    const candidateName = candidateProfile?.fullName || 'Candidate';
    const targetRole = candidateProfile?.targetRole || domain;
    const candidateSkills = Array.isArray(candidateProfile?.skills) ? candidateProfile.skills : [];

    // Extract JD technical terms
    const jdKeywords = Array.from(new Set(
      (jobDescription.match(/\b(React|Node\.js|Express|MongoDB|SQL|PostgreSQL|Python|Java|C\+\+|TypeScript|JavaScript|AWS|Docker|Kubernetes|REST API|GraphQL|Microservices|Git|CI\/CD|Redux|Next\.js|Flutter|Spring Boot|Pandas|PyTorch|TensorFlow)\b/gi) || [])
        .map(k => k.trim())
    ));

    const matchedSkills = [];
    const missingSkills = [];

    const resumeLower = (resumeText + ' ' + candidateSkills.join(' ')).toLowerCase();

    for (const kw of jdKeywords) {
      if (resumeLower.includes(kw.toLowerCase())) {
        matchedSkills.push(kw);
      } else {
        missingSkills.push(kw);
      }
    }

    const matchRatio = jdKeywords.length > 0 ? (matchedSkills.length / jdKeywords.length) : 0.8;
    const overallMatchScore = Math.min(95, Math.max(50, Math.round(matchRatio * 100)));

    const detailedSkillMatches = jdKeywords.map(kw => ({
      skill: kw,
      status: resumeLower.includes(kw.toLowerCase()) ? 'Full Match' : 'Missing',
      category: 'Technical Competency',
    }));

    const roleRequirementsComparison = [
      {
        requirement: `Hands-on experience in ${targetRole} domain`,
        resumeEvidence: resumeText ? resumeText.slice(0, 100).replace(/\r?\n/g, ' ') + '...' : 'Demonstrated across projects',
        matchLevel: 'Full Match',
      },
      ...missingSkills.slice(0, 3).map(kw => ({
        requirement: `Demonstrated competency with ${kw}`,
        resumeEvidence: 'Not explicitly demonstrated in uploaded resume',
        matchLevel: 'Not Demonstrated',
      })),
      ...matchedSkills.slice(0, 3).map(kw => ({
        requirement: `Experience utilizing ${kw} in production`,
        resumeEvidence: `Featured in resume profile skills and projects`,
        matchLevel: 'Full Match',
      })),
    ];

    const result = {
      candidateName,
      targetRole,
      domain,
      overallMatchScore,
      executiveSummary: `${candidateName}'s background demonstrates a ${overallMatchScore}% alignment with the core requirements specified for ${targetRole}.`,
      categoryScores: {
        technicalSkills: overallMatchScore,
        experienceRelevance: Math.min(95, overallMatchScore + 2),
        educationAlignment: 88,
        roleReadiness: Math.max(60, overallMatchScore - 5),
      },
      strengths: matchedSkills.map(s => `Strong verified experience with ${s}`),
      gaps: missingSkills.map(s => `Missing explicit demonstration of ${s}`),
      detailedSkillMatches,
      roleRequirementsComparison,
      resumeSuggestions: [
        'Add quantifiable metrics (e.g. latency reduced by X%, throughput increased by Y%) to project descriptions.',
        ...missingSkills.slice(0, 2).map(s => `Highlight any practical coursework or personal projects using ${s}.`),
      ],
      recommendedSkillsToLearn: missingSkills.map(s => ({
        skill: s,
        priority: 'High Priority',
        reason: 'Specified as a core requirement in the target job description',
      })),
      finalRecommendation: `${candidateName} possesses solid foundational alignment for ${targetRole}. Addressing the identified key skills will significantly enhance competitive readiness.`,
    };

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Verifies if Gemini API key is configured.
 */
export function verifyApiKey(req, res) {
  const client = getGeminiClient();
  res.status(200).json({
    configured: Boolean(client),
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  });
}

export default {
  conductConversation,
  generateQuestions,
  evaluateAnswer,
  generateReport,
  generateResumeJdAnalysis,
  verifyApiKey,
  isValidCandidateResponse,
};
