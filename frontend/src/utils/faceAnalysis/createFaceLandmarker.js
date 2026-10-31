// Singleton FaceLandmarker creator with caching, fallbacks, and retry capability.
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

let cachedLandmarkerPromise = null;

export async function createFaceLandmarker() {
  if (cachedLandmarkerPromise) {
    return cachedLandmarkerPromise;
  }

  cachedLandmarkerPromise = (async () => {
    let vision = null;
    const wasmCdnUrls = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
      'https://unpkg.com/@mediapipe/tasks-vision/wasm',
    ];

    for (const url of wasmCdnUrls) {
      try {
        vision = await FilesetResolver.forVisionTasks(url);
        if (vision) break;
      } catch (err) {
        console.warn(`[FaceLandmarker] WASM CDN ${url} failed, trying fallback:`, err.message);
      }
    }

    if (!vision) {
      throw new Error('Failed to load MediaPipe vision WASM binaries from CDN.');
    }

    const modelAssetUrls = [
      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/models/face_landmarker.task',
    ];

    let lastModelErr = null;
    for (const modelUrl of modelAssetUrls) {
      try {
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
          },
          runningMode: 'VIDEO',
          numFaces: 2,
        });

        if (faceLandmarker) return faceLandmarker;
      } catch (err) {
        console.warn(`[FaceLandmarker] Model asset ${modelUrl} failed:`, err.message);
        lastModelErr = err;
      }
    }

    throw lastModelErr || new Error('Failed to load FaceLandmarker model asset.');
  })().catch((err) => {
    // Reset cache on error so next call can retry
    cachedLandmarkerPromise = null;
    throw err;
  });

  return cachedLandmarkerPromise;
}
