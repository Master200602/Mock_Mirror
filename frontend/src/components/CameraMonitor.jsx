import { useEffect } from 'react';
import { Camera, CameraOff, AlertTriangle, Users } from 'lucide-react';
import useFaceMonitor, { FACE_STATUS } from '../hooks/useFaceMonitor';
import './CameraMonitor.css';

/**
 * Picture-in-picture camera preview + live face-monitoring status.
 * Starts/stops independently of the mic/speech pipeline — a camera
 * permission denial or model failure here never blocks the voice interview.
 */
const CameraMonitor = ({ active, onReady }) => {
  const {
    videoRef,
    canvasRef,
    status,
    errorMessage,
    headDirection,
    eyeContact,
    start,
    stop,
    getReport,
    getBehaviorMetrics,
  } = useFaceMonitor();

  useEffect(() => {
    if (active) {
      start();
    } else {
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (onReady) {
      onReady({ getReport, getBehaviorMetrics });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReady]);

  const isLive = status === FACE_STATUS.MONITORING || status === FACE_STATUS.MULTIPLE_FACES || status === FACE_STATUS.NO_FACE;

  return (
    <div className="camera-monitor glass-card">
      <div className="camera-frame">
        <video ref={videoRef} autoPlay playsInline muted className={`camera-video ${isLive ? 'visible' : ''}`} />
        <canvas ref={canvasRef} width={220} height={165} className="camera-canvas" />

        {status === FACE_STATUS.IDLE && (
          <div className="camera-overlay">
            <CameraOff size={22} />
            <span>Camera off</span>
          </div>
        )}

        {(status === FACE_STATUS.REQUESTING_PERMISSION || status === FACE_STATUS.LOADING_MODEL) && (
          <div className="camera-overlay">
            <Camera size={22} className="pulse-icon" />
            <span>{status === FACE_STATUS.REQUESTING_PERMISSION ? 'Requesting camera...' : 'Loading face model...'}</span>
          </div>
        )}

        {status === FACE_STATUS.PERMISSION_DENIED && (
          <div className="camera-overlay overlay-error">
            <AlertTriangle size={22} />
            <span>{errorMessage || 'Camera access denied.'}</span>
          </div>
        )}

        {status === FACE_STATUS.ERROR && (
          <div className="camera-overlay overlay-error">
            <AlertTriangle size={22} />
            <span>{errorMessage || 'Face detection unavailable.'}</span>
          </div>
        )}

        {isLive && (
          <div className={`camera-status-badge status-${status}`}>
            {status === FACE_STATUS.MONITORING && <><Camera size={12} /> Monitoring</>}
            {status === FACE_STATUS.NO_FACE && <><AlertTriangle size={12} /> No face detected</>}
            {status === FACE_STATUS.MULTIPLE_FACES && <><Users size={12} /> Multiple faces</>}
          </div>
        )}
      </div>

      {isLive && (
        <div className="camera-hint">
          {status === FACE_STATUS.NO_FACE && 'Position yourself in front of the camera.'}
          {status === FACE_STATUS.MULTIPLE_FACES && 'Only the candidate should be visible.'}
          {status === FACE_STATUS.MONITORING && `${headDirection} · ${eyeContact}`}
        </div>
      )}
    </div>
  );
};

export default CameraMonitor;
