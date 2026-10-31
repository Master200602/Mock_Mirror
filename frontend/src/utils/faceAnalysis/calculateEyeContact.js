// Ported from team's interview-face-analysis project (calculateEyeContact.js)
export function calculateEyeContact(results) {
  if (!results.faceLandmarks.length) {
    return 'No Face';
  }

  const landmarks = results.faceLandmarks[0];

  const leftCorner = landmarks[33];
  const rightCorner = landmarks[133];
  const iris = landmarks[468];

  const eyeCenter = (leftCorner.x + rightCorner.x) / 2;
  const diff = Math.abs(iris.x - eyeCenter);

  if (diff < 0.015) {
    return '👁 Excellent Eye Contact';
  }

  if (diff < 0.03) {
    return '👁 Good Eye Contact';
  }

  return '👁 Looking Away';
}
