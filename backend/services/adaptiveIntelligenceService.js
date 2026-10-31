/**
 * MockMirror AI Adaptive Interview Intelligence Layer
 *
 * Dynamically adjusts difficulty (Levels 1–4) and question trajectory
 * between every question based on real-time candidate technical performance,
 * while strictly guaranteeing total question count and resume question quota.
 */
import { generateWithGeminiFallback, extractJSON, getGeminiClient } from './conversationService.js';
import { getDomainCompetencies } from '../config/domainCompetencies.js';
import { generateGroundedResumeQuestions, generateDomainTechnicalQuestions } from './questionService.js';
import { DIFFICULTY_THRESHOLDS, BEHAVIOR_INFLUENCE } from '../config/scoreConfig.js';

export const DIFFICULTY_LEVELS = {
  1: { level: 1, name: 'Easy', tier: 'Beginner', label: 'Level 1 (Easy)' },
  2: { level: 2, name: 'Medium', tier: 'Intermediate', label: 'Level 2 (Medium)' },
  3: { level: 3, name: 'Hard', tier: 'Advanced', label: 'Level 3 (Hard)' },
  4: { level: 4, name: 'Expert', tier: 'Expert', label: 'Level 4 (Expert)' },
  5: { level: 5, name: 'Master', tier: 'Principal', label: 'Level 5 (Master)' },
};

/**
 * Normalizes input difficulty to integer level 1..4 (clamped)
 */
export function parseDifficultyToLevel(diff) {
  if (typeof diff === 'number') return Math.max(DIFFICULTY_THRESHOLDS.minLevel, Math.min(DIFFICULTY_THRESHOLDS.maxLevel, Math.round(diff)));
  const str = String(diff || '').toLowerCase();
  if (str.includes('master') || str.includes('principal') || str.includes('5')) return 5;
  if (str.includes('expert') || str.includes('4')) return 4;
  if (str.includes('hard') || str.includes('advanced') || str.includes('3')) return 3;
  if (str.includes('easy') || str.includes('beginner') || str.includes('1')) return 1;
  return 2; // Default Medium (Level 2)
}

/**
 * Converts integer level 1..4 to standard name
 */
export function parseLevelToDifficultyName(level) {
  const clamped = Math.max(DIFFICULTY_THRESHOLDS.minLevel, Math.min(DIFFICULTY_THRESHOLDS.maxLevel, Math.round(level || 2)));
  return DIFFICULTY_LEVELS[clamped].name;
}

/**
 * Calculates performance trend based on historical answer scores
 * @param {Array<number>} scores
 * @returns {'improving' | 'stable' | 'declining'}
 */
export function calculatePerformanceTrend(scores = []) {
  if (!Array.isArray(scores) || scores.length < 2) return 'stable';
  const recent = scores.slice(-3);
  if (recent.length < 2) return 'stable';

  const diff = recent[recent.length - 1] - recent[0];
  if (diff >= 1.2) return 'improving';
  if (diff <= -1.2) return 'declining';
  return 'stable';
}

/**
 * Evaluates candidate answer content with structured criteria:
 * Correctness, Depth, Relevance, Communication, Confidence.
 */
