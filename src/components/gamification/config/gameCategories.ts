export interface GameCategory {
  key: string;
  label: string;
  emoji: string;
  color: string;
  description: string;
  subjectSpecific: boolean;
}

export const GAME_CATEGORIES: GameCategory[] = [
  {
    key: "cognitive",
    label: "Cognitive Games",
    emoji: "🧠",
    color: "#6366F1",
    description: "Memory, patterns, logic — train your brain",
    subjectSpecific: false,
  },
  {
    key: "speed",
    label: "Speed & Reflex",
    emoji: "⚡",
    color: "#F472B6",
    description: "Reaction time, quick decisions under pressure",
    subjectSpecific: false,
  },
  {
    key: "strategy",
    label: "Strategy Games",
    emoji: "♟️",
    color: "#F59E0B",
    description: "Planning, resource management, thinking ahead",
    subjectSpecific: false,
  },
  {
    key: "adaptive_quiz",
    label: "Adaptive Quiz",
    emoji: "📝",
    color: "#22C55E",
    description: "AI-generated questions with dynamic difficulty",
    subjectSpecific: true,
  },
  {
    key: "simulation",
    label: "Simulations",
    emoji: "🔬",
    color: "#38BDF8",
    description: "Virtual labs, real-world scenarios",
    subjectSpecific: true,
  },
];

export interface SubjectGameConfig {
  subject: string;
  emoji: string;
  color: string;
  gameTypes: {
    key: string;
    name: string;
    category: string;
    description: string;
    emoji: string;
    minAge: number;
    difficulty: number;
  }[];
}

export const SUBJECT_GAMES: SubjectGameConfig[] = [
  {
    subject: "Mathematics",
    emoji: "🔢",
    color: "#A855F7",
    gameTypes: [
      { key: "math_blitz", name: "Math Blitz", category: "speed", description: "Speed calculations under time pressure", emoji: "⚡", minAge: 5, difficulty: 1 },
      { key: "pattern_puzzle", name: "Pattern Puzzle", category: "cognitive", description: "Find the hidden mathematical pattern", emoji: "🧩", minAge: 7, difficulty: 2 },
      { key: "equation_balance", name: "Equation Balance", category: "strategy", description: "Balance equations by placing numbers", emoji: "⚖️", minAge: 9, difficulty: 3 },
      { key: "math_quiz", name: "Math Challenge", category: "adaptive_quiz", description: "AI-adaptive math questions", emoji: "📐", minAge: 5, difficulty: 1 },
    ],
  },
  {
    subject: "Science",
    emoji: "🔬",
    color: "#22C55E",
    gameTypes: [
      { key: "cause_effect", name: "Cause & Effect", category: "cognitive", description: "Match scientific causes to their effects", emoji: "🔗", minAge: 7, difficulty: 2 },
      { key: "element_sort", name: "Element Sort", category: "speed", description: "Rapidly classify elements and compounds", emoji: "⚗️", minAge: 10, difficulty: 3 },
      { key: "hypothesis_lab", name: "Hypothesis Lab", category: "simulation", description: "Design experiments and test hypotheses", emoji: "🧪", minAge: 12, difficulty: 4 },
      { key: "science_quiz", name: "Science Quest", category: "adaptive_quiz", description: "AI-adaptive science questions", emoji: "🔭", minAge: 5, difficulty: 1 },
    ],
  },
  {
    subject: "English",
    emoji: "📚",
    color: "#38BDF8",
    gameTypes: [
      { key: "word_builder", name: "Word Builder", category: "cognitive", description: "Build words from scrambled letters", emoji: "🔤", minAge: 5, difficulty: 1 },
      { key: "grammar_rush", name: "Grammar Rush", category: "speed", description: "Fix grammar errors before time runs out", emoji: "✏️", minAge: 8, difficulty: 2 },
      { key: "story_weaver", name: "Story Weaver", category: "strategy", description: "Complete stories with the right words", emoji: "📖", minAge: 10, difficulty: 3 },
      { key: "language_quiz", name: "Language Quest", category: "adaptive_quiz", description: "AI-adaptive language questions", emoji: "📝", minAge: 5, difficulty: 1 },
    ],
  },
  {
    subject: "Social Studies",
    emoji: "🌍",
    color: "#F59E0B",
    gameTypes: [
      { key: "timeline_challenge", name: "Timeline Challenge", category: "cognitive", description: "Arrange historical events in order", emoji: "📅", minAge: 8, difficulty: 2 },
      { key: "map_explorer", name: "Map Explorer", category: "simulation", description: "Geography-based discovery challenges", emoji: "🗺️", minAge: 7, difficulty: 2 },
      { key: "civilisation_builder", name: "Civilisation Builder", category: "strategy", description: "Build and manage a civilization", emoji: "🏛️", minAge: 12, difficulty: 4 },
      { key: "social_quiz", name: "History Quest", category: "adaptive_quiz", description: "AI-adaptive social studies questions", emoji: "🏺", minAge: 5, difficulty: 1 },
    ],
  },
];

export function getSubjectGames(subject: string, age: number): SubjectGameConfig["gameTypes"] {
  const config = SUBJECT_GAMES.find(
    (s) => s.subject.toLowerCase() === subject.toLowerCase() ||
           subject.toLowerCase().includes(s.subject.toLowerCase().slice(0, 4))
  );
  if (!config) return [];
  return config.gameTypes.filter((g) => age >= g.minAge);
}

export function getAllAvailableGames(age: number, subjects: string[]): { subject: string; games: SubjectGameConfig["gameTypes"] }[] {
  return subjects.map((subject) => ({
    subject,
    games: getSubjectGames(subject, age),
  })).filter((s) => s.games.length > 0);
}
