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
    ],
  },
  pairs: {
    early_learners: [
      { a: '1+1', b: '2' }, { a: '2+2', b: '4' }, { a: '3+1', b: '4' },
      { a: '5-1', b: '4' }, { a: '1+3', b: '4' }, { a: '2+1', b: '3' },
    ],
    explorers: [
      { a: '6×7', b: '42' }, { a: '8×9', b: '72' }, { a: '12×5', b: '60' },
      { a: '√49', b: '7' }, { a: '½ of 24', b: '12' }, { a: '15%', b: '0.15' },
    ],
    thinkers: [
      { a: 'x²-1', b: '(x+1)(x-1)' }, { a: 'π', b: '3.14159...' }, { a: '√144', b: '12' },
      { a: 'sin30°', b: '0.5' }, { a: '2³', b: '8' }, { a: 'LCM(4,6)', b: '12' },
    ],
    advanced: [
      { a: 'd/dx(sin x)', b: 'cos x' }, { a: '∫x dx', b: 'x²/2+C' }, { a: 'e⁰', b: '1' },
      { a: 'ln(e)', b: '1' }, { a: 'lim(1/x)→0', b: '∞' }, { a: 'nCr(5,2)', b: '10' },
    ],
  },
  sort: {
    early_learners: [
      { rule: 'Big or Small number?', leftLabel: 'Small (1-5)', rightLabel: 'Big (6-10)', leftItems: ['1','2','3','4','5'], rightItems: ['6','7','8','9','10'] },
    ],
    explorers: [
      { rule: 'Even or Odd?', leftLabel: 'Even', rightLabel: 'Odd', leftItems: ['2','4','6','8','10','12','14'], rightItems: ['1','3','5','7','9','11','13'] },
    ],
    thinkers: [
      { rule: 'Prime or Composite?', leftLabel: 'Prime', rightLabel: 'Composite', leftItems: ['2','3','5','7','11','13','17'], rightItems: ['4','6','8','9','10','12','15'] },
    ],
    advanced: [
      { rule: 'Rational or Irrational?', leftLabel: 'Rational', rightLabel: 'Irrational', leftItems: ['½','0.75','3','⅓','0.2'], rightItems: ['√2','π','e','√3','√5'] },
    ],
  },
  words: {
    early_learners: [
      { word: 'PLUS', hint: 'Addition sign' }, { word: 'FIVE', hint: 'After four' },
      { word: 'ZERO', hint: 'Nothing' }, { word: 'TEN', hint: '5+5' },
    ],
    explorers: [
      { word: 'FRACTION', hint: 'Part of a whole' }, { word: 'DECIMAL', hint: 'Has a dot' },
      { word: 'PERIMETER', hint: 'Around the shape' }, { word: 'MULTIPLY', hint: '× operation' },
    ],
    thinkers: [
      { word: 'ALGEBRA', hint: 'Using letters for numbers' }, { word: 'GEOMETRY', hint: 'Study of shapes' },
      { word: 'QUADRATIC', hint: 'ax²+bx+c' }, { word: 'POLYNOMIAL', hint: 'Many terms' },
    ],
    advanced: [
      { word: 'DERIVATIVE', hint: 'Rate of change' }, { word: 'INTEGRAL', hint: 'Area under curve' },
      { word: 'LOGARITHM', hint: 'Inverse of exponent' }, { word: 'PROBABILITY', hint: 'Chance of event' },
    ],
  },
  speedTap: {
    early_learners: [
      { instruction: 'Tap only the EVEN numbers!', targets: ['2','4','6','8'], distractors: ['1','3','5','7','9'] },
    ],
    explorers: [
      { instruction: 'Tap only MULTIPLES OF 3!', targets: ['3','6','9','12','15','18'], distractors: ['1','2','4','5','7','8','10','11'] },
    ],
    thinkers: [
      { instruction: 'Tap only PRIME numbers!', targets: ['2','3','5','7','11','13','17','19'], distractors: ['1','4','6','8','9','10','12','14','15','16'] },
    ],
    advanced: [
      { instruction: 'Tap only PERFECT SQUARES!', targets: ['1','4','9','16','25','36','49','64'], distractors: ['2','3','5','6','7','8','10','11','12','15'] },
    ],
  },
  visualMemory: {
    early_learners: [
      { items: ['🔴','🟡','🔵','🟢'], questions: [{ question: 'What color was first?', options: ['Red','Yellow','Blue','Green'], correctIndex: 0 }, { question: 'How many items were there?', options: ['2','3','4','5'], correctIndex: 2 }] },
    ],
    explorers: [
      { items: ['3+2=5','7×3=21','10÷2=5','8-3=5'], questions: [{ question: 'Which equation had multiplication?', options: ['3+2=5','7×3=21','10÷2=5','8-3=5'], correctIndex: 1 }, { question: 'What was 10÷2?', options: ['2','5','10','20'], correctIndex: 1 }] },
    ],
    thinkers: [
      { items: ['x²','2x+3','√x','x³-1'], questions: [{ question: 'Which expression had a square root?', options: ['x²','2x+3','√x','x³-1'], correctIndex: 2 }, { question: 'Which was a cubic?', options: ['x²','2x+3','√x','x³-1'], correctIndex: 3 }] },
    ],
    advanced: [
      { items: ['∫x²dx','d/dx(sin x)','lim(1/n)','Σn²'], questions: [{ question: 'Which was an integral?', options: ['∫x²dx','d/dx(sin x)','lim(1/n)','Σn²'], correctIndex: 0 }, { question: 'Which was a limit?', options: ['∫x²dx','d/dx(sin x)','lim(1/n)','Σn²'], correctIndex: 2 }] },
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
    ],
    explorers: [
      { question: 'What is the largest planet in our solar system?', options: ['Mars', 'Saturn', 'Jupiter', 'Neptune'], correctIndex: 2 },
      { question: 'What is H₂O?', options: ['Salt', 'Sugar', 'Water', 'Air'], correctIndex: 2 },
      { question: 'Which organ pumps blood?', options: ['Brain', 'Lungs', 'Heart', 'Liver'], correctIndex: 2 },
      { question: 'What is the boiling point of water?', options: ['50°C', '100°C', '150°C', '200°C'], correctIndex: 1 },
      { question: 'How many bones does an adult human have?', options: ['106', '156', '206', '306'], correctIndex: 2 },
    ],
    thinkers: [
      { question: 'What is the chemical formula of table salt?', options: ['NaOH', 'NaCl', 'HCl', 'KCl'], correctIndex: 1 },
      { question: 'Which organelle is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], correctIndex: 2 },
      { question: 'What is Newton\'s second law?', options: ['F=ma', 'E=mc²', 'V=IR', 'PV=nRT'], correctIndex: 0 },
      { question: 'What is the pH of pure water?', options: ['5', '7', '9', '14'], correctIndex: 1 },
      { question: 'Which gas do plants absorb?', options: ['O₂', 'N₂', 'CO₂', 'H₂'], correctIndex: 2 },
    ],
    advanced: [
      { question: 'What is the SI unit of electric current?', options: ['Volt', 'Watt', 'Ampere', 'Ohm'], correctIndex: 2 },
      { question: 'What is Avogadro\'s number?', options: ['6.022×10²³', '3.14×10⁸', '9.8×10¹', '1.6×10⁻¹⁹'], correctIndex: 0 },
      { question: 'Which law states energy cannot be created or destroyed?', options: ['Newton\'s 1st', 'Thermodynamics 1st', 'Ohm\'s Law', 'Boyle\'s Law'], correctIndex: 1 },
      { question: 'What is the molecular formula of glucose?', options: ['C₆H₁₂O₆', 'C₂H₅OH', 'CH₄', 'C₆H₆'], correctIndex: 0 },
      { question: 'What is the speed of light?', options: ['3×10⁶ m/s', '3×10⁸ m/s', '3×10¹⁰ m/s', '3×10⁴ m/s'], correctIndex: 1 },
    ],
  },
  pairs: {
    early_learners: [
      { a: '🐱', b: 'Cat' }, { a: '🌳', b: 'Tree' }, { a: '☀️', b: 'Sun' },
      { a: '🌙', b: 'Moon' }, { a: '⭐', b: 'Star' }, { a: '🌊', b: 'Water' },
    ],
    explorers: [
      { a: 'Heart', b: 'Pumps blood' }, { a: 'Lungs', b: 'Breathing' }, { a: 'Brain', b: 'Thinking' },
      { a: 'Stomach', b: 'Digestion' }, { a: 'Kidney', b: 'Filtration' }, { a: 'Liver', b: 'Detox' },
    ],
    thinkers: [
      { a: 'Na', b: 'Sodium' }, { a: 'Fe', b: 'Iron' }, { a: 'Au', b: 'Gold' },
      { a: 'Ag', b: 'Silver' }, { a: 'Cu', b: 'Copper' }, { a: 'Hg', b: 'Mercury' },
    ],
    advanced: [
      { a: 'DNA', b: 'Genetic code' }, { a: 'ATP', b: 'Energy currency' }, { a: 'RNA', b: 'Protein synthesis' },
      { a: 'Enzyme', b: 'Biological catalyst' }, { a: 'Photon', b: 'Light particle' }, { a: 'Quark', b: 'Subatomic' },
    ],
  },
  sort: {
    early_learners: [
      { rule: 'Living or Non-living?', leftLabel: 'Living', rightLabel: 'Non-living', leftItems: ['Cat','Tree','Fish','Bird','Flower'], rightItems: ['Rock','Chair','Book','Phone','Car'] },
    ],
    explorers: [
      { rule: 'Plant or Animal?', leftLabel: 'Plant', rightLabel: 'Animal', leftItems: ['Rose','Fern','Cactus','Moss','Tulip'], rightItems: ['Dog','Eagle','Shark','Ant','Snake'] },
    ],
    thinkers: [
      { rule: 'Metal or Non-metal?', leftLabel: 'Metal', rightLabel: 'Non-metal', leftItems: ['Iron','Copper','Gold','Silver','Zinc'], rightItems: ['Carbon','Oxygen','Nitrogen','Sulfur','Chlorine'] },
    ],
    advanced: [
      { rule: 'Endothermic or Exothermic?', leftLabel: 'Endothermic', rightLabel: 'Exothermic', leftItems: ['Melting ice','Photosynthesis','Evaporation','Cooking egg'], rightItems: ['Combustion','Freezing','Rusting','Respiration'] },
    ],
  },
  words: {
    early_learners: [
      { word: 'PLANT', hint: 'Grows from soil' }, { word: 'WATER', hint: 'H₂O' },
      { word: 'EARTH', hint: 'Our planet' }, { word: 'MOON', hint: 'Shines at night' },
    ],
    explorers: [
      { word: 'PHOTOSYNTHESIS', hint: 'Plants make food' }, { word: 'GRAVITY', hint: 'Pulls things down' },
      { word: 'MOLECULE', hint: 'Group of atoms' }, { word: 'ECOSYSTEM', hint: 'Living community' },
    ],
    thinkers: [
      { word: 'MITOCHONDRIA', hint: 'Cell powerhouse' }, { word: 'CHROMOSOME', hint: 'DNA carrier' },
      { word: 'ELECTROLYSIS', hint: 'Breaking with electricity' }, { word: 'ACCELERATION', hint: 'Rate of velocity change' },
    ],
    advanced: [
      { word: 'THERMODYNAMICS', hint: 'Heat and energy laws' }, { word: 'ELECTROMAGNETIC', hint: 'Light spectrum type' },
      { word: 'STOICHIOMETRY', hint: 'Chemical balancing' }, { word: 'HYBRIDIZATION', hint: 'Orbital mixing' },
    ],
  },
  speedTap: {
    early_learners: [
      { instruction: 'Tap only ANIMALS!', targets: ['🐱','🐶','🐟','🐦','🐸'], distractors: ['🌳','🪨','📱','🪑','📚'] },
    ],
    explorers: [
      { instruction: 'Tap only PLANETS!', targets: ['Mars','Venus','Jupiter','Saturn'], distractors: ['Sun','Moon','Pluto','Star','Comet'] },
    ],
    thinkers: [
      { instruction: 'Tap only NOBLE GASES!', targets: ['Helium','Neon','Argon','Krypton'], distractors: ['Oxygen','Nitrogen','Carbon','Hydrogen','Sodium','Iron'] },
    ],
    advanced: [
      { instruction: 'Tap only ORGANIC COMPOUNDS!', targets: ['CH₄','C₂H₅OH','C₆H₁₂O₆','C₆H₆'], distractors: ['NaCl','H₂O','HCl','NaOH','CaCO₃'] },
    ],
  },
  visualMemory: {
    early_learners: [
      { items: ['🐱','🐶','🐟','🌳'], questions: [{ question: 'Was there a fish?', options: ['Yes','No','Maybe','I forgot'], correctIndex: 0 }, { question: 'How many animals?', options: ['2','3','4','5'], correctIndex: 1 }] },
    ],
    explorers: [
      { items: ['Heart','Lungs','Brain','Liver','Kidney'], questions: [{ question: 'Which organ was NOT shown?', options: ['Heart','Stomach','Brain','Kidney'], correctIndex: 1 }, { question: 'How many organs were shown?', options: ['3','4','5','6'], correctIndex: 2 }] },
    ],
    thinkers: [
      { items: ['H₂O','NaCl','CO₂','O₂','Fe₂O₃'], questions: [{ question: 'Which formula was for water?', options: ['NaCl','H₂O','CO₂','Fe₂O₃'], correctIndex: 1 }, { question: 'Which had iron?', options: ['H₂O','NaCl','CO₂','Fe₂O₃'], correctIndex: 3 }] },
    ],
    advanced: [
      { items: ['ATP→ADP','DNA→mRNA','Glucose→Pyruvate','NADH→NAD+'], questions: [{ question: 'Which was transcription?', options: ['ATP→ADP','DNA→mRNA','Glucose→Pyruvate','NADH→NAD+'], correctIndex: 1 }, { question: 'Which was glycolysis?', options: ['ATP→ADP','DNA→mRNA','Glucose→Pyruvate','NADH→NAD+'], correctIndex: 2 }] },
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
    ],
    explorers: [
      { question: 'What is the plural of "child"?', options: ['Childs', 'Children', 'Childes', 'Child'], correctIndex: 1 },
      { question: 'Which is an adjective? "The tall boy ran fast"', options: ['boy', 'ran', 'tall', 'fast'], correctIndex: 2 },
      { question: 'What is a synonym for "happy"?', options: ['Sad', 'Angry', 'Joyful', 'Tired'], correctIndex: 2 },
      { question: '"I ___ already eaten." Fill in:', options: ['has', 'have', 'had', 'having'], correctIndex: 1 },
    ],
    thinkers: [
      { question: 'Which sentence is in passive voice?', options: ['He wrote a letter', 'A letter was written', 'He is writing', 'They write letters'], correctIndex: 1 },
      { question: 'What figure of speech: "The world is a stage"?', options: ['Simile', 'Metaphor', 'Hyperbole', 'Irony'], correctIndex: 1 },
      { question: 'Which is correct?', options: ['Their going home', 'They\'re going home', 'There going home', 'Theyre going home'], correctIndex: 1 },
      { question: '"Despite" is a:', options: ['Noun', 'Verb', 'Preposition', 'Adverb'], correctIndex: 2 },
    ],
    advanced: [
      { question: 'Which is an example of an oxymoron?', options: ['Dark night', 'Deafening silence', 'Blue sky', 'Fast car'], correctIndex: 1 },
      { question: 'What narrative technique is "stream of consciousness"?', options: ['Third person', 'Interior monologue', 'Dialogue', 'Exposition'], correctIndex: 1 },
      { question: 'Which word means "to make worse"?', options: ['Ameliorate', 'Exacerbate', 'Mitigate', 'Alleviate'], correctIndex: 1 },
      { question: '"Not bad at all" is an example of:', options: ['Litotes', 'Hyperbole', 'Simile', 'Allusion'], correctIndex: 0 },
    ],
  },
  pairs: {
    early_learners: [
      { a: 'A', b: 'Apple' }, { a: 'B', b: 'Ball' }, { a: 'C', b: 'Cat' },
      { a: 'D', b: 'Dog' }, { a: 'E', b: 'Egg' }, { a: 'F', b: 'Fish' },
    ],
    explorers: [
      { a: 'Happy', b: 'Sad' }, { a: 'Big', b: 'Small' }, { a: 'Fast', b: 'Slow' },
      { a: 'Hot', b: 'Cold' }, { a: 'Light', b: 'Dark' }, { a: 'Old', b: 'New' },
    ],
    thinkers: [
      { a: 'Metaphor', b: 'Direct comparison' }, { a: 'Simile', b: 'Like/as comparison' },
      { a: 'Alliteration', b: 'Same starting sound' }, { a: 'Onomatopoeia', b: 'Sound words' },
      { a: 'Hyperbole', b: 'Exaggeration' }, { a: 'Irony', b: 'Opposite meaning' },
    ],
    advanced: [
      { a: 'Protagonist', b: 'Main character' }, { a: 'Antagonist', b: 'Villain' },
      { a: 'Denouement', b: 'Resolution' }, { a: 'Soliloquy', b: 'Thinking aloud' },
      { a: 'Catharsis', b: 'Emotional release' }, { a: 'Allegory', b: 'Symbolic story' },
    ],
  },
  sort: {
    early_learners: [
      { rule: 'Vowel or Consonant?', leftLabel: 'Vowel', rightLabel: 'Consonant', leftItems: ['A','E','I','O','U'], rightItems: ['B','C','D','F','G','H'] },
    ],
    explorers: [
      { rule: 'Noun or Verb?', leftLabel: 'Noun', rightLabel: 'Verb', leftItems: ['Book','Cat','House','River','School'], rightItems: ['Run','Jump','Eat','Swim','Read'] },
    ],
    thinkers: [
      { rule: 'Adjective or Adverb?', leftLabel: 'Adjective', rightLabel: 'Adverb', leftItems: ['Beautiful','Tall','Brave','Clever','Shy'], rightItems: ['Quickly','Slowly','Happily','Loudly','Carefully'] },
    ],
    advanced: [
      { rule: 'Active or Passive voice?', leftLabel: 'Active', rightLabel: 'Passive', leftItems: ['He wrote a book','She sings well','They built a house'], rightItems: ['A book was written','Songs are sung','The house was built'] },
    ],
  },
  words: {
    early_learners: [
      { word: 'APPLE', hint: 'A fruit' }, { word: 'HOUSE', hint: 'Where you live' },
      { word: 'HAPPY', hint: 'Feeling good' }, { word: 'SCHOOL', hint: 'Where you learn' },
    ],
    explorers: [
      { word: 'ADVENTURE', hint: 'Exciting journey' }, { word: 'KNOWLEDGE', hint: 'What you learn' },
      { word: 'BEAUTIFUL', hint: 'Very pretty' }, { word: 'IMPORTANT', hint: 'Matters a lot' },
    ],
    thinkers: [
      { word: 'ONOMATOPOEIA', hint: 'Sound words' }, { word: 'ALLITERATION', hint: 'Same letter start' },
      { word: 'PERSONIFICATION', hint: 'Human traits to objects' }, { word: 'JUXTAPOSITION', hint: 'Side by side contrast' },
    ],
    advanced: [
      { word: 'SESQUIPEDALIAN', hint: 'Long words' }, { word: 'VERISIMILITUDE', hint: 'Appearance of truth' },
      { word: 'EPISTEMOLOGY', hint: 'Study of knowledge' }, { word: 'QUINTESSENTIAL', hint: 'Perfect example' },
    ],
  },
  speedTap: {
    early_learners: [
      { instruction: 'Tap only VOWELS!', targets: ['A','E','I','O','U'], distractors: ['B','C','D','F','G','H','K','L'] },
    ],
    explorers: [
      { instruction: 'Tap only NOUNS!', targets: ['Book','Cat','House','River','Sun'], distractors: ['Run','Big','Slowly','Jump','Happy'] },
    ],
    thinkers: [
      { instruction: 'Tap only CONJUNCTIONS!', targets: ['And','But','Or','Yet','So','Because'], distractors: ['The','Happy','Run','Big','House','Slowly'] },
    ],
    advanced: [
      { instruction: 'Tap only ABSTRACT NOUNS!', targets: ['Freedom','Justice','Love','Wisdom','Courage'], distractors: ['Table','Book','Dog','River','Mountain','Chair'] },
    ],
  },
  visualMemory: {
    early_learners: [
      { items: ['🍎A','🐱C','🏠H','🌟S'], questions: [{ question: 'Which letter was with the cat?', options: ['A','C','H','S'], correctIndex: 1 }, { question: 'What was with letter H?', options: ['Apple','Cat','House','Star'], correctIndex: 2 }] },
    ],
    explorers: [
      { items: ['Noun: Dog','Verb: Run','Adj: Tall','Adv: Quickly'], questions: [{ question: 'What type of word was "Tall"?', options: ['Noun','Verb','Adjective','Adverb'], correctIndex: 2 }, { question: 'Which was the adverb?', options: ['Dog','Run','Tall','Quickly'], correctIndex: 3 }] },
    ],
    thinkers: [
      { items: ['Simile: as brave as a lion','Metaphor: time is money','Irony: clear as mud','Hyperbole: a million times'], questions: [{ question: 'Which was the metaphor?', options: ['as brave as a lion','time is money','clear as mud','a million times'], correctIndex: 1 }] },
    ],
    advanced: [
      { items: ['Hamlet: To be or not','Gatsby: green light','1984: Big Brother','Mockingbird: innocence'], questions: [{ question: 'Which novel had "Big Brother"?', options: ['Hamlet','Gatsby','1984','Mockingbird'], correctIndex: 2 }] },
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
    ],
    explorers: [
      { question: 'Which continent is India in?', options: ['Africa', 'Europe', 'Asia', 'America'], correctIndex: 2 },
      { question: 'Who painted the Mona Lisa?', options: ['Picasso', 'Da Vinci', 'Van Gogh', 'Monet'], correctIndex: 1 },
      { question: 'What is the capital of India?', options: ['Mumbai', 'Delhi', 'Kolkata', 'Chennai'], correctIndex: 1 },
      { question: 'How many days in a leap year?', options: ['364', '365', '366', '367'], correctIndex: 2 },
    ],
    thinkers: [
      { question: 'What is the currency of Japan?', options: ['Yuan', 'Won', 'Yen', 'Ringgit'], correctIndex: 2 },
      { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctIndex: 1 },
      { question: 'Who discovered gravity?', options: ['Einstein', 'Newton', 'Galileo', 'Darwin'], correctIndex: 1 },
      { question: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Ganges', 'Mississippi'], correctIndex: 1 },
    ],
    advanced: [
      { question: 'What is the theory of relativity associated with?', options: ['Newton', 'Einstein', 'Hawking', 'Bohr'], correctIndex: 1 },
      { question: 'Which UN body handles world health?', options: ['UNICEF', 'WHO', 'UNESCO', 'WTO'], correctIndex: 1 },
      { question: 'What is GDP?', options: ['Gross Domestic Product', 'General Data Protocol', 'Global Development Plan', 'Grand Design Project'], correctIndex: 0 },
      { question: 'Which treaty ended World War I?', options: ['Paris', 'Versailles', 'Geneva', 'Vienna'], correctIndex: 1 },
    ],
  },
  pairs: {
    early_learners: [
      { a: '🍎', b: 'Apple' }, { a: '🐶', b: 'Dog' }, { a: '🌞', b: 'Sun' },
      { a: '🌙', b: 'Moon' }, { a: '⭐', b: 'Star' }, { a: '🌈', b: 'Rainbow' },
    ],
    explorers: [
      { a: 'India', b: 'New Delhi' }, { a: 'USA', b: 'Washington' }, { a: 'UK', b: 'London' },
      { a: 'Japan', b: 'Tokyo' }, { a: 'France', b: 'Paris' }, { a: 'Germany', b: 'Berlin' },
    ],
    thinkers: [
      { a: 'Gandhi', b: 'Non-violence' }, { a: 'Newton', b: 'Gravity' }, { a: 'Edison', b: 'Light bulb' },
      { a: 'Einstein', b: 'Relativity' }, { a: 'Darwin', b: 'Evolution' }, { a: 'Curie', b: 'Radioactivity' },
    ],
    advanced: [
      { a: 'Democracy', b: 'People\'s rule' }, { a: 'Capitalism', b: 'Free market' },
      { a: 'Socialism', b: 'State ownership' }, { a: 'Communism', b: 'Classless society' },
      { a: 'Feudalism', b: 'Land-based power' }, { a: 'Fascism', b: 'Authoritarian' },
    ],
  },
  sort: {
    early_learners: [
      { rule: 'Fruit or Vegetable?', leftLabel: 'Fruit', rightLabel: 'Vegetable', leftItems: ['Apple','Banana','Mango','Grape','Orange'], rightItems: ['Carrot','Potato','Onion','Tomato','Spinach'] },
    ],
    explorers: [
      { rule: 'Land Animal or Sea Animal?', leftLabel: 'Land', rightLabel: 'Sea', leftItems: ['Dog','Cat','Horse','Elephant','Lion'], rightItems: ['Whale','Shark','Dolphin','Octopus','Starfish'] },
    ],
    thinkers: [
      { rule: 'Renewable or Non-renewable Energy?', leftLabel: 'Renewable', rightLabel: 'Non-renewable', leftItems: ['Solar','Wind','Hydro','Geothermal','Biomass'], rightItems: ['Coal','Oil','Natural Gas','Nuclear','Petroleum'] },
    ],
    advanced: [
      { rule: 'Democratic or Authoritarian leader?', leftLabel: 'Democratic', rightLabel: 'Authoritarian', leftItems: ['Gandhi','Mandela','Lincoln','MLK Jr'], rightItems: ['Hitler','Stalin','Mussolini','Mao'] },
    ],
  },
  words: {
    early_learners: [
      { word: 'RAINBOW', hint: '7 colors in sky' }, { word: 'FRIEND', hint: 'Someone you like' },
      { word: 'GARDEN', hint: 'Where flowers grow' }, { word: 'SCHOOL', hint: 'Where you learn' },
    ],
    explorers: [
      { word: 'CONTINENT', hint: 'Large land mass' }, { word: 'DEMOCRACY', hint: 'Government by people' },
      { word: 'INVENTION', hint: 'Something new created' }, { word: 'EXPLORER', hint: 'Discovers new places' },
    ],
    thinkers: [
      { word: 'CONSTITUTION', hint: 'Fundamental law' }, { word: 'CIVILIZATION', hint: 'Advanced society' },
      { word: 'REVOLUTION', hint: 'Major change' }, { word: 'INDEPENDENCE', hint: 'Freedom from rule' },
    ],
    advanced: [
      { word: 'SUSTAINABILITY', hint: 'Long-term viability' }, { word: 'GLOBALIZATION', hint: 'World interconnection' },
      { word: 'BUREAUCRACY', hint: 'Government administration' }, { word: 'INFRASTRUCTURE', hint: 'Basic systems' },
    ],
  },
  speedTap: {
    early_learners: [
      { instruction: 'Tap only FRUITS!', targets: ['🍎','🍌','🍇','🍊','🥭'], distractors: ['🥕','🥔','🧅','🍞','📚'] },
    ],
    explorers: [
      { instruction: 'Tap only COUNTRIES!', targets: ['India','Japan','Brazil','France','Egypt'], distractors: ['Paris','London','River','Mountain','Ocean'] },
    ],
    thinkers: [
      { instruction: 'Tap only RENEWABLE energy!', targets: ['Solar','Wind','Hydro','Biomass'], distractors: ['Coal','Oil','Gas','Nuclear','Diesel'] },
    ],
    advanced: [
      { instruction: 'Tap only FUNDAMENTAL RIGHTS!', targets: ['Equality','Freedom','Education','Life'], distractors: ['Voting','Tax','Driving','Business','Trade'] },
    ],
  },
  visualMemory: {
    early_learners: [
      { items: ['🍎','🐶','🌞','🌈'], questions: [{ question: 'Was there a rainbow?', options: ['Yes','No'], correctIndex: 0 }, { question: 'How many items were shown?', options: ['2','3','4','5'], correctIndex: 2 }] },
    ],
    explorers: [
      { items: ['India-Asia','Brazil-S.America','France-Europe','Egypt-Africa'], questions: [{ question: 'Which country was in Europe?', options: ['India','Brazil','France','Egypt'], correctIndex: 2 }] },
    ],
    thinkers: [
      { items: ['1947-Independence','1950-Republic','1969-Moon landing','1991-USSR dissolved'], questions: [{ question: 'When was India\'s Republic formed?', options: ['1947','1950','1969','1991'], correctIndex: 1 }] },
    ],
    advanced: [
      { items: ['GDP: $3.4T','Population: 1.4B','Area: 3.3M km²','Languages: 22'], questions: [{ question: 'What was the GDP?', options: ['$1.4T','$2.4T','$3.4T','$4.4T'], correctIndex: 2 }] },
    ],
  },
};

// ─── CONTENT ACCESS FUNCTION ───
type ContentKey = 'quiz' | 'pairs' | 'sort' | 'words' | 'speedTap' | 'visualMemory';

function getSubjectPool(subject: string) {
  const s = subject.toLowerCase().trim();
  if (['math', 'maths', 'mathematics'].some(m => s.includes(m))) return MATH_CONTENT;
  if (['science', 'physics', 'chemistry', 'biology', 'evs'].some(m => s.includes(m))) return SCIENCE_CONTENT;
  if (['english', 'hindi', 'language', 'grammar', 'literature'].some(m => s.includes(m))) return ENGLISH_CONTENT;
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

export function getQuizQuestions(subject: string, ageGroup: AgeGroupId): QuizQuestion[] {
  return getContent('quiz', subject, ageGroup) || [];
}

export function getMatchPairs(subject: string, ageGroup: AgeGroupId): MatchPair[] {
  return getContent('pairs', subject, ageGroup) || [];
}

export function getSortCategories(subject: string, ageGroup: AgeGroupId): SortCategory[] {
  return getContent('sort', subject, ageGroup) || [];
}

export function getWordEntries(subject: string, ageGroup: AgeGroupId): WordEntry[] {
  return getContent('words', subject, ageGroup) || [];
}

export function getSpeedTapRules(subject: string, ageGroup: AgeGroupId): SpeedTapRule[] {
  return getContent('speedTap', subject, ageGroup) || [];
}

export function getVisualMemorySets(subject: string, ageGroup: AgeGroupId): VisualMemorySet[] {
  return getContent('visualMemory', subject, ageGroup) || [];
}
