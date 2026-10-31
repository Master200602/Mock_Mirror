/**
 * Client-side speech/filler analysis for the PDF report's "Speech & Confidence"
 * section. Evaluates strictly candidate answers (never interviewer questions).
 */

const FILLER_WORDS = ['um', 'uh', 'like', 'so', 'basically', 'you know', 'right', 'actually', 'literally'];

/**
 * Validates whether a response object contains genuine candidate speech.
 */
export function isValidCandidateResponse(r) {
  if (!r || typeof r !== 'object') return false;
  const answer = typeof r.answer === 'string' ? r.answer.trim() : '';
  if (!answer || answer.length === 0) return false;
  const lower = answer.toLowerCase();
  if (lower === 'no answer' || lower === 'silence' || lower === 'unanswered' || lower === 'n/a') return false;
  return /[a-zA-Z0-9]/.test(answer);
}

/**
 * Counts filler words across genuine candidate answers only.
 * @param {{answer?: string}[]} responses
 */
export function analyzeFillerWords(responses = []) {
  const safeResponses = Array.isArray(responses) ? responses : [];
  const validResponses = safeResponses.filter(isValidCandidateResponse);

  if (validResponses.length === 0) {
    return { count: 0, totalWords: 0, densityPct: 0 };
  }

  const combinedText = validResponses.map(r => r.answer.trim()).join(' ');
  const words = combinedText.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  if (totalWords === 0) {
    return { count: 0, totalWords: 0, densityPct: 0 };
  }

  let count = 0;
  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = combinedText.match(regex);
    if (matches) count += matches.length;
  });

  const densityPct = parseFloat(((count / totalWords) * 100).toFixed(1));

  return { count, totalWords, densityPct };
}

/**
 * Estimates speaking pace in words-per-minute strictly from actual candidate speech.
 * Returns null (N/A) if no genuine speech occurred.
 *
 * @param {Array} responses
 * @param {number} durationSeconds
 * @returns {number|null}
 */
export function estimateSpeakingPace(responses = [], durationSeconds) {
  const { totalWords } = analyzeFillerWords(responses);

  // If candidate spoke 0 words, do NOT generate a fake WPM
  if (!totalWords || totalWords === 0) return null;

  const minutes = durationSeconds ? durationSeconds / 60 : null;
  if (!minutes || minutes <= 0) return null;

  const wpm = Math.round(totalWords / minutes);
  return Math.min(220, Math.max(1, wpm));
}

/**
 * Coarse stress-level heuristic from filler density.
 */
export function estimateStressLevel(densityPct) {
  if (!densityPct || densityPct === 0) return 'LOW';
  if (densityPct >= 6) return 'HIGH';
  if (densityPct >= 3) return 'MEDIUM';
  return 'LOW';
}

export default { isValidCandidateResponse, analyzeFillerWords, estimateSpeakingPace, estimateStressLevel };