import { AgeGroupId } from './ageGroups';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface MatchPair {
  a: string;
  b: string;
}

export interface SortCategory {
  rule: string;
  leftLabel: string;
  rightLabel: string;
  leftItems: string[];
  rightItems: string[];
}

export interface WordEntry {
  word: string;
  hint: string;
}

export interface SpeedTapRule {
  instruction: string;
  targets: string[];
  distractors: string[];
}

export interface VisualMemorySet {
  items: string[];
  questions: { question: string; options: string[]; correctIndex: number }[];
}

// ─── Shuffle utility (Fisher-Yates) ───
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── MATH CONTENT ───
const MATH_CONTENT = {
  quiz: {
    early_learners: [
      { question: 'What is 2 + 3?', options: ['4', '5', '6', '7'], correctIndex: 1 },
      { question: 'What is 5 - 2?', options: ['2', '3', '4', '1'], correctIndex: 1 },
      { question: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], correctIndex: 1 },
      { question: 'What is 1 + 1?', options: ['1', '2', '3', '4'], correctIndex: 1 },
      { question: 'What is 4 + 1?', options: ['4', '3', '5', '6'], correctIndex: 2 },
      { question: 'Which is bigger: 3 or 7?', options: ['3', '7', 'Same', 'None'], correctIndex: 1 },
      { question: 'What shape is a ball?', options: ['Square', 'Circle', 'Triangle', 'Star'], correctIndex: 1 },
      { question: 'What is 3 + 3?', options: ['5', '6', '7', '8'], correctIndex: 1 },
      { question: 'What is 6 - 4?', options: ['1', '2', '3', '4'], correctIndex: 1 },
      { question: 'How many corners does a square have?', options: ['2', '3', '4', '5'], correctIndex: 2 },
      { question: 'What is 2 + 2?', options: ['3', '4', '5', '6'], correctIndex: 1 },
      { question: 'What comes after 9?', options: ['8', '10', '11', '7'], correctIndex: 1 },
      { question: 'How many sides does a rectangle have?', options: ['3', '4', '5', '6'], correctIndex: 1 },
      { question: 'What is 7 - 3?', options: ['3', '4', '5', '2'], correctIndex: 1 },
    ],
    explorers: [
      { question: 'What is 12 × 5?', options: ['55', '60', '65', '50'], correctIndex: 1 },
      { question: 'What is 144 ÷ 12?', options: ['10', '11', '12', '13'], correctIndex: 2 },
      { question: 'What is the perimeter of a square with side 8?', options: ['24', '32', '64', '16'], correctIndex: 1 },
      { question: 'What is ¾ of 100?', options: ['25', '50', '75', '80'], correctIndex: 2 },
      { question: 'What is 7 × 8?', options: ['54', '56', '58', '64'], correctIndex: 1 },
      { question: 'How many degrees in a right angle?', options: ['45', '90', '180', '360'], correctIndex: 1 },
      { question: 'What is 15% of 200?', options: ['15', '20', '25', '30'], correctIndex: 3 },
      { question: 'What is the area of a rectangle 5×4?', options: ['9', '18', '20', '25'], correctIndex: 2 },
      { question: 'What is 9 × 9?', options: ['72', '81', '90', '99'], correctIndex: 1 },
      { question: 'What is ½ + ¼?', options: ['¼', '½', '¾', '1'], correctIndex: 2 },
      { question: 'How many faces does a cube have?', options: ['4', '6', '8', '12'], correctIndex: 1 },
      { question: 'What is 1000 ÷ 25?', options: ['20', '30', '40', '50'], correctIndex: 2 },
      { question: 'What is 25% of 80?', options: ['15', '20', '25', '30'], correctIndex: 1 },
      { question: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], correctIndex: 2 },
    ],
    thinkers: [
      { question: 'Solve: 2x + 5 = 15', options: ['x=3', 'x=4', 'x=5', 'x=10'], correctIndex: 2 },
      { question: 'What is √196?', options: ['12', '13', '14', '15'], correctIndex: 2 },
      { question: 'If a triangle has angles 60° and 80°, what is the third?', options: ['30°', '40°', '50°', '60°'], correctIndex: 1 },
      { question: 'What is 3⁴?', options: ['12', '27', '64', '81'], correctIndex: 3 },
      { question: 'Simplify: (x²)(x³)', options: ['x⁵', 'x⁶', '2x⁵', 'x⁸'], correctIndex: 0 },
      { question: 'What is the HCF of 24 and 36?', options: ['6', '8', '12', '24'], correctIndex: 2 },
      { question: 'What is sin(90°)?', options: ['0', '0.5', '1', '√2'], correctIndex: 2 },
      { question: 'Area of circle with radius 7? (π≈22/7)', options: ['44', '88', '154', '308'], correctIndex: 2 },
      { question: 'What is the LCM of 6 and 8?', options: ['12', '24', '48', '16'], correctIndex: 1 },
      { question: 'Solve: 3x - 7 = 14', options: ['x=5', 'x=6', 'x=7', 'x=8'], correctIndex: 2 },
      { question: 'What is cos(0°)?', options: ['0', '0.5', '1', '-1'], correctIndex: 2 },
      { question: 'What is 2⁵?', options: ['16', '32', '64', '10'], correctIndex: 1 },
      { question: 'If x² = 49, x = ?', options: ['±5', '±6', '±7', '±8'], correctIndex: 2 },
      { question: 'What is tan(45°)?', options: ['0', '0.5', '1', '√3'], correctIndex: 2 },
    ],
    advanced: [
      { question: 'What is the derivative of x³?', options: ['x²', '2x²', '3x²', '3x'], correctIndex: 2 },
      { question: 'What is ∫2x dx?', options: ['x²', 'x²+C', '2x²', '2x²+C'], correctIndex: 1 },
      { question: 'What is log₂(64)?', options: ['4', '5', '6', '8'], correctIndex: 2 },
      { question: 'In a GP: 2, 6, 18, __?', options: ['36', '48', '54', '72'], correctIndex: 2 },
      { question: 'What is the value of i² (imaginary unit)?', options: ['1', '-1', 'i', '-i'], correctIndex: 1 },
      { question: 'Solve: |2x - 3| = 7', options: ['x=5 or x=-2', 'x=2 or x=5', 'x=5 only', 'x=-2 only'], correctIndex: 0 },
      { question: 'P(A∪B) = P(A)+P(B)-P(A∩B). If P(A)=0.3, P(B)=0.5, P(A∩B)=0.1?', options: ['0.6', '0.7', '0.8', '0.9'], correctIndex: 1 },
      { question: 'What is the determinant of [[1,2],[3,4]]?', options: ['-2', '2', '-10', '10'], correctIndex: 0 },
      { question: 'What is d/dx(eˣ)?', options: ['xeˣ', 'eˣ', 'eˣ⁻¹', 'xeˣ⁻¹'], correctIndex: 1 },
      { question: 'What is ∫sin(x) dx?', options: ['cos(x)+C', '-cos(x)+C', 'sin(x)+C', '-sin(x)+C'], correctIndex: 1 },
      { question: 'What is lim(x→0) sin(x)/x?', options: ['0', '1', '∞', 'undefined'], correctIndex: 1 },
      { question: 'Sum of infinite GP with a=1, r=½?', options: ['1', '2', '3', '∞'], correctIndex: 1 },
      { question: 'What is nP2 when n=5?', options: ['10', '20', '25', '30'], correctIndex: 1 },
      { question: 'Matrix A is 3×2, B is 2×4. AB is?', options: ['3×4', '2×2', '3×2', '2×4'], correctIndex: 0 },
    ],
  },
  pairs: {
    early_learners: [
      { a: '1+1', b: '2' }, { a: '2+2', b: '4' }, { a: '3+1', b: '4' },
      { a: '5-1', b: '4' }, { a: '1+3', b: '4' }, { a: '2+1', b: '3' },
      { a: '5+0', b: '5' }, { a: '3+3', b: '6' }, { a: '4-2', b: '2' },
      { a: '1+4', b: '5' }, { a: '6-1', b: '5' }, { a: '2+3', b: '5' },
    ],
    explorers: [
      { a: '6×7', b: '42' }, { a: '8×9', b: '72' }, { a: '12×5', b: '60' },
      { a: '√49', b: '7' }, { a: '½ of 24', b: '12' }, { a: '15%', b: '0.15' },
      { a: '9×9', b: '81' }, { a: '√64', b: '8' }, { a: '¾ of 20', b: '15' },
      { a: '11×11', b: '121' }, { a: '100÷4', b: '25' }, { a: '7×6', b: '42' },
    ],
    thinkers: [
      { a: 'x²-1', b: '(x+1)(x-1)' }, { a: 'π', b: '3.14159...' }, { a: '√144', b: '12' },
      { a: 'sin30°', b: '0.5' }, { a: '2³', b: '8' }, { a: 'LCM(4,6)', b: '12' },
      { a: 'cos60°', b: '0.5' }, { a: '5!', b: '120' }, { a: '√225', b: '15' },
      { a: 'tan45°', b: '1' }, { a: '3³', b: '27' }, { a: 'HCF(12,18)', b: '6' },
    ],
    advanced: [
      { a: 'd/dx(sin x)', b: 'cos x' }, { a: '∫x dx', b: 'x²/2+C' }, { a: 'e⁰', b: '1' },
      { a: 'ln(e)', b: '1' }, { a: 'lim(1/x)→0', b: '∞' }, { a: 'nCr(5,2)', b: '10' },
      { a: 'd/dx(eˣ)', b: 'eˣ' }, { a: '∫1/x dx', b: 'ln|x|+C' }, { a: 'log₁₀(100)', b: '2' },
      { a: 'nCr(6,3)', b: '20' }, { a: 'd/dx(x⁴)', b: '4x³' }, { a: 'ln(1)', b: '0' },
    ],
  },
  sort: {
    early_learners: [
      { rule: 'Big or Small number?', leftLabel: 'Small (1-5)', rightLabel: 'Big (6-10)', leftItems: ['1','2','3','4','5'], rightItems: ['6','7','8','9','10'] },
      { rule: 'Odd or Even?', leftLabel: 'Odd', rightLabel: 'Even', leftItems: ['1','3','5','7','9'], rightItems: ['2','4','6','8','10'] },
    ],
    explorers: [
      { rule: 'Even or Odd?', leftLabel: 'Even', rightLabel: 'Odd', leftItems: ['2','4','6','8','10','12','14'], rightItems: ['1','3','5','7','9','11','13'] },
      { rule: 'Multiple of 5 or Not?', leftLabel: 'Multiple of 5', rightLabel: 'Not', leftItems: ['5','10','15','20','25','30'], rightItems: ['3','7','11','13','17','19'] },
    ],
    thinkers: [
      { rule: 'Prime or Composite?', leftLabel: 'Prime', rightLabel: 'Composite', leftItems: ['2','3','5','7','11','13','17'], rightItems: ['4','6','8','9','10','12','15'] },
      { rule: 'Perfect Square or Not?', leftLabel: 'Perfect Square', rightLabel: 'Not', leftItems: ['1','4','9','16','25','36'], rightItems: ['2','3','5','7','10','15'] },
    ],
    advanced: [
      { rule: 'Rational or Irrational?', leftLabel: 'Rational', rightLabel: 'Irrational', leftItems: ['½','0.75','3','⅓','0.2'], rightItems: ['√2','π','e','√3','√5'] },
      { rule: 'Convergent or Divergent?', leftLabel: 'Convergent', rightLabel: 'Divergent', leftItems: ['1/n²','1/2ⁿ','(-1)ⁿ/n','1/n³'], rightItems: ['1/n','n','n²','(-1)ⁿ'] },
    ],
  },
  words: {
    early_learners: [
      { word: 'PLUS', hint: 'Addition sign' }, { word: 'FIVE', hint: 'After four' },
      { word: 'ZERO', hint: 'Nothing' }, { word: 'TEN', hint: '5+5' },
      { word: 'FOUR', hint: 'Before five' }, { word: 'SIX', hint: 'After five' },
      { word: 'NINE', hint: 'Before ten' }, { word: 'TWO', hint: 'After one' },
      { word: 'ADD', hint: 'Put together' }, { word: 'SUM', hint: 'Total' },
      { word: 'ONE', hint: 'First number' }, { word: 'HALF', hint: 'Part of two' },
    ],
    explorers: [
      { word: 'FRACTION', hint: 'Part of a whole' }, { word: 'DECIMAL', hint: 'Has a dot' },
      { word: 'PERIMETER', hint: 'Around the shape' }, { word: 'MULTIPLY', hint: '× operation' },
      { word: 'DIVIDE', hint: '÷ operation' }, { word: 'ANGLE', hint: 'Measured in degrees' },
      { word: 'RADIUS', hint: 'Half the diameter' }, { word: 'SQUARE', hint: 'Equal sides shape' },
      { word: 'FACTOR', hint: 'Divides evenly' }, { word: 'PRIME', hint: 'Only 1 and itself' },
      { word: 'RATIO', hint: 'Comparison of two' }, { word: 'AREA', hint: 'Space inside' },
    ],
    thinkers: [
      { word: 'ALGEBRA', hint: 'Using letters for numbers' }, { word: 'GEOMETRY', hint: 'Study of shapes' },
      { word: 'QUADRATIC', hint: 'ax²+bx+c' }, { word: 'POLYNOMIAL', hint: 'Many terms' },
      { word: 'EQUATION', hint: 'Two sides equal' }, { word: 'VARIABLE', hint: 'Unknown letter' },
      { word: 'EXPONENT', hint: 'Power of a number' }, { word: 'THEOREM', hint: 'Proven statement' },
      { word: 'FUNCTION', hint: 'Maps input to output' }, { word: 'MATRIX', hint: 'Array of numbers' },
      { word: 'HYPOTENUSE', hint: 'Longest side' }, { word: 'TANGENT', hint: 'Touches at one point' },
    ],
    advanced: [
      { word: 'DERIVATIVE', hint: 'Rate of change' }, { word: 'INTEGRAL', hint: 'Area under curve' },
      { word: 'LOGARITHM', hint: 'Inverse of exponent' }, { word: 'PROBABILITY', hint: 'Chance of event' },
      { word: 'ASYMPTOTE', hint: 'Approaches but never reaches' }, { word: 'VECTOR', hint: 'Direction and magnitude' },
      { word: 'SCALAR', hint: 'Just a number' }, { word: 'DETERMINANT', hint: 'Matrix property' },
      { word: 'PERMUTATION', hint: 'Ordered arrangement' }, { word: 'COMBINATION', hint: 'Unordered selection' },
      { word: 'DIFFERENTIAL', hint: 'Tiny change' }, { word: 'CONVERGENCE', hint: 'Approaching a limit' },
    ],
  },
  speedTap: {
    early_learners: [
      { instruction: 'Tap only the EVEN numbers!', targets: ['2','4','6','8','10'], distractors: ['1','3','5','7','9','11'] },
      { instruction: 'Tap numbers BIGGER than 5!', targets: ['6','7','8','9','10'], distractors: ['1','2','3','4','5'] },
    ],
    explorers: [
      { instruction: 'Tap only MULTIPLES OF 3!', targets: ['3','6','9','12','15','18','21'], distractors: ['1','2','4','5','7','8','10','11','13'] },
      { instruction: 'Tap only MULTIPLES OF 4!', targets: ['4','8','12','16','20','24'], distractors: ['1','2','3','5','6','7','9','10','11'] },
    ],
    thinkers: [
      { instruction: 'Tap only PRIME numbers!', targets: ['2','3','5','7','11','13','17','19','23'], distractors: ['1','4','6','8','9','10','12','14','15','16','18'] },
      { instruction: 'Tap only PERFECT CUBES!', targets: ['1','8','27','64','125'], distractors: ['2','3','4','5','9','16','25','36','49'] },
    ],
    advanced: [
      { instruction: 'Tap only PERFECT SQUARES!', targets: ['1','4','9','16','25','36','49','64'], distractors: ['2','3','5','6','7','8','10','11','12','15'] },
      { instruction: 'Tap only FIBONACCI numbers!', targets: ['1','2','3','5','8','13','21','34'], distractors: ['4','6','7','9','10','11','12','14','15'] },
    ],
  },
  visualMemory: {
    early_learners: [
      { items: ['🔴','🟡','🔵','🟢'], questions: [{ question: 'What color was first?', options: ['Red','Yellow','Blue','Green'], correctIndex: 0 }, { question: 'How many items were there?', options: ['2','3','4','5'], correctIndex: 2 }] },
      { items: ['1','3','5','7'], questions: [{ question: 'Were all numbers odd?', options: ['Yes','No'], correctIndex: 0 }, { question: 'What was the biggest number?', options: ['3','5','7','9'], correctIndex: 2 }] },
      { items: ['⭐','🌙','☀️','🌈'], questions: [{ question: 'Was there a moon?', options: ['Yes','No'], correctIndex: 0 }, { question: 'How many items?', options: ['3','4','5','6'], correctIndex: 1 }] },
    ],
    explorers: [
      { items: ['3+2=5','7×3=21','10÷2=5','8-3=5'], questions: [{ question: 'Which equation had multiplication?', options: ['3+2=5','7×3=21','10÷2=5','8-3=5'], correctIndex: 1 }, { question: 'What was 10÷2?', options: ['2','5','10','20'], correctIndex: 1 }] },
      { items: ['12×4=48','√81=9','25%=¼','15+17=32'], questions: [{ question: 'What was √81?', options: ['7','8','9','10'], correctIndex: 2 }, { question: 'Which had a percentage?', options: ['12×4=48','√81=9','25%=¼','15+17=32'], correctIndex: 2 }] },
      { items: ['½','⅓','¼','⅕'], questions: [{ question: 'Which fraction was largest?', options: ['½','⅓','¼','⅕'], correctIndex: 0 }, { question: 'Was ⅙ shown?', options: ['Yes','No'], correctIndex: 1 }] },
    ],
    thinkers: [
      { items: ['x²','2x+3','√x','x³-1'], questions: [{ question: 'Which expression had a square root?', options: ['x²','2x+3','√x','x³-1'], correctIndex: 2 }, { question: 'Which was a cubic?', options: ['x²','2x+3','√x','x³-1'], correctIndex: 3 }] },
      { items: ['sin30°=0.5','cos60°=0.5','tan45°=1','sin90°=1'], questions: [{ question: 'What was tan45°?', options: ['0','0.5','1','√3'], correctIndex: 2 }, { question: 'Which had value 0.5?', options: ['tan45°','sin90°','cos60°','All'], correctIndex: 2 }] },
      { items: ['HCF(12,18)=6','LCM(4,6)=12','√169=13','7²=49'], questions: [{ question: 'What was LCM(4,6)?', options: ['8','10','12','24'], correctIndex: 2 }, { question: 'What was √169?', options: ['11','12','13','14'], correctIndex: 2 }] },
    ],
    advanced: [
      { items: ['∫x²dx','d/dx(sin x)','lim(1/n)','Σn²'], questions: [{ question: 'Which was an integral?', options: ['∫x²dx','d/dx(sin x)','lim(1/n)','Σn²'], correctIndex: 0 }, { question: 'Which was a limit?', options: ['∫x²dx','d/dx(sin x)','lim(1/n)','Σn²'], correctIndex: 2 }] },
      { items: ['det(A)=-2','tr(A)=5','A⁻¹ exists','rank(A)=3'], questions: [{ question: 'What was the determinant?', options: ['-1','-2','2','5'], correctIndex: 1 }, { question: 'What was the trace?', options: ['3','4','5','6'], correctIndex: 2 }] },
      { items: ['P(A)=0.3','P(B)=0.5','P(A∩B)=0.1','P(A∪B)=0.7'], questions: [{ question: 'What was P(A∩B)?', options: ['0.1','0.3','0.5','0.7'], correctIndex: 0 }, { question: 'What was P(A∪B)?', options: ['0.5','0.6','0.7','0.8'], correctIndex: 2 }] },
    ],
  },
};

