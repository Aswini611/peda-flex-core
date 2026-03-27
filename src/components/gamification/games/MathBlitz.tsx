import { useState, useEffect, useRef } from "react";
import { playCorrectSound, playWrongSound, playNextSound, playLevelUpSound } from "../sounds";

interface MathBlitzProps {
  onComplete: (result: { score: number; maxScore: number; accuracy: number; avgResponseTime: number; questionsAttempted: number; questionsCorrect: number; timeUsed: number; difficultyReached: number }) => void;
  ageStage: string;
  brainLevel: string;
}

interface MathQuestion {
  display: string;
  answer: number;
  options: number[];
}

function generateQuestion(difficulty: number, ageStage: string): MathQuestion {
  const ops = difficulty <= 1 ? ["+", "-"] : ["+", "-", "×"];
  if (difficulty >= 4) ops.push("÷");

  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  const maxNum = ageStage === "explorer" ? 10 + difficulty * 3 : ageStage === "builder" ? 20 + difficulty * 5 : 50 + difficulty * 10;

  switch (op) {
    case "+":
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * maxNum) + 2;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * Math.min(12, maxNum / 2)) + 1;
      b = Math.floor(Math.random() * Math.min(12, maxNum / 2)) + 1;
      answer = a * b;
      break;
    case "÷":
      b = Math.floor(Math.random() * 10) + 2;
      answer = Math.floor(Math.random() * 10) + 1;
      a = b * answer;
      break;
    default:
      a = 1; b = 1; answer = 2;
  }

  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const wrong = answer + (offset === 0 ? 1 : offset);
    if (wrong >= 0) options.add(wrong);
  }

  return {
    display: `${a} ${op} ${b} = ?`,
    answer,
    options: Array.from(options).sort(() => Math.random() - 0.5),
  };
}

export function MathBlitz({ onComplete, ageStage, brainLevel }: MathBlitzProps) {
  const timeLimit = ageStage === "explorer" ? 60 : ageStage === "builder" ? 75 : 90;
  const [difficulty, setDifficulty] = useState(0);
  const [question, setQuestion] = useState<MathQuestion>(() => generateQuestion(0, ageStage));
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [feedback, setFeedback] = useState<string | null>(null);
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

  const handleAnswer = (opt: number) => {
    responseTimes.current.push(Date.now() - qStart.current);
    setAttempted((p) => p + 1);
    const isCorrect = opt === question.answer;

    let newDiff = difficulty;
    if (isCorrect) {
      setScore((p) => p + 15);
      setCorrect((p) => p + 1);
      const ns = streak + 1;
      setStreak(ns);
      if (ns >= 2) { newDiff = Math.min(difficulty + 1, 6); setStreak(0); playLevelUpSound(); }
      setFeedback("✅");
      playCorrectSound();
    } else {
      setScore((p) => p - 5);
      setStreak(0);
      newDiff = Math.max(difficulty - 1, 0);
      setFeedback("❌");
      playWrongSound();
    }
    setDifficulty(newDiff);

    setTimeout(() => {
      setFeedback(null);
      setQuestion(generateQuestion(newDiff, ageStage));
      qStart.current = Date.now();
      playNextSound();
    }, 500);
  };

  const timerColor = timeLeft > timeLimit * 0.5 ? "#22C55E" : timeLeft > timeLimit * 0.2 ? "#F59E0B" : "#EF4444";
  const LABELS = ["Very Easy", "Easy", "Medium", "Hard", "Very Hard", "Expert", "Master"];

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col">
          <span className="text-sm font-medium" style={{ color: "#A855F7" }}>Q{attempted + 1}</span>
          <span className="text-xs px-2 py-0.5 rounded-full mt-1" style={{ background: "rgba(168,85,247,0.2)", color: "#A855F7" }}>
            {LABELS[Math.min(difficulty, LABELS.length - 1)]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold" style={{ color: "#F1F5F9" }}>Score: {score}</span>
          <span className="text-sm font-mono px-2 py-1 rounded" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: timerColor }}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {feedback && (
        <div className="text-4xl font-bold animate-fade-in">{feedback}</div>
      )}

      {!feedback && (
        <>
          <div className="text-4xl md:text-5xl font-black text-center py-8" style={{ color: "#F1F5F9" }}>
            {question.display}
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="py-5 rounded-xl text-2xl font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#F1F5F9" }}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      {streak >= 2 && (
        <div className="text-xs font-bold animate-pulse" style={{ color: "#F59E0B" }}>
          🔥 {streak} streak!
        </div>
      )}
    </div>
  );
}
