import { useCallback, useEffect, useRef, useState } from 'react';
import { createFaceLandmarker } from '../utils/faceAnalysis/createFaceLandmarker';
import { calculateHeadDirection } from '../utils/faceAnalysis/calculateHeadDirection';
import { calculateFacePosition } from '../utils/faceAnalysis/calculateFacePosition';
import { calculateEyeContact } from '../utils/faceAnalysis/calculateEyeContact';
import { isBlinking } from '../utils/faceAnalysis/calculateBlink';
import { calculateSmile } from '../utils/faceAnalysis/calculateSmile';
import { calculateInterviewScore } from '../utils/faceAnalysis/calculateInterviewScore';
import { calculateFaceCount } from '../utils/faceAnalysis/calculateFaceCount';
import { drawLandmarks } from '../utils/faceAnalysis/drawLandmarks';
import SessionRecorder from '../utils/faceAnalysis/sessionRecorder';

// Throttle detection to ~6-7fps instead of every animation frame (~60fps),
// so MediaPipe doesn't compete for CPU with speech recognition / TTS.
const DETECTION_INTERVAL_MS = 150;

export const FACE_STATUS = {
  IDLE: 'idle',
  REQUESTING_PERMISSION: 'requesting_permission',
  PERMISSION_DENIED: 'permission_denied',
  LOADING_MODEL: 'loading_model',
  MONITORING: 'monitoring',
  NO_FACE: 'no_face',
  MULTIPLE_FACES: 'multiple_faces',
  ERROR: 'error',
  STOPPED: 'stopped',
};

/**
 * Orchestrates the camera stream + MediaPipe FaceLandmarker model +
 * throttled detection loop, and exposes live face metrics.
 *
 * Runs entirely independently of the mic/speech pipeline: starting,
 * stopping, or erroring here never touches the voice interview state.
 */
export default function useFaceMonitor({ onFrame } = {}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const lastDetectTimeRef = useRef(0);
  const recorderRef = useRef(new SessionRecorder());
  const blinkingRef = useRef(false);
  const blinkCountRef = useRef(0);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState(FACE_STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState('');
  const [headDirection, setHeadDirection] = useState('👀 Looking Forward');
  const [facePosition, setFacePosition] = useState('🎯 Face Centered');
  const [eyeContact, setEyeContact] = useState('👁 Checking...');
  const [smileStatus, setSmileStatus] = useState('😐 Neutral');
  const [blinkCount, setBlinkCount] = useState(0);
  const [faceCount, setFaceCount] = useState(0);
  const [score, setScore] = useState(100);

  const detectLoop = useCallback(() => {
    const tick = (timestamp) => {
      if (!mountedRef.current) return;

      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        !video.paused &&
        landmarker
      ) {
        if (timestamp - lastDetectTimeRef.current >= DETECTION_INTERVAL_MS) {
          lastDetectTimeRef.current = timestamp;

          try {
            const results = landmarker.detectForVideo(video, performance.now());
            const count = calculateFaceCount(results);

            if (canvasRef.current) {
              drawLandmarks(canvasRef.current, results);
            }

            if (count === 0) {
              setStatus(FACE_STATUS.NO_FACE);
              setHeadDirection('No Face');
              setFacePosition('No Face');
              setEyeContact('No Face');
              setSmileStatus('No Face');
              setScore(0);
              setFaceCount(0);

              recorderRef.current.update({
                eyeContact: 'No Face',
                facePosition: 'No Face',
                headDirection: 'No Face',
                smileStatus: 'No Face',
                blinkCount: blinkCountRef.current,
                faceCount: 0,
              });
            } else {
              const direction = calculateHeadDirection(results);
              const position = calculateFacePosition(results);
              const eye = calculateEyeContact(results);
              const blinking = isBlinking(results);
              const smile = calculateSmile(results);

              if (blinking && !blinkingRef.current) {
                blinkingRef.current = true;
                blinkCountRef.current += 1;
                setBlinkCount(blinkCountRef.current);
              } else if (!blinking) {
                blinkingRef.current = false;
              }

              const interviewScore = calculateInterviewScore(eye, position, direction, smile);

              setStatus(count > 1 ? FACE_STATUS.MULTIPLE_FACES : FACE_STATUS.MONITORING);
              setHeadDirection(direction);
              setFacePosition(position);
              setEyeContact(eye);
              setSmileStatus(smile);
              setScore(interviewScore);
              setFaceCount(count);

              recorderRef.current.update({
                eyeContact: eye,
                facePosition: position,
                headDirection: direction,
                smileStatus: smile,
                blinkCount: blinkCountRef.current,
                faceCount: count,
              });

              if (onFrame) {
                onFrame({
                  headDirection: direction,
                  facePosition: position,
                  eyeContact: eye,
                  smileStatus: smile,
                  blinkCount: blinkCountRef.current,
                  faceCount: count,
                  score: interviewScore,
                });
              }
            }
          } catch (frameErr) {
            console.warn('[FaceMonitor] detectForVideo frame skipped:', frameErr.message);
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [onFrame]);

  const start = useCallback(async () => {
    if (status === FACE_STATUS.MONITORING || status === FACE_STATUS.LOADING_MODEL) return;

    setErrorMessage('');
    recorderRef.current.reset();
    blinkingRef.current = false;
    blinkCountRef.current = 0;
    setBlinkCount(0);

    setStatus(FACE_STATUS.REQUESTING_PERMISSION);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          // ignore autoplay pause promise
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus(FACE_STATUS.PERMISSION_DENIED);
      setErrorMessage(
        err?.name === 'NotAllowedError'
          ? 'Camera access is required for the face monitoring feature. Please allow camera access and try again.'
          : 'Unable to access the camera. It may be in use by another application.'
      );
      return;
    }

    setStatus(FACE_STATUS.LOADING_MODEL);

    try {
      if (!landmarkerRef.current) {
        landmarkerRef.current = await createFaceLandmarker();
      }
      if (!mountedRef.current) return;

      // Allow video dimensions to initialize
      if (videoRef.current && (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0)) {
        await new Promise((res) => setTimeout(res, 300));
      }

      lastDetectTimeRef.current = 0;
      setStatus(FACE_STATUS.MONITORING);
      detectLoop();
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn('[FaceMonitor] Initialization error:', err);
      setStatus(FACE_STATUS.ERROR);
      setErrorMessage('Face detection failed to initialize. The interview will continue with voice only.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectLoop]);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus((prev) => (prev === FACE_STATUS.IDLE ? prev : FACE_STATUS.STOPPED));
  }, []);

  const getReport = useCallback(() => {
    return recorderRef.current.generateReport();
  }, []);

  const getBehaviorMetrics = useCallback(() => {
    return recorderRef.current.toBehaviorMetrics();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    status,
    errorMessage,
    headDirection,
    facePosition,
    eyeContact,
    smileStatus,
    blinkCount,
    faceCount,
    score,
    start,
    stop,
    getReport,
    getBehaviorMetrics,
  };
}
