// Ported from team's interview-face-analysis project (calculateHeadDirection.js)
export function calculateHeadDirection(results) {
  if (!results.faceLandmarks.length) {
    return 'No Face';
  }

  const landmarks = results.faceLandmarks[0];

  const nose = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];

  const leftDistance = Math.abs(nose.x - leftEye.x);
  const rightDistance = Math.abs(rightEye.x - nose.x);

  if (leftDistance < rightDistance * 0.75) {
    return '⬅️ Looking Right';
  }

  if (rightDistance < leftDistance * 0.75) {
    return '➡️ Looking Left';
  }

  return '👀 Looking Forward';
}
