// Ported from team's interview-face-analysis project (calculateBlink.js)
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function isBlinking(results) {
  if (!results.faceLandmarks.length) return false;

  const landmarks = results.faceLandmarks[0];

  const top = landmarks[159];
  const bottom = landmarks[145];
  const left = landmarks[33];
  const right = landmarks[133];

  const vertical = distance(top, bottom);
  const horizontal = distance(left, right);

  const eyeAspectRatio = vertical / horizontal;

  return eyeAspectRatio < 0.2;
}
