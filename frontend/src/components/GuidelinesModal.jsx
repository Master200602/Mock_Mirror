import { useState } from 'react';
import { Mic, Camera, ShieldCheck, Clock, Volume2, CheckCircle2, X } from 'lucide-react';
import './GuidelinesModal.css';

/**
 * Pre-interview guidelines popup.
 * Shown after the candidate submits their details, before the actual
 * interview session (mic/camera/AI greeting) is started.
 */
const GuidelinesModal = ({ interviewerName = 'your interviewer', onConfirm, onClose }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const guidelines = [
    {
      icon: <Mic size={20} />,
      title: 'Microphone access',
      text: "You'll be asked to allow microphone access. Speak clearly and naturally — your voice is transcribed live to answer questions.",
    },
    {
      icon: <Camera size={20} />,
      title: 'Camera stays on',
      text: 'Your camera monitors posture, eye contact and expressions to give you behavioral feedback. Sit where your full face is visible and well lit.',
    },
    {
      icon: <Volume2 size={20} />,
      title: 'Quiet environment',
      text: 'Find a quiet space with minimal background noise so your answers are captured accurately.',
    },
    {
      icon: <Clock size={20} />,
      title: 'Take your time',
      text: "There's no hard time limit per question, but try to answer as you would in a real interview — clear and to the point.",
    },
    {
      icon: <ShieldCheck size={20} />,
      title: 'Your data stays local',
      text: 'This is a practice session. No login, no database — everything is processed for this session only.',
    },
  ];

  return (
    <div className="guidelines-overlay" role="dialog" aria-modal="true" aria-labelledby="guidelines-title">
      <div className="guidelines-modal glass-card">
        <button className="guidelines-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="guidelines-header">
          <h2 id="guidelines-title">Before You Begin</h2>
          <p>A few quick guidelines before you start your interview with <strong>{interviewerName}</strong>.</p>
        </div>

        <ul className="guidelines-list">
          {guidelines.map((g, i) => (
            <li key={i} className="guidelines-item">
              <span className="guidelines-icon">{g.icon}</span>
              <div>
                <h4>{g.title}</h4>
                <p>{g.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <label className="guidelines-ack">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span>I've read the guidelines and I'm ready to begin.</span>
        </label>

        <div className="guidelines-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Not Yet
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!acknowledged}
            onClick={onConfirm}
          >
            <CheckCircle2 size={18} /> Continue to Device Check
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidelinesModal;
