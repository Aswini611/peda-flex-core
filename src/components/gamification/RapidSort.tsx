import { useState, useEffect, useRef, useCallback } from "react";
import { GameProps, GameResult } from "./types";

interface SortRule {
  description: string;
  leftLabel: string;
  rightLabel: string;
  classify: (item: string) => "left" | "right";
}

const RULES: SortRule[] = [
  {
    description: "Even → Left, Odd → Right",
    leftLabel: "EVEN",
    rightLabel: "ODD",
    classify: (item) => (parseInt(item) % 2 === 0 ? "left" : "right"),
  },
  {
    description: "Living → Left, Non-living → Right",
    leftLabel: "LIVING",
    rightLabel: "NON-LIVING",
    classify: (item) => {
      const living = ["Cat", "Dog", "Tree", "Fish", "Bird", "Flower", "Horse", "Bee", "Frog", "Whale"];
      return living.includes(item) ? "left" : "right";
    },
  },
  {
    description: "Vowel start → Left, Consonant start → Right",
    leftLabel: "VOWEL",
    rightLabel: "CONSONANT",
    classify: (item) => ("AEIOUaeiou".includes(item[0]) ? "left" : "right"),
  },
  {
    description: "Number < 50 → Left, ≥ 50 → Right",
    leftLabel: "< 50",
    rightLabel: "≥ 50",
    classify: (item) => (parseInt(item) < 50 ? "left" : "right"),
  },
];

const ITEMS_POOL: Record<number, string[]> = {
  0: ["2", "7", "14", "33", "8", "15", "22", "41", "6", "19", "30", "55", "12", "9", "44", "27"],
  1: ["Cat", "Rock", "Dog", "Chair", "Tree", "Phone", "Fish", "Table", "Bird", "Lamp", "Flower", "Book", "Horse", "Car", "Bee", "Pencil"],
  2: ["Apple", "Banana", "Orange", "Mango", "Kiwi", "Grape", "Peach", "Plum", "Avocado", "Berry", "Cherry", "Date", "Fig", "Ice", "Olive", "Umbrella"],
  3: ["12", "55", "8", "73", "44", "91", "23", "67", "5", "82", "31", "49", "60", "15", "88", "37"],
};

export function RapidSort({ onComplete }: GameProps) {
  const [ruleIndex, setRuleIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [ruleTimeLeft, setRuleTimeLeft] = useState(20);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [missed, setMissed] = useState(0);
  const responseTimes = useRef<number[]>([]);
  const itemStart = useRef(Date.now());
  const startTime = useRef(Date.now());
  const itemTimer = useRef<ReturnType<typeof setTimeout>>();

  const rule = RULES[ruleIndex % RULES.length];
  const pool = ITEMS_POOL[ruleIndex % Object.keys(ITEMS_POOL).length];

  const spawnItem = useCallback(() => {
    const items = pool;
    const item = items[Math.floor(Math.random() * items.length)];
    setCurrentItem(item);
    itemStart.current = Date.now();

    clearTimeout(itemTimer.current);
    itemTimer.current = setTimeout(() => {
      // Missed
      setMissed((p) => p + 1);
      setScore((p) => p - 2);
      setAttempted((p) => p + 1);
      spawnItem();
    }, 4000);
  }, [pool]);

  useEffect(() => {
    startTime.current = Date.now();
    spawnItem();
    return () => clearTimeout(itemTimer.current);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) { finishGame(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  useEffect(() => {
    if (ruleTimeLeft <= 0) {
      setRuleIndex((p) => p + 1);
      setRuleTimeLeft(20);
      return;
    }
    const t = setTimeout(() => setRuleTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [ruleTimeLeft]);

  const finishGame = () => {
    clearTimeout(itemTimer.current);
    const timeUsed = Math.round((Date.now() - startTime.current) / 1000);
    const avgResp = responseTimes.current.length > 0
      ? Math.round(responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length)
      : 0;
    onComplete({
      gameIndex: 4,
      gameName: "Rapid Sort",
      rawScore: Math.max(0, score),
      maxScore: attempted * 8,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      avgResponseTime: avgResp,
      questionsAttempted: attempted,
      questionsCorrect: correct,
      timeUsed,
      timeLimit: 90,
    });
  };

  const handleSort = (side: "left" | "right") => {
    clearTimeout(itemTimer.current);
    const respTime = Date.now() - itemStart.current;
    responseTimes.current.push(respTime);
    setAttempted((p) => p + 1);

    const correctSide = rule.classify(currentItem);
    if (side === correctSide) {
      setScore((p) => p + 8);
      setCorrect((p) => p + 1);
      setFeedback("✅");
    } else {
      setScore((p) => p - 4);
      setFeedback("❌");
    }

    setTimeout(() => {
      setFeedback(null);
      spawnItem();
    }, 400);
  };

  const timerColor = timeLeft > 45 ? "#22C55E" : timeLeft > 15 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-medium" style={{ color: "#F472B6" }}>Sorted: {attempted}</span>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold" style={{ color: "#F1F5F9" }}>Score: {score}</span>
          <span className="text-sm font-mono px-2 py-1 rounded" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: timerColor }}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Rule display */}
      <div className="w-full text-center p-3 rounded-xl" style={{ background: "rgba(244,114,182,0.15)", border: "1px solid rgba(244,114,182,0.3)" }}>
        <p className="text-xs mb-1" style={{ color: "rgba(244,114,182,0.7)" }}>CURRENT RULE (changes in {ruleTimeLeft}s)</p>
        <p className="text-sm font-bold" style={{ color: "#F472B6" }}>{rule.description}</p>
      </div>

      {/* Item card */}
      <div className="relative">
        <div
          className="w-40 h-40 flex items-center justify-center rounded-2xl text-3xl font-bold animate-fade-in"
          style={{ background: "rgba(255,255,255,0.08)", border: "2px solid rgba(244,114,182,0.4)", color: "#F1F5F9" }}
        >
          {feedback ? (
            <span className="text-4xl">{feedback}</span>
          ) : (
            currentItem
          )}
        </div>
      </div>

      {/* Sort buttons */}
      <div className="flex gap-4 w-full">
        <button
          onClick={() => handleSort("left")}
          className="flex-1 py-5 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.4)", color: "#A855F7" }}
        >
          ⬅ {rule.leftLabel}
        </button>
        <button
          onClick={() => handleSort("right")}
          className="flex-1 py-5 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: "rgba(56,189,248,0.25)", border: "1px solid rgba(56,189,248,0.4)", color: "#38BDF8" }}
        >
          {rule.rightLabel} ➡
        </button>
      </div>
    </div>
  );
}
