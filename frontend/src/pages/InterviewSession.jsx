import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Volume2, Loader, AlertCircle, LogOut, Send, Play, UserCheck, ArrowRight, FileText, CheckCircle2, Zap, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import useSpeech from '../hooks/useSpeech';
import { sendConversationTurn, generateQuestions } from '../services/api';
import { getRandomInterviewer } from '../utils/interviewers';
import CameraMonitor from '../components/CameraMonitor';
import DeviceCheckModal from '../components/DeviceCheckModal';
import GuidelinesModal from '../components/GuidelinesModal';
import './InterviewSession.css';

/**
 * Personalized Conversational Interview Session with Real-World Human Interviewer Personas
 */
const InterviewSession = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    domain = 'Software Engineering',
    difficulty = 'Medium',
    questionsCount = 5,
    candidateProfile = null,
    resumeText = '',
    jobDescription = '',
    interviewer: initialInterviewer = null,
  } = location.state || {};

  // Assigned real-world interviewer persona
  const interviewer = useRef(initialInterviewer || getRandomInterviewer()).current;

  // ─── State ───
  const [isStarted, setIsStarted] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | greeting | speaking | listening | thinking | complete
  const [conversationHistory, setConversationHistory] = useState([]);
  const [responses, setResponses] = useState([]);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showDeviceCheck, setShowDeviceCheck] = useState(false);

  // Phase 9: 10-Second Response Timeout state
  const [showNoResponsePrompt, setShowNoResponsePrompt] = useState(false);

  // Number 4: Leveling-Up Toast notification
  const [levelUpNotification, setLevelUpNotification] = useState(null);

  // Planned structured question set enforcing deterministic resume-based question rules
  const [plannedQuestions, setPlannedQuestions] = useState([]);
  const [isPreparingQuestions, setIsPreparingQuestions] = useState(false);
  const plannedQuestionsRef = useRef([]);

  // AI Adaptive Interview Intelligence State
  const [adaptiveState, setAdaptiveState] = useState({
    currentDifficultyLevel: difficulty === 'Hard' ? 3 : difficulty === 'Easy' ? 1 : 2,
    currentDifficultyName: difficulty || 'Medium',
    nextDifficultyLevel: difficulty === 'Hard' ? 3 : difficulty === 'Easy' ? 1 : 2,
    nextDifficultyName: difficulty || 'Medium',
    difficultyAction: 'initial',
    performanceTrend: 'stable',
    reason: '',
    scoresHistory: [],
    difficultyHistory: [difficulty === 'Hard' ? 3 : difficulty === 'Easy' ? 1 : 2],
  });

  // ─── Speech hook ───
  const {
    transcript,
    interimTranscript,
    isListening,
    speechError,
    startListening,
    stopListening,
    resetTranscript,
    getTranscript,
    speak,
    stopSpeaking,
    isSpeechSupported,
  } = useSpeech();

  // ─── Refs ───
  const chatEndRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isCompletingRef = useRef(false);
  const conversationHistoryRef = useRef([]);
  const cameraApiRef = useRef(null);
  const questionStartTimeRef = useRef(null);
  const lastSubmittedAnswerRef = useRef('');
  const noResponseTimerRef = useRef(null);
  const handleCameraReady = useRef((api) => {
    cameraApiRef.current = api;
  }).current;

  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  useEffect(() => {
    plannedQuestionsRef.current = plannedQuestions;
  }, [plannedQuestions]);

  // Phase 9: Cancel 10-second timer as soon as candidate speaks or types
  useEffect(() => {
    const hasActivity = Boolean(transcript.trim() || interimTranscript.trim() || textInput.trim());
    if (hasActivity) {
      if (noResponseTimerRef.current) {
        clearTimeout(noResponseTimerRef.current);
        noResponseTimerRef.current = null;
      }
      setShowNoResponsePrompt(false);
    }
  }, [transcript, interimTranscript, textInput]);

  // Auto-dismiss level-up notification after 6 seconds
  useEffect(() => {
    if (!levelUpNotification) return;
    const timer = setTimeout(() => {
      setLevelUpNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [levelUpNotification]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, transcript, interimTranscript, textInput]);

  /**
   * User clicks "Start Conversation" — generates/validates questions and unlocks audio
   */
  const handleStartSession = async () => {
    setIsPreparingQuestions(true);
    setError('');

    let questionsList = [];
    try {
      const qRes = await generateQuestions({
        domain,
        difficulty,
        totalQuestions: questionsCount,
        candidateProfile,
        resumeText,
        jobDescription,
      });

      if (qRes && Array.isArray(qRes.questions) && qRes.questions.length > 0) {
        questionsList = qRes.questions;
      }
    } catch (err) {
      console.warn('Failed to pre-generate structured questions, fallback cascade will handle live turns:', err);
    }

    setPlannedQuestions(questionsList);
    plannedQuestionsRef.current = questionsList;
    setIsPreparingQuestions(false);
    setIsStarted(true);

    // Camera + face detection start independently
    setCameraActive(true);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (e) {
      console.warn('Mic permission error:', e);
    }

    getAIResponse('', [], questionsList);
  };

  const responsesRef = useRef([]);

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  /**
   * Core conversation turn handler
   */
  const getAIResponse = async (userAnswer, history, qList = null) => {
    if (isProcessingRef.current || isCompletingRef.current) return;
    isProcessingRef.current = true;

    const activeQuestionList = qList || plannedQuestionsRef.current || [];
    const currentTurnAnswer = (userAnswer || '').trim();
    const prevResponses = [...responsesRef.current];

    let updatedHistory = [...history];
    if (currentTurnAnswer) {
      updatedHistory = [...history, { role: 'candidate', text: currentTurnAnswer }];
      setConversationHistory(updatedHistory);
    }

    setPhase('thinking');
    setError('');
    setTextInput('');
    resetTranscript();

    // Cancel 10-second response prompt when candidate has submitted
    if (noResponseTimerRef.current) {
      clearTimeout(noResponseTimerRef.current);
      noResponseTimerRef.current = null;
    }
    setShowNoResponsePrompt(false);

    // Calculate candidate turn index
    const prevCandidateCount = history.filter(m => m.role === 'candidate').length;
    const candidateTurnIdx = prevCandidateCount + (currentTurnAnswer ? 1 : 0);

    try {
      // Compute per-turn voice metrics directly from the submitted answer
      const responseTimeSec = questionStartTimeRef.current
        ? (Date.now() - questionStartTimeRef.current) / 1000
        : null;
      const wordCount = currentTurnAnswer ? currentTurnAnswer.split(/\s+/).filter(Boolean).length : 0;
      const FILLER_WORDS = ['um', 'uh', 'like', 'so', 'basically', 'you know', 'right', 'actually', 'literally', 'i mean'];
      const fillerCount = FILLER_WORDS.reduce((count, filler) => {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        return count + (currentTurnAnswer.match(regex) || []).length;
      }, 0);
      const fillerDensityPct = wordCount > 0 ? Math.round((fillerCount / wordCount) * 100 * 10) / 10 : 0;
      const speakingDurationSec = responseTimeSec ? Math.max(1, responseTimeSec - 2) : null;
      const estimatedWpm = speakingDurationSec && wordCount > 0 ? Math.round((wordCount / speakingDurationSec) * 60) : null;

      const turnVoiceMetrics = {
        responseTimeSec: responseTimeSec ? Math.round(responseTimeSec * 10) / 10 : null,
        wordCount,
        fillerCount,
        fillerDensityPct,
        estimatedWpm,
      };

      // Compute per-turn face metrics snapshot
      let turnFaceMetrics = null;
      if (cameraApiRef.current?.getBehaviorMetrics) {
        const bm = cameraApiRef.current.getBehaviorMetrics();
        turnFaceMetrics = {
          eyeContactPct: bm?.eyeContactPct ?? null,
          faceCenteringPct: bm?.faceCenteringPct ?? null,
          headMovementPct: null, // derived from session recorder if available
        };
        // Try to get more detailed metrics from getReport
        if (cameraApiRef.current?.getReport) {
          const report = cameraApiRef.current.getReport();
          if (report) {
            turnFaceMetrics.headMovementPct = report.headStability != null ? Math.round(100 - report.headStability) : null;
          }
        }
      }

      const response = await sendConversationTurn({
        domain,
        difficulty: adaptiveState.nextDifficultyName || adaptiveState.currentDifficultyName || difficulty,
        totalQuestions: questionsCount,
        conversationHistory: updatedHistory,
        userAnswer: currentTurnAnswer,
        candidateProfile,
        resumeText,
        interviewerName: interviewer.name,
        interviewerTitle: interviewer.title,
        plannedQuestions: activeQuestionList,
        currentQuestionIndex: Math.max(0, candidateTurnIdx - 1),
        voiceMetrics: turnVoiceMetrics,
        faceMetrics: turnFaceMetrics,
        interviewState: {
          currentDifficultyLevel: adaptiveState.nextDifficultyLevel || adaptiveState.currentDifficultyLevel || 2,
          scoresHistory: adaptiveState.scoresHistory || [],
          difficultyHistory: adaptiveState.difficultyHistory || [],
          resumeQuestionsRequired: Math.floor(questionsCount / 2),
          resumeQuestionsAsked: prevResponses.filter(r => r.type === 'resume_based').length,
        },
      });

      const { aiResponse, questionNumber: qNum, isComplete, intent, evaluation, adaptiveState: newAdaptiveState, nextQuestion } = response;

      // If backend returned adaptive state, update it and trigger leveling up alerts
      if (newAdaptiveState) {
        setAdaptiveState(newAdaptiveState);

        // Number 4: Prominently alert candidate when difficulty levels up or adjusts
        if (newAdaptiveState.difficultyAction === 'increase') {
          setLevelUpNotification({
            action: 'increase',
            from: newAdaptiveState.currentDifficultyLevel,
            to: newAdaptiveState.nextDifficultyLevel,
            toName: newAdaptiveState.nextDifficultyName,
            reason: newAdaptiveState.reason || 'Strong technical explanation! Advancing to a higher difficulty challenge.',
          });
        } else if (newAdaptiveState.difficultyAction === 'decrease') {
          setLevelUpNotification({
            action: 'decrease',
            from: newAdaptiveState.currentDifficultyLevel,
            to: newAdaptiveState.nextDifficultyLevel,
            toName: newAdaptiveState.nextDifficultyName,
            reason: newAdaptiveState.reason || 'Adjusting question difficulty to explore foundational principles.',
          });
        }
      }

      // If the backend returned an error (e.g., Gemini not configured), show it
      if (response.error) {
        setError(aiResponse || 'The AI interviewer encountered an issue. Please try again.');
        setPhase('listening');
        resetTranscript();
        startListening(3500, handleSilenceTimeout);
        return;
      }

      let currentLatestResponses = [...responsesRef.current];

      // Record question answer evaluations (candidateTurnIdx >= 2 represents candidate answers to configured questions)
      if (evaluation && currentTurnAnswer && candidateTurnIdx >= 2) {
        const qIndex0 = candidateTurnIdx - 2; // 0 for Q1, 1 for Q2, etc.
        const qPlanItem = activeQuestionList[qIndex0] || null;
        const lastAiMsg = [...history].reverse().find(m => m.role === 'interviewer');
        const qType = qPlanItem?.type || 'domain_based';
        const qText = lastAiMsg?.text || qPlanItem?.question || `Question ${qIndex0 + 1}`;

        const newResponseItem = {
          questionId: qPlanItem?.id || `q_${qIndex0 + 1}`,
          question: qText,
          type: qType,
          types: qPlanItem?.types || [qType],
          topic: qPlanItem?.topic || qType,
          difficultyLevel: newAdaptiveState?.currentDifficultyLevel || adaptiveState.currentDifficultyLevel,
          difficultyName: newAdaptiveState?.currentDifficultyName || adaptiveState.currentDifficultyName,
          difficultyAction: newAdaptiveState?.difficultyAction || 'maintain',
          answer: currentTurnAnswer,
          candidateAnswer: currentTurnAnswer,
          suggestedAnswer: evaluation.suggestedAnswer || `A comprehensive answer should explain core principles, implementation details, and practical trade-offs for this question.`,
          score: evaluation.score ?? (intent === 'dont_know' ? 2 : 7),
          feedback: evaluation.feedback || '',
          strengths: evaluation.strengths || [],
          improvements: evaluation.improvements || [],
          intent: intent || 'normal_answer',
        };

        currentLatestResponses = [...currentLatestResponses, newResponseItem];
        setResponses(currentLatestResponses);
        responsesRef.current = currentLatestResponses;
      }

      // If backend supplied a dynamic adaptive question, append or update it
      if (nextQuestion && !isComplete) {
        const targetSlot = Math.max(0, candidateTurnIdx - 1);
        const updatedPlanned = [...activeQuestionList];
        if (targetSlot < updatedPlanned.length) {
          updatedPlanned[targetSlot] = nextQuestion;
        } else {
          updatedPlanned.push(nextQuestion);
        }
        setPlannedQuestions(updatedPlanned);
        plannedQuestionsRef.current = updatedPlanned;
      }

      setQuestionNumber(qNum || 0);

      const newHistory = [...updatedHistory, { role: 'interviewer', text: aiResponse }];
      setConversationHistory(newHistory);

      const isSessionFinished = isComplete || intent === 'end_interview';

      if (isSessionFinished) {
        isCompletingRef.current = true;
        stopListening();
        if (noResponseTimerRef.current) {
          clearTimeout(noResponseTimerRef.current);
          noResponseTimerRef.current = null;
        }
        setShowNoResponsePrompt(false);

        setPhase('speaking');
        try {
          await speak(aiResponse, interviewer.voiceSettings);
        } catch (e) {
          /* ignore */
        }
        setPhase('complete');
        setCameraActive(false);

        setTimeout(() => {
          navigate('/report', {
            state: {
              domain,
              difficulty: newAdaptiveState?.nextDifficultyName || adaptiveState.nextDifficultyName || difficulty,
              totalQuestions: questionsCount,
              responses: currentLatestResponses,
              adaptiveState: newAdaptiveState || adaptiveState,
              difficultyHistory: newAdaptiveState?.difficultyHistory || adaptiveState.difficultyHistory || [],
              performanceTrend: newAdaptiveState?.performanceTrend || adaptiveState.performanceTrend || 'stable',
              isEarlyTermination: intent === 'end_interview',
              terminationReason: intent === 'end_interview' ? 'candidate_requested_stop' : 'session_completed',
              candidateProfile,
              resumeText,
              jobDescription,
              interviewer,
              plannedQuestions: activeQuestionList,
              faceReport: cameraApiRef.current?.getReport?.(),
              behaviorMetrics: cameraApiRef.current?.getBehaviorMetrics?.(),
            },
          });
        }, 2500);
      } else {
        // Speak response aloud using persona voice parameters
        setPhase('speaking');
        try {
          await speak(aiResponse, interviewer.voiceSettings);
        } catch (e) {
          console.warn('TTS error:', e);
        }

        // Transition to listening phase with clean slate
        setPhase('listening');
        setTextInput('');
        resetTranscript();
        questionStartTimeRef.current = Date.now();

        // Phase 9: Start 10-second response prompt timer
        setShowNoResponsePrompt(false);
        if (noResponseTimerRef.current) clearTimeout(noResponseTimerRef.current);
        noResponseTimerRef.current = setTimeout(() => {
          setShowNoResponsePrompt(true);
        }, 10000);

        startListening(3500, handleSilenceTimeout);
      }
    } catch (err) {
      console.error('Interview turn error:', err);

      const errorMessage = err.response?.data?.message
        || err.response?.data?.aiResponse
        || (err.name === 'AxiosError' && !err.response
            ? "I'm having trouble connecting to the interview server. Please ensure the backend server is running on port 5000."
            : err.message || "An unexpected error occurred during the interview turn. Please try again.");

      setError(errorMessage);
      setPhase('listening');
      setTextInput('');
      resetTranscript();

      // Phase 9 timer reset on error retry
      setShowNoResponsePrompt(false);
      if (noResponseTimerRef.current) clearTimeout(noResponseTimerRef.current);
      noResponseTimerRef.current = setTimeout(() => {
        setShowNoResponsePrompt(true);
      }, 10000);

      startListening(3500, handleSilenceTimeout);
    } finally {
      isProcessingRef.current = false;
    }
  };

  /**
   * Silence timeout callback — auto-submits spoken answer
   */
  const handleSilenceTimeout = () => {
    if (isCompletingRef.current || isProcessingRef.current) return;
    const typed = textInput.trim();
    const spoken = getTranscript().trim();
    const text = typed || spoken;
    if (text) {
      if (text === lastSubmittedAnswerRef.current && !typed) {
        console.warn('[InterviewSession] Prevented duplicate auto-submission of previous answer');
        return;
      }
      lastSubmittedAnswerRef.current = text;
      stopListening();
      setTextInput('');
      resetTranscript();
      if (noResponseTimerRef.current) {
        clearTimeout(noResponseTimerRef.current);
        noResponseTimerRef.current = null;
      }
      setShowNoResponsePrompt(false);
      getAIResponse(text, conversationHistoryRef.current);
    }
  };

  /**
   * Manual Start/Pause Mic
   */
  const handleToggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening(3500, handleSilenceTimeout);
    }
  };

  /**
   * Manual Submit
   */
  const handleManualSubmit = (e) => {
    if (e) e.preventDefault();
    if (isCompletingRef.current || isProcessingRef.current) return;
    const typed = textInput.trim();
    const spoken = getTranscript().trim();
    const text = typed || spoken;
    if (!text) {
      setError('Please speak your answer into your mic or type an answer first.');
      return;
    }
    if (text === lastSubmittedAnswerRef.current && !typed) {
      console.warn('[InterviewSession] Prevented duplicate manual submission of previous answer');
      return;
    }
    lastSubmittedAnswerRef.current = text;
    stopListening();
    setTextInput('');
    resetTranscript();
    if (noResponseTimerRef.current) {
      clearTimeout(noResponseTimerRef.current);
      noResponseTimerRef.current = null;
    }
    setShowNoResponsePrompt(false);
    getAIResponse(text, conversationHistoryRef.current);
  };

  /**
   * End Interview early
   */
  const handleEndInterview = () => {
    isCompletingRef.current = true;
    if (noResponseTimerRef.current) {
      clearTimeout(noResponseTimerRef.current);
      noResponseTimerRef.current = null;
    }
    stopListening();
    stopSpeaking();
    setCameraActive(false);
    navigate('/report', {
      state: {
        domain,
        difficulty,
        totalQuestions: questionsCount,
        responses: responsesRef.current,
        isEarlyTermination: true,
        terminationReason: 'candidate_requested_stop',
        candidateProfile,
        resumeText,
        jobDescription,
        interviewer,
        plannedQuestions: plannedQuestionsRef.current,
        faceReport: cameraApiRef.current?.getReport?.(),
        behaviorMetrics: cameraApiRef.current?.getBehaviorMetrics?.(),
      },
    });
  };

  // IF NO CANDIDATE PROFILE: Render a clear glassmorphic redirect card (NEVER A BLANK SCREEN)
  if (!candidateProfile || !candidateProfile.fullName) {
    return (
      <div className="session-page">
        <div className="start-card glass-card text-center">
          <div className="start-icon">
            <UserCheck size={48} />
          </div>
          <h2>Candidate Profile Required</h2>
          <p>
            Please complete your candidate details and upload your resume before starting your interview.
          </p>
          <button
            className="btn-primary start-session-btn"
            onClick={() => navigate('/candidate-info')}
          >
            Go to Candidate Form <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  if (!isSpeechSupported) {
    return (
      <div className="session-page">
        <div className="unsupported-card glass-card">
          <AlertCircle size={48} />
          <h2>Browser Not Supported</h2>
          <p>Your browser doesn't support Web Speech API. Please use <strong>Google Chrome</strong>.</p>
          <button className="btn-primary" onClick={() => navigate('/candidate-info')}>Go Back</button>
        </div>
      </div>
    );
  }

  const hasResume = Boolean((resumeText && resumeText.trim().length > 30) || (candidateProfile?.skills?.length > 0));
  let expectedResumeCount = 0;
  if (hasResume) {
    if (questionsCount === 2) expectedResumeCount = 1;
    else if (questionsCount >= 3) expectedResumeCount = Math.floor((questionsCount - 1) / 2);
  }
  const expectedOtherCount = questionsCount - expectedResumeCount;

  if (isPreparingQuestions) {
    return (
      <div className="session-page">
        <div className="start-card glass-card text-center">
          <Loader size={48} className="spin text-primary" style={{ margin: '0 auto 1rem' }} />
          <h2>Preparing Your Interview with {interviewer.name}...</h2>
          <p style={{ marginTop: '0.5rem', color: '#64748b' }}>
            Analyzing resume details and generating <strong>{expectedResumeCount} resume-based</strong> + <strong>{expectedOtherCount} technical</strong> questions...
          </p>
        </div>
      </div>
    );
  }

  // Entry Card before unlocking audio
  if (!isStarted) {
    return (
      <div className="session-page">
        <div className="start-card glass-card text-center">
          <div className="start-icon" style={{ background: interviewer.avatarBg, borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#fff', fontSize: '1.8rem', fontWeight: 800 }}>
            {interviewer.avatarInitial}
          </div>
          <h2>Ready to Begin Your Interview with {interviewer.name}?</h2>
          <p>
            Interviewer: <strong>{interviewer.name}</strong> ({interviewer.title})<br />
            Candidate: <strong>{candidateProfile?.fullName || 'Candidate'}</strong> | <strong>{candidateProfile?.targetRole || domain}</strong> ({difficulty} Level)
          </p>
          {hasResume ? (
            <div className="resume-notice" style={{ marginTop: '0.75rem', textAlign: 'left', padding: '0.85rem 1.1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', fontWeight: 600, color: '#10b981' }}>
                <CheckCircle2 size={16} /> Verified Resume Attached
              </div>
              <div style={{ fontSize: '0.88rem', color: '#334155' }}>
                🎯 <strong>{questionsCount} Questions Session</strong>: {expectedResumeCount} Resume-Based ({candidateProfile?.skills?.length || 0} skills loaded) + {expectedOtherCount} Technical
              </div>
            </div>
          ) : (
            <div className="resume-notice" style={{ marginTop: '0.75rem' }}>
              <span>🎯 {questionsCount} Technical Questions Configured</span>
            </div>
          )}
          <button className="btn-primary start-session-btn" style={{ marginTop: '1.2rem' }} onClick={() => setShowGuidelines(true)}>
            Start Interview with {interviewer.name} <Play size={20} fill="currentColor" />
          </button>
        </div>

        {showGuidelines && (
          <GuidelinesModal
            interviewerName={interviewer.name}
            onClose={() => setShowGuidelines(false)}
            onConfirm={() => {
              setShowGuidelines(false);
              setShowDeviceCheck(true);
            }}
          />
        )}

        {showDeviceCheck && (
          <DeviceCheckModal
            interviewerName={interviewer.name}
            onClose={() => setShowDeviceCheck(false)}
            onConfirm={() => {
              setShowDeviceCheck(false);
              handleStartSession();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="session-page">
      {/* Header */}
      <div className="session-header glass-card">
        <div className="session-meta">
          <span className="badge" style={{ background: interviewer.badgeColor, color: '#fff', fontWeight: 700 }}>🎙️ {interviewer.name}</span>
          <span className="badge">{candidateProfile?.fullName || 'Candidate'}</span>
          <span className="badge">{domain}</span>
          <span className="badge adaptive-pill-badge" style={{
            background: adaptiveState.difficultyAction === 'increase' ? 'rgba(16, 185, 129, 0.18)' : adaptiveState.difficultyAction === 'decrease' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(0, 212, 255, 0.15)',
            border: `1px solid ${adaptiveState.difficultyAction === 'increase' ? '#10b981' : adaptiveState.difficultyAction === 'decrease' ? '#f59e0b' : '#00d4ff'}`,
            color: adaptiveState.difficultyAction === 'increase' ? '#10b981' : adaptiveState.difficultyAction === 'decrease' ? '#f59e0b' : '#00d4ff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 700,
          }}>
            <Zap size={13} />
            {adaptiveState.nextDifficultyName || adaptiveState.currentDifficultyName || difficulty}
            {adaptiveState.difficultyAction === 'increase' && <span style={{ fontSize: '0.75rem', background: '#10b981', color: '#000', padding: '0.1rem 0.35rem', borderRadius: '4px', marginLeft: '0.2rem' }}>↑ Level Up</span>}
            {adaptiveState.difficultyAction === 'decrease' && <span style={{ fontSize: '0.75rem', background: '#f59e0b', color: '#000', padding: '0.1rem 0.35rem', borderRadius: '4px', marginLeft: '0.2rem' }}>↓ Adjusted</span>}
          </span>
          {questionNumber > 0 && (
            <span className="badge">Q {Math.min(questionNumber, questionsCount)}/{questionsCount}</span>
          )}
        </div>
        <div className="header-right">
          <div className={`status-indicator ${phase}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {phase === 'greeting' && `Connecting to ${interviewer.name}...`}
              {phase === 'speaking' && `${interviewer.name} is Speaking...`}
              {phase === 'listening' && (isListening ? '🔴 Listening to your voice' : 'Mic Paused')}
              {phase === 'thinking' && `${interviewer.name} is Evaluating...`}
              {phase === 'complete' && 'Interview Complete'}
            </span>
          </div>
          <button className="end-btn" onClick={handleEndInterview} title="End Interview">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(questionNumber / questionsCount) * 100}%` }}></div>
      </div>

      {/* Main Content */}
      <div className="session-main">
        {/* Avatar + Camera row */}
        <div className="session-top-row">
          <div className="avatar-section">
            <div className={`ai-avatar ${
              phase === 'speaking' ? 'avatar-speaking' :
              phase === 'listening' && isListening ? 'avatar-listening' :
              phase === 'thinking' || phase === 'greeting' ? 'avatar-thinking' :
              'avatar-idle'
            }`}>
              <div className="avatar-ring ring-1"></div>
              <div className="avatar-ring ring-2"></div>
              <div className="avatar-ring ring-3"></div>
              <div className="avatar-core" style={{ background: interviewer.avatarBg }}>
                {phase === 'speaking' && <Volume2 size={28} />}
                {phase === 'listening' && <Mic size={28} />}
                {(phase === 'thinking' || phase === 'greeting') && <Loader size={28} className="spin" />}
                {phase === 'complete' && <span className="avatar-check">✓</span>}
              </div>
            </div>
            <span className="avatar-label"><strong>{interviewer.name}</strong> • {interviewer.title}</span>
          </div>

          <CameraMonitor active={cameraActive} onReady={handleCameraReady} />
        </div>

        {/* Number 4: Animated Level Up / Difficulty Adjustment Notification */}
        {levelUpNotification && (
          <div className="level-up-toast animate-slide-down" style={{
            margin: '0.5rem 0 1rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            background: levelUpNotification.action === 'increase'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(0, 212, 255, 0.15))'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.1))',
            border: `1.5px solid ${levelUpNotification.action === 'increase' ? '#10b981' : '#f59e0b'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {levelUpNotification.action === 'increase' ? (
                <TrendingUp size={22} style={{ color: '#10b981', flexShrink: 0 }} />
              ) : (
                <TrendingDown size={22} style={{ color: '#f59e0b', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: levelUpNotification.action === 'increase' ? '#10b981' : '#f59e0b' }}>
                  {levelUpNotification.action === 'increase'
                    ? `🚀 Level Up! Advancing to Level ${levelUpNotification.to} (${levelUpNotification.toName})`
                    : `⚖️ Difficulty Adjusted to Level ${levelUpNotification.to} (${levelUpNotification.toName})`}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  {levelUpNotification.reason}
                </div>
              </div>
            </div>
            <button
              onClick={() => setLevelUpNotification(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.4rem' }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Chat Transcript */}
        <div className="conversation-area">
          <div className="chat-scroll">
            {conversationHistory.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble ${msg.role === 'interviewer' ? 'bubble-ai' : 'bubble-user'}`}
              >
                <div className="bubble-header">
                  <span className="bubble-role">
                    {msg.role === 'interviewer' ? (
                      <>
                        <span className="role-avatar-badge" style={{ background: interviewer.avatarBg }}>🎙️</span>
                        <span className="role-author-name">{interviewer.name}</span>
                        <span className="role-sub-badge">{interviewer.title}</span>
                      </>
                    ) : (
                      <>
                        <span className="role-avatar-badge user-avatar-badge">👤</span>
                        <span className="role-author-name">You</span>
                        <span className="role-sub-badge">{candidateProfile?.fullName || 'Candidate'}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="bubble-body">
                  <p className="bubble-text">{msg.text}</p>
                </div>
              </div>
            ))}

            {/* LIVE REAL-TIME WORD-BY-WORD BUBBLE */}
            {phase === 'listening' && (textInput || transcript || interimTranscript) && (
              <div className="chat-bubble bubble-user bubble-live">
                <div className="bubble-header">
                  <span className="bubble-role">
                    <span className="role-avatar-badge user-avatar-badge">👤</span>
                    <span className="role-author-name">You</span>
                    <span className="role-live-badge">
                      <span className="live-pulse-dot"></span>
                      {isListening ? 'Speaking live...' : 'Typing...'}
                    </span>
                  </span>
                </div>
                <div className="bubble-body">
                  <p className="bubble-text live-text">
                    {textInput || (
                      <>
                        {transcript && <span className="final-word">{transcript} </span>}
                        {interimTranscript && <span className="interim-word">{interimTranscript}</span>}
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {phase === 'thinking' && (
              <div className="chat-bubble bubble-ai bubble-thinking">
                <div className="bubble-header">
                  <span className="bubble-role">
                    <span className="role-avatar-badge" style={{ background: interviewer.avatarBg }}>🎙️</span>
                    <span className="role-author-name">{interviewer.name}</span>
                    <span className="role-thinking-badge">Evaluating answer...</span>
                  </span>
                </div>
                <div className="thinking-dots"><span></span><span></span><span></span></div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Phase 9: 10-Second Response Timeout Friendly Prompt */}
        {showNoResponsePrompt && phase === 'listening' && (
          <div className="no-response-prompt animate-fade-in" style={{
            margin: '0.75rem 0 0.25rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(0, 212, 255, 0.08)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
          }}>
            <Clock size={18} style={{ color: '#00d4ff', flexShrink: 0 }} />
            <span>Take your time, but please start answering when you're ready.</span>
          </div>
        )}

        {/* Error Diagnostic */}
        {(error || speechError) && (
          <div className="error-message">
            <AlertCircle size={16} />
            <span>
              {error || (speechError === 'no-speech' ? 'No voice detected. Type your response below or click Mic.' : `Microphone event (${speechError}). Type or click Mic.`)}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="controls">
          {phase === 'listening' && (
            <form onSubmit={handleManualSubmit} className="input-form">
              <button
                type="button"
                className={`mic-btn ${isListening ? 'active' : ''}`}
                onClick={handleToggleMic}
                title={isListening ? 'Pause Mic' : 'Start Mic'}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                <span>{isListening ? 'Listening...' : 'Mic'}</span>
              </button>

              <input
                type="text"
                className="chat-input"
                placeholder={isListening ? 'Speak or type your answer here...' : 'Type or speak your answer...'}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />

              <button
                type="submit"
                className="done-btn"
                disabled={!textInput.trim() && !transcript.trim() && !interimTranscript.trim()}
              >
                <Send size={18} />
                Send Answer
              </button>
            </form>
          )}

          {phase === 'speaking' && (
            <div className="speaking-indicator">
              <Volume2 size={20} />
              <span>{interviewer.name} is speaking...</span>
            </div>
          )}

          {(phase === 'thinking' || phase === 'greeting') && (
            <div className="thinking-indicator">
              <Loader size={20} className="spin" />
              <span>{phase === 'greeting' ? `Connecting with ${interviewer.name}...` : `${interviewer.name} is evaluating your response...`}</span>
            </div>
          )}

          {phase === 'complete' && (
            <div className="complete-indicator">
              <span>✅ Interview complete! Redirecting to report...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewSession;
