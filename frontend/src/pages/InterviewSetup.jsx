import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings, Play, Briefcase, Zap, List, User, FileText, CheckCircle, UserCheck } from 'lucide-react';
import { getRandomInterviewer } from '../utils/interviewers';
import './InterviewSetup.css';

const domains = [
  'Software Engineering', 'Data Science', 'Product Management',
  'Marketing', 'Finance', 'Healthcare', 'Education', 'General'
];

const InterviewSetup = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const candidateProfile = location.state?.candidateProfile || null;
  const resumeText = location.state?.resumeText || '';
  const interviewer = location.state?.interviewer || getRandomInterviewer();

  const initialDomain = candidateProfile?.targetRole || domains[0];
  const [domain, setDomain] = useState(initialDomain);
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionsCount, setQuestionsCount] = useState(5);

  const handleStart = (e) => {
    e.preventDefault();
    navigate('/interview', {
      state: {
        domain,
        difficulty,
        questionsCount,
        candidateProfile,
        resumeText,
        interviewer,
      },
    });
  };

  return (
    <div className="setup-page">
      <div className="setup-container">
        
        {/* Candidate Profile Summary Banner */}
        {candidateProfile && (
          <div className="candidate-summary-banner glass-card">
            <div className="summary-main">
              <div className="candidate-avatar-badge">
                <User size={28} />
              </div>
              <div className="summary-info">
                <h3>Candidate: <span className="gradient-text">{candidateProfile.fullName}</span></h3>
                <p className="summary-role">Target Role: <strong>{candidateProfile.targetRole}</strong> | {candidateProfile.education}</p>
                {candidateProfile.skills && (
                  <div className="summary-skills">
                    {candidateProfile.skills.slice(0, 5).map((skill, i) => (
                      <span key={i} className="summary-skill-chip">{skill}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {resumeText && (
              <div className="resume-badge">
                <FileText size={18} />
                <span>Resume Attached ({resumeText.split(/\s+/).length} words)</span>
                <CheckCircle size={16} className="text-success" />
              </div>
            )}
          </div>
        )}

        <div className="setup-header text-center">
          <h2><Settings className="inline-icon" /> Interview Session Setup</h2>
          <p>Configure parameters for your session with <strong>{interviewer.name}</strong></p>
        </div>

        <div className="setup-content">
          <form className="setup-form glass-card" onSubmit={handleStart}>

            <div className="form-group">
              <label><Briefcase className="label-icon" /> Select Domain / Focus Area</label>
              <div className="custom-select-wrapper">
                <input
                  type="text"
                  className="custom-input"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. Software Engineering / Full Stack"
                />
              </div>
            </div>

            <div className="form-group">
              <label><Zap className="label-icon" /> Difficulty Level</label>
              <div className="difficulty-toggles">
                {['Easy', 'Medium', 'Hard'].map(level => (
                  <button
                    key={level}
                    type="button"
                    className={`toggle-btn ${difficulty === level ? 'active' : ''}`}
                    onClick={() => setDifficulty(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>
                <span><List className="label-icon" /> Number of Questions</span>
                <span className="count-badge">{questionsCount}</span>
              </label>
              <input
                type="range"
                min="3"
                max="10"
                value={questionsCount}
                onChange={(e) => setQuestionsCount(parseInt(e.target.value))}
                className="custom-slider"
              />
              <div className="slider-labels">
                <span>3</span>
                <span>10</span>
              </div>
            </div>

            <button type="submit" className="btn-primary start-btn">
              Start Interview with {interviewer.name} <Play size={20} fill="currentColor" />
            </button>
          </form>

          <div className="setup-preview glass-card">
            <h3>Session Preview</h3>
            <div className="preview-items">
              <div className="preview-item">
                <span className="preview-label">Interviewer</span>
                <span className="preview-value gradient-text">{interviewer.name}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Candidate</span>
                <span className="preview-value">{candidateProfile?.fullName || 'Guest Candidate'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Target Role</span>
                <span className="preview-value">{domain}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Difficulty</span>
                <span className="preview-value">{difficulty}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Questions</span>
                <span className="preview-value">{questionsCount}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Resume Context</span>
                <span className="preview-value text-success">{resumeText ? 'Enabled ✅' : 'Standard'}</span>
              </div>
            </div>
            <div className="preview-info">
              <p><UserCheck size={16} /> <strong>{interviewer.name}</strong> ({interviewer.title}) will greet you and conduct a natural human voice interview tailored to your experience.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;
