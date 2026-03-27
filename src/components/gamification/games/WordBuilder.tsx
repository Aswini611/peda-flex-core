import { useState, useEffect, useRef, useCallback } from "react";
import { playCorrectSound, playWrongSound, playNextSound, playLevelUpSound } from "../sounds";

interface WordBuilderProps {
  onComplete: (result: { score: number; maxScore: number; accuracy: number; avgResponseTime: number; questionsAttempted: number; questionsCorrect: number; timeUsed: number; difficultyReached: number }) => void;
  ageStage: string;
}

interface WordChallenge {
  scrambled: string[];
  answer: string;
  hint: string;
}

const WORD_POOLS: Record<number, { word: string; hint: string }[]> = {
  0: [
    { word: "CAT", hint: "A pet that purrs" },
    { word: "DOG", hint: "Man's best friend" },
    { word: "SUN", hint: "Bright star in sky" },
    { word: "CUP", hint: "You drink from it" },
    { word: "BIG", hint: "Not small" },
    { word: "RED", hint: "Color of fire" },
  ],
  1: [
    { word: "TREE", hint: "Has leaves and branches" },
    { word: "FISH", hint: "Lives in water" },
    { word: "BOOK", hint: "You read it" },
    { word: "STAR", hint: "Shines at night" },
    { word: "LAMP", hint: "Gives light" },
    { word: "RAIN", hint: "Water from clouds" },
  ],
  2: [
    { word: "HOUSE", hint: "Where you live" },
    { word: "RIVER", hint: "Flowing water body" },
    { word: "PLANE", hint: "Flies in the sky" },
    { word: "BRAIN", hint: "You think with it" },
    { word: "CHAIR", hint: "Sit on it" },
    { word: "LIGHT", hint: "Opposite of dark" },
  ],
  3: [
    { word: "PLANET", hint: "Earth is one" },
    { word: "BRIDGE", hint: "Crosses over water" },
    { word: "MIRROR", hint: "Shows reflection" },
    { word: "CASTLE", hint: "Kings lived here" },
    { word: "JUNGLE", hint: "Dense forest" },
    { word: "FROZEN", hint: "Turned to ice" },
  ],
  4: [
    { word: "LIBRARY", hint: "Books are stored here" },
    { word: "VOLCANO", hint: "Mountain that erupts" },
    { word: "PYRAMID", hint: "Ancient Egyptian structure" },
    { word: "GRAVITY", hint: "Pulls things down" },
    { word: "MYSTERY", hint: "Something unknown" },
    { word: "KINGDOM", hint: "Ruled by a king" },
  ],
};

function scramble(word: string): string[] {
  const letters = word.split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  if (letters.join("") === word) {
    [letters[0], letters[letters.length - 1]] = [letters[letters.length - 1], letters[0]];
  }
  return letters;
}

function getChallenge(difficulty: number): WordChallenge {
  const pool = WORD_POOLS[Math.min(difficulty, 4)];
  const item = pool[Math.floor(Math.random() * pool.length)];
  return { scrambled: scramble(item.word), answer: item.word, hint: item.hint };
}