// ─── SCIENCE CONTENT ───
const SCIENCE_CONTENT = {
  quiz: {
    early_learners: [
      { question: 'Which animal says "Moo"?', options: ['Cat', 'Cow', 'Dog', 'Duck'], correctIndex: 1 },
      { question: 'What do plants need to grow?', options: ['Candy', 'Water', 'Toys', 'Books'], correctIndex: 1 },
      { question: 'How many legs does a spider have?', options: ['4', '6', '8', '10'], correctIndex: 2 },
      { question: 'What is the color of the sky?', options: ['Red', 'Green', 'Blue', 'Yellow'], correctIndex: 2 },
      { question: 'Which season is hot?', options: ['Winter', 'Summer', 'Autumn', 'Spring'], correctIndex: 1 },
      { question: 'What does the Sun give us?', options: ['Water', 'Light', 'Food', 'Toys'], correctIndex: 1 },
      { question: 'Which animal can fly?', options: ['Fish', 'Dog', 'Bird', 'Cat'], correctIndex: 2 },
      { question: 'Where do fish live?', options: ['Trees', 'Water', 'Sky', 'Ground'], correctIndex: 1 },
      { question: 'What part of a plant is underground?', options: ['Leaf', 'Flower', 'Root', 'Stem'], correctIndex: 2 },
      { question: 'Which body part helps us hear?', options: ['Eyes', 'Nose', 'Ears', 'Mouth'], correctIndex: 2 },
      { question: 'Rain comes from?', options: ['Sun', 'Clouds', 'Moon', 'Stars'], correctIndex: 1 },
      { question: 'How many legs does a cat have?', options: ['2', '4', '6', '8'], correctIndex: 1 },
      { question: 'What color are leaves?', options: ['Red', 'Blue', 'Green', 'Yellow'], correctIndex: 2 },
      { question: 'Which sense helps us smell?', options: ['Nose', 'Eyes', 'Ears', 'Hands'], correctIndex: 0 },
    ],
    explorers: [
      { question: 'What is the largest planet in our solar system?', options: ['Mars', 'Saturn', 'Jupiter', 'Neptune'], correctIndex: 2 },
      { question: 'What is H₂O?', options: ['Salt', 'Sugar', 'Water', 'Air'], correctIndex: 2 },
      { question: 'Which organ pumps blood?', options: ['Brain', 'Lungs', 'Heart', 'Liver'], correctIndex: 2 },
      { question: 'What is the boiling point of water?', options: ['50°C', '100°C', '150°C', '200°C'], correctIndex: 1 },
      { question: 'How many bones does an adult human have?', options: ['106', '156', '206', '306'], correctIndex: 2 },
      { question: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Earth', 'Mars'], correctIndex: 1 },
      { question: 'What gas do we breathe in?', options: ['CO₂', 'N₂', 'O₂', 'H₂'], correctIndex: 2 },
      { question: 'What is the freezing point of water?', options: ['-10°C', '0°C', '10°C', '50°C'], correctIndex: 1 },
      { question: 'Which force pulls objects toward Earth?', options: ['Magnetism', 'Friction', 'Gravity', 'Buoyancy'], correctIndex: 2 },
      { question: 'How many planets in our solar system?', options: ['6', '7', '8', '9'], correctIndex: 2 },
      { question: 'What is the largest organ in the body?', options: ['Heart', 'Brain', 'Liver', 'Skin'], correctIndex: 3 },
      { question: 'Which animal is a mammal?', options: ['Snake', 'Frog', 'Whale', 'Lizard'], correctIndex: 2 },
      { question: 'What are the building blocks of matter?', options: ['Cells', 'Atoms', 'Molecules', 'Proteins'], correctIndex: 1 },
      { question: 'Earth revolves around the?', options: ['Moon', 'Sun', 'Mars', 'Stars'], correctIndex: 1 },
    ],
    thinkers: [
      { question: 'What is the chemical formula of table salt?', options: ['NaOH', 'NaCl', 'HCl', 'KCl'], correctIndex: 1 },
      { question: 'Which organelle is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], correctIndex: 2 },
      { question: "What is Newton's second law?", options: ['F=ma', 'E=mc²', 'V=IR', 'PV=nRT'], correctIndex: 0 },
      { question: 'What is the pH of pure water?', options: ['5', '7', '9', '14'], correctIndex: 1 },
      { question: 'Which gas do plants absorb?', options: ['O₂', 'N₂', 'CO₂', 'H₂'], correctIndex: 2 },
      { question: 'What is the chemical symbol for Gold?', options: ['Gd', 'Go', 'Au', 'Ag'], correctIndex: 2 },
      { question: 'Which type of blood cells fight infection?', options: ['Red', 'White', 'Platelets', 'Plasma'], correctIndex: 1 },
      { question: 'What is the unit of force?', options: ['Joule', 'Watt', 'Newton', 'Pascal'], correctIndex: 2 },
      { question: 'What is the atomic number of Carbon?', options: ['4', '6', '8', '12'], correctIndex: 1 },
      { question: 'Which vitamin is produced by sunlight?', options: ['A', 'B', 'C', 'D'], correctIndex: 3 },
      { question: 'What is the formula for speed?', options: ['d/t', 'd×t', 'd+t', 'd-t'], correctIndex: 0 },
      { question: 'Which planet has the most moons?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], correctIndex: 1 },
      { question: 'DNA stands for?', options: ['Deoxyribonucleic Acid', 'Dinucleic Acid', 'Dual Nuclear Acid', 'None'], correctIndex: 0 },
      { question: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], correctIndex: 2 },
    ],
    advanced: [
      { question: 'What is the SI unit of electric current?', options: ['Volt', 'Watt', 'Ampere', 'Ohm'], correctIndex: 2 },
      { question: "What is Avogadro's number?", options: ['6.022×10²³', '3.14×10⁸', '9.8×10¹', '1.6×10⁻¹⁹'], correctIndex: 0 },
      { question: 'Which law states energy cannot be created or destroyed?', options: ["Newton's 1st", 'Thermodynamics 1st', "Ohm's Law", "Boyle's Law"], correctIndex: 1 },
      { question: 'What is the molecular formula of glucose?', options: ['C₆H₁₂O₆', 'C₂H₅OH', 'CH₄', 'C₆H₆'], correctIndex: 0 },
      { question: 'What is the speed of light?', options: ['3×10⁶ m/s', '3×10⁸ m/s', '3×10¹⁰ m/s', '3×10⁴ m/s'], correctIndex: 1 },
      { question: 'What is the charge of an electron?', options: ['+1', '-1', '0', '+2'], correctIndex: 1 },
      { question: 'Which element has atomic number 1?', options: ['Helium', 'Hydrogen', 'Lithium', 'Carbon'], correctIndex: 1 },
      { question: 'What is Planck\'s constant?', options: ['6.626×10⁻³⁴ J·s', '3×10⁸ m/s', '9.8 m/s²', '1.6×10⁻¹⁹ C'], correctIndex: 0 },
      { question: 'Which bond type shares electrons?', options: ['Ionic', 'Covalent', 'Metallic', 'Hydrogen'], correctIndex: 1 },
      { question: 'What is the formula for kinetic energy?', options: ['½mv²', 'mgh', 'Fd', 'mc²'], correctIndex: 0 },
      { question: 'RNA differs from DNA by having?', options: ['Thymine', 'Uracil', 'Adenine', 'Guanine'], correctIndex: 1 },
      { question: 'Which law: PV = nRT?', options: ['Ideal Gas Law', "Boyle's", "Charles's", "Dalton's"], correctIndex: 0 },
      { question: 'What is the oxidation state of Fe in Fe₂O₃?', options: ['+1', '+2', '+3', '+4'], correctIndex: 2 },
      { question: 'Which particle has no charge?', options: ['Proton', 'Electron', 'Neutron', 'Positron'], correctIndex: 2 },
    ],
  },
  pairs: {
    early_learners: [
      { a: '🐱', b: 'Cat' }, { a: '🌳', b: 'Tree' }, { a: '☀️', b: 'Sun' },
      { a: '🌙', b: 'Moon' }, { a: '⭐', b: 'Star' }, { a: '🌊', b: 'Water' },
      { a: '🐶', b: 'Dog' }, { a: '🌸', b: 'Flower' }, { a: '🐟', b: 'Fish' },
      { a: '🦋', b: 'Butterfly' }, { a: '🐦', b: 'Bird' }, { a: '🐸', b: 'Frog' },
    ],
    explorers: [
      { a: 'Heart', b: 'Pumps blood' }, { a: 'Lungs', b: 'Breathing' }, { a: 'Brain', b: 'Thinking' },
      { a: 'Stomach', b: 'Digestion' }, { a: 'Kidney', b: 'Filtration' }, { a: 'Liver', b: 'Detox' },
      { a: 'Bone', b: 'Support' }, { a: 'Skin', b: 'Protection' }, { a: 'Eye', b: 'Vision' },
      { a: 'Ear', b: 'Hearing' }, { a: 'Nose', b: 'Smell' }, { a: 'Tongue', b: 'Taste' },
    ],
    thinkers: [
      { a: 'Na', b: 'Sodium' }, { a: 'Fe', b: 'Iron' }, { a: 'Au', b: 'Gold' },
      { a: 'Ag', b: 'Silver' }, { a: 'Cu', b: 'Copper' }, { a: 'Hg', b: 'Mercury' },
      { a: 'K', b: 'Potassium' }, { a: 'Ca', b: 'Calcium' }, { a: 'Pb', b: 'Lead' },
      { a: 'Sn', b: 'Tin' }, { a: 'Zn', b: 'Zinc' }, { a: 'Al', b: 'Aluminium' },
    ],
    advanced: [
      { a: 'DNA', b: 'Genetic code' }, { a: 'ATP', b: 'Energy currency' }, { a: 'RNA', b: 'Protein synthesis' },
      { a: 'Enzyme', b: 'Biological catalyst' }, { a: 'Photon', b: 'Light particle' }, { a: 'Quark', b: 'Subatomic' },
      { a: 'Ribosome', b: 'Protein factory' }, { a: 'Mitosis', b: 'Cell division' }, { a: 'Meiosis', b: 'Gamete formation' },
      { a: 'Neuron', b: 'Nerve cell' }, { a: 'Antibody', b: 'Immune protein' }, { a: 'Isotope', b: 'Same element variant' },
    ],
  },
  sort: {
    early_learners: [
      { rule: 'Living or Non-living?', leftLabel: 'Living', rightLabel: 'Non-living', leftItems: ['Cat','Tree','Fish','Bird','Flower'], rightItems: ['Rock','Chair','Book','Phone','Car'] },
      { rule: 'Can Fly or Cannot Fly?', leftLabel: 'Can Fly', rightLabel: 'Cannot', leftItems: ['Bird','Butterfly','Bee','Bat','Eagle'], rightItems: ['Dog','Fish','Cat','Snake','Frog'] },
    ],
    explorers: [
      { rule: 'Plant or Animal?', leftLabel: 'Plant', rightLabel: 'Animal', leftItems: ['Rose','Fern','Cactus','Moss','Tulip'], rightItems: ['Dog','Eagle','Shark','Ant','Snake'] },
      { rule: 'Solid or Liquid?', leftLabel: 'Solid', rightLabel: 'Liquid', leftItems: ['Rock','Ice','Wood','Metal','Glass'], rightItems: ['Water','Milk','Oil','Juice','Mercury'] },
    ],
    thinkers: [
      { rule: 'Metal or Non-metal?', leftLabel: 'Metal', rightLabel: 'Non-metal', leftItems: ['Iron','Copper','Gold','Silver','Zinc'], rightItems: ['Carbon','Oxygen','Nitrogen','Sulfur','Chlorine'] },
      { rule: 'Acid or Base?', leftLabel: 'Acid', rightLabel: 'Base', leftItems: ['HCl','H₂SO₄','Vinegar','Lemon','HNO₃'], rightItems: ['NaOH','KOH','Soap','Baking Soda','Lime'] },
    ],
    advanced: [
      { rule: 'Endothermic or Exothermic?', leftLabel: 'Endothermic', rightLabel: 'Exothermic', leftItems: ['Melting ice','Photosynthesis','Evaporation','Cooking egg'], rightItems: ['Combustion','Freezing','Rusting','Respiration'] },
      { rule: 'Scalar or Vector?', leftLabel: 'Scalar', rightLabel: 'Vector', leftItems: ['Mass','Speed','Temperature','Energy','Time'], rightItems: ['Force','Velocity','Acceleration','Momentum','Displacement'] },
    ],
  },
  words: {
    early_learners: [
      { word: 'PLANT', hint: 'Grows from soil' }, { word: 'WATER', hint: 'H₂O' },
      { word: 'EARTH', hint: 'Our planet' }, { word: 'MOON', hint: 'Shines at night' },
      { word: 'BIRD', hint: 'Can fly' }, { word: 'FISH', hint: 'Lives in water' },
      { word: 'RAIN', hint: 'Falls from clouds' }, { word: 'SEED', hint: 'Plant baby' },
      { word: 'TREE', hint: 'Has branches' }, { word: 'LEAF', hint: 'Green part of plant' },
      { word: 'STAR', hint: 'Twinkles at night' }, { word: 'NEST', hint: 'Bird home' },
    ],
    explorers: [
      { word: 'PHOTOSYNTHESIS', hint: 'Plants make food' }, { word: 'GRAVITY', hint: 'Pulls things down' },
      { word: 'MOLECULE', hint: 'Group of atoms' }, { word: 'ECOSYSTEM', hint: 'Living community' },
      { word: 'OXYGEN', hint: 'We breathe this' }, { word: 'CARBON', hint: 'Element of life' },
      { word: 'NUCLEUS', hint: 'Cell center' }, { word: 'PLANET', hint: 'Orbits a star' },
      { word: 'ENERGY', hint: 'Ability to work' }, { word: 'MAGNET', hint: 'Attracts iron' },
      { word: 'FOSSIL', hint: 'Ancient remains' }, { word: 'ORBIT', hint: 'Path around' },
    ],
    thinkers: [
      { word: 'MITOCHONDRIA', hint: 'Cell powerhouse' }, { word: 'CHROMOSOME', hint: 'DNA carrier' },
      { word: 'ELECTROLYSIS', hint: 'Breaking with electricity' }, { word: 'ACCELERATION', hint: 'Rate of velocity change' },
      { word: 'CATALYST', hint: 'Speeds reaction' }, { word: 'DIFFUSION', hint: 'Spreading out' },
      { word: 'FREQUENCY', hint: 'Cycles per second' }, { word: 'SPECTRUM', hint: 'Band of colors' },
      { word: 'NEUTRON', hint: 'No charge particle' }, { word: 'REFRACTION', hint: 'Light bending' },
      { word: 'COMPOUND', hint: 'Two+ elements bonded' }, { word: 'DENSITY', hint: 'Mass per volume' },
    ],
    advanced: [
      { word: 'THERMODYNAMICS', hint: 'Heat and energy laws' }, { word: 'ELECTROMAGNETIC', hint: 'Light spectrum type' },
      { word: 'STOICHIOMETRY', hint: 'Chemical balancing' }, { word: 'HYBRIDIZATION', hint: 'Orbital mixing' },
      { word: 'HOMEOSTASIS', hint: 'Internal balance' }, { word: 'POLYMERIZATION', hint: 'Chain building' },
      { word: 'RADIOACTIVE', hint: 'Emits radiation' }, { word: 'CRYSTALLINE', hint: 'Ordered structure' },
      { word: 'EQUILIBRIUM', hint: 'Balanced state' }, { word: 'RESONANCE', hint: 'Vibration matching' },
      { word: 'SEMICONDUCTORS', hint: 'Between conductor and insulator' }, { word: 'PHOTOVOLTAIC', hint: 'Solar cells' },
    ],
  },
  speedTap: {
    early_learners: [
      { instruction: 'Tap only ANIMALS!', targets: ['🐱','🐶','🐟','🐦','🐸','🦋'], distractors: ['🌳','🪨','📱','🪑','📚','🏠'] },
      { instruction: 'Tap only things that GROW!', targets: ['🌳','🌸','🌱','🍎','🐣'], distractors: ['🪨','🪑','📱','🔑','🏠'] },
    ],
    explorers: [
      { instruction: 'Tap only PLANETS!', targets: ['Mars','Venus','Jupiter','Saturn','Mercury','Neptune'], distractors: ['Sun','Moon','Pluto','Star','Comet','Asteroid'] },
      { instruction: 'Tap only ORGANS!', targets: ['Heart','Brain','Lungs','Liver','Kidney','Stomach'], distractors: ['Chair','Book','Table','Phone','Pen','Bag'] },
    ],
    thinkers: [
      { instruction: 'Tap only NOBLE GASES!', targets: ['Helium','Neon','Argon','Krypton','Xenon'], distractors: ['Oxygen','Nitrogen','Carbon','Hydrogen','Sodium','Iron','Chlorine'] },
      { instruction: 'Tap only METALS!', targets: ['Iron','Copper','Gold','Silver','Zinc','Aluminium'], distractors: ['Carbon','Oxygen','Nitrogen','Sulfur','Chlorine','Neon'] },
    ],
    advanced: [
      { instruction: 'Tap only ORGANIC COMPOUNDS!', targets: ['CH₄','C₂H₅OH','C₆H₁₂O₆','C₆H₆','CH₃COOH'], distractors: ['NaCl','H₂O','HCl','NaOH','CaCO₃','KMnO₄'] },
      { instruction: 'Tap only SI BASE UNITS!', targets: ['Meter','Kilogram','Second','Ampere','Kelvin','Mole','Candela'], distractors: ['Newton','Joule','Watt','Pascal','Hertz','Volt'] },
    ],
  },
  visualMemory: {
    early_learners: [
      { items: ['🐱','🐶','🐟','🌳'], questions: [{ question: 'Was there a fish?', options: ['Yes','No'], correctIndex: 0 }, { question: 'How many animals?', options: ['2','3','4','5'], correctIndex: 1 }] },
      { items: ['☀️','🌙','⭐','🌈'], questions: [{ question: 'Was there a rainbow?', options: ['Yes','No'], correctIndex: 0 }, { question: 'Was there clouds?', options: ['Yes','No'], correctIndex: 1 }] },
      { items: ['🌸','🌳','🌱','🍎'], questions: [{ question: 'Was there a fruit?', options: ['Yes','No'], correctIndex: 0 }, { question: 'How many plant items?', options: ['2','3','4','5'], correctIndex: 2 }] },
    ],
    explorers: [
      { items: ['Heart','Lungs','Brain','Liver','Kidney'], questions: [{ question: 'Which organ was NOT shown?', options: ['Heart','Stomach','Brain','Kidney'], correctIndex: 1 }, { question: 'How many organs were shown?', options: ['3','4','5','6'], correctIndex: 2 }] },
      { items: ['Mercury','Venus','Earth','Mars','Jupiter'], questions: [{ question: 'Was Saturn shown?', options: ['Yes','No'], correctIndex: 1 }, { question: 'Which planet was 3rd?', options: ['Mercury','Venus','Earth','Mars'], correctIndex: 2 }] },
      { items: ['O₂','CO₂','H₂O','N₂','He'], questions: [{ question: 'Which was a noble gas?', options: ['O₂','CO₂','H₂O','He'], correctIndex: 3 }, { question: 'Was NH₃ shown?', options: ['Yes','No'], correctIndex: 1 }] },
    ],
    thinkers: [
      { items: ['H₂O','NaCl','CO₂','O₂','Fe₂O₃'], questions: [{ question: 'Which formula was for water?', options: ['NaCl','H₂O','CO₂','Fe₂O₃'], correctIndex: 1 }, { question: 'Which had iron?', options: ['H₂O','NaCl','CO₂','Fe₂O₃'], correctIndex: 3 }] },
      { items: ['F=ma','E=mc²','V=IR','PV=nRT'], questions: [{ question: 'Which was Ohm\'s law?', options: ['F=ma','E=mc²','V=IR','PV=nRT'], correctIndex: 2 }, { question: 'Which related to gas?', options: ['F=ma','E=mc²','V=IR','PV=nRT'], correctIndex: 3 }] },
      { items: ['Mitochondria','Ribosome','Nucleus','Golgi','ER'], questions: [{ question: 'Which is the powerhouse?', options: ['Ribosome','Nucleus','Mitochondria','Golgi'], correctIndex: 2 }, { question: 'Was Lysosome shown?', options: ['Yes','No'], correctIndex: 1 }] },
    ],
    advanced: [
      { items: ['ATP→ADP','DNA→mRNA','Glucose→Pyruvate','NADH→NAD+'], questions: [{ question: 'Which was transcription?', options: ['ATP→ADP','DNA→mRNA','Glucose→Pyruvate','NADH→NAD+'], correctIndex: 1 }, { question: 'Which was glycolysis?', options: ['ATP→ADP','DNA→mRNA','Glucose→Pyruvate','NADH→NAD+'], correctIndex: 2 }] },
      { items: ['λ=h/mv','E=hf','ΔG=ΔH-TΔS','PV=nRT'], questions: [{ question: 'Which is de Broglie?', options: ['λ=h/mv','E=hf','ΔG=ΔH-TΔS','PV=nRT'], correctIndex: 0 }, { question: 'Which is Gibbs free energy?', options: ['λ=h/mv','E=hf','ΔG=ΔH-TΔS','PV=nRT'], correctIndex: 2 }] },
      { items: ['pH 1: HCl','pH 7: Water','pH 14: NaOH','pH 4: Vinegar'], questions: [{ question: 'What pH was water?', options: ['1','4','7','14'], correctIndex: 2 }, { question: 'Which was most acidic?', options: ['HCl','Water','Vinegar','NaOH'], correctIndex: 0 }] },
    ],
  },
};

// ─── ENGLISH CONTENT ───
const ENGLISH_CONTENT = {
  quiz: {
    early_learners: [
      { question: 'Which is a vowel?', options: ['B', 'A', 'C', 'D'], correctIndex: 1 },
      { question: 'What is the opposite of "big"?', options: ['Tall', 'Small', 'Wide', 'Long'], correctIndex: 1 },
      { question: 'Which word rhymes with "cat"?', options: ['Dog', 'Bat', 'Cup', 'Red'], correctIndex: 1 },
      { question: '"She ___ to school daily." Fill in:', options: ['go', 'goes', 'going', 'gone'], correctIndex: 1 },
      { question: 'Which is a fruit?', options: ['Chair', 'Apple', 'Book', 'Pen'], correctIndex: 1 },
      { question: 'What sound does a cow make?', options: ['Meow', 'Bark', 'Moo', 'Quack'], correctIndex: 2 },
      { question: 'How many vowels in English?', options: ['3', '4', '5', '6'], correctIndex: 2 },
      { question: 'Which letter comes after D?', options: ['C', 'E', 'F', 'B'], correctIndex: 1 },
      { question: '"The ___ is red." Choose:', options: ['cat', 'car', 'book', 'all of these'], correctIndex: 3 },
      { question: 'Which word starts with "S"?', options: ['Ball', 'Sun', 'Cat', 'Dog'], correctIndex: 1 },
      { question: 'What is the opposite of "hot"?', options: ['Warm', 'Cold', 'Cool', 'Nice'], correctIndex: 1 },
      { question: 'Which animal is a pet?', options: ['Lion', 'Dog', 'Tiger', 'Bear'], correctIndex: 1 },
      { question: 'Complete: A, B, C, __', options: ['E', 'D', 'F', 'G'], correctIndex: 1 },
      { question: 'Which is a color?', options: ['Run', 'Blue', 'Jump', 'Eat'], correctIndex: 1 },
    ],
    explorers: [
      { question: 'What is the plural of "child"?', options: ['Childs', 'Children', 'Childes', 'Child'], correctIndex: 1 },
      { question: 'Which is an adjective? "The tall boy ran fast"', options: ['boy', 'ran', 'tall', 'fast'], correctIndex: 2 },
      { question: 'What is a synonym for "happy"?', options: ['Sad', 'Angry', 'Joyful', 'Tired'], correctIndex: 2 },
      { question: '"I ___ already eaten." Fill in:', options: ['has', 'have', 'had', 'having'], correctIndex: 1 },
      { question: 'What is the past tense of "run"?', options: ['Runned', 'Ran', 'Running', 'Runs'], correctIndex: 1 },
      { question: 'Which is a pronoun?', options: ['Beautiful', 'She', 'Run', 'Quickly'], correctIndex: 1 },
      { question: 'What is an antonym of "brave"?', options: ['Bold', 'Cowardly', 'Strong', 'Fearless'], correctIndex: 1 },
      { question: '"The dog ___ loudly." Choose:', options: ['bark', 'barks', 'barking', 'barked'], correctIndex: 1 },
      { question: 'Which sentence is correct?', options: ['He go school', 'He goes to school', 'He going school', 'He goed school'], correctIndex: 1 },
      { question: 'What is a noun?', options: ['Run', 'Beautiful', 'Book', 'Quickly'], correctIndex: 2 },
      { question: 'What is the plural of "mouse"?', options: ['Mouses', 'Mice', 'Mousies', 'Mouse'], correctIndex: 1 },
      { question: 'Which is an adverb?', options: ['Fast', 'Quickly', 'Quick', 'Speed'], correctIndex: 1 },
      { question: 'What type of sentence ends with "?"', options: ['Statement', 'Exclamation', 'Question', 'Command'], correctIndex: 2 },
      { question: 'Choose the correct spelling:', options: ['Beautful', 'Beautiful', 'Beautifull', 'Beutiful'], correctIndex: 1 },
    ],
    thinkers: [
      { question: 'Which sentence is in passive voice?', options: ['He wrote a letter', 'A letter was written', 'He is writing', 'They write letters'], correctIndex: 1 },
      { question: 'What figure of speech: "The world is a stage"?', options: ['Simile', 'Metaphor', 'Hyperbole', 'Irony'], correctIndex: 1 },
      { question: 'Which is correct?', options: ['Their going home', "They're going home", 'There going home', 'Theyre going home'], correctIndex: 1 },
      { question: '"Despite" is a:', options: ['Noun', 'Verb', 'Preposition', 'Adverb'], correctIndex: 2 },
      { question: 'What is a dangling modifier?', options: ['A modifier without a subject', 'A type of verb', 'A noun phrase', 'A conjunction'], correctIndex: 0 },
      { question: '"As brave as a lion" is a:', options: ['Metaphor', 'Simile', 'Hyperbole', 'Personification'], correctIndex: 1 },
      { question: 'Which is in present perfect?', options: ['I eat', 'I ate', 'I have eaten', 'I was eating'], correctIndex: 2 },
      { question: 'An oxymoron is:', options: ['Contradictory terms together', 'Exaggeration', 'Comparison', 'Repetition'], correctIndex: 0 },
      { question: 'What is the subject in "The cat sat on the mat"?', options: ['mat', 'sat', 'cat', 'on'], correctIndex: 2 },
      { question: '"Neither...nor" is a:', options: ['Conjunction', 'Preposition', 'Adverb', 'Pronoun'], correctIndex: 0 },
      { question: 'Which is a compound sentence?', options: ['I ran fast.', 'I ran and she walked.', 'Running fast.', 'The fast runner.'], correctIndex: 1 },
      { question: 'What is alliteration?', options: ['Rhyming words', 'Same starting sound', 'Exaggeration', 'Comparison'], correctIndex: 1 },
      { question: 'Choose the correct form:', options: ['Who\'s book is this?', 'Whose book is this?', 'Whos book is this?', 'Who book is this?'], correctIndex: 1 },
      { question: 'An elegy is:', options: ['A comedy', 'A sad poem', 'A love letter', 'A speech'], correctIndex: 1 },
    ],
    advanced: [
      { question: 'Which is an example of an oxymoron?', options: ['Dark night', 'Deafening silence', 'Blue sky', 'Fast car'], correctIndex: 1 },
      { question: 'What narrative technique is "stream of consciousness"?', options: ['Third person', 'Interior monologue', 'Dialogue', 'Exposition'], correctIndex: 1 },
      { question: 'Which word means "to make worse"?', options: ['Ameliorate', 'Exacerbate', 'Mitigate', 'Alleviate'], correctIndex: 1 },
      { question: '"Not bad at all" is an example of:', options: ['Litotes', 'Hyperbole', 'Simile', 'Allusion'], correctIndex: 0 },
      { question: 'What is an unreliable narrator?', options: ['A narrator who lies or distorts', 'Third person view', 'Omniscient narrator', 'First person view'], correctIndex: 0 },
      { question: 'Which is a malapropism?', options: ['Using wrong similar word', 'Exaggeration', 'Understatement', 'Repetition'], correctIndex: 0 },
      { question: '"Shall I compare thee to a summer\'s day?" is:', options: ['Metaphor', 'Rhetorical question', 'Simile', 'Hyperbole'], correctIndex: 1 },
      { question: 'What is epistolary fiction?', options: ['Written in letters/documents', 'Poetry form', 'Drama script', 'News article'], correctIndex: 0 },
      { question: 'Which is an example of synecdoche?', options: ['All hands on deck', 'Dark night', 'Fast car', 'Blue ocean'], correctIndex: 0 },
      { question: 'What is enjambment in poetry?', options: ['Rhyme scheme', 'Line continuation without pause', 'Meter pattern', 'Stanza break'], correctIndex: 1 },
      { question: 'Who wrote "Pride and Prejudice"?', options: ['Charlotte Brontë', 'Jane Austen', 'Emily Dickinson', 'Virginia Woolf'], correctIndex: 1 },
      { question: 'What is dramatic irony?', options: ['Audience knows but characters don\'t', 'Characters exaggerate', 'Sarcasm', 'Pun'], correctIndex: 0 },
      { question: 'A soliloquy is:', options: ['A dialogue', 'Speaking thoughts aloud alone', 'A group discussion', 'A letter'], correctIndex: 1 },
      { question: 'What is a bildungsroman?', options: ['Coming-of-age novel', 'Romance novel', 'Mystery novel', 'Science fiction'], correctIndex: 0 },
    ],
  },
  pairs: {
    early_learners: [
      { a: 'A', b: 'Apple' }, { a: 'B', b: 'Ball' }, { a: 'C', b: 'Cat' },
      { a: 'D', b: 'Dog' }, { a: 'E', b: 'Egg' }, { a: 'F', b: 'Fish' },
      { a: 'G', b: 'Grape' }, { a: 'H', b: 'Hat' }, { a: 'I', b: 'Ice' },
      { a: 'J', b: 'Jug' }, { a: 'K', b: 'Kite' }, { a: 'L', b: 'Lion' },
    ],
    explorers: [
      { a: 'Happy', b: 'Sad' }, { a: 'Big', b: 'Small' }, { a: 'Fast', b: 'Slow' },
      { a: 'Hot', b: 'Cold' }, { a: 'Light', b: 'Dark' }, { a: 'Old', b: 'New' },
      { a: 'Tall', b: 'Short' }, { a: 'Rich', b: 'Poor' }, { a: 'Strong', b: 'Weak' },
      { a: 'Hard', b: 'Soft' }, { a: 'Brave', b: 'Cowardly' }, { a: 'Clean', b: 'Dirty' },
    ],
    thinkers: [
      { a: 'Metaphor', b: 'Direct comparison' }, { a: 'Simile', b: 'Like/as comparison' },
      { a: 'Alliteration', b: 'Same starting sound' }, { a: 'Onomatopoeia', b: 'Sound words' },
      { a: 'Hyperbole', b: 'Exaggeration' }, { a: 'Irony', b: 'Opposite meaning' },
      { a: 'Personification', b: 'Human traits to objects' }, { a: 'Oxymoron', b: 'Contradictory terms' },
      { a: 'Anaphora', b: 'Repetition at start' }, { a: 'Euphemism', b: 'Mild expression' },
      { a: 'Satire', b: 'Mocking criticism' }, { a: 'Paradox', b: 'Self-contradiction' },
    ],
    advanced: [
      { a: 'Protagonist', b: 'Main character' }, { a: 'Antagonist', b: 'Villain' },
      { a: 'Denouement', b: 'Resolution' }, { a: 'Soliloquy', b: 'Thinking aloud' },
      { a: 'Catharsis', b: 'Emotional release' }, { a: 'Allegory', b: 'Symbolic story' },
      { a: 'Epiphany', b: 'Sudden realization' }, { a: 'Motif', b: 'Recurring element' },
      { a: 'Foreshadowing', b: 'Hint of future' }, { a: 'Juxtaposition', b: 'Side by side contrast' },
      { a: 'Diction', b: 'Word choice' }, { a: 'Tone', b: 'Author\'s attitude' },
    ],
  },
  sort: {
    early_learners: [
      { rule: 'Vowel or Consonant?', leftLabel: 'Vowel', rightLabel: 'Consonant', leftItems: ['A','E','I','O','U'], rightItems: ['B','C','D','F','G','H'] },
      { rule: 'Animal or Thing?', leftLabel: 'Animal', rightLabel: 'Thing', leftItems: ['Dog','Cat','Bird','Fish','Cow'], rightItems: ['Chair','Book','Pen','Bag','Cup'] },
    ],
    explorers: [
      { rule: 'Noun or Verb?', leftLabel: 'Noun', rightLabel: 'Verb', leftItems: ['Book','Cat','House','River','School'], rightItems: ['Run','Jump','Eat','Swim','Read'] },
      { rule: 'Singular or Plural?', leftLabel: 'Singular', rightLabel: 'Plural', leftItems: ['Child','Mouse','Foot','Tooth','Man'], rightItems: ['Children','Mice','Feet','Teeth','Men'] },
    ],
    thinkers: [
      { rule: 'Adjective or Adverb?', leftLabel: 'Adjective', rightLabel: 'Adverb', leftItems: ['Beautiful','Tall','Brave','Clever','Shy'], rightItems: ['Quickly','Slowly','Happily','Loudly','Carefully'] },
      { rule: 'Simile or Metaphor?', leftLabel: 'Simile', rightLabel: 'Metaphor', leftItems: ['As brave as a lion','Like a star','Fast as wind','Sweet as honey'], rightItems: ['Life is a journey','Time is money','Heart of gold','Sea of troubles'] },
    ],
    advanced: [
      { rule: 'Active or Passive voice?', leftLabel: 'Active', rightLabel: 'Passive', leftItems: ['He wrote a book','She sings well','They built a house'], rightItems: ['A book was written','Songs are sung','The house was built'] },
      { rule: 'Fiction or Non-fiction?', leftLabel: 'Fiction', rightLabel: 'Non-fiction', leftItems: ['Harry Potter','Lord of Rings','Narnia','Hamlet'], rightItems: ['Autobiography','Encyclopedia','News article','Research paper'] },
    ],
  },
  words: {
    early_learners: [
      { word: 'APPLE', hint: 'A fruit' }, { word: 'HOUSE', hint: 'Where you live' },
      { word: 'HAPPY', hint: 'Feeling good' }, { word: 'SCHOOL', hint: 'Where you learn' },
      { word: 'BOOK', hint: 'You read it' }, { word: 'WATER', hint: 'You drink it' },
      { word: 'CAT', hint: 'Says meow' }, { word: 'DOG', hint: 'Says woof' },
      { word: 'SUN', hint: 'In the sky' }, { word: 'BIRD', hint: 'Can fly' },
      { word: 'FISH', hint: 'Lives in water' }, { word: 'TREE', hint: 'Has leaves' },
    ],
    explorers: [
      { word: 'ADVENTURE', hint: 'Exciting journey' }, { word: 'KNOWLEDGE', hint: 'What you learn' },
      { word: 'BEAUTIFUL', hint: 'Very pretty' }, { word: 'IMPORTANT', hint: 'Matters a lot' },
      { word: 'SENTENCE', hint: 'Group of words' }, { word: 'PARAGRAPH', hint: 'Group of sentences' },
      { word: 'GRAMMAR', hint: 'Language rules' }, { word: 'SPELLING', hint: 'Letter order' },
      { word: 'ALPHABET', hint: 'A to Z' }, { word: 'READING', hint: 'Looking at words' },
      { word: 'WRITING', hint: 'Putting words down' }, { word: 'LANGUAGE', hint: 'Way to communicate' },
    ],
    thinkers: [
      { word: 'ONOMATOPOEIA', hint: 'Sound words' }, { word: 'ALLITERATION', hint: 'Same letter start' },
      { word: 'PERSONIFICATION', hint: 'Human traits to objects' }, { word: 'JUXTAPOSITION', hint: 'Side by side contrast' },
      { word: 'METAPHOR', hint: 'Direct comparison' }, { word: 'HYPERBOLE', hint: 'Exaggeration' },
      { word: 'SYNONYM', hint: 'Same meaning' }, { word: 'ANTONYM', hint: 'Opposite meaning' },
      { word: 'CONJUNCTION', hint: 'Joining word' }, { word: 'PREPOSITION', hint: 'Position word' },
      { word: 'PRONOUN', hint: 'Replaces a noun' }, { word: 'ADJECTIVE', hint: 'Describes a noun' },
    ],
    advanced: [
      { word: 'SESQUIPEDALIAN', hint: 'Long words' }, { word: 'VERISIMILITUDE', hint: 'Appearance of truth' },
      { word: 'EPISTEMOLOGY', hint: 'Study of knowledge' }, { word: 'QUINTESSENTIAL', hint: 'Perfect example' },
      { word: 'SOLILOQUY', hint: 'Thinking aloud' }, { word: 'DENOUEMENT', hint: 'Story resolution' },
      { word: 'PROTAGONIST', hint: 'Main character' }, { word: 'ANTAGONIST', hint: 'The villain' },
      { word: 'FORESHADOWING', hint: 'Hint of future' }, { word: 'BILDUNGSROMAN', hint: 'Coming-of-age story' },
      { word: 'EUPHEMISM', hint: 'Mild expression' }, { word: 'CATHARSIS', hint: 'Emotional release' },
    ],
  },
  speedTap: {
    early_learners: [
      { instruction: 'Tap only VOWELS!', targets: ['A','E','I','O','U'], distractors: ['B','C','D','F','G','H','K','L','M','N'] },
      { instruction: 'Tap only ANIMALS!', targets: ['Cat','Dog','Bird','Fish','Cow'], distractors: ['Book','Chair','Pen','Bag','Cup','Table'] },
    ],
    explorers: [
      { instruction: 'Tap only NOUNS!', targets: ['Book','Cat','House','River','Sun','School'], distractors: ['Run','Big','Slowly','Jump','Happy','Quickly'] },
      { instruction: 'Tap only VERBS!', targets: ['Run','Jump','Eat','Swim','Read','Write'], distractors: ['Book','Cat','Big','Happy','Slow','House'] },
    ],
    thinkers: [
      { instruction: 'Tap only CONJUNCTIONS!', targets: ['And','But','Or','Yet','So','Because'], distractors: ['The','Happy','Run','Big','House','Slowly'] },
      { instruction: 'Tap only ADJECTIVES!', targets: ['Beautiful','Tall','Brave','Quick','Smart','Gentle'], distractors: ['Run','Jump','Book','Table','And','Quickly'] },
    ],
    advanced: [
      { instruction: 'Tap only ABSTRACT NOUNS!', targets: ['Freedom','Justice','Love','Wisdom','Courage','Hope'], distractors: ['Table','Book','Dog','River','Mountain','Chair'] },
      { instruction: 'Tap only LITERARY DEVICES!', targets: ['Metaphor','Simile','Irony','Satire','Allegory'], distractors: ['Noun','Verb','Subject','Object','Predicate','Clause'] },
    ],
  },
  visualMemory: {
    early_learners: [
      { items: ['🍎A','🐱C','🏠H','🌟S'], questions: [{ question: 'Which letter was with the cat?', options: ['A','C','H','S'], correctIndex: 1 }, { question: 'What was with letter H?', options: ['Apple','Cat','House','Star'], correctIndex: 2 }] },
      { items: ['B-Ball','D-Dog','F-Fish','G-Grape'], questions: [{ question: 'Which letter was for Dog?', options: ['B','D','F','G'], correctIndex: 1 }, { question: 'What started with F?', options: ['Ball','Dog','Fish','Grape'], correctIndex: 2 }] },
      { items: ['Red-🔴','Blue-🔵','Green-🟢','Yellow-🟡'], questions: [{ question: 'Which color was shown first?', options: ['Blue','Green','Red','Yellow'], correctIndex: 2 }, { question: 'Was Purple shown?', options: ['Yes','No'], correctIndex: 1 }] },
    ],
    explorers: [
      { items: ['Noun: Dog','Verb: Run','Adj: Tall','Adv: Quickly'], questions: [{ question: 'What type of word was "Tall"?', options: ['Noun','Verb','Adjective','Adverb'], correctIndex: 2 }, { question: 'Which was the adverb?', options: ['Dog','Run','Tall','Quickly'], correctIndex: 3 }] },
      { items: ['Past: Ate','Present: Eat','Future: Will eat','Continuous: Eating'], questions: [{ question: 'Which was past tense?', options: ['Eat','Ate','Will eat','Eating'], correctIndex: 1 }, { question: 'Which was future?', options: ['Ate','Eat','Will eat','Eating'], correctIndex: 2 }] },
      { items: ['Singular: Child','Plural: Children','Singular: Mouse','Plural: Mice'], questions: [{ question: 'What is plural of Child?', options: ['Childs','Children','Childes','Childer'], correctIndex: 1 }, { question: 'What is plural of Mouse?', options: ['Mouses','Mousies','Mice','Meece'], correctIndex: 2 }] },
    ],
    thinkers: [
      { items: ['Simile: as brave as a lion','Metaphor: time is money','Irony: clear as mud','Hyperbole: a million times'], questions: [{ question: 'Which was the metaphor?', options: ['as brave as a lion','time is money','clear as mud','a million times'], correctIndex: 1 }] },
      { items: ['Subject: Cat','Verb: Sat','Object: Mat','Preposition: On'], questions: [{ question: 'What was the subject?', options: ['Sat','Cat','Mat','On'], correctIndex: 1 }, { question: 'What was the preposition?', options: ['Cat','Sat','Mat','On'], correctIndex: 3 }] },
      { items: ['Active: He wrote','Passive: Was written','Active: She sings','Passive: Is sung'], questions: [{ question: 'Which was passive?', options: ['He wrote','Was written','She sings','None'], correctIndex: 1 }, { question: 'How many active voice examples?', options: ['1','2','3','4'], correctIndex: 1 }] },
    ],
    advanced: [
      { items: ['Hamlet: To be or not','Gatsby: green light','1984: Big Brother','Mockingbird: innocence'], questions: [{ question: 'Which novel had "Big Brother"?', options: ['Hamlet','Gatsby','1984','Mockingbird'], correctIndex: 2 }] },
      { items: ['Sonnet: 14 lines','Haiku: 5-7-5','Limerick: 5 lines','Ode: Lyric poem'], questions: [{ question: 'How many lines in a sonnet?', options: ['10','12','14','16'], correctIndex: 2 }, { question: 'What is a haiku pattern?', options: ['3-5-3','5-7-5','7-5-7','4-6-4'], correctIndex: 1 }] },
      { items: ['Tragedy: Downfall','Comedy: Happy end','Satire: Mockery','Epic: Grand tale'], questions: [{ question: 'Which genre mocks?', options: ['Tragedy','Comedy','Satire','Epic'], correctIndex: 2 }, { question: 'Which has a happy ending?', options: ['Tragedy','Comedy','Satire','Epic'], correctIndex: 1 }] },
    ],
  },
};

// ─── HINDI CONTENT ───
const HINDI_CONTENT = {
  quiz: {
    early_learners: [
      { question: '"क" से क्या बनता है?', options: ['कमल', 'गमला', 'चम्मच', 'टमाटर'], correctIndex: 0 },
      { question: '"अ" कौन सा अक्षर है?', options: ['व्यंजन', 'स्वर', 'मात्रा', 'संख्या'], correctIndex: 1 },
      { question: 'हिंदी में कितने स्वर होते हैं?', options: ['10', '11', '12', '13'], correctIndex: 1 },
      { question: '"ख" से शुरू होने वाला शब्द कौन सा है?', options: ['कमल', 'खरगोश', 'गमला', 'चम्मच'], correctIndex: 1 },
      { question: '"ग" से शुरू होने वाला शब्द?', options: ['गाय', 'काम', 'चाय', 'माम'], correctIndex: 0 },
      { question: '"माँ" शब्द में कितने अक्षर हैं?', options: ['1', '2', '3', '4'], correctIndex: 1 },
      { question: 'इनमें से फल कौन सा है?', options: ['कुर्सी', 'आम', 'किताब', 'पेन'], correctIndex: 1 },
      { question: '"बिल्ली" किसे कहते हैं?', options: ['Dog', 'Cat', 'Bird', 'Fish'], correctIndex: 1 },
      { question: '"नमस्ते" का अर्थ क्या है?', options: ['Goodbye', 'Hello', 'Sorry', 'Thanks'], correctIndex: 1 },
      { question: '"पानी" को English में क्या कहते हैं?', options: ['Fire', 'Water', 'Air', 'Food'], correctIndex: 1 },
      { question: '"सूरज" क्या करता है?', options: ['बारिश', 'रोशनी', 'हवा', 'ठंडक'], correctIndex: 1 },
      { question: '"च" से शुरू होने वाला शब्द?', options: ['चिड़िया', 'किताब', 'गमला', 'टमाटर'], correctIndex: 0 },
      { question: '"एक" के बाद क्या आता है?', options: ['तीन', 'दो', 'चार', 'पाँच'], correctIndex: 1 },
      { question: '"लाल" कौन सा रंग है?', options: ['Blue', 'Green', 'Red', 'Yellow'], correctIndex: 2 },
    ],
    explorers: [
      { question: '"संज्ञा" किसे कहते हैं?', options: ['क्रिया', 'नाम', 'विशेषण', 'सर्वनाम'], correctIndex: 1 },
      { question: '"दौड़ना" कौन सा शब्द भेद है?', options: ['संज्ञा', 'क्रिया', 'विशेषण', 'सर्वनाम'], correctIndex: 1 },
      { question: '"सुंदर" कौन सा शब्द भेद है?', options: ['संज्ञा', 'क्रिया', 'विशेषण', 'क्रिया विशेषण'], correctIndex: 2 },
      { question: '"वह" कौन सा शब्द भेद है?', options: ['संज्ञा', 'सर्वनाम', 'क्रिया', 'विशेषण'], correctIndex: 1 },
      { question: '"बड़ा" का विलोम शब्द?', options: ['लंबा', 'छोटा', 'ऊँचा', 'मोटा'], correctIndex: 1 },
      { question: '"सुख" का विलोम शब्द?', options: ['खुशी', 'दुख', 'आनंद', 'प्रसन्न'], correctIndex: 1 },
      { question: '"पुस्तक" का पर्यायवाची?', options: ['कलम', 'किताब', 'कागज़', 'पत्र'], correctIndex: 1 },
      { question: '"जल" का पर्यायवाची?', options: ['अग्नि', 'पानी', 'वायु', 'पृथ्वी'], correctIndex: 1 },
      { question: 'वचन बदलो: "लड़का"', options: ['लड़की', 'लड़के', 'लड़कों', 'लड़कियाँ'], correctIndex: 1 },
      { question: 'लिंग बदलो: "राजा"', options: ['रानी', 'राज', 'राजकुमार', 'महाराज'], correctIndex: 0 },
      { question: '"धीरे-धीरे" कौन सा शब्द भेद है?', options: ['संज्ञा', 'क्रिया', 'विशेषण', 'क्रिया विशेषण'], correctIndex: 3 },
      { question: '"अनार" में कितने अक्षर हैं?', options: ['2', '3', '4', '5'], correctIndex: 1 },
      { question: '"गाय" कौन सी संज्ञा है?', options: ['व्यक्तिवाचक', 'जातिवाचक', 'भाववाचक', 'समूहवाचक'], correctIndex: 1 },
      { question: '"राम" कौन सी संज्ञा है?', options: ['व्यक्तिवाचक', 'जातिवाचक', 'भाववाचक', 'समूहवाचक'], correctIndex: 0 },
    ],
    thinkers: [
      { question: '"उपसर्ग" किसे कहते हैं?', options: ['शब्द के अंत में जुड़ने वाला', 'शब्द के आरम्भ में जुड़ने वाला', 'मूल शब्द', 'वाक्य'], correctIndex: 1 },
      { question: '"प्रत्यय" शब्द के किस भाग में लगता है?', options: ['आरम्भ', 'मध्य', 'अंत', 'कहीं भी'], correctIndex: 2 },
      { question: '"अनुप्रास अलंकार" में क्या होता है?', options: ['अर्थ की तुलना', 'वर्णों की आवृत्ति', 'अतिशयोक्ति', 'विरोध'], correctIndex: 1 },
      { question: '"उपमा अलंकार" में क्या होता है?', options: ['तुलना', 'अतिशयोक्ति', 'व्यंग्य', 'वर्ण आवृत्ति'], correctIndex: 0 },
      { question: '"रूपक अलंकार" में?', options: ['उपमा और उपमेय एक', 'तुलना', 'अतिशयोक्ति', 'विरोधाभास'], correctIndex: 0 },
      { question: '"समास" का अर्थ?', options: ['शब्दों का विस्तार', 'शब्दों का संक्षेप', 'शब्दों का अर्थ', 'शब्दों की गिनती'], correctIndex: 1 },
      { question: '"द्वंद्व समास" का उदाहरण?', options: ['राजपुत्र', 'माता-पिता', 'चतुर्भुज', 'नीलकमल'], correctIndex: 1 },
      { question: '"मुहावरा" क्या है?', options: ['लोकोक्ति', 'विशेष अर्थ वाला वाक्यांश', 'कविता', 'कहानी'], correctIndex: 1 },
      { question: '"आँखें खुलना" मुहावरे का अर्थ?', options: ['नींद से जागना', 'सच्चाई समझ आना', 'रोना', 'देखना'], correctIndex: 1 },
      { question: '"नाक कटना" मुहावरे का अर्थ?', options: ['चोट लगना', 'बेइज़्ज़ती होना', 'ठंड लगना', 'छींकना'], correctIndex: 1 },
      { question: '"संधि" किसे कहते हैं?', options: ['शब्दों का मेल', 'वर्णों का मेल', 'वाक्यों का मेल', 'अर्थों का मेल'], correctIndex: 1 },
      { question: '"विद्यालय" में कौन सी संधि है?', options: ['स्वर संधि', 'व्यंजन संधि', 'विसर्ग संधि', 'कोई नहीं'], correctIndex: 0 },
      { question: '"कर्मधारय समास" का उदाहरण?', options: ['नीलकमल', 'राजा-रानी', 'त्रिभुज', 'यथाशक्ति'], correctIndex: 0 },
      { question: 'काल के कितने भेद हैं?', options: ['2', '3', '4', '5'], correctIndex: 1 },
    ],
    advanced: [
      { question: '"छायावाद" के प्रमुख कवि?', options: ['तुलसीदास', 'जयशंकर प्रसाद', 'कबीर', 'रहीम'], correctIndex: 1 },
      { question: '"गोदान" किसकी रचना है?', options: ['प्रेमचंद', 'जयशंकर प्रसाद', 'महादेवी वर्मा', 'सूर्यकांत'], correctIndex: 0 },
      { question: '"रामचरितमानस" के रचयिता?', options: ['कबीर', 'सूरदास', 'तुलसीदास', 'रहीम'], correctIndex: 2 },
      { question: '"दोहा" छंद में कितनी मात्राएँ?', options: ['11-13', '13-11', '16-12', '12-16'], correctIndex: 1 },
      { question: '"चौपाई" में कितनी मात्राएँ?', options: ['16', '24', '28', '32'], correctIndex: 0 },
      { question: '"सूरसागर" के रचयिता?', options: ['तुलसीदास', 'सूरदास', 'कबीर', 'मीराबाई'], correctIndex: 1 },
      { question: '"भक्तिकाल" का समय?', options: ['1000-1300', '1375-1700', '1700-1900', '1900-2000'], correctIndex: 1 },
      { question: '"रीतिकाल" को अन्य नाम?', options: ['आदिकाल', 'भक्तिकाल', 'श्रृंगारकाल', 'आधुनिककाल'], correctIndex: 2 },
      { question: '"कबीर" किस काल के कवि?', options: ['आदिकाल', 'भक्तिकाल', 'रीतिकाल', 'आधुनिककाल'], correctIndex: 1 },
      { question: '"अतिशयोक्ति अलंकार" में?', options: ['बढ़ा-चढ़ाकर कहना', 'तुलना करना', 'वर्ण दोहराना', 'विरोध दिखाना'], correctIndex: 0 },
      { question: '"विलोम" का अर्थ?', options: ['समान अर्थ', 'विपरीत अर्थ', 'अनेक अर्थ', 'कोई अर्थ नहीं'], correctIndex: 1 },
      { question: '"तत्सम" शब्द किसे कहते हैं?', options: ['संस्कृत से आए शब्द', 'अरबी शब्द', 'अंग्रेजी शब्द', 'देशी शब्द'], correctIndex: 0 },
      { question: '"तद्भव" शब्द?', options: ['संस्कृत जैसे', 'बदले हुए संस्कृत शब्द', 'विदेशी शब्द', 'नए शब्द'], correctIndex: 1 },
      { question: '"मीराबाई" किसकी भक्त थीं?', options: ['राम', 'कृष्ण', 'शिव', 'हनुमान'], correctIndex: 1 },
    ],
  },
  pairs: {
    early_learners: [
      { a: 'क', b: 'कमल' }, { a: 'ख', b: 'खरगोश' }, { a: 'ग', b: 'गाय' },
      { a: 'घ', b: 'घर' }, { a: 'च', b: 'चिड़िया' }, { a: 'छ', b: 'छाता' },
      { a: 'ज', b: 'जहाज़' }, { a: 'झ', b: 'झंडा' }, { a: 'ट', b: 'टमाटर' },
      { a: 'थ', b: 'थाली' }, { a: 'द', b: 'दवात' }, { a: 'प', b: 'पतंग' },
    ],
    explorers: [
      { a: 'बड़ा', b: 'छोटा' }, { a: 'सुख', b: 'दुख' }, { a: 'दिन', b: 'रात' },
      { a: 'गर्म', b: 'ठंडा' }, { a: 'ऊपर', b: 'नीचे' }, { a: 'अंदर', b: 'बाहर' },
      { a: 'आना', b: 'जाना' }, { a: 'हँसना', b: 'रोना' }, { a: 'सच', b: 'झूठ' },
      { a: 'अमीर', b: 'गरीब' }, { a: 'कठिन', b: 'सरल' }, { a: 'पुराना', b: 'नया' },
    ],
    thinkers: [
      { a: 'उपमा', b: 'तुलना' }, { a: 'रूपक', b: 'अभेद' }, { a: 'अनुप्रास', b: 'वर्ण आवृत्ति' },
      { a: 'श्लेष', b: 'अनेक अर्थ' }, { a: 'यमक', b: 'शब्द आवृत्ति' }, { a: 'उत्प्रेक्षा', b: 'संभावना' },
      { a: 'संज्ञा', b: 'नाम' }, { a: 'सर्वनाम', b: 'संज्ञा के बदले' }, { a: 'क्रिया', b: 'काम' },
      { a: 'विशेषण', b: 'गुण बताना' }, { a: 'अव्यय', b: 'न बदलने वाला' }, { a: 'समास', b: 'संक्षेप' },
    ],
    advanced: [
      { a: 'प्रेमचंद', b: 'गोदान' }, { a: 'तुलसीदास', b: 'रामचरितमानस' }, { a: 'सूरदास', b: 'सूरसागर' },
      { a: 'कबीर', b: 'बीजक' }, { a: 'जयशंकर प्रसाद', b: 'कामायनी' }, { a: 'महादेवी वर्मा', b: 'यामा' },
      { a: 'मीराबाई', b: 'पदावली' }, { a: 'रहीम', b: 'रहीम दोहावली' }, { a: 'बिहारी', b: 'बिहारी सतसई' },
      { a: 'निराला', b: 'परिमल' }, { a: 'पंत', b: 'पल्लव' }, { a: 'दिनकर', b: 'रश्मिरथी' },
    ],
  },
  sort: {
    early_learners: [
      { rule: 'स्वर या व्यंजन?', leftLabel: 'स्वर', rightLabel: 'व्यंजन', leftItems: ['अ','आ','इ','ई','उ'], rightItems: ['क','ख','ग','घ','च'] },
      { rule: 'फल या सब्ज़ी?', leftLabel: 'फल', rightLabel: 'सब्ज़ी', leftItems: ['आम','सेब','केला','अंगूर','संतरा'], rightItems: ['आलू','प्याज़','गाजर','मटर','गोभी'] },
    ],
    explorers: [
      { rule: 'संज्ञा या क्रिया?', leftLabel: 'संज्ञा', rightLabel: 'क्रिया', leftItems: ['किताब','गाय','फूल','नदी','पहाड़'], rightItems: ['दौड़ना','खाना','पीना','सोना','लिखना'] },
      { rule: 'एकवचन या बहुवचन?', leftLabel: 'एकवचन', rightLabel: 'बहुवचन', leftItems: ['लड़का','लड़की','किताब','गाय','पत्ता'], rightItems: ['लड़के','लड़कियाँ','किताबें','गायें','पत्ते'] },
    ],
    thinkers: [
      { rule: 'तत्सम या तद्भव?', leftLabel: 'तत्सम', rightLabel: 'तद्भव', leftItems: ['अग्नि','क्षेत्र','दुग्ध','वत्स','गृह'], rightItems: ['आग','खेत','दूध','बच्चा','घर'] },
      { rule: 'विशेषण या क्रिया विशेषण?', leftLabel: 'विशेषण', rightLabel: 'क्रिया विशेषण', leftItems: ['सुंदर','बड़ा','लंबा','मोटा','अच्छा'], rightItems: ['धीरे','जल्दी','यहाँ','वहाँ','अभी'] },
    ],
    advanced: [
      { rule: 'भक्तिकाल या आधुनिककाल?', leftLabel: 'भक्तिकाल', rightLabel: 'आधुनिककाल', leftItems: ['तुलसीदास','सूरदास','कबीर','मीराबाई'], rightItems: ['प्रेमचंद','निराला','महादेवी वर्मा','दिनकर'] },
      { rule: 'स्वर संधि या व्यंजन संधि?', leftLabel: 'स्वर संधि', rightLabel: 'व्यंजन संधि', leftItems: ['विद्यालय','देवालय','सूर्योदय','महोत्सव'], rightItems: ['जगन्नाथ','उत्कर्ष','सत्याग्रह','अन्नपूर्णा'] },
    ],
  },
  words: {
    early_learners: [
      { word: 'कमल', hint: 'एक फूल' }, { word: 'गाय', hint: 'दूध देती है' },
      { word: 'पानी', hint: 'पीने के लिए' }, { word: 'फूल', hint: 'बगीचे में' },
      { word: 'पेड़', hint: 'छाया देता है' }, { word: 'चाँद', hint: 'रात में दिखता है' },
      { word: 'तारा', hint: 'आसमान में चमकता है' }, { word: 'मछली', hint: 'पानी में रहती है' },
      { word: 'बादल', hint: 'आसमान में' }, { word: 'हवा', hint: 'चलती रहती है' },
      { word: 'सूरज', hint: 'रोशनी देता है' }, { word: 'घर', hint: 'रहने की जगह' },
    ],
    explorers: [
      { word: 'विद्यालय', hint: 'पढ़ने की जगह' }, { word: 'पुस्तक', hint: 'पढ़ने के लिए' },
      { word: 'परिवार', hint: 'माता-पिता-बच्चे' }, { word: 'बगीचा', hint: 'फूलों की जगह' },
      { word: 'किसान', hint: 'खेती करता है' }, { word: 'अध्यापक', hint: 'पढ़ाता है' },
      { word: 'भारत', hint: 'हमारा देश' }, { word: 'नदी', hint: 'बहता पानी' },
      { word: 'पहाड़', hint: 'ऊँचा स्थान' }, { word: 'समुद्र', hint: 'खारा पानी' },
      { word: 'जंगल', hint: 'पेड़ों की जगह' }, { word: 'गाँव', hint: 'छोटी बस्ती' },
    ],
    thinkers: [
      { word: 'अनुप्रास', hint: 'अलंकार प्रकार' }, { word: 'उपमा', hint: 'तुलना अलंकार' },
      { word: 'समास', hint: 'शब्द संक्षेप' }, { word: 'संधि', hint: 'वर्ण मेल' },
      { word: 'मुहावरा', hint: 'विशेष अर्थ' }, { word: 'लोकोक्ति', hint: 'कहावत' },
      { word: 'विशेषण', hint: 'गुण बताने वाला' }, { word: 'सर्वनाम', hint: 'नाम के बदले' },
      { word: 'उपसर्ग', hint: 'शब्द के आगे' }, { word: 'प्रत्यय', hint: 'शब्द के पीछे' },
      { word: 'वाक्य', hint: 'शब्दों का समूह' }, { word: 'पर्यायवाची', hint: 'समान अर्थ' },
    ],
    advanced: [
      { word: 'रामचरितमानस', hint: 'तुलसीदास की रचना' }, { word: 'छायावाद', hint: 'काव्य आंदोलन' },
      { word: 'प्रगतिवाद', hint: 'साहित्यिक आंदोलन' }, { word: 'प्रयोगवाद', hint: 'नई कविता' },
      { word: 'अतिशयोक्ति', hint: 'बढ़ा-चढ़ाकर कहना' }, { word: 'विरोधाभास', hint: 'विरोध दिखाना' },
      { word: 'श्रृंगार', hint: 'प्रेम रस' }, { word: 'करुण', hint: 'दुःख रस' },
      { word: 'वीर', hint: 'शौर्य रस' }, { word: 'हास्य', hint: 'हँसी रस' },
      { word: 'भयानक', hint: 'भय रस' }, { word: 'रौद्र', hint: 'क्रोध रस' },
    ],
  },
  speedTap: {
    early_learners: [
      { instruction: 'केवल स्वर (vowels) को टैप करो!', targets: ['अ','आ','इ','ई','उ','ऊ'], distractors: ['क','ख','ग','घ','च','छ','ज','झ'] },
      { instruction: 'केवल फलों को टैप करो!', targets: ['आम','सेब','केला','अंगूर','संतरा'], distractors: ['आलू','प्याज़','गाजर','गोभी','मटर'] },
    ],
    explorers: [
      { instruction: 'केवल संज्ञा शब्दों को टैप करो!', targets: ['किताब','गाय','फूल','नदी','पहाड़','घर'], distractors: ['दौड़ना','खाना','सुंदर','बड़ा','धीरे','जल्दी'] },
      { instruction: 'केवल क्रिया शब्दों को टैप करो!', targets: ['दौड़ना','खाना','पीना','लिखना','सोना','पढ़ना'], distractors: ['किताब','फूल','सुंदर','बड़ा','घर','नदी'] },
    ],
    thinkers: [
      { instruction: 'केवल विलोम शब्द जोड़ी के पहले शब्द को टैप करो!', targets: ['बड़ा','सुख','दिन','गर्म','ऊपर','अंदर'], distractors: ['छोटा','दुख','रात','ठंडा','नीचे','बाहर'] },
      { instruction: 'केवल तत्सम शब्दों को टैप करो!', targets: ['अग्नि','क्षेत्र','दुग्ध','नयन','गृह','वत्स'], distractors: ['आग','खेत','दूध','आँख','घर','बच्चा'] },
    ],
    advanced: [
      { instruction: 'केवल भक्तिकालीन कवियों को टैप करो!', targets: ['तुलसीदास','सूरदास','कबीर','मीराबाई','रहीम'], distractors: ['प्रेमचंद','निराला','दिनकर','महादेवी','पंत','प्रसाद'] },
      { instruction: 'केवल रस के नाम टैप करो!', targets: ['श्रृंगार','करुण','वीर','हास्य','रौद्र','भयानक','अद्भुत'], distractors: ['उपमा','रूपक','अनुप्रास','श्लेष','यमक','संधि'] },
    ],
  },
  visualMemory: {
    early_learners: [
      { items: ['क-कमल','ख-खरगोश','ग-गाय','घ-घर'], questions: [{ question: '"ख" से क्या था?', options: ['कमल','खरगोश','गाय','घर'], correctIndex: 1 }, { question: 'कितने अक्षर दिखाए गए?', options: ['2','3','4','5'], correctIndex: 2 }] },
      { items: ['🍎सेब','🍌केला','🍇अंगूर','🥭आम'], questions: [{ question: 'कौन सा फल दिखाया गया?', options: ['संतरा','सेब','पपीता','अनार'], correctIndex: 1 }, { question: 'कितने फल थे?', options: ['2','3','4','5'], correctIndex: 2 }] },
      { items: ['लाल🔴','नीला🔵','हरा🟢','पीला🟡'], questions: [{ question: 'पहला रंग कौन सा था?', options: ['नीला','हरा','लाल','पीला'], correctIndex: 2 }, { question: 'क्या बैंगनी दिखाया गया?', options: ['हाँ','नहीं'], correctIndex: 1 }] },
    ],
    explorers: [
      { items: ['संज्ञा: किताब','क्रिया: दौड़ना','विशेषण: सुंदर','सर्वनाम: वह'], questions: [{ question: '"सुंदर" कौन सा शब्द भेद?', options: ['संज्ञा','क्रिया','विशेषण','सर्वनाम'], correctIndex: 2 }, { question: 'क्रिया कौन सी थी?', options: ['किताब','दौड़ना','सुंदर','वह'], correctIndex: 1 }] },
      { items: ['बड़ा↔छोटा','सुख↔दुख','दिन↔रात','गर्म↔ठंडा'], questions: [{ question: '"सुख" का विलोम?', options: ['बड़ा','दुख','रात','ठंडा'], correctIndex: 1 }, { question: '"गर्म" का विलोम?', options: ['छोटा','दुख','रात','ठंडा'], correctIndex: 3 }] },
      { items: ['एकवचन: लड़का','बहुवचन: लड़के','एकवचन: किताब','बहुवचन: किताबें'], questions: [{ question: '"लड़का" का बहुवचन?', options: ['लड़की','लड़के','लड़कियाँ','लड़कों'], correctIndex: 1 }, { question: '"किताब" का बहुवचन?', options: ['किताबें','किताबों','किताबी','किताब'], correctIndex: 0 }] },
    ],
    thinkers: [
      { items: ['उपमा: जैसे/सा','रूपक: अभेद','अनुप्रास: वर्ण आवृत्ति','यमक: शब्द आवृत्ति'], questions: [{ question: 'वर्ण आवृत्ति किस अलंकार में?', options: ['उपमा','रूपक','अनुप्रास','यमक'], correctIndex: 2 }, { question: 'अभेद किस अलंकार में?', options: ['उपमा','रूपक','अनुप्रास','यमक'], correctIndex: 1 }] },
      { items: ['द्वंद्व: माता-पिता','तत्पुरुष: राजपुत्र','कर्मधारय: नीलकमल','अव्ययीभाव: प्रतिदिन'], questions: [{ question: '"नीलकमल" किस समास का उदाहरण?', options: ['द्वंद्व','तत्पुरुष','कर्मधारय','अव्ययीभाव'], correctIndex: 2 }, { question: '"माता-पिता" किस समास में?', options: ['द्वंद्व','तत्पुरुष','कर्मधारय','अव्ययीभाव'], correctIndex: 0 }] },
    ],
    advanced: [
      { items: ['प्रेमचंद: गोदान','तुलसीदास: रामचरितमानस','कबीर: बीजक','सूरदास: सूरसागर'], questions: [{ question: '"गोदान" किसकी रचना?', options: ['तुलसीदास','कबीर','प्रेमचंद','सूरदास'], correctIndex: 2 }, { question: '"बीजक" किसकी रचना?', options: ['प्रेमचंद','तुलसीदास','कबीर','सूरदास'], correctIndex: 2 }] },
      { items: ['श्रृंगार-प्रेम','करुण-दुख','वीर-शौर्य','हास्य-हँसी'], questions: [{ question: '"शौर्य" किस रस से जुड़ा?', options: ['श्रृंगार','करुण','वीर','हास्य'], correctIndex: 2 }, { question: '"दुख" किस रस से?', options: ['श्रृंगार','करुण','वीर','हास्य'], correctIndex: 1 }] },
      { items: ['भक्तिकाल: 1375-1700','रीतिकाल: 1700-1900','आधुनिक: 1900+','आदिकाल: 1000-1375'], questions: [{ question: 'भक्तिकाल कब?', options: ['1000-1375','1375-1700','1700-1900','1900+'], correctIndex: 1 }, { question: 'रीतिकाल कब?', options: ['1000-1375','1375-1700','1700-1900','1900+'], correctIndex: 2 }] },
    ],
  },
};

// ─── GENERAL CONTENT (for all other subjects) ───
const GENERAL_CONTENT = {
  quiz: {
    early_learners: [
      { question: 'What color is a banana?', options: ['Red', 'Yellow', 'Blue', 'Green'], correctIndex: 1 },
      { question: 'How many fingers on one hand?', options: ['3', '4', '5', '6'], correctIndex: 2 },
      { question: 'Which is bigger: elephant or ant?', options: ['Ant', 'Elephant', 'Same', 'Neither'], correctIndex: 1 },
      { question: 'What do we use to see?', options: ['Ears', 'Eyes', 'Nose', 'Mouth'], correctIndex: 1 },
      { question: 'What color is grass?', options: ['Red', 'Blue', 'Green', 'Yellow'], correctIndex: 2 },
      { question: 'How many ears do you have?', options: ['1', '2', '3', '4'], correctIndex: 1 },
      { question: 'What do birds do?', options: ['Swim', 'Fly', 'Dig', 'Sleep'], correctIndex: 1 },
      { question: 'What shape is a clock?', options: ['Square', 'Triangle', 'Circle', 'Star'], correctIndex: 2 },
      { question: 'Which meal do we eat in the morning?', options: ['Lunch', 'Dinner', 'Breakfast', 'Snack'], correctIndex: 2 },
      { question: 'How many wheels does a bicycle have?', options: ['1', '2', '3', '4'], correctIndex: 1 },
      { question: 'What do we drink?', options: ['Stones', 'Water', 'Sand', 'Wood'], correctIndex: 1 },
      { question: 'Which is a day of the week?', options: ['January', 'Monday', 'Summer', 'Morning'], correctIndex: 1 },
      { question: 'What comes after Sunday?', options: ['Saturday', 'Monday', 'Friday', 'Tuesday'], correctIndex: 1 },
      { question: 'How many months in a year?', options: ['10', '11', '12', '13'], correctIndex: 2 },
    ],
    explorers: [
      { question: 'Which continent is India in?', options: ['Africa', 'Europe', 'Asia', 'America'], correctIndex: 2 },
      { question: 'Who painted the Mona Lisa?', options: ['Picasso', 'Da Vinci', 'Van Gogh', 'Monet'], correctIndex: 1 },
      { question: 'What is the capital of India?', options: ['Mumbai', 'Delhi', 'Kolkata', 'Chennai'], correctIndex: 1 },
      { question: 'How many days in a leap year?', options: ['364', '365', '366', '367'], correctIndex: 2 },
      { question: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], correctIndex: 2 },
      { question: 'What is the national bird of India?', options: ['Parrot', 'Peacock', 'Sparrow', 'Eagle'], correctIndex: 1 },
      { question: 'How many continents are there?', options: ['5', '6', '7', '8'], correctIndex: 2 },
      { question: 'Which is the largest desert?', options: ['Sahara', 'Gobi', 'Thar', 'Antarctic'], correctIndex: 0 },
      { question: 'What is the capital of Japan?', options: ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'], correctIndex: 2 },
      { question: 'Which planet is called the Blue Planet?', options: ['Mars', 'Venus', 'Earth', 'Neptune'], correctIndex: 2 },
      { question: 'What is the national animal of India?', options: ['Lion', 'Tiger', 'Elephant', 'Bear'], correctIndex: 1 },
      { question: 'Which river is the longest in India?', options: ['Yamuna', 'Ganga', 'Godavari', 'Narmada'], correctIndex: 1 },
      { question: 'Who was the first President of India?', options: ['Gandhi', 'Nehru', 'Rajendra Prasad', 'Ambedkar'], correctIndex: 2 },
      { question: 'How many states in India?', options: ['25', '28', '29', '30'], correctIndex: 1 },
    ],
    thinkers: [
      { question: 'What is the currency of Japan?', options: ['Yuan', 'Won', 'Yen', 'Ringgit'], correctIndex: 2 },
      { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctIndex: 1 },
      { question: 'Who discovered gravity?', options: ['Einstein', 'Newton', 'Galileo', 'Darwin'], correctIndex: 1 },
      { question: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Ganges', 'Mississippi'], correctIndex: 1 },
      { question: 'Who wrote "Romeo and Juliet"?', options: ['Dickens', 'Shakespeare', 'Austen', 'Twain'], correctIndex: 1 },
      { question: 'What is the largest country by area?', options: ['China', 'USA', 'Russia', 'Canada'], correctIndex: 2 },
      { question: 'Which gas makes up most of Earth\'s atmosphere?', options: ['Oxygen', 'Nitrogen', 'CO₂', 'Hydrogen'], correctIndex: 1 },
      { question: 'Who invented the telephone?', options: ['Edison', 'Bell', 'Tesla', 'Marconi'], correctIndex: 1 },
      { question: 'What is the smallest continent?', options: ['Europe', 'Antarctica', 'Australia', 'South America'], correctIndex: 2 },
      { question: 'Which country has the most population?', options: ['India', 'China', 'USA', 'Indonesia'], correctIndex: 0 },
      { question: 'What is the Great Wall located in?', options: ['Japan', 'India', 'China', 'Korea'], correctIndex: 2 },
      { question: 'Who painted the Sistine Chapel?', options: ['Da Vinci', 'Michelangelo', 'Raphael', 'Donatello'], correctIndex: 1 },
      { question: 'What does UNESCO stand for?', options: ['United Nations Educational Scientific Cultural Org', 'United Network for Science', 'Universal Education System', 'None'], correctIndex: 0 },
      { question: 'Which instrument measures earthquakes?', options: ['Barometer', 'Seismograph', 'Thermometer', 'Altimeter'], correctIndex: 1 },
    ],
    advanced: [
      { question: 'What is the theory of relativity associated with?', options: ['Newton', 'Einstein', 'Hawking', 'Bohr'], correctIndex: 1 },
      { question: 'Which UN body handles world health?', options: ['UNICEF', 'WHO', 'UNESCO', 'WTO'], correctIndex: 1 },
      { question: 'What is GDP?', options: ['Gross Domestic Product', 'General Data Protocol', 'Global Development Plan', 'Grand Design Project'], correctIndex: 0 },
      { question: 'Which treaty ended World War I?', options: ['Paris', 'Versailles', 'Geneva', 'Vienna'], correctIndex: 1 },
      { question: 'What is the Universal Declaration of Human Rights year?', options: ['1945', '1948', '1950', '1955'], correctIndex: 1 },
      { question: 'Who proposed the theory of evolution?', options: ['Newton', 'Einstein', 'Darwin', 'Mendel'], correctIndex: 2 },
      { question: 'What is cryptocurrency based on?', options: ['Gold', 'Blockchain', 'Banks', 'Government'], correctIndex: 1 },
      { question: 'Which country launched Sputnik?', options: ['USA', 'USSR', 'China', 'UK'], correctIndex: 1 },
      { question: 'What is the Kyoto Protocol about?', options: ['Trade', 'Climate change', 'Nuclear weapons', 'Space'], correctIndex: 1 },
      { question: 'Who is known as the Father of the Nation in India?', options: ['Nehru', 'Gandhi', 'Ambedkar', 'Patel'], correctIndex: 1 },
      { question: 'What is the World Bank\'s primary function?', options: ['Military aid', 'Development finance', 'Space research', 'Trade regulation'], correctIndex: 1 },
      { question: 'Which amendment gave voting rights to women in the US?', options: ['15th', '19th', '21st', '26th'], correctIndex: 1 },
      { question: 'What is the Cold War?', options: ['A war in Arctic', 'US-USSR ideological conflict', 'A winter war', 'None'], correctIndex: 1 },
      { question: 'Who wrote "The Republic"?', options: ['Aristotle', 'Plato', 'Socrates', 'Homer'], correctIndex: 1 },
    ],
  },
  pairs: {
    early_learners: [
      { a: '🍎', b: 'Apple' }, { a: '🐶', b: 'Dog' }, { a: '🌞', b: 'Sun' },
      { a: '🌙', b: 'Moon' }, { a: '⭐', b: 'Star' }, { a: '🌈', b: 'Rainbow' },
      { a: '🐱', b: 'Cat' }, { a: '🌸', b: 'Flower' }, { a: '🐟', b: 'Fish' },
      { a: '🦋', b: 'Butterfly' }, { a: '🐦', b: 'Bird' }, { a: '🍌', b: 'Banana' },
    ],
    explorers: [
      { a: 'India', b: 'New Delhi' }, { a: 'USA', b: 'Washington' }, { a: 'UK', b: 'London' },
      { a: 'Japan', b: 'Tokyo' }, { a: 'France', b: 'Paris' }, { a: 'Germany', b: 'Berlin' },
      { a: 'China', b: 'Beijing' }, { a: 'Russia', b: 'Moscow' }, { a: 'Brazil', b: 'Brasilia' },
      { a: 'Australia', b: 'Canberra' }, { a: 'Egypt', b: 'Cairo' }, { a: 'Italy', b: 'Rome' },
    ],
    thinkers: [
      { a: 'Gandhi', b: 'Non-violence' }, { a: 'Newton', b: 'Gravity' }, { a: 'Edison', b: 'Light bulb' },
      { a: 'Einstein', b: 'Relativity' }, { a: 'Darwin', b: 'Evolution' }, { a: 'Curie', b: 'Radioactivity' },
      { a: 'Tesla', b: 'AC current' }, { a: 'Galileo', b: 'Telescope' }, { a: 'Bell', b: 'Telephone' },
      { a: 'Wright Bros', b: 'Airplane' }, { a: 'Pasteur', b: 'Vaccination' }, { a: 'Turing', b: 'Computing' },
    ],
    advanced: [
      { a: 'Democracy', b: "People's rule" }, { a: 'Capitalism', b: 'Free market' },
      { a: 'Socialism', b: 'State ownership' }, { a: 'Communism', b: 'Classless society' },
      { a: 'Feudalism', b: 'Land-based power' }, { a: 'Fascism', b: 'Authoritarian' },
      { a: 'Monarchy', b: 'King/Queen rule' }, { a: 'Oligarchy', b: 'Few rule' },
      { a: 'Theocracy', b: 'Religious rule' }, { a: 'Anarchy', b: 'No government' },
      { a: 'Republic', b: 'Elected representatives' }, { a: 'Autocracy', b: 'One person rule' },
    ],
  },
  sort: {
    early_learners: [
      { rule: 'Fruit or Vegetable?', leftLabel: 'Fruit', rightLabel: 'Vegetable', leftItems: ['Apple','Banana','Mango','Grape','Orange'], rightItems: ['Carrot','Potato','Onion','Tomato','Spinach'] },
      { rule: 'Day or Night?', leftLabel: 'Day', rightLabel: 'Night', leftItems: ['Sun','Lunch','School','Playing','Morning'], rightItems: ['Moon','Stars','Sleep','Dinner','Dark'] },
    ],
    explorers: [
      { rule: 'Land Animal or Sea Animal?', leftLabel: 'Land', rightLabel: 'Sea', leftItems: ['Dog','Cat','Horse','Elephant','Lion'], rightItems: ['Whale','Shark','Dolphin','Octopus','Starfish'] },
      { rule: 'Country or City?', leftLabel: 'Country', rightLabel: 'City', leftItems: ['India','Japan','France','Brazil','Egypt'], rightItems: ['Paris','Tokyo','Mumbai','London','Cairo'] },
    ],
    thinkers: [
      { rule: 'Renewable or Non-renewable Energy?', leftLabel: 'Renewable', rightLabel: 'Non-renewable', leftItems: ['Solar','Wind','Hydro','Geothermal','Biomass'], rightItems: ['Coal','Oil','Natural Gas','Nuclear','Petroleum'] },
      { rule: 'Inventor or Artist?', leftLabel: 'Inventor', rightLabel: 'Artist', leftItems: ['Edison','Tesla','Bell','Watt','Nobel'], rightItems: ['Da Vinci','Picasso','Van Gogh','Monet','Michelangelo'] },
    ],
    advanced: [
      { rule: 'Democratic or Authoritarian leader?', leftLabel: 'Democratic', rightLabel: 'Authoritarian', leftItems: ['Gandhi','Mandela','Lincoln','MLK Jr'], rightItems: ['Hitler','Stalin','Mussolini','Mao'] },
      { rule: 'Developed or Developing country?', leftLabel: 'Developed', rightLabel: 'Developing', leftItems: ['USA','Japan','Germany','UK','France'], rightItems: ['India','Brazil','Nigeria','Indonesia','Bangladesh'] },
    ],
  },
  words: {
    early_learners: [
      { word: 'RAINBOW', hint: '7 colors in sky' }, { word: 'FRIEND', hint: 'Someone you like' },
      { word: 'GARDEN', hint: 'Where flowers grow' }, { word: 'SCHOOL', hint: 'Where you learn' },
      { word: 'PUPPY', hint: 'Baby dog' }, { word: 'HAPPY', hint: 'Smiling face' },
      { word: 'MOON', hint: 'Night sky' }, { word: 'CLOUD', hint: 'White and fluffy' },
      { word: 'STAR', hint: 'Twinkles at night' }, { word: 'KITE', hint: 'Flies in wind' },
      { word: 'CAKE', hint: 'Birthday treat' }, { word: 'BELL', hint: 'Makes sound' },
    ],
    explorers: [
      { word: 'CONTINENT', hint: 'Large land mass' }, { word: 'DEMOCRACY', hint: 'Government by people' },
      { word: 'INVENTION', hint: 'Something new created' }, { word: 'EXPLORER', hint: 'Discovers new places' },
      { word: 'CULTURE', hint: 'Way of life' }, { word: 'ANCIENT', hint: 'Very old' },
      { word: 'COMPASS', hint: 'Shows direction' }, { word: 'VOLCANO', hint: 'Erupts lava' },
      { word: 'ISLAND', hint: 'Land in water' }, { word: 'DESERT', hint: 'Sandy dry place' },
      { word: 'FOREST', hint: 'Full of trees' }, { word: 'GLACIER', hint: 'Slow ice river' },
    ],
    thinkers: [
      { word: 'CONSTITUTION', hint: 'Fundamental law' }, { word: 'CIVILIZATION', hint: 'Advanced society' },
      { word: 'REVOLUTION', hint: 'Major change' }, { word: 'INDEPENDENCE', hint: 'Freedom from rule' },
      { word: 'PARLIAMENT', hint: 'Law-making body' }, { word: 'AMBASSADOR', hint: 'Country representative' },
      { word: 'PHILOSOPHY', hint: 'Love of wisdom' }, { word: 'ARCHAEOLOGY', hint: 'Study of ruins' },
      { word: 'GEOGRAPHY', hint: 'Study of Earth' }, { word: 'ASTRONOMY', hint: 'Study of stars' },
      { word: 'ECONOMICS', hint: 'Study of money' }, { word: 'SOCIOLOGY', hint: 'Study of society' },
    ],
    advanced: [
      { word: 'SUSTAINABILITY', hint: 'Long-term viability' }, { word: 'GLOBALIZATION', hint: 'World interconnection' },
      { word: 'BUREAUCRACY', hint: 'Government administration' }, { word: 'INFRASTRUCTURE', hint: 'Basic systems' },
      { word: 'JURISPRUDENCE', hint: 'Science of law' }, { word: 'GEOPOLITICS', hint: 'Geography and politics' },
      { word: 'CRYPTOCURRENCY', hint: 'Digital money' }, { word: 'BIOTECHNOLOGY', hint: 'Biology and tech' },
      { word: 'MULTILATERAL', hint: 'Many sided agreement' }, { word: 'ENTREPRENEUR', hint: 'Business starter' },
      { word: 'PHILANTHROPY', hint: 'Helping others' }, { word: 'CONSTITUTIONAL', hint: 'Related to constitution' },
    ],
  },
  speedTap: {
    early_learners: [
      { instruction: 'Tap only FRUITS!', targets: ['🍎','🍌','🍇','🍊','🥭','🍓'], distractors: ['🥕','🥔','🧅','🍞','📚','🪑'] },
      { instruction: 'Tap only COLORS!', targets: ['Red','Blue','Green','Yellow','Orange','Pink'], distractors: ['Dog','Cat','Book','Chair','Run','Eat'] },
    ],
    explorers: [
      { instruction: 'Tap only COUNTRIES!', targets: ['India','Japan','Brazil','France','Egypt','China'], distractors: ['Paris','London','River','Mountain','Ocean','City'] },
      { instruction: 'Tap only CAPITALS!', targets: ['Delhi','Tokyo','Paris','London','Cairo','Berlin'], distractors: ['India','Japan','River','Mountain','France','Ocean'] },
    ],
    thinkers: [
      { instruction: 'Tap only RENEWABLE energy!', targets: ['Solar','Wind','Hydro','Biomass','Geothermal'], distractors: ['Coal','Oil','Gas','Nuclear','Diesel','Petrol'] },
      { instruction: 'Tap only SCIENTISTS!', targets: ['Newton','Einstein','Darwin','Curie','Tesla','Galileo'], distractors: ['Shakespeare','Picasso','Mozart','Gandhi','Napoleon','Caesar'] },
    ],
    advanced: [
      { instruction: 'Tap only FUNDAMENTAL RIGHTS!', targets: ['Equality','Freedom','Education','Life','Privacy','Speech'], distractors: ['Voting','Tax','Driving','Business','Trade','Profit'] },
      { instruction: 'Tap only UN ORGANIZATIONS!', targets: ['WHO','UNICEF','UNESCO','WTO','IMF','FAO'], distractors: ['NASA','FBI','CIA','NATO','ISRO','DRDO'] },
    ],
  },
  visualMemory: {
    early_learners: [
      { items: ['🍎','🐶','🌞','🌈'], questions: [{ question: 'Was there a rainbow?', options: ['Yes','No'], correctIndex: 0 }, { question: 'How many items were shown?', options: ['2','3','4','5'], correctIndex: 2 }] },
      { items: ['Monday','Tuesday','Wednesday','Thursday'], questions: [{ question: 'Was Friday shown?', options: ['Yes','No'], correctIndex: 1 }, { question: 'What day was first?', options: ['Tuesday','Monday','Wednesday','Thursday'], correctIndex: 1 }] },
      { items: ['🔵Blue','🔴Red','🟢Green','🟡Yellow'], questions: [{ question: 'Was Green shown?', options: ['Yes','No'], correctIndex: 0 }, { question: 'How many colors?', options: ['3','4','5','6'], correctIndex: 1 }] },
    ],
    explorers: [
      { items: ['India-Asia','Brazil-S.America','France-Europe','Egypt-Africa'], questions: [{ question: 'Which country was in Europe?', options: ['India','Brazil','France','Egypt'], correctIndex: 2 }] },
      { items: ['Delhi-India','Tokyo-Japan','Paris-France','London-UK'], questions: [{ question: 'Which city is in Japan?', options: ['Delhi','Tokyo','Paris','London'], correctIndex: 1 }, { question: 'Was Berlin shown?', options: ['Yes','No'], correctIndex: 1 }] },
      { items: ['Peacock-India','Bald Eagle-USA','Kiwi-NZ','Robin-UK'], questions: [{ question: 'Which bird is from India?', options: ['Eagle','Kiwi','Peacock','Robin'], correctIndex: 2 }, { question: 'Was Parrot shown?', options: ['Yes','No'], correctIndex: 1 }] },
    ],
    thinkers: [
      { items: ['1947-Independence','1950-Republic','1969-Moon landing','1991-USSR dissolved'], questions: [{ question: "When was India's Republic formed?", options: ['1947','1950','1969','1991'], correctIndex: 1 }] },
      { items: ['Newton-Gravity','Einstein-Relativity','Darwin-Evolution','Curie-Radioactivity'], questions: [{ question: 'Who is linked to Gravity?', options: ['Einstein','Darwin','Newton','Curie'], correctIndex: 2 }, { question: 'Who studied Radioactivity?', options: ['Newton','Einstein','Darwin','Curie'], correctIndex: 3 }] },
    ],
    advanced: [
      { items: ['GDP: $3.4T','Population: 1.4B','Area: 3.3M km²','Languages: 22'], questions: [{ question: 'What was the GDP?', options: ['$1.4T','$2.4T','$3.4T','$4.4T'], correctIndex: 2 }] },
      { items: ['UN: 1945','NATO: 1949','EU: 1993','ASEAN: 1967'], questions: [{ question: 'When was UN formed?', options: ['1945','1949','1993','1967'], correctIndex: 0 }, { question: 'When was NATO formed?', options: ['1945','1949','1993','1967'], correctIndex: 1 }] },
    ],
  },
};

// ─── CONTENT ACCESS FUNCTIONS ───
type ContentKey = 'quiz' | 'pairs' | 'sort' | 'words' | 'speedTap' | 'visualMemory';

function getSubjectPool(subject: string) {
  const s = subject.toLowerCase().trim();
  if (['math', 'maths', 'mathematics'].some(m => s.includes(m))) return MATH_CONTENT;
  if (['science', 'physics', 'chemistry', 'biology', 'evs'].some(m => s.includes(m))) return SCIENCE_CONTENT;
  if (['hindi'].some(m => s === m || s.includes(m))) return HINDI_CONTENT;
  if (['english', 'language', 'grammar', 'literature'].some(m => s.includes(m))) return ENGLISH_CONTENT;
  return GENERAL_CONTENT;
}

export function getContent<T extends ContentKey>(
  contentType: T,
  subject: string,
  ageGroup: AgeGroupId
): any {
  const pool = getSubjectPool(subject);
  const content = (pool as any)[contentType];
  if (!content) return null;
  return content[ageGroup] || content['explorers'] || null;
}

/** Returns shuffled, unique quiz questions (no repeats) */
export function getQuizQuestions(subject: string, ageGroup: AgeGroupId): QuizQuestion[] {
  const q = getContent('quiz', subject, ageGroup) || [];
  return shuffle(q);
}

/** Returns shuffled, unique match pairs */
export function getMatchPairs(subject: string, ageGroup: AgeGroupId): MatchPair[] {
  const p = getContent('pairs', subject, ageGroup) || [];
  return shuffle(p);
}

/** Returns shuffled sort categories */
export function getSortCategories(subject: string, ageGroup: AgeGroupId): SortCategory[] {
  const s = getContent('sort', subject, ageGroup) || [];
  return shuffle(s);
}

/** Returns shuffled, unique word entries */
export function getWordEntries(subject: string, ageGroup: AgeGroupId): WordEntry[] {
  const w = getContent('words', subject, ageGroup) || [];
  return shuffle(w);
}

/** Returns shuffled speed tap rules */
export function getSpeedTapRules(subject: string, ageGroup: AgeGroupId): SpeedTapRule[] {
  const r = getContent('speedTap', subject, ageGroup) || [];
  return shuffle(r);
}

/** Returns shuffled visual memory sets */
export function getVisualMemorySets(subject: string, ageGroup: AgeGroupId): VisualMemorySet[] {
  const v = getContent('visualMemory', subject, ageGroup) || [];
  return shuffle(v);
}
