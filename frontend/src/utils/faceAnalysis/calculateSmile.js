// Ported from team's interview-face-analysis project (calculateSmile.js)
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function calculateSmile(results) {
  if (!results.faceLandmarks.length) {
    return 'No Face';
  }

  const landmarks = results.faceLandmarks[0];

  const leftMouth = landmarks[61];
  const rightMouth = landmarks[291];
  const upperLip = landmarks[13];
  const lowerLip = landmarks[14];

  const mouthWidth = distance(leftMouth, rightMouth);
  const mouthHeight = distance(upperLip, lowerLip);

  const smileRatio = mouthWidth / mouthHeight;

  if (smileRatio > 7.5) {
    return '😊 Smiling';
  }

  return '😐 Neutral';
}
