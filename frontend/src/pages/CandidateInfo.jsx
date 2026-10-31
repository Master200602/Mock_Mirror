import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, MapPin, GraduationCap, Briefcase, Target, UploadCloud, CheckCircle2, FileText, AlertCircle, ArrowRight, Loader2, Zap, List, UserCheck, RefreshCw, Search, Sparkles } from 'lucide-react';
import { uploadResume, analyzeResume } from '../services/api';
import { getRandomInterviewer } from '../utils/interviewers';
import { DOMAIN_GROUPS } from '../data/domains';
import './CandidateInfo.css';

// Must match MAX_RESUME_MB in backend/routes/resume.js. Kept below Vercel's ~4.5MB
// serverless request-body limit (larger uploads are rejected by Vercel itself with a 413).
const MAX_RESUME_MB = 4;

const CandidateInfo = () => {
  const navigate = useNavigate();

  // Assigned real-world interviewer persona (selected dynamically for each session)
  const [interviewer, setInterviewer] = useState(() => getRandomInterviewer());

  const handleShuffleInterviewer = () => {
    setInterviewer(prev => getRandomInterviewer(prev.id));
  };

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    city: '',
    college: '',
    degree: '',
    branch: '',
    graduationYear: '',
    experienceYears: '0',
    currentRole: '',
    targetRole: 'Software Engineer',
  });

  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionsCount, setQuestionsCount] = useState(5);

  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | uploading | analyzed | error
  const [domainSearch, setDomainSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDomainGroups = DOMAIN_GROUPS.map(group => {
    if (!domainSearch.trim()) return group;
    const q = domainSearch.toLowerCase().trim();
    const matchingRoles = group.roles.filter(role =>
      role.toLowerCase().includes(q) || group.category.toLowerCase().includes(q)
    );
    return matchingRoles.length > 0 ? { ...group, roles: matchingRoles } : null;
  }).filter(Boolean);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (file) => {
    if (!file) return;

    // Prevent duplicate submissions (e.g. a second file dropped while one is processing)
    if (uploadStatus === 'uploading') return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Only PDF format resumes are allowed. Please select a valid PDF file.');
      setUploadStatus('error');
      return;
    }

    if (file.size > MAX_RESUME_MB * 1024 * 1024) {
      setErrorMessage(`File size exceeds the maximum limit of ${MAX_RESUME_MB}MB. Please upload a smaller PDF.`);
      setUploadStatus('error');
      return;
    }

    setResumeFile(file);
    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      const uploadRes = await uploadResume(file);

      // A non-object reply (e.g. an HTML page) means the request never reached our API —
      // typically VITE_API_URL is not set on the deployed frontend.
      if (!uploadRes || typeof uploadRes !== 'object') {
        setErrorMessage('The server sent an unexpected response. The site may be misconfigured — please contact support.');
        setUploadStatus('error');
        setResumeFile(null);
        setResumeText('');
        return;
      }

      // Check if backend returned a rejection (NOT_A_RESUME, INSUFFICIENT_CONTENT, etc.)
      if (uploadRes.error) {
        setErrorMessage(uploadRes.message || 'This file was rejected. Please upload a valid resume PDF.');
        setUploadStatus('error');
        setResumeFile(null);
        setResumeText('');
        return;
      }

      const text = uploadRes.extractedText;
      if (!text || text.length < 50) {
        setErrorMessage("Couldn't extract readable text from this PDF. Please upload a text-based resume PDF (not a scanned image).");
        setUploadStatus('error');
        setResumeFile(null);
        setResumeText('');
        return;
      }

      setResumeText(text);

      const analysisRes = await analyzeResume(text, formData.targetRole);
      setResumeAnalysis(analysisRes);

      // Auto-fill candidate profile fields from resume analysis
      if (analysisRes) {
        setFormData(prev => {
          const updated = { ...prev };
          if (analysisRes.name) updated.fullName = analysisRes.name;
          if (analysisRes.email) updated.email = analysisRes.email;
          if (analysisRes.location) updated.city = analysisRes.location;
          if (analysisRes.college) updated.college = analysisRes.college;
          if (analysisRes.degree) updated.degree = analysisRes.degree;
          if (analysisRes.branch) updated.branch = analysisRes.branch;
          if (analysisRes.graduationYear) {
            const year = parseInt(analysisRes.graduationYear, 10);
            if (!isNaN(year) && year >= 1980 && year <= 2040) updated.graduationYear = year;
          }
          if (analysisRes.experienceYears != null) {
            const expStr = String(analysisRes.experienceYears).toLowerCase();
            if (expStr.includes('fresher') || expStr.includes('0')) updated.experienceYears = '0';
            else if (expStr.includes('1')) updated.experienceYears = '1';
            else if (expStr.includes('2')) updated.experienceYears = '2';
            else if (expStr.includes('3') || expStr.includes('4') || expStr.includes('5')) updated.experienceYears = '3';
            else if (expStr.includes('5+') || expStr.includes('senior') || expStr.includes('lead')) updated.experienceYears = '5+';
          }
          return updated;
        });
        setIsAutoFilled(true);
      }

      setUploadStatus('analyzed');
    } catch (err) {
      console.warn('Resume upload error:', err);

      // Extract error message from API response if available
      const apiError = err?.response?.data;
      if (apiError?.error && apiError?.message) {
        setErrorMessage(apiError.message);
        setUploadStatus('error');
        setResumeFile(null);
        setResumeText('');
        return;
      }

      // No JSON from our API: pick the clearest message we can from what happened.
      // (Vercel's own 413/502/504 pages are not JSON, so they land here.)
      const status = err?.response?.status;
      let message;
      if (status === 413) {
        message = `This file is too large for the server. Please upload a PDF smaller than ${MAX_RESUME_MB}MB.`;
      } else if (status === 429) {
        message = 'Too many requests. Please wait a few minutes and try again.';
      } else if (status === 504 || status === 408 || err?.code === 'ECONNABORTED') {
        message = 'Processing your resume took too long. Please try again in a moment.';
      } else if (status === 404) {
        message = 'The resume service could not be found (404). The site may be misconfigured — please contact support.';
      } else if (status) {
        message = `The server had a problem processing your resume (error ${status}). Please try again.`;
      } else {
        // No response at all: offline, blocked by CORS, or the backend is unreachable
        message = 'Could not connect to the server to process your resume. Please check your connection and try again.';
      }
      setErrorMessage(message);
      setUploadStatus('error');
      setResumeFile(null);
      setResumeText('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!resumeFile || uploadStatus !== 'analyzed') {
      setErrorMessage('Resume upload is COMPULSORY. Please upload your PDF resume first so details can be auto-filled.');
      return;
    }
    if (!formData.fullName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Email Address is required.');
      return;
    }
    if (!formData.city.trim()) {
      setErrorMessage('City / Location is required.');
      return;
    }
    if (!formData.college.trim()) {
      setErrorMessage('College / University name is required.');
      return;
    }
    if (!formData.degree.trim()) {
      setErrorMessage('Degree is required.');
      return;
    }
    if (!formData.branch.trim()) {
      setErrorMessage('Branch / Specialization is required.');
      return;
    }
    if (!formData.targetRole.trim()) {
      setErrorMessage('Target Job Role / Domain is required.');
      return;
    }

    setIsSubmitting(true);

    const candidateProfile = {
      ...formData,
      skills: resumeAnalysis?.skills || [formData.branch, formData.targetRole],
      projects: resumeAnalysis?.projects || ['Academic & Technical Projects'],
      summary: resumeAnalysis?.summary || `Candidate applying for ${formData.targetRole} from ${formData.city}`,
      education: `${formData.degree} in ${formData.branch} (${formData.graduationYear}) - ${formData.college}`,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/interview', {
        state: {
          domain: formData.targetRole || 'Software Engineering',
          difficulty,
          questionsCount,
          candidateProfile,
          resumeText,
          jobDescription,
          interviewer,
        },
      });
    }, 600);
  };

  return (
    <div className="candidate-page">
      <div className="candidate-container">
        
        <div className="candidate-header text-center">
          <h2>Candidate Registration & Resume Upload</h2>
          <p>Complete all mandatory fields and attach your resume PDF to meet your interviewer and begin.</p>
        </div>

        {/* Assigned Interviewer Card */}
        <div className="assigned-interviewer-card glass-card">
          <div className="interviewer-card-left">
            <div className="interviewer-avatar" style={{ background: interviewer.avatarBg }}>
              {interviewer.avatarInitial}
            </div>
            <div className="interviewer-details">
              <span className="assigned-tag"><UserCheck size={14} /> Assigned Interviewer</span>
              <h3>{interviewer.name}</h3>
              <p className="interviewer-title">{interviewer.title} • {interviewer.company}</p>
              <p className="interviewer-personality">"{interviewer.personality}"</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary change-interviewer-btn"
            onClick={handleShuffleInterviewer}
            title="Change Interviewer Persona"
          >
            <RefreshCw size={16} /> Switch Interviewer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="candidate-form-layout">
          
          {/* ── SECTION 1: RESUME UPLOAD (FIRST FIELD) ── */}
          <div className="upload-section glass-card resume-first-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3><FileText className="section-icon" /> 1. Upload Your Resume (PDF) <span className="req-star">*</span></h3>
              {uploadStatus === 'analyzed' && (
                <span className="autofill-badge">
                  <Sparkles size={14} /> Resume Analyzed & Details Auto-Filled
                </span>
              )}
            </div>
            <p className="upload-subtitle">
              Upload your PDF resume first. Our AI will automatically extract your contact, education, and technical details to auto-fill your profile below.
            </p>

            <div
              className={`dropzone ${uploadStatus === 'analyzed' ? 'dropzone-success' : ''} ${uploadStatus === 'error' ? 'dropzone-error' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {uploadStatus === 'uploading' ? (
                <div className="dropzone-state">
                  <Loader2 size={40} className="spin text-primary" />
                  <p className="state-text">Processing and analyzing resume PDF...</p>
                </div>
              ) : uploadStatus === 'analyzed' ? (
                <div className="dropzone-state">
                  <CheckCircle2 size={44} className="text-success" />
                  <p className="file-name">{resumeFile?.name}</p>
                  <p className="state-subtitle">Resume PDF uploaded & analyzed successfully! ✅</p>
                  {resumeAnalysis?.skills && (
                    <div className="skills-tags">
                      {resumeAnalysis.skills.slice(0, 8).map((skill, i) => (
                        <span key={i} className="skill-tag">{skill}</span>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: '0.82rem', color: 'var(--primary)', marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <Sparkles size={14} /> Profile fields auto-filled below. Review and edit any field as needed.
                  </p>
                </div>
              ) : (
                <div className="dropzone-state">
                  <UploadCloud size={44} className="upload-icon" />
                  <p className="state-text">Drag & drop your PDF resume here, or <span className="browse-link">browse file</span></p>
                  <span className="file-hint">PDF format compulsory (Max size {MAX_RESUME_MB}MB)</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                    className="file-input-hidden"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 2: CANDIDATE DETAILS (AUTO-FILLED) ── */}
          <div className="form-section glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3><User className="section-icon" /> 2. Candidate Information</h3>
              {isAutoFilled && (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, background: 'rgba(0, 212, 255, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '8px' }}>
                  ✓ Auto-filled (Editable)
                </span>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
                <label><User className="label-icon" /> Full Name <span className="req-star">*</span></label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Auto-filled from resume or enter manually"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="custom-input highlight-input"
                />
              </div>

              <div className="form-group">
                <label><Mail className="label-icon" /> Email Address <span className="req-star">*</span></label>
                <input
                  type="email"
                  name="email"
                  placeholder="alex@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="custom-input"
                />
              </div>

              <div className="form-group">
                <label><MapPin className="label-icon" /> City / Location <span className="req-star">*</span></label>
                <input
                  type="text"
                  name="city"
                  placeholder="e.g. Mumbai, New York, London"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="custom-input"
                />
              </div>

              <div className="form-group full-width">
                <label><GraduationCap className="label-icon" /> College / University <span className="req-star">*</span></label>
                <input
                  type="text"
                  name="college"
                  placeholder="e.g. National Institute of Technology / Stanford"
                  value={formData.college}
                  onChange={handleInputChange}
                  required
                  className="custom-input"
                />
              </div>

              <div className="form-group">
                <label><GraduationCap className="label-icon" /> Degree <span className="req-star">*</span></label>
                <input
                  type="text"
                  name="degree"
                  placeholder="e.g. B.Tech / B.E. / M.S. / B.C.A."
                  value={formData.degree}
                  onChange={handleInputChange}
                  required
                  className="custom-input"
                />
              </div>

              <div className="form-group">
                <label><GraduationCap className="label-icon" /> Branch / Specialization <span className="req-star">*</span></label>
                <input
                  type="text"
                  name="branch"
                  placeholder="e.g. Computer Science / AI / Data Science"
                  value={formData.branch}
                  onChange={handleInputChange}
                  required
                  className="custom-input"
                />
              </div>

              <div className="form-group">
                <label>Graduation Year <span className="req-star">*</span></label>
                <input
                  type="number"
                  name="graduationYear"
                  min="2015"
                  max="2032"
                  placeholder="YYYY"
                  value={formData.graduationYear}
                  onChange={handleInputChange}
                  required
                  className="custom-input"
                />
              </div>

              <div className="form-group">
                <label><Briefcase className="label-icon" /> Experience Level</label>
                <select
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  className="custom-select"
                >
                  <option value="0">Fresher (0 years)</option>
                  <option value="1">1 Year</option>
                  <option value="2">2 Years</option>
                  <option value="3">3-5 Years</option>
                  <option value="5+">5+ Years</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── SECTION 3: TARGET ROLE & JOB DESCRIPTION ── */}
          <div className="jd-section glass-card">
            <h3><Target className="section-icon" /> 3. Target Role & Job Description</h3>

            <div className="form-group full-width" style={{ marginTop: '0.25rem' }}>
              <label><Target className="label-icon" /> Select Your Interview Career Domain / Role <span className="req-star">*</span></label>
              <div className="domain-select-container">
                <div className="domain-filter-box">
                  <Search size={14} className="domain-search-icon" />
                  <input
                    type="text"
                    placeholder="Type to filter roles (e.g. Data Scientist, Cloud, Java)..."
                    value={domainSearch}
                    onChange={(e) => setDomainSearch(e.target.value)}
                    className="domain-filter-input"
                  />
                  {domainSearch && (
                    <button
                      type="button"
                      className="domain-filter-clear"
                      onClick={() => setDomainSearch('')}
                      title="Clear filter"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <select
                  name="targetRole"
                  value={formData.targetRole}
                  onChange={handleInputChange}
                  required
                  className="custom-select custom-domain-select"
                >
                  <option value="" disabled>-- Select Your Career Domain / Role --</option>
                  {filteredDomainGroups.map(group => (
                    <optgroup key={group.category} label={`── ${group.category} ──`}>
                      {group.roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <span className="domain-selected-hint">
                Selected Domain: <strong style={{ color: 'var(--primary)' }}>{formData.targetRole || 'None'}</strong> — Technical questions will be strictly tailored to this domain.
              </span>
            </div>

            <div className="form-group full-width" style={{ marginTop: '0.75rem' }}>
              <label><Briefcase className="label-icon" /> Target Job Description (Optional)</label>
              <p className="upload-subtitle" style={{ marginBottom: '0.4rem' }}>
                Paste the target job description to get JD-targeted questions and a full Resume vs JD Match Analysis report.
              </p>
              <textarea
                name="jobDescription"
                rows={4}
                placeholder={`Job Title: Full Stack Developer\n\nRequirements:\n- Strong knowledge of JavaScript, React & Node.js.`}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="custom-textarea"
              />
              {jobDescription.trim().length > 15 && (
                <div className="jd-features-notice">
                  <div className="jd-notice-item">✓ JD-based interview questions will be included</div>
                  <div className="jd-notice-item">✓ Your resume will be compared against this Job Description</div>
                  <div className="jd-notice-item">✓ Personalized Resume vs JD Analysis PDF Report will be generated</div>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 4: INTERVIEW SETUP & LAUNCH ── */}
          <div className="config-section glass-card full-width">
            <h3><Zap className="section-icon" /> 4. Interview Setup & Launch</h3>

            <div className="form-group full-width difficulty-section-group" style={{ marginTop: '0.5rem' }}>
              <label className="difficulty-main-label">
                <Zap className="label-icon" /> Select Interview Difficulty Level <span className="req-star">*</span>
              </label>
              <div className="difficulty-cards-grid">
                {[
                  {
                    id: 'Easy',
                    title: 'EASY',
                    subtitle: 'Beginner / Fundamentals',
                    desc: 'Tests fundamental concepts, basic terminology, syntax & core practical understanding.',
                    tag: 'Beginner Level',
                  },
                  {
                    id: 'Medium',
                    title: 'MEDIUM',
                    subtitle: 'Intermediate / Real-World',
                    desc: 'Tests practical problem-solving, real-world company questions, debugging & implementation.',
                    tag: 'Standard (Recommended)',
                  },
                  {
                    id: 'Hard',
                    title: 'HARD',
                    subtitle: 'Advanced / Senior',
                    desc: 'Tests advanced architecture, system design, scalability, security & technical trade-offs.',
                    tag: 'High Depth',
                  },
                ].map((level) => {
                  const isSelected = difficulty === level.id;
                  return (
                    <div
                      key={level.id}
                      className={`difficulty-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setDifficulty(level.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="diff-card-header">
                        <span className="diff-card-title">{level.title}</span>
                        <span className={`diff-card-radio ${isSelected ? 'checked' : ''}`}>
                          {isSelected ? '✓' : ''}
                        </span>
                      </div>
                      <span className="diff-card-subtitle">{level.subtitle}</span>
                      <p className="diff-card-desc">{level.desc}</p>
                      <div className="diff-card-footer">
                        <span className="diff-tag">{level.tag}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="session-quick-config" style={{ marginTop: '0.75rem' }}>
              <div className="form-group full-width">
                <label>
                  <span><List className="label-icon" /> Questions Count: <strong>{questionsCount} Questions</strong></span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={questionsCount}
                  onChange={(e) => setQuestionsCount(parseInt(e.target.value))}
                  className="custom-slider"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="error-banner">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button type="submit" className="btn-primary start-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Connecting with {interviewer.name}... <Loader2 size={20} className="spin" /></>
              ) : (
                <>Start Interview with {interviewer.name} <ArrowRight size={20} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateInfo;