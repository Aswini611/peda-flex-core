import { useState, useEffect, useRef } from "react";
import { playCorrectSound, playWrongSound, playNextSound, playLevelUpSound } from "../sounds";

interface CauseEffectProps {
  onComplete: (result: { score: number; maxScore: number; accuracy: number; avgResponseTime: number; questionsAttempted: number; questionsCorrect: number; timeUsed: number; difficultyReached: number }) => void;
  ageStage: string;
}

interface CauseEffectPair {
  cause: string;
  effect: string;
}

const PAIRS_BY_DIFFICULTY: Record<number, CauseEffectPair[]> = {
  0: [
    { cause: "Rain falls", effect: "Ground gets wet" },
    { cause: "Sun heats water", effect: "Water evaporates" },
    { cause: "You eat food", effect: "You get energy" },
    { cause: "Ice melts", effect: "Water forms" },
    { cause: "Wind blows", effect: "Leaves move" },
    { cause: "You exercise", effect: "Heart beats faster" },
  ],
  1: [
    { cause: "Earth rotates", effect: "Day and night occur" },
    { cause: "Volcano erupts", effect: "Lava flows down" },
    { cause: "Plants photosynthesize", effect: "Oxygen is released" },
    { cause: "Moon's gravity pulls", effect: "Ocean tides change" },
    { cause: "Temperature drops", effect: "Water freezes" },
    { cause: "Lightning strikes", effect: "Thunder follows" },
  ],
  2: [
    { cause: "Deforestation increases", effect: "CO2 levels rise" },
    { cause: "Tectonic plates shift", effect: "Earthquakes occur" },
    { cause: "Ozone layer thins", effect: "UV radiation increases" },
    { cause: "Bacteria multiply", effect: "Infection spreads" },
    { cause: "Pressure increases", effect: "Boiling point rises" },
    { cause: "Light hits prism", effect: "Colors separate" },
  ],
  3: [
    { cause: "Neuron fires", effect: "Signal transmitted via synapse" },
    { cause: "DNA mutates", effect: "Protein structure changes" },
    { cause: "Star exhausts fuel", effect: "Supernova explosion occurs" },
    { cause: "Catalyst is added", effect: "Reaction rate increases" },
    { cause: "pH drops below 7", effect: "Solution becomes acidic" },
    { cause: "Electric current flows", effect: "Magnetic field is generated" },
  ],
};

interface Round {
  causes: string[];
  effects: string[];
  correctMap: Record<number, number>;
}

function generateRound(difficulty: number): Round {
  const pool = PAIRS_BY_DIFFICULTY[Math.min(difficulty, 3)];
  const count = Math.min(3 + Math.floor(difficulty / 2), 4);
  const selected: CauseEffectPair[] = [];
  const used = new Set<number>();
  while (selected.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    if (!used.has(idx)) { used.add(idx); selected.push(pool[idx]); }
  }

  const causes = selected.map((p) => p.cause);
  const shuffledEffects = [...selected].sort(() => Math.random() - 0.5);
  const correctMap: Record<number, number> = {};
  selected.forEach((p, ci) => {
    const ei = shuffledEffects.findIndex((se) => se.effect === p.effect);
    correctMap[ci] = ei;
  });

  return { causes, effects: shuffledEffects.map((p) => p.effect), correctMap };
}

