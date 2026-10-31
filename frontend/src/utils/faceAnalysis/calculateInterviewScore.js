// Ported from team's interview-face-analysis project (calculateInterviewScore.js)
export function calculateInterviewScore(eyeContact, facePosition, headDirection, smileStatus) {
  let score = 100;

  if (eyeContact.includes('Looking Away')) score -= 25;
  if (eyeContact.includes('Good')) score -= 10;
  if (!facePosition.includes('Centered')) score -= 20;
  if (!headDirection.includes('Forward')) score -= 15;
  if (!smileStatus.includes('Smiling')) score -= 10;

  return Math.max(score, 0);
}
