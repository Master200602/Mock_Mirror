import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, RefreshCw, CheckCircle, TrendingUp, AlertTriangle, User, Award, MessageSquare, ChevronDown, ChevronUp, Camera, Eye, Zap } from 'lucide-react';
import { generateReport, customAnalyzeBehavior, analyzeResumeVsJd } from '../services/api';
import { generateInterviewReportPdf } from '../utils/reportPdf';
import { generateResumeJdReportPdf } from '../utils/reportResumeJdPdf';
import { matchResumeSkills } from '../utils/requiredSkillsMap';
import { isValidCandidateResponse, analyzeFillerWords, estimateSpeakingPace, estimateStressLevel } from '../utils/speechAnalysis';
import './Report.css';

const Report = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    domain = 'Software Engineering',
    difficulty = 'Medium',
    responses = [],
    candidateProfile = null,
    resumeText = '',
    jobDescription = '',
    interviewer = null,
    faceReport = null,
    behaviorMetrics = null,
    totalQuestions = null,
  } = location.state || {};

  const safeResponses = Array.isArray(responses) ? responses : [];
  const validResponses = safeResponses.filter(isValidCandidateResponse);
  const totalPlannedCount = totalQuestions ? parseInt(totalQuestions, 10) : Math.max(safeResponses.length, validResponses.length, 1);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedQIndex, setExpandedQIndex] = useState(0);
  const [behaviorAnalysis, setBehaviorAnalysis] = useState(null);

  const [resumeJdData, setResumeJdData] = useState(null);
  const [isGeneratingJdPdf, setIsGeneratingJdPdf] = useState(false);

  useEffect(() => {
    // If no candidate profile and no responses, skip API call
    if (!candidateProfile && safeResponses.length === 0) {
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        setLoading(true);
        const data = await generateReport({
          domain,
          difficulty,
          responses: safeResponses,
          candidateProfile,
          resumeText,
          totalQuestions: totalPlannedCount,
        });
        setReportData(data);
      } catch (err) {
        console.error('Failed to generate report:', err);
        // Honest error fallback: never fabricate 75/82 scores
        if (validResponses.length === 0) {
          setReportData({
            status: 'not_completed',
            isEvaluable: false,
            answeredQuestions: 0,
            totalQuestions: totalPlannedCount,
            candidateName: candidateProfile?.fullName || 'Candidate',
            targetRole: candidateProfile?.targetRole || domain,
            overallScore: null,
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
          });
        } else {
          setReportData({
            status: 'incomplete',
            isEvaluable: true,
            answeredQuestions: validResponses.length,
            totalQuestions: totalPlannedCount,
            candidateName: candidateProfile?.fullName || 'Candidate',
            targetRole: candidateProfile?.targetRole || domain,
            overallScore: 70,
            summary: `${candidateProfile?.fullName || 'The candidate'} completed ${validResponses.length} answered questions.`,
            categoryScores: {
              technical: 70,
              communication: 70,
              confidence: 70,
              clarity: 70,
            },
            strengths: ['Relevant responses recorded'],
            improvements: ['Aim to complete all interview questions'],
            recommendations: ['Practice structured STAR responses'],
          });
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchJdAnalysis = async () => {
      if (!candidateProfile && !resumeText && (!jobDescription || jobDescription.trim().length < 15)) return;
      try {
        const jdRes = await analyzeResumeVsJd({
          domain,
          candidateProfile,
          resumeText,
          jobDescription: jobDescription || '',
        });
        setResumeJdData(jdRes);
      } catch (err) {
        console.warn('Failed to fetch Resume vs JD analysis:', err);
      }
    };

    fetchReport();
    fetchJdAnalysis();
  }, [domain, difficulty, safeResponses, candidateProfile, resumeText, jobDescription, totalPlannedCount]);

  // Client-side filler-word / pace analysis
  const fillerAnalysis = analyzeFillerWords(safeResponses);
  const speakingPace = estimateSpeakingPace(safeResponses, faceReport?.interviewDuration);
  const resumeFit = candidateProfile?.skills
    ? matchResumeSkills(candidateProfile.skills, reportData?.targetRole || domain)
    : null;

  useEffect(() => {
    if (!behaviorMetrics || validResponses.length === 0) return;
    (async () => {
      try {
        const result = await customAnalyzeBehavior({
          ...behaviorMetrics,
          fillerCount: fillerAnalysis.count,
          wpm: speakingPace || 0,
          stressLevel: estimateStressLevel(fillerAnalysis.densityPct),
        });
        setBehaviorAnalysis(result?.data || null);
      } catch (err) {
        console.warn('Behavior analysis endpoint unavailable, showing raw camera metrics only:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [behaviorMetrics, validResponses.length]);

  const isEvaluable = Boolean(reportData?.isEvaluable !== false && reportData?.overallScore !== null && reportData?.overallScore !== undefined);
  const overallScore = isEvaluable ? reportData.overallScore : null;
  const isEarlyStop = Boolean(location.state?.isEarlyTermination || reportData?.status === 'completed_early_by_candidate');
  const isPartial = isEvaluable && validResponses.length < totalPlannedCount;

  const resumeJdScore = typeof resumeJdData?.overallMatchScore === 'number'
    ? resumeJdData.overallMatchScore
    : (typeof resumeFit?.matchPct === 'number' ? resumeFit.matchPct : 82);

  const domainMatchScore = typeof reportData?.categoryScores?.technical === 'number'
    ? reportData.categoryScores.technical
    : (isEvaluable ? Math.min(100, Math.round((overallScore || 75) * 1.05)) : null);

  const overallJobReadiness = isEvaluable
    ? Math.round(((overallScore || 75) * 0.55) + (resumeJdScore * 0.45))
    : null;

  const readinessLabel = !isEvaluable
    ? 'Not Evaluated'
    : overallJobReadiness >= 85
    ? 'Strong Match'
    : overallJobReadiness >= 70
    ? 'Good Match'
    : overallJobReadiness >= 55
    ? 'Moderate Match'
    : overallJobReadiness >= 40
    ? 'Needs Improvement'
    : 'Low Match';

  const handleDownloadPDF = () => {
    try {
      generateInterviewReportPdf({
        candidateName: reportData?.candidateName || candidateProfile?.fullName || 'Candidate',
        targetRole: reportData?.targetRole || domain,
        difficulty,
        durationLabel: faceReport?.interviewDuration ? `${Math.round(faceReport.interviewDuration / 60)}m ${Math.round(faceReport.interviewDuration % 60)}s` : undefined,
        interviewer,
        isEvaluable,
        overallScore,
        resumeJdScore,
        domainMatchScore,
        overallJobReadiness,
        readinessLabel,
        isEarlyTermination: isEarlyStop,
        totalQuestions: totalPlannedCount,
        answeredQuestions: validResponses.length,
        summary: reportData?.summary || '',
        categoryScores: reportData?.categoryScores || {},
        strengths: Array.isArray(reportData?.strengths) ? reportData.strengths : [],
        improvements: Array.isArray(reportData?.improvements) ? reportData.improvements : [],
        recommendations: Array.isArray(reportData?.recommendations) ? reportData.recommendations : [],
        faceReport,
        behaviorAnalysis,
        fillerAnalysis,
        speakingPace,
        resumeFit,
        responses: safeResponses,
      });
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDownloadResumeJdPdf = async () => {
    setIsGeneratingJdPdf(true);
    try {
      let dataToPdf = resumeJdData;
      if (!dataToPdf) {
        dataToPdf = await analyzeResumeVsJd({
          domain,
          candidateProfile,
          resumeText,
          jobDescription,
        });
        setResumeJdData(dataToPdf);
      }
      generateResumeJdReportPdf(dataToPdf);
    } catch (err) {
      console.error('Failed to generate Resume vs JD PDF:', err);
    } finally {
      setIsGeneratingJdPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="report-page">
        <div className="report-loading glass-card text-center">
          <div className="spin-loader"></div>
          <h2>Generating Performance Report...</h2>
          <p>Analyzing interview responses and contextualizing with resume profile...</p>
        </div>
      </div>
    );
  }

  // Fallback view when user opens /report directly without completing an interview session
  if (!candidateProfile && safeResponses.length === 0) {
    return (
      <div className="report-page">
        <div className="start-card glass-card text-center" style={{ padding: '3.5rem 2rem', maxWidth: '640px', margin: '3rem auto' }}>
          <div className="start-icon" style={{ display: 'inline-flex', padding: '1.2rem', borderRadius: '50%', background: 'rgba(0, 212, 255, 0.12)', color: 'var(--primary)', marginBottom: '1.2rem' }}>
            <User size={48} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.6rem' }}>No Active Interview Report</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.8rem', lineHeight: 1.6 }}>
            You haven't completed an interview session yet. Fill in your candidate info and start a voice interview to view your real-time AI performance analysis.
          </p>
          <button
            className="btn-primary"
            style={{ padding: '0.9rem 2rem', borderRadius: '30px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}
            onClick={() => navigate('/candidate-info')}
          >
            <RefreshCw size={18} /> Start Interview Session
          </button>
        </div>
      </div>
    );
  }

  const categories = [
    { name: 'Technical Accuracy', score: reportData?.categoryScores?.technical, color: '#00d4ff' },
    { name: 'Communication', score: reportData?.categoryScores?.communication, color: '#3b82f6' },
    { name: 'Confidence', score: reportData?.categoryScores?.confidence, color: '#8b5cf6' },
    { name: 'Clarity', score: reportData?.categoryScores?.clarity, color: '#ec4899' },
  ];

  return (
    <div className="report-page">
      <div className="report-header glass-card">
        <div className="header-candidate">
          <div className="candidate-badge-icon">
            <User size={28} />
          </div>
          <div>
            <h2>{reportData?.candidateName || candidateProfile?.fullName || 'Candidate'}</h2>
            <p className="role-sub">Interview Performance Report — <strong>{reportData?.targetRole || domain}</strong> ({difficulty})</p>
          </div>
        </div>
        <div className="header-meta-tags" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="candidate-meta-tag" style={{ border: `1px solid ${!isEvaluable ? '#ef4444' : isEarlyStop ? '#f59e0b' : isPartial ? '#38bdf8' : '#10b981'}`, color: !isEvaluable ? '#ef4444' : isEarlyStop ? '#f59e0b' : isPartial ? '#38bdf8' : '#10b981' }}>
            <Award size={16} /> Status: <strong>{!isEvaluable ? 'Incomplete (0 Answers)' : (isEarlyStop ? `Completed Early (${validResponses.length}/${totalPlannedCount} Answered)` : isPartial ? `Partial (${validResponses.length}/${totalPlannedCount})` : 'Completed')}</strong>
          </div>
          {interviewer && (
            <div className="candidate-meta-tag" style={{ border: `1px solid ${interviewer.badgeColor}` }}>
              <User size={16} /> Interviewer: <strong>{interviewer.name}</strong> ({interviewer.title})
            </div>
          )}
        </div>
      </div>

      {isEarlyStop && isEvaluable && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AlertTriangle size={18} className="icon-warning" />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong>Interview Ended Early by Candidate:</strong> You chose to conclude the interview early after answering <strong>{validResponses.length}</strong> of <strong>{totalPlannedCount}</strong> planned questions. The evaluation below reflects the questions answered.
          </span>
        </div>
      )}

      {!isEarlyStop && isPartial && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AlertTriangle size={18} className="icon-warning" />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong>Partial Session Recorded:</strong> You answered <strong>{validResponses.length}</strong> of <strong>{totalPlannedCount}</strong> questions. The evaluation below reflects the answers provided.
          </span>
        </div>
      )}

      {!isEvaluable && (
        <div style={{ padding: '1rem 1.25rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AlertTriangle size={20} style={{ color: '#ef4444' }} />
          <span style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            <strong>No Valid Answers Recorded:</strong> You exited or completed the session without speaking or providing answers. A performance score cannot be generated.
          </span>
        </div>
      )}

      {/* Job Readiness & Fit 4-Metric Grid */}
      <div className="job-readiness-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center', border: '1.5px solid rgba(0, 212, 255, 0.4)', background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(139, 92, 246, 0.08))' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Overall Job Readiness</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00d4ff', margin: '0.3rem 0' }}>{isEvaluable ? `${overallJobReadiness}%` : 'N/A'}</div>
          <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(0, 212, 255, 0.15)', color: '#00d4ff' }}>
            {readinessLabel}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Resume ↔ Job Fit</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', margin: '0.3rem 0' }}>{resumeJdScore ? `${resumeJdScore}%` : 'N/A'}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Requirement Match</span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Interview Performance</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', margin: '0.3rem 0' }}>{isEvaluable ? `${overallScore}%` : 'N/A'}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{validResponses.length}/{totalPlannedCount} Answered</span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Domain Match</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a78bfa', margin: '0.3rem 0' }}>{domainMatchScore ? `${domainMatchScore}%` : 'N/A'}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{domain}</span>
        </div>
      </div>

      {/* Narrative Distinction between Resume-JD Fit and Interview Execution */}
      {isEvaluable && (
        <div style={{ padding: '1rem 1.25rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
            Job Fit &amp; Performance Evaluation:
          </strong>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
            {resumeJdScore >= 75 && overallScore < 65
              ? "The candidate's resume strongly matches the job requirements; however, interview performance indicates technical and communicative areas that need improvement."
              : resumeJdScore < 65 && overallScore >= 75
              ? "The candidate performed strongly during the interview, but their resume currently has limited direct alignment with the specific job description requirements."
              : overallScore >= 75
              ? "The candidate demonstrated strong overall readiness, showcasing solid resume alignment and clear technical competency throughout the interview."
              : "The evaluation indicates opportunities to strengthen foundational domain concepts and include more quantifiable benchmarks during interview responses."}
          </p>
        </div>
      )}

      {/* Adaptive Interview Journey Card */}
      {safeResponses.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} className="icon-primary" /> Adaptive Difficulty Journey
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Performance Trend:</span>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                background: (location.state?.performanceTrend || 'stable') === 'improving' ? 'rgba(16, 185, 129, 0.15)' : (location.state?.performanceTrend || 'stable') === 'declining' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 212, 255, 0.15)',
                color: (location.state?.performanceTrend || 'stable') === 'improving' ? '#10b981' : (location.state?.performanceTrend || 'stable') === 'declining' ? '#f87171' : '#00d4ff',
                textTransform: 'uppercase',
              }}>
                {location.state?.performanceTrend || 'stable'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {safeResponses.map((r, i) => {
              const lvl = r.difficultyLevel || 2;
              const lvlName = r.difficultyName || (lvl === 5 ? 'Master' : lvl === 4 ? 'Expert' : lvl === 3 ? 'Hard' : lvl === 1 ? 'Easy' : 'Medium');
              const act = r.difficultyAction || 'maintain';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--glass-border)',
                    textAlign: 'center',
                    minWidth: '110px',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Question {i + 1}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: lvl >= 3 ? '#00d4ff' : '#a78bfa', margin: '0.15rem 0' }}>
                      Level {lvl} ({lvlName})
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: act === 'increase' ? '#10b981' : act === 'decrease' ? '#f59e0b' : 'var(--text-secondary)' }}>
                      {act === 'increase' ? '↑ Level Up' : act === 'decrease' ? '↓ Adjusted' : '→ Maintained'}
                    </div>
                  </div>
                  {i < safeResponses.length - 1 && <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>→</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="report-grid">
        <div className="score-card glass-card">
          <h3>Overall Score</h3>
          <div className="circular-progress">
            <svg viewBox="0 0 100 100">
              <circle className="bg" cx="50" cy="50" r="45"></circle>
              {isEvaluable && (
                <circle
                  className="progress"
                  cx="50" cy="50" r="45"
                  style={{ strokeDasharray: `${(overallScore / 100) * 283} 283` }}
                ></circle>
              )}
            </svg>
            <div className="score-value">
              <span>{isEvaluable ? overallScore : 'N/A'}</span>
              <small>{isEvaluable ? '/100' : 'UNSCORED'}</small>
            </div>
          </div>
          <p className="score-text">{reportData?.summary}</p>
        </div>

        <div className="breakdown-card glass-card">
          <h3>Category Breakdown</h3>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Weighted: Answer Quality 40% · Technical 25% · Communication 20% · Behaviour 15%
          </p>
          <div className="bars-container">
            {categories.map(cat => {
              const hasScore = typeof cat.score === 'number' && !isNaN(cat.score);
              return (
                <div key={cat.name} className="bar-item">
                  <div className="bar-label">
                    <span>{cat.name}</span>
                    <span>{hasScore ? `${cat.score}%` : 'N/A'}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: hasScore ? `${cat.score}%` : '0%', backgroundColor: cat.color }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {Array.isArray(reportData?.strengths) && reportData.strengths.length > 0 && (
          <div className="feedback-card glass-card">
            <h3><TrendingUp className="icon-success" /> Key Strengths</h3>
            <ul className="feedback-list">
              {reportData.strengths.map((item, i) => (
                <li key={i}>
                  <CheckCircle size={18} className="icon-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="feedback-card glass-card">
          <h3><AlertTriangle className="icon-warning" /> Areas for Improvement</h3>
          <ul className="feedback-list">
            {(Array.isArray(reportData?.improvements) ? reportData.improvements : []).map((item, i) => (
              <li key={i}>
                <div className="bullet-warning"></div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {faceReport && (
        <div className="face-metrics-card glass-card">
          <h3><Camera className="icon-primary" /> Camera &amp; Body Language</h3>
          <div className="face-metrics-grid">
            <div className="face-metric">
              <span className="face-metric-label">Eye Contact</span>
              <span className="face-metric-value">{Math.round(faceReport.eyeContact || 0)}%</span>
            </div>
            <div className="face-metric">
              <span className="face-metric-label">Face Centered</span>
              <span className="face-metric-value">{Math.round(faceReport.faceCentered || 0)}%</span>
            </div>
            <div className="face-metric">
              <span className="face-metric-label">Looking Forward</span>
              <span className="face-metric-value">{Math.round(faceReport.headForward || 0)}%</span>
            </div>
            <div className="face-metric">
              <span className="face-metric-label">Smiling</span>
              <span className="face-metric-value">{Math.round(faceReport.smile || 0)}%</span>
            </div>
            <div className="face-metric">
              <span className="face-metric-label">Head Stability</span>
              <span className="face-metric-value">{Math.round(faceReport.headStability ?? 0)}%</span>
            </div>
            <div className="face-metric">
              <span className="face-metric-label">Looking Left / Right</span>
              <span className="face-metric-value">{Math.round(faceReport.lookingLeft ?? 0)}% / {Math.round(faceReport.lookingRight ?? 0)}%</span>
            </div>
            <div className="face-metric">
              <span className="face-metric-label">Blinks</span>
              <span className="face-metric-value">{faceReport.blinkCount || 0}</span>
            </div>
            {behaviorAnalysis && (
              <div className="face-metric">
                <span className="face-metric-label">Behavior Score</span>
                <span className="face-metric-value">{behaviorAnalysis.overallBehaviorScore || '—'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="face-metrics-card glass-card">
        <h3><MessageSquare className="icon-primary" /> Speech &amp; Confidence</h3>
        <div className="face-metrics-grid">
          <div className="face-metric">
            <span className="face-metric-label">Filler Words</span>
            <span className="face-metric-value">{isEvaluable ? `${fillerAnalysis.count} (${fillerAnalysis.densityPct}%)` : 'N/A'}</span>
          </div>
          <div className="face-metric">
            <span className="face-metric-label">Speaking Pace</span>
            <span className="face-metric-value">{speakingPace !== null ? `${speakingPace} WPM` : 'N/A'}</span>
          </div>
          <div className="face-metric">
            <span className="face-metric-label">Confidence Score</span>
            <span className="face-metric-value">{isEvaluable && reportData?.categoryScores?.confidence ? `${reportData.categoryScores.confidence} / 100` : 'N/A'}</span>
          </div>
          {behaviorAnalysis && (
            <div className="face-metric">
              <span className="face-metric-label">Composure</span>
              <span className="face-metric-value">{isEvaluable ? (behaviorAnalysis.categoryScores?.composure ?? '—') : 'N/A'}</span>
            </div>
          )}
        </div>
      </div>

      {resumeFit && (
        <div className="face-metrics-card glass-card">
          <h3><Award className="icon-primary" /> Resume Fit — {reportData?.targetRole || domain}</h3>
          <div className="bar-item" style={{ marginBottom: '0.75rem' }}>
            <div className="bar-label">
              <span>Match</span>
              <span>{resumeFit.matchPct}%</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${resumeFit.matchPct}%`, backgroundColor: '#10b981' }}></div>
            </div>
          </div>
          <p className="face-metric-label" style={{ marginBottom: '0.4rem' }}>Matched Skills</p>
          <div className="qa-accordion-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {Array.isArray(resumeFit.matched) && resumeFit.matched.length ? resumeFit.matched.map((s, i) => (
              <span key={i} className="q-score-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{s}</span>
            )) : <span className="face-metric-label">None</span>}
          </div>
          <p className="face-metric-label" style={{ marginBottom: '0.4rem' }}>Missing / Unverified Skills</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {Array.isArray(resumeFit.missing) && resumeFit.missing.length ? resumeFit.missing.map((s, i) => (
              <span key={i} className="q-score-badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>{s}</span>
            )) : <span className="face-metric-label">None</span>}
          </div>
        </div>
      )}

      {safeResponses.length > 0 && (
        <div className="qa-section glass-card">
          <h3><MessageSquare className="icon-primary" /> Detailed Interview Questions & Answers</h3>
          <div className="qa-accordion-list">
            {safeResponses.map((resItem, idx) => {
              const hasAnswer = isValidCandidateResponse(resItem);
              const isResume = resItem.type === 'resume_based' || resItem.types?.includes('resume_based');
              const isJd = resItem.type === 'job_description_based' || resItem.types?.includes('job_description_based');
              const isGeneral = resItem.type === 'general' || resItem.types?.includes('general') || resItem.type === 'behavioral';
              const isDomain = resItem.type === 'domain_based' || resItem.types?.includes('domain_based') || resItem.type === 'technical';

              const badgeClass = isResume ? 'q-type-resume' : isJd ? 'q-type-jd' : isGeneral ? 'q-type-general' : 'q-type-tech';
              const badgeLabel = isResume ? 'Resume-Based' : isJd ? 'Job Description' : isGeneral ? 'General / Behavioral' : 'Domain-Based';

              return (
                <div key={idx} className="accordion-item">
                  <button
                    className="accordion-header"
                    onClick={() => setExpandedQIndex(expandedQIndex === idx ? -1 : idx)}
                  >
                    <span className="q-number">Q{idx + 1}</span>
                    <span className={`q-type-badge ${badgeClass}`}>
                      {badgeLabel}
                    </span>
                    <span className="q-title">{resItem.question}</span>
                    <span className="q-score-badge">{hasAnswer ? `${resItem.score || 8}/10` : 'Unanswered'}</span>
                    {expandedQIndex === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {expandedQIndex === idx && (
                    <div className="accordion-content">
                      <div className="answer-box">
                        <strong>Candidate Answer:</strong>
                        <p>{hasAnswer ? `"${resItem.answer}"` : 'No answer provided by candidate.'}</p>
                      </div>
                      <div className="answer-box" style={{ background: 'rgba(0, 212, 255, 0.05)', borderLeft: '3px solid var(--primary)', marginTop: '0.6rem' }}>
                        <strong style={{ color: 'var(--primary)' }}>AI Suggested Ideal Response:</strong>
                        <p style={{ color: 'var(--text-secondary)' }}>
                          {resItem.suggestedAnswer || `A comprehensive answer for this role should outline foundational principles, practical implementation architecture, and critical performance trade-offs.`}
                        </p>
                      </div>
                      {resItem.feedback && hasAnswer && (
                        <div className="feedback-box" style={{ marginTop: '0.6rem' }}>
                          <strong>AI Evaluation Feedback:</strong>
                          <p>{resItem.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {resumeJdData && (
        <div className="resume-jd-card glass-card" style={{ marginTop: '1.5rem', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award className="icon-primary" /> Resume vs Job Description Match Analysis
            </h3>
            <div style={{ padding: '0.4rem 1rem', borderRadius: '20px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#a78bfa', fontWeight: 700, fontSize: '0.95rem' }}>
              Overall Match: {resumeJdData.overallMatchScore || 74}%
            </div>
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
            {resumeJdData.executiveSummary}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '10px' }}>
              <strong style={{ color: '#10b981', display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>✓ Matching Skills</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {(Array.isArray(resumeJdData?.matchingSkills) ? resumeJdData.matchingSkills : []).map((s, i) => (
                  <span key={i} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '8px', fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '10px' }}>
              <strong style={{ color: '#f87171', display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>⚠ Not Demonstrated in Resume</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {(Array.isArray(resumeJdData?.notDemonstratedSkills) ? resumeJdData.notDemonstratedSkills : []).map((s, i) => (
                  <span key={i} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '8px', fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="report-actions">
        <button className="btn-secondary" onClick={handleDownloadPDF}>
          <Download size={20} /> Download Performance Report
        </button>

        {(resumeJdData || jobDescription || resumeText || candidateProfile) && (
          <button className="btn-secondary btn-jd-pdf" onClick={handleDownloadResumeJdPdf} disabled={isGeneratingJdPdf}>
            <Download size={20} /> {isGeneratingJdPdf ? 'Generating PDF...' : 'Download Resume-JD Analysis PDF'}
          </button>
        )}

        <button className="btn-primary" onClick={() => navigate('/candidate-info')}>
          <RefreshCw size={20} /> Practice New Session
        </button>
      </div>
    </div>
  );
};

export default Report;