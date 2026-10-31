// New minimal utility (not in the original team project, which only supported
// numFaces: 1). Added so we can surface "multiple faces detected" warnings,
// which the integration spec explicitly calls for. Purely reads the landmarker
// output — no new detection logic.
export function calculateFaceCount(results) {
  return results?.faceLandmarks?.length || 0;
}