export function CauseEffect({ onComplete, ageStage }: CauseEffectProps) {
  const timeLimit = 120;
  const [difficulty, setDifficulty] = useState(0);
  const [round, setRound] = useState<Round>(() => generateRound(0));
  const [selectedCause, setSelectedCause] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundNum, setRoundNum] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [feedback, setFeedback] = useState<{ idx: number; ok: boolean } | null>(null);
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
      maxScore: attempted * 15,
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

  const handleEffectClick = (effectIdx: number) => {
    if (selectedCause === null || matched.has(selectedCause)) return;
    responseTimes.current.push(Date.now() - qStart.current);
    setAttempted((p) => p + 1);

    const isCorrect = round.correctMap[selectedCause] === effectIdx;
    if (isCorrect) {
      setScore((p) => p + 15);
      setCorrect((p) => p + 1);
      const ns = streak + 1;
      setStreak(ns);
      setMatched((prev) => new Set(prev).add(selectedCause));
      setFeedback({ idx: effectIdx, ok: true });
      playCorrectSound();

      if (ns >= 3) {
        setDifficulty((p) => Math.min(p + 1, 3));
        setStreak(0);
        playLevelUpSound();
      }
    } else {
      setScore((p) => p - 5);
      setStreak(0);
      setFeedback({ idx: effectIdx, ok: false });
      playWrongSound();
    }

    setTimeout(() => {
      setFeedback(null);
      setSelectedCause(null);
      qStart.current = Date.now();
    }, 600);
  };

  // Check if all matched — advance to next round
  useEffect(() => {
    if (matched.size > 0 && matched.size >= round.causes.length) {
      setTimeout(() => {
        setRoundNum((p) => p + 1);
        setRound(generateRound(difficulty));
        setMatched(new Set());
        setSelectedCause(null);
        playNextSound();
      }, 1000);
    }
  }, [matched.size]);

  const timerColor = timeLeft > 60 ? "#22C55E" : timeLeft > 20 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col">
          <span className="text-sm font-medium" style={{ color: "#22C55E" }}>Round {roundNum + 1} · {matched.size}/{round.causes.length}</span>
          <span className="text-xs px-2 py-0.5 rounded-full mt-1" style={{ background: "rgba(34,197,94,0.2)", color: "#22C55E" }}>
            {["Very Easy", "Easy", "Medium", "Hard"][Math.min(difficulty, 3)]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold" style={{ color: "#F1F5F9" }}>Score: {score}</span>
          <span className="text-sm font-mono px-2 py-1 rounded" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: timerColor }}>
            {timeLeft}s
          </span>
        </div>
      </div>

      <p className="text-xs" style={{ color: "rgba(241,245,249,0.5)" }}>
        Select a cause on the left, then match it to the correct effect on the right
      </p>

      <div className="grid grid-cols-2 gap-4 w-full">
        {/* Causes */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-center mb-2" style={{ color: "#A855F7" }}>CAUSE</p>
          {round.causes.map((cause, i) => {
            const isMatched = matched.has(i);
            const isSelected = selectedCause === i;
            return (
              <button key={i} onClick={() => !isMatched && setSelectedCause(i)} disabled={isMatched}
                className="w-full p-3 rounded-xl text-sm text-left transition-all duration-200"
                style={{
                  background: isMatched ? "rgba(34,197,94,0.15)" : isSelected ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isMatched ? "rgba(34,197,94,0.4)" : isSelected ? "#A855F7" : "rgba(255,255,255,0.1)"}`,
                  color: isMatched ? "#22C55E" : "#F1F5F9",
                  opacity: isMatched ? 0.6 : 1,
                }}>
                {isMatched && "✅ "}{cause}
              </button>
            );
          })}
        </div>

        {/* Effects */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-center mb-2" style={{ color: "#38BDF8" }}>EFFECT</p>
          {round.effects.map((effect, i) => {
            const isFeedback = feedback?.idx === i;
            const matchedEffectIdxs = Array.from(matched).map((ci) => round.correctMap[ci]);
            const isUsed = matchedEffectIdxs.includes(i);
            return (
              <button key={i} onClick={() => !isUsed && handleEffectClick(i)} disabled={isUsed || selectedCause === null}
                className="w-full p-3 rounded-xl text-sm text-left transition-all duration-200"
                style={{
                  background: isUsed ? "rgba(34,197,94,0.15)" : isFeedback ? (feedback.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)") : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isUsed ? "rgba(34,197,94,0.4)" : isFeedback ? (feedback.ok ? "#22C55E" : "#EF4444") : "rgba(255,255,255,0.1)"}`,
                  color: isUsed ? "#22C55E" : "#F1F5F9",
                  opacity: isUsed ? 0.6 : 1,
                }}>
                {isUsed && "✅ "}{effect}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