export function WordBuilder({ onComplete, ageStage }: WordBuilderProps) {
  const timeLimit = ageStage === "explorer" ? 90 : 120;
  const [difficulty, setDifficulty] = useState(0);
  const [challenge, setChallenge] = useState<WordChallenge>(() => getChallenge(0));
  const [selected, setSelected] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [showHint, setShowHint] = useState(false);
  const startTime = useRef(Date.now());
  const responseTimes = useRef<number[]>([]);
  const qStart = useRef(Date.now());

  useEffect(() => {
    if (timeLeft <= 0) { finish(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const finish = () => {
    onComplete({
      score: Math.max(0, score),
      maxScore: attempted * 20,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      avgResponseTime: responseTimes.current.length > 0
        ? Math.round(responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length)
        : 0,
      questionsAttempted: attempted,
      questionsCorrect: correct,
      timeUsed: Math.round((Date.now() - startTime.current) / 1000),
      difficultyReached: difficulty,
    });
  };

  const currentWord = selected.map((i) => challenge.scrambled[i]).join("");
  const isComplete = selected.length === challenge.scrambled.length;

  useEffect(() => {
    if (!isComplete) return;
    responseTimes.current.push(Date.now() - qStart.current);
    setAttempted((p) => p + 1);

    if (currentWord === challenge.answer) {
      setScore((p) => p + 20);
      setCorrect((p) => p + 1);
      const ns = streak + 1;
      setStreak(ns);
      if (ns >= 2) { setDifficulty((p) => Math.min(p + 1, 4)); setStreak(0); playLevelUpSound(); }
      playCorrectSound();
    } else {
      setScore((p) => p - 5);
      setStreak(0);
      setDifficulty((p) => Math.max(p - 1, 0));
      playWrongSound();
    }

    setTimeout(() => {
      const nd = currentWord === challenge.answer ? difficulty : Math.max(difficulty - 1, 0);
      setChallenge(getChallenge(nd));
      setSelected([]);
      setShowHint(false);
      qStart.current = Date.now();
      playNextSound();
    }, 800);
  }, [isComplete]);

  const toggleLetter = (idx: number) => {
    if (isComplete) return;
    if (selected.includes(idx)) {
      setSelected(selected.filter((i) => i !== idx));
    } else {
      setSelected([...selected, idx]);
    }
  };

  const timerColor = timeLeft > timeLimit * 0.5 ? "#22C55E" : timeLeft > timeLimit * 0.2 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col">
          <span className="text-sm font-medium" style={{ color: "#38BDF8" }}>Word {attempted + 1}</span>
          <span className="text-xs px-2 py-0.5 rounded-full mt-1" style={{ background: "rgba(56,189,248,0.2)", color: "#38BDF8" }}>
            {["Very Easy", "Easy", "Medium", "Hard", "Expert"][Math.min(difficulty, 4)]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold" style={{ color: "#F1F5F9" }}>Score: {score}</span>
          <span className="text-sm font-mono px-2 py-1 rounded" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: timerColor }}>
            {timeLeft}s
          </span>
        </div>
      </div>

      <button onClick={() => setShowHint(true)} className="text-xs px-3 py-1 rounded-full transition-all hover:scale-105"
        style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
        {showHint ? `💡 ${challenge.hint}` : "💡 Show Hint (-5 pts)"}
      </button>

      {/* Current word being built */}
      <div className="flex gap-2 min-h-[60px] items-center justify-center">
        {challenge.scrambled.map((_, i) => (
          <div key={i} className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-black"
            style={{
              background: selected[i] !== undefined ? "rgba(56,189,248,0.3)" : "rgba(255,255,255,0.05)",
              border: `2px ${selected.length === i ? "dashed" : "solid"} ${selected[i] !== undefined ? "#38BDF8" : "rgba(255,255,255,0.15)"}`,
              color: "#F1F5F9",
            }}>
            {selected[i] !== undefined ? challenge.scrambled[selected[i]] : ""}
          </div>
        ))}
      </div>

      {/* Scrambled letters */}
      <div className="flex gap-2 flex-wrap justify-center">
        {challenge.scrambled.map((letter, i) => {
          const isUsed = selected.includes(i);
          return (
            <button key={i} onClick={() => toggleLetter(i)} disabled={isComplete}
              className="w-14 h-14 rounded-xl text-2xl font-black transition-all duration-200 hover:scale-110 active:scale-95"
              style={{
                background: isUsed ? "rgba(255,255,255,0.03)" : "rgba(56,189,248,0.2)",
                border: `1px solid ${isUsed ? "rgba(255,255,255,0.05)" : "rgba(56,189,248,0.4)"}`,
                color: isUsed ? "rgba(241,245,249,0.2)" : "#F1F5F9",
                transform: isUsed ? "scale(0.85)" : undefined,
              }}>
              {letter}
            </button>
          );
        })}
      </div>

      <button onClick={() => { setSelected([]); }}
        className="text-xs px-4 py-2 rounded-lg transition-all hover:scale-105"
        style={{ background: "rgba(239,68,68,0.2)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>
        🔄 Reset
      </button>
    </div>
  );
}