export async function evaluateAnswerQuality({
  question = '',
  answer = '',
  domain = 'Software Developer',
  currentDifficultyLevel = 2,
  candidateProfile = {},
  resumeText = '',
}) {
  const cleanAnswer = String(answer || '').trim();
  const levelInfo = DIFFICULTY_LEVELS[parseDifficultyToLevel(currentDifficultyLevel)];

  // Fast offline heuristic if answer is empty or silence
  if (!cleanAnswer || /^(no answer|silence|unanswered|n\/a)$/i.test(cleanAnswer)) {
    return {
      answerScore: 0,
      correctness: 0,
      depth: 0,
      relevance: 0,
      communication: 0,
      confidence: 0,
      overallPerformance: 'very_weak',
      keyStrengths: [],
      improvements: ['Ensure your microphone is active and articulate answers clearly.'],
      suggestedAnswer: `A strong answer for ${domain} should outline core technical architecture and trade-offs.`,
      extractedTopics: [],
      reason: 'No candidate answer was provided.',
    };
  }

  const client = getGeminiClient();
  if (client) {
    const prompt = `You are a principal technical interviewer on MockMirror evaluating a candidate's live spoken answer.
Domain / Target Role: ${domain}
Current Difficulty Tier: ${levelInfo.label} (${levelInfo.tier})
Question Asked: "${question}"
Candidate Spoken Answer: "${cleanAnswer}"

EVALUATION CRITERIA:
1. Correctness (1-10): Technical accuracy and soundness of concepts.
2. Depth (1-10): Practical detail, engineering trade-offs, architecture context.
3. Relevance (1-10): Directly answering the asked question without drifting.
4. Communication (1-10): Structure, clarity, and conciseness.
5. Confidence (1-10): Technical certainty in explanations (do not penalize normal speaking hesitation).

Return ONLY valid JSON matching this exact structure:
{
  "correctness": 1-10,
  "depth": 1-10,
  "relevance": 1-10,
  "communication": 1-10,
  "confidence": 1-10,
  "answerScore": 1-10,
  "overallPerformance": "excellent" | "very_good" | "good" | "average" | "weak" | "very_weak",
  "reason": "1-sentence concise reason for this evaluation",
  "keyStrengths": ["1-2 genuine strengths"],
  "improvements": ["1-2 specific constructive suggestions"],
  "suggestedAnswer": "2-sentence ideal technical answer highlighting core architecture and best practices",
  "extractedTopics": ["Key technical concepts, tools, or design choices mentioned by candidate in their answer"]
}`;

    try {
      const { text } = await generateWithGeminiFallback(prompt);
      const parsed = extractJSON(text);
      if (parsed && typeof parsed.answerScore === 'number') {
        const score = Math.max(1, Math.min(10, Math.round(parsed.answerScore)));
        return {
          answerScore: score,
          correctness: Math.max(1, Math.min(10, Math.round(parsed.correctness || score))),
          depth: Math.max(1, Math.min(10, Math.round(parsed.depth || score))),
          relevance: Math.max(1, Math.min(10, Math.round(parsed.relevance || score))),
          communication: Math.max(1, Math.min(10, Math.round(parsed.communication || score))),
          confidence: Math.max(1, Math.min(10, Math.round(parsed.confidence || score))),
          overallPerformance: parsed.overallPerformance || (score >= 8.5 ? 'excellent' : score >= 7.5 ? 'very_good' : score >= 6.0 ? 'good' : score >= 4.5 ? 'average' : 'weak'),
          reason: parsed.reason || 'Evaluated against domain technical criteria.',
          keyStrengths: Array.isArray(parsed.keyStrengths) ? parsed.keyStrengths : ['Demonstrated domain knowledge'],
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ['Include more quantifiable benchmarks'],
          suggestedAnswer: parsed.suggestedAnswer || `An ideal answer outlines foundational principles and real-world trade-offs in ${domain}.`,
          extractedTopics: Array.isArray(parsed.extractedTopics) ? parsed.extractedTopics : [],
        };
      }
    } catch (err) {
      console.warn('[adaptiveIntelligenceService] Gemini answer evaluation fallback:', err.message);
    }
  }

  // Robust Rule-Based Fallback
  const wordCount = cleanAnswer.split(/\s+/).length;
  let score = 7;
  if (wordCount < 10) score = 4;
  else if (wordCount > 60) score = 8.5;
  else if (wordCount > 30) score = 7.5;

  const performance = score >= 8.5 ? 'excellent' : score >= 7.5 ? 'very_good' : score >= 6.0 ? 'good' : score >= 4.5 ? 'average' : 'weak';

  return {
    answerScore: score,
    correctness: score,
    depth: Math.max(1, score - 1),
    relevance: score,
    communication: score,
    confidence: score,
    overallPerformance: performance,
    reason: `Candidate provided a ${performance} answer with ${wordCount} words.`,
    keyStrengths: ['Clear spoken explanation', 'Relevant domain terms'],
    improvements: ['Include quantitative benchmarks and edge cases'],
    suggestedAnswer: `A comprehensive answer for ${domain} should outline core technical architecture and trade-offs.`,
    extractedTopics: cleanAnswer.match(/\b(React|Node\.js|Express|MongoDB|SQL|AWS|Docker|Kubernetes|REST API|JWT|Redis|Kafka|Microservices|Git|CI\/CD)\b/gi) || [],
  };
}

/**
 * Central Intelligence Layer Decision Engine
 *
 * Deterministically decides next difficulty level, difficulty action,
 * next question type (follow-up vs scenario vs resume), and generates reasoning.
 * Strictly adheres to Priority Hierarchy:
 * 1. Interview safety & continuity
 * 2. Total question count (N)
 * 3. Required resume-question quota
 * 4. Controlled adaptive difficulty (max ±1 transition per turn)
 */
