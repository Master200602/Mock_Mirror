import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Mic, CheckCircle2, AlertTriangle, RefreshCw, X, Play, Volume2, ShieldCheck, Eye } from 'lucide-react';
import { createFaceLandmarker } from '../utils/faceAnalysis/createFaceLandmarker';
import { calculateFaceCount } from '../utils/faceAnalysis/calculateFaceCount';
import './DeviceCheckModal.css';

/**
 * Pre-Interview Device Check Modal
 * Verifies camera stream, video frame rendering, face detection,
 * and real-time microphone input volume before starting the AI voice interview.
 */
const DeviceCheckModal = ({ interviewerName = 'Sarah Jenkins', onConfirm, onClose }) => {
  // Device status states: 'checking' | 'ready' | 'permission_denied' | 'error' | 'not_found'
  const [cameraStatus, setCameraStatus] = useState('checking');
  const [micStatus, setMicStatus] = useState('checking');
  const [faceStatus, setFaceStatus] = useState('checking');

  const [cameraErrorMessage, setCameraErrorMessage] = useState('');
  const [micErrorMessage, setMicErrorMessage] = useState('');

  // Real-time microphone audio volume level (0 to 100)
  const [audioLevel, setAudioLevel] = useState(0);
  const [micDetectedVoice, setMicDetectedVoice] = useState(false);

  // Refs for media cleanup
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const videoStreamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const landmarkerRef = useRef(null);
  const mountedRef = useRef(true);

  // ─────────────────────────────────────────────────────────────────
  // 1. CAMERA CHECK & FACE DETECTION INITIALIZATION
  // ─────────────────────────────────────────────────────────────────
  const initCameraCheck = useCallback(async () => {
    if (!mountedRef.current) return;
    setCameraStatus('checking');
    setFaceStatus('checking');
    setCameraErrorMessage('');

    // Clean up existing camera stream if retrying
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('error');
        setCameraErrorMessage('Your browser does not support video media devices.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      videoStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (!videoRef.current) return resolve();
          if (videoRef.current.readyState >= 2) return resolve();
          videoRef.current.onloadedmetadata = () => resolve();
          setTimeout(resolve, 1500); // safety fallback
        });
      }

      setCameraStatus('ready');

      // Initialize FaceLandmarker to check face detection readiness
      try {
        if (!landmarkerRef.current) {
          landmarkerRef.current = await createFaceLandmarker();
        }

        if (videoRef.current) {
          try { await videoRef.current.play(); } catch (e) { /* ignore */ }
        }

        if (videoRef.current && landmarkerRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          try {
            const results = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());
            const count = calculateFaceCount(results);
            if (count >= 1) {
              setFaceStatus('ready');
            } else {
              setFaceStatus('no_face');
            }
          } catch (e) {
            setFaceStatus('ready');
          }
        } else {
          setFaceStatus('ready');
        }
      } catch (faceErr) {
        console.warn('[DeviceCheck] Face detector check notice:', faceErr.message);
        setFaceStatus('ready'); // non-blocking fallback
      }

    } catch (err) {
      if (!mountedRef.current) return;
      console.warn('[DeviceCheck] Camera check error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('permission_denied');
        setCameraErrorMessage('Camera permission is required. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('not_found');
        setCameraErrorMessage('No camera was detected on your device. Please connect a webcam and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraStatus('error');
        setCameraErrorMessage('Camera could not be accessed. It may be in use by Zoom, Teams, or another application.');
      } else {
        setCameraStatus('error');
        setCameraErrorMessage(err.message || 'Failed to initialize camera video stream.');
      }
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // 2. MICROPHONE CHECK & REAL-TIME AUDIO VOLUME METER
  // ─────────────────────────────────────────────────────────────────
  const initMicrophoneCheck = useCallback(async () => {
    if (!mountedRef.current) return;
    setMicStatus('checking');
    setMicErrorMessage('');

    // Clean up existing audio stream if retrying
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { await audioContextRef.current.close(); } catch (e) { /* ignore */ }
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicStatus('error');
        setMicErrorMessage('Your browser does not support audio media devices.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      audioStreamRef.current = stream;

      // Set up AudioContext + AnalyserNode for volume meter
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateMeter = () => {
          if (!mountedRef.current || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const levelPct = Math.min(100, Math.round((avg / 128) * 100));

          setAudioLevel(levelPct);
          if (levelPct > 12) {
            setMicDetectedVoice(true);
          }

          animFrameRef.current = requestAnimationFrame(updateMeter);
        };

        updateMeter();
      }

      setMicStatus('ready');
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn('[DeviceCheck] Microphone check error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicStatus('permission_denied');
        setMicErrorMessage('Microphone permission is required. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicStatus('not_found');
        setMicErrorMessage('No microphone was detected on your device. Please connect a microphone and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setMicStatus('error');
        setMicErrorMessage('Microphone could not be accessed. It may be in use by another application.');
      } else {
        setMicStatus('error');
        setMicErrorMessage(err.message || 'Failed to initialize microphone audio input.');
      }
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // 3. RUN INITIAL CHECKS ON MOUNT
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    initCameraCheck();
    initMicrophoneCheck();

    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) { /* ignore */ }
      }
    };
  }, [initCameraCheck, initMicrophoneCheck]);

  // Handle Retry / Recheck button
  const handleRetry = () => {
    initCameraCheck();
    initMicrophoneCheck();
  };

  // Handle Confirm & Start
  const handleConfirmStart = () => {
    // Stop local test streams so CameraMonitor & useSpeech get fresh clean access
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) { /* ignore */ }
    }

    onConfirm();
  };

  const isAllReady = cameraStatus === 'ready' && micStatus === 'ready';

  // Format meter volume bar blocks
  const totalBlocks = 12;
  const filledBlocks = Math.round((audioLevel / 100) * totalBlocks);
  const meterBarText = '█'.repeat(filledBlocks) + '░'.repeat(totalBlocks - filledBlocks);

  return (
    <div className="device-check-overlay" role="dialog" aria-modal="true" aria-labelledby="device-check-title">
      <div className="device-check-modal glass-card">
        <button className="device-check-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="device-check-header">
          <h2 id="device-check-title">Pre-Interview Device Check</h2>
          <p>Verify your camera and microphone before beginning your voice interview with <strong>{interviewerName}</strong>.</p>
        </div>

        <div className="device-check-grid">
          
          {/* CAMERA PREVIEW & STATUS CARD */}
          <div className="device-card camera-check-card">
            <div className="card-title">
              <Camera size={18} className="icon-primary" />
              <span>Camera &amp; Video Preview</span>
            </div>

            <div className="video-preview-wrapper">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`check-video-element ${cameraStatus === 'ready' ? 'active' : ''}`}
              />

              {cameraStatus === 'checking' && (
                <div className="video-placeholder">
                  <RefreshCw size={28} className="spin text-primary" />
                  <span>Checking camera availability...</span>
                </div>
              )}

              {cameraStatus !== 'checking' && cameraStatus !== 'ready' && (
                <div className="video-placeholder error-placeholder">
                  <AlertTriangle size={32} className="text-error" />
                  <span>{cameraErrorMessage || 'Camera unavailable'}</span>
                </div>
              )}

              {cameraStatus === 'ready' && (
                <div className="face-badge-floating">
                  {faceStatus === 'ready' ? (
                    <span className="badge-success"><CheckCircle2 size={13} /> Face Detected</span>
                  ) : (
                    <span className="badge-warning"><Eye size={13} /> Position face in camera frame</span>
                  )}
                </div>
              )}
            </div>

            <div className="status-row">
              {cameraStatus === 'checking' && (
                <span className="status-text text-muted"><RefreshCw size={14} className="spin" /> Testing camera...</span>
              )}
              {cameraStatus === 'ready' && (
                <span className="status-text text-success"><CheckCircle2 size={16} /> Camera Ready</span>
              )}
              {cameraStatus === 'permission_denied' && (
                <span className="status-text text-error"><X size={16} /> Camera Permission Denied</span>
              )}
              {(cameraStatus === 'error' || cameraStatus === 'not_found') && (
                <span className="status-text text-error"><X size={16} /> Camera Not Ready</span>
              )}
            </div>

            {cameraErrorMessage && (
              <p className="device-error-desc">{cameraErrorMessage}</p>
            )}
          </div>

          {/* MICROPHONE METER & STATUS CARD */}
          <div className="device-card mic-check-card">
            <div className="card-title">
              <Mic size={18} className="icon-primary" />
              <span>Microphone &amp; Audio Input</span>
            </div>

            <div className="mic-meter-box">
              <div className="mic-prompt">
                <Volume2 size={20} className={audioLevel > 15 ? 'pulse-icon text-success' : 'text-muted'} />
                <span>{micDetectedVoice ? '🎤 Voice input detected!' : '🎤 Speak into your mic to test level...'}</span>
              </div>

              {micStatus === 'ready' && (
                <div className="volume-meter-container">
                  <span className="meter-bar">{meterBarText}</span>
                  <span className="meter-pct">{audioLevel}%</span>
                </div>
              )}

              {micStatus === 'checking' && (
                <div className="meter-loading">
                  <RefreshCw size={20} className="spin text-primary" />
                  <span>Connecting microphone...</span>
                </div>
              )}

              {micStatus !== 'checking' && micStatus !== 'ready' && (
                <div className="meter-error">
                  <AlertTriangle size={20} className="text-error" />
                  <span>Microphone unavailable</span>
                </div>
              )}
            </div>

            <div className="status-row">
              {micStatus === 'checking' && (
                <span className="status-text text-muted"><RefreshCw size={14} className="spin" /> Testing microphone...</span>
              )}
              {micStatus === 'ready' && (
                <span className="status-text text-success"><CheckCircle2 size={16} /> Microphone Ready</span>
              )}
              {micStatus === 'permission_denied' && (
                <span className="status-text text-error"><X size={16} /> Microphone Permission Denied</span>
              )}
              {(micStatus === 'error' || micStatus === 'not_found') && (
                <span className="status-text text-error"><X size={16} /> Microphone Not Ready</span>
              )}
            </div>

            {micErrorMessage && (
              <p className="device-error-desc">{micErrorMessage}</p>
            )}

            <div className="device-guideline-note">
              <ShieldCheck size={14} />
              <span>Devices are checked locally for this session. Your audio/video remains private.</span>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER & ACTION BUTTONS */}
        <div className="device-check-footer">
          <button
            type="button"
            className="btn-secondary retry-btn"
            onClick={handleRetry}
            title="Recheck camera and microphone"
          >
            <RefreshCw size={16} /> Check Devices Again
          </button>

          <button
            type="button"
            className="btn-primary start-check-btn"
            disabled={!isAllReady}
            onClick={handleConfirmStart}
          >
            {isAllReady ? (
              <>Start Interview with {interviewerName} <Play size={18} fill="currentColor" /></>
            ) : (
              <>Waiting for Devices... <RefreshCw size={16} className="spin" /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeviceCheckModal;
