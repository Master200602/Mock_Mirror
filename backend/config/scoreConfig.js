/**
 * Scoring & Difficulty Transition Configuration
 */

export const DIFFICULTY_THRESHOLDS = {
  minLevel: 1,
  maxLevel: 5,
  increaseAboveOrEqual: 8.0,
  decreaseBelow: 5.0,
};

export const BEHAVIOR_INFLUENCE = {
  nervousnessThreshold: 0.45,
  fillerDensityWeight: 0.25,
  eyeContactWeight: 0.35,
  headMovementWeight: 0.20,
  faceCenteringWeight: 0.20,
};

export default {
  DIFFICULTY_THRESHOLDS,
  BEHAVIOR_INFLUENCE,
};