export function determineNextInterviewAction({
  interviewState = {},
  answerEvaluation = {},
  candidateIntent = 'normal_answer',
  domain = 'Software Developer',
  voiceMetrics = null,
  faceMetrics = null,
}) {
  const totalQuestions = Math.max(1, parseInt(interviewState.totalQuestions, 10) || 5);
  const currentQuestionNumber = Math.max(1, parseInt(interviewState.currentQuestionNumber, 10) || 1);
  const currentLevel = parseDifficultyToLevel(interviewState.currentDifficultyLevel || 2);
  const questionsRemaining = Math.max(0, totalQuestions - currentQuestionNumber);

  const resumeQuestionsRequired = Math.max(0, parseInt(interviewState.resumeQuestionsRequired, 10) || 0);
  const resumeQuestionsAsked = Math.max(0, parseInt(interviewState.resumeQuestionsAsked, 10) || 0);
  const resumeQuestionsNeeded = Math.max(0, resumeQuestionsRequired - resumeQuestionsAsked);

  const scoresHistory = Array.isArray(interviewState.scoresHistory) ? [...interviewState.scoresHistory] : [];
  if (typeof answerEvaluation.answerScore === 'number') {
    scoresHistory.push(answerEvaluation.answerScore);
  }

  const score = answerEvaluation.answerScore ?? 7;
  let difficultyAction = 'maintain';
  let recommendedLevel = currentLevel;
  let reason = '';

  // 1. Candidate wants to end interview early
  if (candidateIntent === 'end_interview') {
    return {
      action: 'conclude',
      difficultyAction: 'maintain',
      currentDifficultyLevel: currentLevel,
      recommendedDifficultyLevel: currentLevel,
      difficultyName: parseLevelToDifficultyName(currentLevel),
      nextQuestionType: 'concluding',
      reason: 'Candidate requested to conclude the interview session early.',
      performanceTrend: calculatePerformanceTrend(scoresHistory),
      isComplete: true,
      shouldAdvance: false,
    };
  }

  // 2. Candidate said "Don't know" or "Skip"
  if (candidateIntent === 'dont_know' || candidateIntent === 'skip_question') {
    difficultyAction = currentLevel > 1 ? 'decrease' : 'maintain';
    recommendedLevel = Math.max(1, currentLevel - 1);
    reason = 'Candidate indicated unfamiliarity with the topic; adapting with a foundational question.';
  } else {
    // 3. Performance-Driven Controlled Difficulty Transition (configurable thresholds)
    // Calculate behavioral nervousness indicator from voice + face metrics
    let nervousnessIndicator = 0;
    if (voiceMetrics || faceMetrics) {
      const fillerDensity = voiceMetrics?.fillerDensityPct ? Math.min(1, voiceMetrics.fillerDensityPct / 10) : 0;
      const eyeContactDeficit = faceMetrics?.eyeContactPct != null ? Math.max(0, 1 - faceMetrics.eyeContactPct / 100) : 0;
      const headInstability = faceMetrics?.headMovementPct != null ? Math.min(1, faceMetrics.headMovementPct / 100) : 0;
      const faceCenterDeficit = faceMetrics?.faceCenteringPct != null ? Math.max(0, 1 - faceMetrics.faceCenteringPct / 100) : 0;
      nervousnessIndicator = (
        fillerDensity * BEHAVIOR_INFLUENCE.fillerDensityWeight +
        eyeContactDeficit * BEHAVIOR_INFLUENCE.eyeContactWeight +
        headInstability * BEHAVIOR_INFLUENCE.headMovementWeight +
        faceCenterDeficit * BEHAVIOR_INFLUENCE.faceCenteringWeight
      );
    }

    // Strong performance → +1 Level (Capped at maxLevel)
    if (score >= DIFFICULTY_THRESHOLDS.increaseAboveOrEqual) {
      // Suppress difficulty increase if behavioral nervousness is high
      if (nervousnessIndicator >= BEHAVIOR_INFLUENCE.nervousnessThreshold) {
        difficultyAction = 'maintain';
        recommendedLevel = currentLevel;
        reason = `Candidate scored well (${score}/10) but behavioral indicators suggest elevated nervousness. Maintaining current level to support composure recovery.`;
      } else if (currentLevel < DIFFICULTY_THRESHOLDS.maxLevel) {
        difficultyAction = 'increase';
        recommendedLevel = currentLevel + 1;
        reason = `Candidate demonstrated strong technical mastery (Score: ${score}/10). Increasing challenge.`;
      } else {
        difficultyAction = 'maintain';
        recommendedLevel = DIFFICULTY_THRESHOLDS.maxLevel;
        reason = `Candidate demonstrated exceptional mastery at maximum difficulty tier (Level ${DIFFICULTY_THRESHOLDS.maxLevel} Master).`;
      }
    }
    // Weak performance → -1 Level (Floored at minLevel)
    else if (score < DIFFICULTY_THRESHOLDS.decreaseBelow) {
      if (currentLevel > DIFFICULTY_THRESHOLDS.minLevel) {
        difficultyAction = 'decrease';
        recommendedLevel = currentLevel - 1;
        reason = `Candidate struggled with depth on this topic (Score: ${score}/10). Adjusting difficulty to support conceptual recovery.`;
      } else {
        difficultyAction = 'maintain';
        recommendedLevel = DIFFICULTY_THRESHOLDS.minLevel;
        reason = `Candidate is currently at foundational difficulty (Level ${DIFFICULTY_THRESHOLDS.minLevel} Easy). Maintaining level.`;
      }
    }
    // Average / Good (maintainMin – increaseAboveOrEqual) → Maintain
    else {
      difficultyAction = 'maintain';
      recommendedLevel = currentLevel;
      reason = `Candidate demonstrated solid foundational understanding (Score: ${score}/10). Maintaining current difficulty level.`;
    }
  }

  // Strict Validation: Difficulty change cannot exceed ±1 in a single turn
  if (Math.abs(recommendedLevel - currentLevel) > 1) {
    recommendedLevel = recommendedLevel > currentLevel ? currentLevel + 1 : currentLevel - 1;
  }
  // Clamp within [minLevel, maxLevel]
  recommendedLevel = Math.max(DIFFICULTY_THRESHOLDS.minLevel, Math.min(DIFFICULTY_THRESHOLDS.maxLevel, recommendedLevel));

  // 4. Intelligent Question Type & Direction Selection
  let nextQuestionType = 'technical';
  const extractedTopics = Array.isArray(answerEvaluation.extractedTopics) ? answerEvaluation.extractedTopics : [];

  // PRIORITY RULE: Mandatory Resume Quota Enforcement
  // If questions remaining exactly equal resume questions needed, MUST ask resume question!
  if (resumeQuestionsNeeded > 0 && questionsRemaining <= resumeQuestionsNeeded) {
    nextQuestionType = 'resume_based';
    reason += ' (Guaranteed resume-based question quota requirement).';
  } else if (score >= 8.0 && extractedTopics.length > 0 && Math.random() < 0.65) {
    // Contextual Follow-Up Drill-Down when candidate introduces interesting technical tools/architectures
    nextQuestionType = 'follow_up';
    reason += ` (Contextual drill-down on candidate's mention of ${extractedTopics[0]}).`;
  } else if (recommendedLevel === 5) {
    nextQuestionType = 'system_design';
  } else if (recommendedLevel === 4) {
    nextQuestionType = 'system_design';
  } else if (recommendedLevel === 3) {
    nextQuestionType = 'scenario_based';
  } else if (recommendedLevel === 1) {
    nextQuestionType = 'conceptual';
  } else {
    nextQuestionType = 'technical';
  }

  const isComplete = questionsRemaining === 0;

  return {
    action: isComplete ? 'conclude' : 'ask_next',
    difficultyAction,
    currentDifficultyLevel: currentLevel,
    recommendedDifficultyLevel: recommendedLevel,
    difficultyName: parseLevelToDifficultyName(recommendedLevel),
    nextQuestionType: isComplete ? 'concluding' : nextQuestionType,
    reason,
    performanceTrend: calculatePerformanceTrend(scoresHistory),
    isComplete,
    shouldAdvance: !isComplete,
    extractedTopic: isComplete ? null : (extractedTopics[0] || null),
  };
}

