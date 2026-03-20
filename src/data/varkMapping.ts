// VARK Learning Style derivation from assessment question responses
// Maps assessment questions to Visual, Auditory, Read/Write, Kinesthetic modalities

export interface VarkScores {
  visual: number;
  auditory: number;
  readWrite: number;
  kinesthetic: number;
  dominant: "Visual" | "Auditory" | "Read/Write" | "Kinesthetic";
}

interface VarkMapping {
  visual: number[];
  auditory: number[];
  readWrite: number[];
  kinesthetic: number[];
}

const VARK_MAPPINGS: Record<number, VarkMapping> = {
  // Age 3-4: Developmental
  3: {
    visual: [4, 8, 9, 10, 26],        // point to objects, stack blocks, scribble, identify colors, recognize animals
    auditory: [2, 11, 20, 22, 23],      // say words, respond to name, enjoy music, listen to stories, repeat words
    readWrite: [3, 24, 25, 27],          // follow instructions, ask questions, show curiosity, pretend games
    kinesthetic: [6, 12, 16, 17, 18, 19, 21], // play with toys, dress myself, walk, run, kick ball, hold crayons, dance
  },
  // Age 5-9: MI + School Readiness
  5: {
    visual: [7, 8, 18, 20, 30],         // drawing, color inside lines, recognize patterns, observe insects, identify shapes
    auditory: [1, 2, 9, 10, 28],         // listen to stories, tell stories, music class, remember lyrics, clap to rhythm
    readWrite: [3, 4, 16, 22, 27],       // recognize letters, read words, ask questions, follow rules, remember instructions
    kinesthetic: [5, 6, 11, 12, 13, 17], // counting, puzzles, dancing, outdoor games, balance, building blocks
  },
  // Age 10-14: MI + Info Processing
  10: {
    visual: [7, 21, 27],                 // learn from diagrams, prefer visual learning, understand graphs
    auditory: [12, 14, 17, 22],           // music practice, ask questions in class, enjoy debates, explain to friends
    readWrite: [1, 4, 6, 9, 16, 28],     // reading books, remember study, writing essays, homework on time, revise, remember sequences
    kinesthetic: [5, 8, 11, 13, 24],      // science experiments, teams, sports, logical puzzles, group projects
  },
  // Age 15+: Big Five + Career
  15: {
    visual: [11, 20, 22],                // creative tasks, technical subjects, artistic activities
    auditory: [2, 8, 23, 29],            // social gatherings, express ideas, leading discussions, debates
    readWrite: [1, 10, 12, 18, 27],      // organized, analyze problems, structured plans, reflect before acting, research
    kinesthetic: [4, 6, 17, 19, 21],     // try new experiences, leadership roles, calculated risks, ambitious, practical work
  },
};

export function deriveVarkScores(
  ageGroup: number,
  responses: Record<string, number>
): VarkScores {
  const mapping = VARK_MAPPINGS[ageGroup];
  if (!mapping) {
    return { visual: 50, auditory: 50, readWrite: 50, kinesthetic: 50, dominant: "Visual" };
  }

  const maxPerQuestion = ageGroup <= 5 ? 4 : 5;

  const calcPercentage = (questionIds: number[]) => {
    const total = questionIds.reduce((sum, qId) => sum + (responses[String(qId)] || 0), 0);
    const max = questionIds.length * maxPerQuestion;
    return max > 0 ? Math.round((total / max) * 100) : 0;
  };

  const visual = calcPercentage(mapping.visual);
  const auditory = calcPercentage(mapping.auditory);
  const readWrite = calcPercentage(mapping.readWrite);
  const kinesthetic = calcPercentage(mapping.kinesthetic);

  const scores = { visual, auditory, readWrite, kinesthetic };
  const max = Math.max(visual, auditory, readWrite, kinesthetic);
  
  let dominant: VarkScores["dominant"] = "Visual";
  if (max === auditory) dominant = "Auditory";
  if (max === readWrite) dominant = "Read/Write";
  if (max === kinesthetic) dominant = "Kinesthetic";
  // Visual wins ties by default (checked first)
  if (max === visual) dominant = "Visual";

  return { ...scores, dominant };
}
