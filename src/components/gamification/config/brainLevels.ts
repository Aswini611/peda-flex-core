export interface BrainLevel {
  key: string;
  label: string;
  emoji: string;
  xpRequired: number;
  color: string;
  description: string;
  unlockedFeatures: string[];
  gameplayModifiers: {
    speedMultiplier: number;
    complexityTier: number;
    bonusXpMultiplier: number;
  };
}

export const BRAIN_LEVELS: BrainLevel[] = [
  {
    key: "reactive",
    label: "Reactive",
    emoji: "🟢",
    xpRequired: 0,
    color: "#22C55E",
    description: "Building foundational cognitive skills through guided activities",
    unlockedFeatures: ["Basic cognitive games", "Guided tutorials"],
    gameplayModifiers: { speedMultiplier: 1.0, complexityTier: 1, bonusXpMultiplier: 1.0 },
  },
  {
    key: "logical",
    label: "Logical",
    emoji: "🔵",
    xpRequired: 500,
    color: "#3B82F6",
    description: "Applying logical reasoning to solve structured problems",
    unlockedFeatures: ["Logic puzzles", "Timed challenges", "Pattern recognition"],
    gameplayModifiers: { speedMultiplier: 1.1, complexityTier: 2, bonusXpMultiplier: 1.2 },
  },
  {
    key: "analytical",
    label: "Analytical",
    emoji: "🟣",
    xpRequired: 1500,
    color: "#8B5CF6",
    description: "Breaking down complex problems into components",
    unlockedFeatures: ["Multi-step puzzles", "Data analysis games", "Strategy unlocked"],
    gameplayModifiers: { speedMultiplier: 1.2, complexityTier: 3, bonusXpMultiplier: 1.5 },
  },
  {
    key: "strategic",
    label: "Strategic",
    emoji: "🟠",
    xpRequired: 3500,
    color: "#F59E0B",
    description: "Planning ahead and optimizing solutions across scenarios",
    unlockedFeatures: ["Strategy simulations", "Resource management", "Competitive modes"],
    gameplayModifiers: { speedMultiplier: 1.3, complexityTier: 4, bonusXpMultiplier: 2.0 },
  },
  {
    key: "creative",
    label: "Creative",
    emoji: "🔴",
    xpRequired: 6000,
    color: "#EF4444",
    description: "Generating novel solutions and lateral thinking",
    unlockedFeatures: ["Creative challenges", "Open-ended problems", "Innovation labs"],
    gameplayModifiers: { speedMultiplier: 1.4, complexityTier: 5, bonusXpMultiplier: 2.5 },
  },
  {
    key: "expert",
    label: "Expert",
    emoji: "👑",
    xpRequired: 10000,
    color: "#F59E0B",
    description: "Mastery across all cognitive dimensions",
    unlockedFeatures: ["All games unlocked", "Mentor mode", "Custom challenges"],
    gameplayModifiers: { speedMultiplier: 1.5, complexityTier: 6, bonusXpMultiplier: 3.0 },
  },
];

export function getBrainLevel(xp: number): BrainLevel {
  let current = BRAIN_LEVELS[0];
  for (const level of BRAIN_LEVELS) {
    if (xp >= level.xpRequired) current = level;
    else break;
  }
  return current;
}

export function getNextBrainLevel(xp: number): BrainLevel | null {
  for (const level of BRAIN_LEVELS) {
    if (xp < level.xpRequired) return level;
  }
  return null;
}

export function getBrainLevelProgress(xp: number): number {
  const current = getBrainLevel(xp);
  const next = getNextBrainLevel(xp);
  if (!next) return 100;
  const range = next.xpRequired - current.xpRequired;
  const progress = xp - current.xpRequired;
  return Math.round((progress / range) * 100);
}