/**
 * Dynamically constructs the next question matching adapted difficulty level & question type.
 */
export async function generateAdaptiveNextQuestion({
  domain = 'Software Developer',
  targetDifficultyLevel = 2,
  nextQuestionType = 'technical',
  previousQuestion = '',
  previousAnswer = '',
  extractedTopic = null,
  candidateProfile = {},
  resumeText = '',
  existingQuestions = [],
}) {
  const levelInfo = DIFFICULTY_LEVELS[parseDifficultyToLevel(targetDifficultyLevel)];
  const existingLower = existingQuestions.map(q => (typeof q === 'string' ? q : q.question || '').toLowerCase());
  const client = getGeminiClient();

  // 1. Resume-Based Question
  if (nextQuestionType === 'resume_based') {
    const resumeQuestions = generateGroundedResumeQuestions(candidateProfile, resumeText, 1, levelInfo.name, existingQuestions);
    if (resumeQuestions.length > 0) {
      return {
        question: resumeQuestions[0].question,
        type: 'resume_based',
        types: ['resume_based', 'adaptive'],
        difficultyLevel: levelInfo.level,
        difficultyName: levelInfo.name,
        topic: 'resume_experience',
      };
    }
  }

  // 2. Contextual Follow-Up Question
  if (nextQuestionType === 'follow_up' && extractedTopic && client) {
    const prompt = `You are a technical interviewer on MockMirror conducting an adaptive interview.
The candidate just gave an answer in which they mentioned "${extractedTopic}".
Previous Question: "${previousQuestion}"
Candidate Answer: "${previousAnswer}"
Target Difficulty: ${levelInfo.label} (${levelInfo.tier})
Domain: ${domain}

INSTRUCTION:
Ask a natural, direct follow-up technical question exploring their specific choice or implementation of "${extractedTopic}" and the trade-offs involved at ${levelInfo.name} difficulty.
Return ONLY raw valid JSON: { "question": "follow up question text", "topic": "${extractedTopic}" }`;

    try {
      const { text } = await generateWithGeminiFallback(prompt);
      const parsed = extractJSON(text);
      if (parsed && parsed.question && parsed.question.length > 15) {
        return {
          question: parsed.question.trim(),
          type: 'follow_up',
          types: ['follow_up', 'adaptive'],
          difficultyLevel: levelInfo.level,
          difficultyName: levelInfo.name,
          topic: parsed.topic || extractedTopic,
        };
      }
    } catch (err) {
      console.warn('[generateAdaptiveNextQuestion] Follow-up generation fallback:', err.message);
    }
  }

  // 3. Domain Competency Adaptive Question Generation via Gemini
  if (client) {
    const domainInfo = getDomainCompetencies(domain);
    const prompt = `You are designing the NEXT interview question for a candidate who has reached ${levelInfo.label} (${levelInfo.tier}).
Domain: ${domain}
Target Difficulty: ${levelInfo.label}
Question Category / Style: ${nextQuestionType}
Competencies for ${domain}: ${domainInfo.competencies.slice(0, 5).join(', ')}
Previous Questions Asked: ${JSON.stringify(existingQuestions.slice(-3).map(q => typeof q === 'string' ? q : q.question))}

INSTRUCTION:
Generate ONE high-quality, realistic ${nextQuestionType} question testing the candidate at ${levelInfo.name} difficulty level.
Do not duplicate previous questions.
Return ONLY raw valid JSON: { "question": "question text", "topic": "core_concept" }`;

    try {
      const { text } = await generateWithGeminiFallback(prompt);
      const parsed = extractJSON(text);
      if (parsed && parsed.question && parsed.question.length > 15) {
        return {
          question: parsed.question.trim(),
          type: nextQuestionType,
          types: [nextQuestionType, 'adaptive', 'domain_based'],
          difficultyLevel: levelInfo.level,
          difficultyName: levelInfo.name,
          topic: parsed.topic || 'domain_competency',
        };
      }
    } catch (err) {
      console.warn('[generateAdaptiveNextQuestion] Adaptive question generation fallback:', err.message);
    }
  }

  // 4. Grounded Domain Technical Curated Fallback
  const fallback = generateDomainTechnicalQuestions(domain, levelInfo.name, 1, existingQuestions);
  return {
    question: fallback[0]?.question || `In ${domain} (${levelInfo.name} level), what are the most critical architectural decisions and performance trade-offs you evaluate?`,
    type: 'domain_based',
    types: ['domain_based', 'adaptive'],
    difficultyLevel: levelInfo.level,
    difficultyName: levelInfo.name,
    topic: 'domain_competency',
  };
}
