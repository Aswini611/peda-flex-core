import { AgeGroupId } from './ageGroups';

export type GameCategory = 'memory' | 'logic' | 'subject' | 'speed' | 'verbal';

export interface GameDefinition {
  id: string;
  name: string;
  icon: string;
  dimension: string;
  color: string;
  category: GameCategory;
  ageGroups: AgeGroupId[];
  subjects: string[] | 'all';
  timeLimit: Record<AgeGroupId, number>;
  objective: string;
  rules: Record<AgeGroupId, string[]>;
  scoring: string;
  weight: number;
}

export const GAME_REGISTRY: GameDefinition[] = [
  // ─── MEMORY GAMES ───
  {
    id: 'visual-memory',
    name: 'Visual Memory',
    icon: '👁️',
    dimension: 'Visual Memory',
    color: '#FF6B6B',
    category: 'memory',
    ageGroups: ['early_learners', 'explorers'],
    subjects: 'all',
    timeLimit: { early_learners: 90, explorers: 75, thinkers: 60, advanced: 60 },
    objective: 'Remember what you see and answer questions about it.',
    rules: {
      early_learners: ['Look at the colorful items carefully', 'Remember what you see', 'Answer questions about what was shown'],
      explorers: ['Memorize the items and their positions', 'Items disappear after a few seconds', 'Recall details accurately'],
      thinkers: ['Memorize items and positions', 'Items disappear quickly', 'Recall details accurately'],
      advanced: ['Memorize items and positions', 'Items disappear quickly', 'Recall details accurately'],
    },
    scoring: '+10 correct | +0 wrong',
    weight: 0.20,
  },
  {
    id: 'match-pairs',
    name: 'Match Pairs',
    icon: '🃏',
    dimension: 'Working Memory',
    color: '#38BDF8',
    category: 'memory',
    ageGroups: ['early_learners', 'explorers', 'thinkers'],
    subjects: 'all',
    timeLimit: { early_learners: 120, explorers: 90, thinkers: 75, advanced: 60 },
    objective: 'Find matching pairs by flipping cards.',
    rules: {
      early_learners: ['Tap a card to flip it', 'Find two matching cards', 'Try to remember where cards are'],
      explorers: ['Flip cards to find matches', 'Remember positions to be faster', 'Fewer flips = higher score'],
      thinkers: ['Find all pairs as fast as possible', 'Penalties for extra flips', 'Speed and accuracy both matter'],
      advanced: ['Find all pairs as fast as possible', 'Penalties for extra flips', 'Speed and accuracy both matter'],
    },
    scoring: '+15 match | -2 miss',
    weight: 0.20,
  },
  {
    id: 'pattern-flash',
    name: 'Pattern Flash',
    icon: '🔷',
    dimension: 'Working Memory',
    color: '#38BDF8',
    category: 'memory',
    ageGroups: ['explorers', 'thinkers', 'advanced'],
    subjects: 'all',
    timeLimit: { early_learners: 90, explorers: 75, thinkers: 60, advanced: 50 },
    objective: 'Memorize glowing tiles and tap them back from memory.',
    rules: {
      early_learners: ['Watch the tiles light up', 'Tap the same tiles', 'Take your time!'],
      explorers: ['Tiles light up briefly — memorize them', 'Click the same tiles after they disappear', 'Difficulty increases each round'],
      thinkers: ['Tiles light up briefly — memorize positions', 'Click the same tiles after they disappear', 'Difficulty increases with more tiles'],
      advanced: ['Tiles flash very quickly', 'Reproduce the exact pattern', 'High accuracy required'],
    },
    scoring: '+10 correct | -5 wrong',
    weight: 0.20,
  },
  // ─── LOGIC/REASONING GAMES ───
  {
    id: 'number-balance',
    name: 'Number Balance',
    icon: '⚖️',
    dimension: 'Numerical Reasoning',
    color: '#A855F7',
    category: 'logic',
    ageGroups: ['explorers', 'thinkers', 'advanced'],
    subjects: ['Maths', 'Mathematics', 'Math', 'Maths Part 1', 'Maths Part 2'],
    timeLimit: { early_learners: 120, explorers: 90, thinkers: 90, advanced: 75 },
    objective: 'Judge which side of the scale is heavier.',
    rules: {
      early_learners: ['Compare two numbers', 'Pick the bigger one', 'No rush!'],
      explorers: ['Compare numbers on both sides', 'Watch for multipliers', 'Select LEFT, RIGHT, or EQUAL'],
      thinkers: ['Compare expressions on both sides', 'Watch for multipliers (×2, ×3)', 'Select quickly and accurately'],
      advanced: ['Complex expressions with multipliers', 'Speed is critical', 'Full penalty system'],
    },
    scoring: '+15 correct | -5 wrong',
    weight: 0.20,
  },
  {
    id: 'shape-sequence',
    name: 'Shape Sequence',
    icon: '🔶',
    dimension: 'Pattern Recognition',
    color: '#F59E0B',
    category: 'logic',
    ageGroups: ['explorers', 'thinkers', 'advanced'],
    subjects: 'all',
    timeLimit: { early_learners: 90, explorers: 75, thinkers: 60, advanced: 50 },
    objective: 'Find the missing shape or number in the series.',
    rules: {
      early_learners: ['Look at the pattern', 'What comes next?', 'Pick from the options'],
      explorers: ['Observe the pattern in the sequence', 'Select the correct next element', 'Patterns get trickier'],
      thinkers: ['Complex patterns with multiple rules', 'Select the correct answer quickly', 'Timed per question'],
      advanced: ['Multi-layered patterns', 'Fibonacci, geometric sequences', 'Speed matters'],
    },
    scoring: '+20 correct | 0 wrong',
    weight: 0.20,
  },
  {
    id: 'category-sort',
    name: 'Category Sort',
    icon: '📦',
    dimension: 'Classification & Logic',
    color: '#22C55E',
    category: 'logic',
    ageGroups: ['early_learners', 'explorers', 'thinkers', 'advanced'],
    subjects: 'all',
    timeLimit: { early_learners: 90, explorers: 75, thinkers: 60, advanced: 50 },
    objective: 'Sort items into the correct categories.',
    rules: {
      early_learners: ['Read the category names', 'Drag items to the right group', 'No penalties!'],
      explorers: ['Sort items into 2 categories', 'Rules change periodically', 'Be quick and accurate'],
      thinkers: ['Complex categorization rules', 'Rules change every 15 seconds', 'Penalties for wrong sorts'],
      advanced: ['Multi-criteria sorting', 'Rapid rule changes', 'Full penalty system'],
    },
    scoring: '+10 correct | -5 wrong',
    weight: 0.15,
  },
  // ─── VERBAL GAMES ───
  {
    id: 'word-proof',
    name: 'Word Proof',
    icon: '📝',
    dimension: 'Verbal & Attention',
    color: '#84CC16',
    category: 'verbal',
    ageGroups: ['explorers', 'thinkers', 'advanced'],
    subjects: ['English', 'Hindi', 'Language', 'Urdu', 'Sanskrit'],
    timeLimit: { early_learners: 120, explorers: 120, thinkers: 90, advanced: 75 },
    objective: 'Spot spelling and grammar mistakes.',
    rules: {
      early_learners: ['Find the misspelled words', 'Click on them', 'No penalties for mistakes'],
      explorers: ['Read the paragraph for errors', 'Click on wrong words', 'Avoid clicking correct words'],
      thinkers: ['Find spelling AND grammar errors', 'False positives cost points', 'Time pressure increases'],
      advanced: ['Subtle grammar and usage errors', 'Heavy penalty for false positives', 'Expert-level text'],
    },
    scoring: '+10 found | -8 false positive',
    weight: 0.20,
  },
  {
    id: 'word-scramble',
    name: 'Word Scramble',
    icon: '🔤',
    dimension: 'Vocabulary & Spelling',
    color: '#EC4899',
    category: 'verbal',
    ageGroups: ['early_learners', 'explorers', 'thinkers'],
    subjects: 'all',
    timeLimit: { early_learners: 120, explorers: 90, thinkers: 75, advanced: 60 },
    objective: 'Unscramble the letters to form the correct word.',
    rules: {
      early_learners: ['Letters are mixed up', 'Tap letters in the right order', 'Hints available!'],
      explorers: ['Unscramble subject-related words', 'Tap letters to spell the word', 'Speed bonus for fast answers'],
      thinkers: ['Complex vocabulary words', 'No hints available', 'Timed per word'],
      advanced: ['Complex vocabulary words', 'No hints available', 'Timed per word'],
    },
    scoring: '+15 correct | +5 speed bonus',
    weight: 0.15,
  },
  // ─── SUBJECT-SPECIFIC GAMES ───
  {
    id: 'quick-quiz',
    name: 'Quick Quiz',
    icon: '❓',
    dimension: 'Subject Knowledge',
    color: '#6366F1',
    category: 'subject',
    ageGroups: ['early_learners', 'explorers', 'thinkers', 'advanced'],
    subjects: 'all',
    timeLimit: { early_learners: 120, explorers: 90, thinkers: 75, advanced: 60 },
    objective: 'Answer rapid-fire questions on your subject.',
    rules: {
      early_learners: ['Read the question carefully', 'Pick the right answer', 'No rush, take your time!'],
      explorers: ['Answer questions quickly', '4 options per question', 'Timer per question'],
      thinkers: ['Rapid-fire subject questions', 'Strict time per question', 'Penalties for wrong answers'],
      advanced: ['Complex subject questions', 'Very limited time', 'Full penalty system'],
    },
    scoring: '+15 correct | -5 wrong',
    weight: 0.25,
  },
  // ─── SPEED GAMES ───
  {
    id: 'rapid-sort',
    name: 'Rapid Sort',
    icon: '⚡',
    dimension: 'Processing Speed',
    color: '#F472B6',
    category: 'speed',
    ageGroups: ['explorers', 'thinkers', 'advanced'],
    subjects: 'all',
    timeLimit: { early_learners: 120, explorers: 90, thinkers: 90, advanced: 75 },
    objective: 'Sort items left or right based on the rule.',
    rules: {
      early_learners: ['Sort items into two groups', 'Take your time', 'Have fun!'],
      explorers: ['Read the sorting rule', 'Swipe left or right to sort', 'Rules change every 30 seconds'],
      thinkers: ['Sort items quickly', 'Rules change every 20 seconds', 'Penalties for wrong sorts'],
      advanced: ['Maximum speed required', 'Rapid rule changes', 'Heavy penalties'],
    },
    scoring: '+8 correct | -4 wrong',
    weight: 0.15,
  },
  {
    id: 'speed-tap',
    name: 'Speed Tap',
    icon: '👆',
    dimension: 'Reaction Speed',
    color: '#EF4444',
    category: 'speed',
    ageGroups: ['early_learners', 'explorers', 'thinkers', 'advanced'],
    subjects: 'all',
    timeLimit: { early_learners: 60, explorers: 50, thinkers: 45, advanced: 40 },
    objective: 'Tap the correct items as fast as possible!',
    rules: {
      early_learners: ['Tap the items that match the rule', 'Ignore the wrong ones', 'Be quick!'],
      explorers: ['Tap only matching items', 'Items appear and disappear fast', 'Don\'t tap wrong items'],
      thinkers: ['Rapid item appearances', 'Complex matching rules', 'Penalties for wrong taps'],
      advanced: ['Extremely fast items', 'Multi-criteria matching', 'Heavy penalties'],
    },
    scoring: '+10 correct | -8 wrong tap',
    weight: 0.15,
  },
];

export function getGamesForAgeGroup(ageGroupId: AgeGroupId): GameDefinition[] {
  return GAME_REGISTRY.filter(g => g.ageGroups.includes(ageGroupId));
}

export function getGamesForSubject(subject: string, ageGroupId: AgeGroupId): GameDefinition[] {
  const normalizedSubject = subject.toLowerCase().trim();
  return GAME_REGISTRY.filter(g => {
    if (!g.ageGroups.includes(ageGroupId)) return false;
    if (g.subjects === 'all') return true;
    return g.subjects.some(s => s.toLowerCase() === normalizedSubject || normalizedSubject.includes(s.toLowerCase()));
  });
}
