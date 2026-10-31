/**
 * Visual Landmark Overlay Renderer
 *
 * Keeps the camera preview clean and natural (no distracting blue dots or mesh lines)
 * while the background MediaPipe Face Landmarker model, head tracking, eye contact,
 * blink detection, smile calculation, and presence monitoring continue to operate normally.
 */
export function drawLandmarks(canvas, results) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
