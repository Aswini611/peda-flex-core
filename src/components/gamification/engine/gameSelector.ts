import { AgeGroupId } from './ageGroups';
import { GameDefinition, GameCategory, GAME_REGISTRY } from './gameRegistry';

export interface SelectedGame extends GameDefinition {
  difficulty: 'easy' | 'medium' | 'hard';
  selectedIndex: number;
}

/**
 * Selects 5 optimal games for a student based on age group, subject, and constraints.
 * Ensures:
 * - At least 1 memory game
 * - At least 1 logic/reasoning game
 * - At least 1 subject-specific game
 * - At least 1 speed-based game
 * - All games are age-appropriate
 */
export function selectGamesForStudent(
  ageGroupId: AgeGroupId,
  subject: string,
  avgAccuracy?: number // from student profile, for difficulty scaling
): SelectedGame[] {
  const normalizedSubject = subject.toLowerCase().trim();

  // Get all eligible games for this age group AND subject
  const eligible = GAME_REGISTRY.filter(g => {
    if (!g.ageGroups.includes(ageGroupId)) return false;
    // Only include games that are subject-compatible
    if (g.subjects === 'all') return true;
    return g.subjects.some(s => 
      s.toLowerCase() === normalizedSubject || 
      normalizedSubject.includes(s.toLowerCase()) ||
      s.toLowerCase().includes(normalizedSubject)
    );
  });

  // Separate by category
  const byCategory: Record<GameCategory, GameDefinition[]> = {
    memory: [],
    logic: [],
    subject: [],
    speed: [],
    verbal: [],
  };

  eligible.forEach(g => {
    byCategory[g.category].push(g);
  });

  // Filter subject-relevant games
  const subjectRelevant = eligible.filter(g => {
    if (g.subjects === 'all') return true;
    return g.subjects.some(s => 
      s.toLowerCase() === normalizedSubject || 
      normalizedSubject.includes(s.toLowerCase()) ||
      s.toLowerCase().includes(normalizedSubject)
    );
  });

  const selected: GameDefinition[] = [];
  const usedIds = new Set<string>();

  const pickFrom = (pool: GameDefinition[]): GameDefinition | null => {
    const available = pool.filter(g => !usedIds.has(g.id));
    if (available.length === 0) return null;
    // Weighted random: prefer subject-relevant games
    const weighted = available.map(g => ({
      game: g,
      weight: (g.subjects === 'all' ? 1 : 
        g.subjects.some(s => normalizedSubject.includes(s.toLowerCase())) ? 3 : 1),
    }));
    const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const w of weighted) {
      rand -= w.weight;
      if (rand <= 0) return w.game;
    }
    return weighted[weighted.length - 1].game;
  };

  const addGame = (game: GameDefinition | null) => {
    if (game && !usedIds.has(game.id)) {
      selected.push(game);
      usedIds.add(game.id);
    }
  };

  // 1. Ensure at least 1 memory game
  addGame(pickFrom(byCategory.memory));

  // 2. Ensure at least 1 logic game
  addGame(pickFrom(byCategory.logic));

  // 3. Ensure at least 1 subject-specific or verbal game
  const subjectOrVerbal = [...byCategory.subject, ...byCategory.verbal];
  addGame(pickFrom(subjectOrVerbal.length > 0 ? subjectOrVerbal : subjectRelevant));

  // 4. Ensure at least 1 speed game
  addGame(pickFrom(byCategory.speed));

  // 5. Fill remaining slots from all eligible games
  while (selected.length < 5) {
    const remaining = eligible.filter(g => !usedIds.has(g.id));
    if (remaining.length === 0) break;
    addGame(pickFrom(remaining));
  }

  // If we still don't have 5, allow duplicates from different categories
  if (selected.length < 5) {
    const all = eligible.filter(g => !usedIds.has(g.id));
    while (selected.length < 5 && all.length > 0) {
      const idx = Math.floor(Math.random() * all.length);
      selected.push(all[idx]);
      all.splice(idx, 1);
    }
  }

  // Determine difficulty based on accuracy
  const difficulty: 'easy' | 'medium' | 'hard' = 
    !avgAccuracy || avgAccuracy < 50 ? 'easy' :
    avgAccuracy < 75 ? 'medium' : 'hard';

  // Shuffle for variety
  const shuffled = selected.sort(() => Math.random() - 0.5);

  return shuffled.map((g, i) => ({
    ...g,
    difficulty,
    selectedIndex: i,
  }));
}
