// Ported from team's interview-face-analysis project (calculateFacePosition.js)
export function calculateFacePosition(results) {
  if (!results.faceLandmarks.length) {
    return 'No Face';
  }

  const landmarks = results.faceLandmarks[0];
  const nose = landmarks[1];

  const centerX = nose.x;
  const centerY = nose.y;

  if (centerX < 0.4) {
    return '➡️ Move Right';
  }

  if (centerX > 0.6) {
    return '⬅️ Move Left';
  }

  if (centerY < 0.4) {
    return '⬇️ Move Down';
  }

  if (centerY > 0.6) {
    return '⬆️ Move Up';
  }

  return '🎯 Face Centered';
}
