/**
 * Age-Based Game Selection Engine for APAS Gamification
 *
 * Logic:
 * 1. Fetch student age → map to stage (Explorer / Builder / Strategist / Mastermind)
 * 2. Select ONLY games appropriate for that stage
 * 3. Within each stage, scale difficulty (Easy → Medium → Hard) by performance
 * 4. Return a transparent selection result
 */

import { getAgeStage, AgeStage } from "@/components/gamification/config/ageStages";

/* ──── Difficulty enum ──── */
export type Difficulty = "easy" | "medium" | "hard";

/* ──── Game definition ──── */
export interface StageGame {
  key: string;
  name: string;
  emoji: string;
  category: "cognitive" | "speed" | "strategy" | "adaptive_quiz" | "simulation";
  subject: string | null;          // null = cross-subject
  description: string;
  /** Which stages this game is available in */
  stages: string[];
  /** Base difficulty tier 1-5 (used for ordering within a stage) */
  baseDifficulty: number;
  /** Age-specific instructions keyed by stage */
  instructions: Record<string, string>;
}

/* ──── Full game library ──── */
export const GAME_LIBRARY: StageGame[] = [
  // ═══ COGNITIVE ═══
  {
    key: "memory_match",
    name: "Memory Match",
    emoji: "🃏",
    category: "cognitive",
    subject: null,
    description: "Flip cards and find matching pairs",
    stages: ["explorer", "builder"],
    baseDifficulty: 1,
    instructions: {
      explorer: "Tap a card to flip it. Find two cards that look the same!",
      builder: "Match pairs quickly — bonus points for speed!",
    },
  },
  {
    key: "pattern_flash",
    name: "Pattern Flash",
    emoji: "🔷",
    category: "cognitive",
    subject: null,
    description: "Memorize glowing tiles and recall their positions",
    stages: ["explorer", "builder", "strategist"],
    baseDifficulty: 2,
    instructions: {
      explorer: "Watch the tiles light up, then tap the same tiles!",
      builder: "Memorize the sequence — more tiles each round!",
      strategist: "Speed + accuracy matter. Beat your best combo!",
    },
  },
  {
    key: "shape_sequence",
    name: "Shape Sequence",
    emoji: "🔶",
    category: "cognitive",
    subject: null,
    description: "Find the missing shape in the pattern",
    stages: ["explorer", "builder", "strategist"],
    baseDifficulty: 2,
    instructions: {
      explorer: "Look at the shapes. Which one comes next?",
      builder: "Spot the rule and pick the missing shape.",
      strategist: "Patterns get tricky — look for nested rules.",
    },
  },
  {
    key: "logic_grid",
    name: "Logic Grid",
    emoji: "🧩",
    category: "cognitive",
    subject: null,
    description: "Solve logic puzzles using clues",
    stages: ["strategist", "mastermind"],
    baseDifficulty: 4,
    instructions: {
      strategist: "Use elimination and clues to fill the grid.",
      mastermind: "Multi-variable logic — think like a detective.",
    },
  },
  {
    key: "cognitive_round",
    name: "Cognitive Round",
    emoji: "🧠",
    category: "cognitive",
    subject: null,
    description: "5 brain-training mini-games in a row",
    stages: ["explorer", "builder", "strategist", "mastermind"],
    baseDifficulty: 3,
    instructions: {
      explorer: "Play 5 fun brain games and earn your score!",
      builder: "Challenge your brain across 5 dimensions.",
      strategist: "Compete against yourself in 5 cognitive tests.",
      mastermind: "Push your limits across all cognitive areas.",
    },
  },

  // ═══ SPEED & REFLEX ═══
  {
    key: "rapid_sort",
    name: "Rapid Sort",
    emoji: "⚡",
    category: "speed",
    subject: null,
    description: "Sort falling items left or right by category",
    stages: ["explorer", "builder", "strategist"],
    baseDifficulty: 2,
    instructions: {
      explorer: "Swipe items to the correct side. Go fast!",
      builder: "Rules change every 20 seconds — stay sharp!",
      strategist: "Multiple rules, faster items — react instantly.",
    },
  },
  {
    key: "math_blitz",
    name: "Math Blitz",
    emoji: "⚡",
    category: "speed",
    subject: "Mathematics",
    description: "Speed calculations under time pressure",
    stages: ["explorer", "builder", "strategist", "mastermind"],
    baseDifficulty: 1,
    instructions: {
      explorer: "Solve simple sums as fast as you can!",
      builder: "Multiply, divide — beat the clock!",
      strategist: "Multi-step equations at lightning speed.",
      mastermind: "Advanced algebra and rapid reasoning.",
    },
  },
  {
    key: "grammar_rush",
    name: "Grammar Rush",
    emoji: "✏️",
    category: "speed",
    subject: "English",
    description: "Fix grammar errors before time runs out",
    stages: ["builder", "strategist", "mastermind"],
    baseDifficulty: 2,
    instructions: {
      builder: "Find and fix the grammar mistake in each sentence.",
      strategist: "Complex sentences — spot subtle errors fast.",
      mastermind: "Advanced grammar, punctuation, and style errors.",
    },
  },
  {
    key: "element_sort",
    name: "Element Sort",
    emoji: "⚗️",
    category: "speed",
    subject: "Science",
    description: "Rapidly classify elements and compounds",
    stages: ["builder", "strategist", "mastermind"],
    baseDifficulty: 3,
    instructions: {
      builder: "Sort items into metals, non-metals, or compounds.",
      strategist: "Classify by group, period, and type — faster!",
      mastermind: "Organic vs inorganic, reactions, and bonding types.",
    },
  },

  // ═══ STRATEGY ═══
  {
    key: "number_balance",
    name: "Number Balance",
    emoji: "⚖️",
    category: "strategy",
    subject: "Mathematics",
    description: "Balance equations by placing numbers",
    stages: ["builder", "strategist", "mastermind"],
    baseDifficulty: 3,
    instructions: {
      builder: "Make both sides equal by choosing the right number.",
      strategist: "Use variables and operators to balance complex equations.",
      mastermind: "Simultaneous balancing with constraints.",
    },
  },
  {
    key: "story_weaver",
    name: "Story Weaver",
    emoji: "📖",
    category: "strategy",
    subject: "English",
    description: "Complete stories with the right words and logic",
    stages: ["builder", "strategist", "mastermind"],
    baseDifficulty: 3,
    instructions: {
      builder: "Pick the best word to complete the story.",
      strategist: "Choose words that maintain tone and logic.",
      mastermind: "Craft narratives with vocabulary and coherence.",
    },
  },
  {
    key: "civilisation_builder",
    name: "Civilisation Builder",
    emoji: "🏛️",
    category: "strategy",
    subject: "Social Studies",
    description: "Build and manage a civilization through decisions",
    stages: ["strategist", "mastermind"],
    baseDifficulty: 4,
    instructions: {
      strategist: "Make resource and trade decisions to grow your empire.",
      mastermind: "Balance politics, economics, and culture for your civilisation.",
    },
  },
  {
    key: "hypothesis_lab",
    name: "Hypothesis Lab",
    emoji: "🧪",
    category: "simulation",
    subject: "Science",
    description: "Design experiments and test hypotheses",
    stages: ["strategist", "mastermind"],
    baseDifficulty: 4,
    instructions: {
      strategist: "Choose variables, predict outcomes, run experiments.",
      mastermind: "Design full experimental methods and analyze results.",
    },
  },

  // ═══ ADAPTIVE QUIZ ═══
  {
    key: "math_quiz",
    name: "Math Challenge",
    emoji: "📐",
    category: "adaptive_quiz",
    subject: "Mathematics",
    description: "AI-adaptive math questions that match your level",
    stages: ["explorer", "builder", "strategist", "mastermind"],
    baseDifficulty: 1,
    instructions: {
      explorer: "Answer fun math questions — they get harder if you're doing great!",
      builder: "Solve problems that adapt to your skill.",
      strategist: "AI picks harder problems as you improve.",
      mastermind: "University-level adaptive math challenges.",
    },
  },
  {
    key: "science_quiz",
    name: "Science Quest",
    emoji: "🔭",
    category: "adaptive_quiz",
    subject: "Science",
    description: "AI-adaptive science questions",
    stages: ["explorer", "builder", "strategist", "mastermind"],
    baseDifficulty: 1,
    instructions: {
      explorer: "Explore science with fun questions!",
      builder: "Test your science knowledge — it adapts!",
      strategist: "Deep science questions tailored to you.",
      mastermind: "Advanced scientific reasoning challenges.",
    },
  },
  {
    key: "language_quiz",
    name: "Language Quest",
    emoji: "📝",
    category: "adaptive_quiz",
    subject: "English",
    description: "AI-adaptive language questions",
    stages: ["explorer", "builder", "strategist", "mastermind"],
    baseDifficulty: 1,
    instructions: {
      explorer: "Have fun with words and sentences!",
      builder: "Grammar, vocabulary, and comprehension.",
      strategist: "Complex reading and writing challenges.",
      mastermind: "Advanced literary analysis and composition.",
    },
  },
  {
    key: "social_quiz",
    name: "History Quest",
    emoji: "🏺",
    category: "adaptive_quiz",
    subject: "Social Studies",
    description: "AI-adaptive social studies questions",
    stages: ["explorer", "builder", "strategist", "mastermind"],
    baseDifficulty: 1,
    instructions: {
      explorer: "Learn about history with fun questions!",
      builder: "Test what you know about the world.",
      strategist: "Deep dives into history and geography.",
      mastermind: "Advanced geopolitics and historical analysis.",
    },
  },

  // ═══ SIMULATION ═══
  {
    key: "word_builder",
    name: "Word Builder",
    emoji: "🔤",
    category: "cognitive",
    subject: "English",
    description: "Build words from scrambled letters",
    stages: ["explorer", "builder", "strategist"],
    baseDifficulty: 1,
    instructions: {
      explorer: "Make words from the jumbled letters!",
      builder: "Longer words score more — find them all!",
      strategist: "Race against time to find every valid word.",
    },
  },
  {
    key: "cause_effect",
    name: "Cause & Effect",
    emoji: "🔗",
    category: "cognitive",
    subject: "Science",
    description: "Match scientific causes to their effects",
    stages: ["builder", "strategist", "mastermind"],
    baseDifficulty: 2,
    instructions: {
      builder: "Match each cause to the right effect.",
      strategist: "Chain multiple causes and effects together.",
      mastermind: "Complex causal reasoning across disciplines.",
    },
  },
  {
    key: "timeline_challenge",
    name: "Timeline Challenge",
    emoji: "📅",
    category: "cognitive",
    subject: "Social Studies",
    description: "Arrange historical events in chronological order",
    stages: ["builder", "strategist", "mastermind"],
    baseDifficulty: 2,
    instructions: {
      builder: "Drag events into the right order on the timeline.",
      strategist: "More events, tighter time periods — precision matters.",
      mastermind: "Interleave global events across centuries.",
    },
  },
  {
    key: "map_explorer",
    name: "Map Explorer",
    emoji: "🗺️",
    category: "simulation",
    subject: "Social Studies",
    description: "Geography-based discovery challenges",
    stages: ["explorer", "builder", "strategist"],
    baseDifficulty: 2,
    instructions: {
      explorer: "Find countries and landmarks on the map!",
      builder: "Locate capitals, rivers, and regions quickly.",
      strategist: "Complex geopolitical mapping challenges.",
    },
  },
];

