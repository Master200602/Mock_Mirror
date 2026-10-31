import { useNavigate } from 'react-router-dom';
import { Target, Mic, Activity, LineChart, FileText, Zap, ChevronRight } from 'lucide-react';
import MagicRings from '../components/MagicRings';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    { icon: <Target className="feature-icon" />, title: 'Smart Questions', desc: 'AI-generated questions tailored to your domain' },
    { icon: <Mic className="feature-icon" />, title: 'Voice Interaction', desc: 'Natural speech-based Q&A' },
    { icon: <Activity className="feature-icon" />, title: 'Behavior Analysis', desc: 'Real-time posture and expression tracking' },
    { icon: <LineChart className="feature-icon" />, title: 'Performance Scoring', desc: 'Detailed evaluation metrics' },
    { icon: <FileText className="feature-icon" />, title: 'PDF Reports', desc: 'Downloadable performance summaries' },
    { icon: <Zap className="feature-icon" />, title: 'Instant Feedback', desc: 'Real-time AI-powered insights' }
  ];

  return (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-magicrings-wrapper">
          <MagicRings
            color="#00d4ff"
            colorTwo="#8b5cf6"
            motion="pulse"
            ringCount={6}
            speed={1}
            lineThickness={2}
            glow={1}
            hoverScale={1.2}
            clickBurst={true}
          />
        </div>
        <div className="hero-content">
          <h1 className="hero-title">
            Master Your Next Interview <br />
            <span className="gradient-text">With AI</span>
          </h1>
          <p className="hero-subtitle">
            Practice with our AI-powered simulator featuring real-time feedback, voice interaction, and comprehensive performance analysis.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => navigate('/candidate-info')}>
              Start Practicing <ChevronRight size={20} />
            </button>
          </div>
        </div>
        
        <div className="hero-stats glass-card">
          <div className="stat-item">
            <span className="stat-value gradient-text">Resume</span>
            <span className="stat-label">Tailored</span>
          </div>
          <div className="stat-item">
            <span className="stat-value gradient-text">Real-time</span>
            <span className="stat-label">Human Voice</span>
          </div>
          <div className="stat-item">
            <span className="stat-value gradient-text">Detailed</span>
            <span className="stat-label">PDF Report</span>
          </div>
        </div>
      </section>

      <section className="features">
        <h2 className="section-title">Why MockMirror?</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card glass-card">
              <div className="feature-icon-wrapper">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step glass-card">
            <div className="step-number">1</div>
            <h3>Fill Info & Upload Resume</h3>
            <p>Provide your background, target job role, and upload your PDF resume for AI parsing.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step glass-card">
            <div className="step-number">2</div>
            <h3>Practice Voice Interview</h3>
            <p>Answer dynamic voice questions tailored directly to your resume projects and technical skills.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step glass-card">
            <div className="step-number">3</div>
            <h3>Get Personalized Report</h3>
            <p>Review comprehensive feedback, category scores, strengths, and Q&A breakdown.</p>
          </div>
        </div>
      </section>

      <section className="cta glass-card">
        <h2>Ready to Ace Your Interview?</h2>
        <p>Start your AI-powered practice session today and boost your confidence.</p>
        <button className="btn-primary" onClick={() => navigate('/candidate-info')}>
          Start Now <ChevronRight size={20} />
        </button>
      </section>

      <footer className="footer">
        <p>Terminal4</p>
      </footer>
    </div>
  );
};

export default LandingPage;
