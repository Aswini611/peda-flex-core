import { AgeGroupId } from './ageGroups';
import { GameDefinition, GAME_REGISTRY } from './gameRegistry';

export interface SelectedGame extends GameDefinition {
  difficulty: 'easy' | 'medium' | 'hard';
  selectedIndex: number;
}

/**
 * Selects ALL eligible games for a student based on age group and subject.
 * All games use subject-aware content pools, so every game's questions
 * will match the selected subject.
 */
export function selectGamesForStudent(
  ageGroupId: AgeGroupId,
  subject: string,
  avgAccuracy?: number
): SelectedGame[] {
  // Get all eligible games for this age group
  const eligible = GAME_REGISTRY.filter(g => g.ageGroups.includes(ageGroupId));

  // Determine difficulty based on accuracy
  const difficulty: 'easy' | 'medium' | 'hard' = 
    !avgAccuracy || avgAccuracy < 50 ? 'easy' :
    avgAccuracy < 75 ? 'medium' : 'hard';

  // Shuffle for variety
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);

  return shuffled.map((g, i) => ({
    ...g,
    difficulty,
    selectedIndex: i,
  }));
}