/* ──────────────────────────────────────────────────────── */
/*  Core Selection Engine                                   */
/* ──────────────────────────────────────────────────────── */

export interface GameSelectionResult {
  age: number;
  stage: AgeStage;
  games: SelectedGame[];
  difficulty: Difficulty;
}

export interface SelectedGame {
  key: string;
  name: string;
  emoji: string;
  category: string;
  subject: string | null;
  description: string;
  instruction: string;
  difficulty: Difficulty;
  baseDifficulty: number;
}

/**
 * Determine difficulty based on average accuracy from recent sessions.
 */
export function computeDifficulty(avgAccuracy: number | null): Difficulty {
  if (avgAccuracy === null || avgAccuracy === undefined) return "easy";
  if (avgAccuracy >= 75) return "hard";
  if (avgAccuracy >= 50) return "medium";
  return "easy";
}

/**
 * Main selection function.
 *
 * Rules:
 * - Only return games whose `stages` array includes the student's stage key
 * - Sort by baseDifficulty so easiest appear first
 * - Compute difficulty from performance
 */
export function selectGamesForStudent(
  age: number,
  avgAccuracy: number | null,
  subjectFilter?: string | null,
  categoryFilter?: string | null,
): GameSelectionResult {
  const stage = getAgeStage(age);
  const difficulty = computeDifficulty(avgAccuracy);

  let eligible = GAME_LIBRARY.filter((g) => g.stages.includes(stage.key));

  if (subjectFilter) {
    eligible = eligible.filter(
      (g) => g.subject === null || g.subject?.toLowerCase() === subjectFilter.toLowerCase(),
    );
  }

  if (categoryFilter) {
    eligible = eligible.filter((g) => g.category === categoryFilter);
  }

  // Sort: subject-specific first, then by baseDifficulty ascending
  eligible.sort((a, b) => {
    if (a.subject && !b.subject) return -1;
    if (!a.subject && b.subject) return 1;
    return a.baseDifficulty - b.baseDifficulty;
  });

  const games: SelectedGame[] = eligible.map((g) => ({
    key: g.key,
    name: g.name,
    emoji: g.emoji,
    category: g.category,
    subject: g.subject,
    description: g.description,
    instruction: g.instructions[stage.key] || g.description,
    difficulty,
    baseDifficulty: g.baseDifficulty,
  }));

  return { age, stage, games, difficulty };
}

/**
 * Get recommended games (3-5) prioritizing weak areas and variety.
 */
export function getRecommendedGames(
  age: number,
  avgAccuracy: number | null,
  weakSubjects: string[],
  recentGameKeys: string[],
): SelectedGame[] {
  const { games, stage } = selectGamesForStudent(age, avgAccuracy);
  const recentSet = new Set(recentGameKeys);

  // Score each game for recommendation
  const scored = games.map((g) => {
    let score = 0;
    // Boost weak-subject games
    if (g.subject && weakSubjects.some((ws) => ws.toLowerCase() === g.subject?.toLowerCase())) {
      score += 10;
    }
    // Boost games not recently played
    if (!recentSet.has(g.key)) score += 5;
    // Boost variety — different categories
    if (g.category === "cognitive") score += 2;
    if (g.category === "adaptive_quiz") score += 3;
    return { game: g, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((s) => s.game);
}
