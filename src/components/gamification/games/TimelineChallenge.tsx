import { useState, useEffect, useRef } from "react";
import { playCorrectSound, playWrongSound, playNextSound, playLevelUpSound } from "../sounds";

interface TimelineChallengeProps {
  onComplete: (result: { score: number; maxScore: number; accuracy: number; avgResponseTime: number; questionsAttempted: number; questionsCorrect: number; timeUsed: number; difficultyReached: number }) => void;
  ageStage: string;
}

interface TimelineEvent {
  event: string;
  year: number;
}

const EVENTS_BY_DIFFICULTY: Record<number, TimelineEvent[]> = {
  0: [
    { event: "Telephone invented", year: 1876 },
    { event: "First airplane flight", year: 1903 },
    { event: "Television invented", year: 1927 },
    { event: "First moon landing", year: 1969 },
    { event: "Internet created", year: 1983 },
    { event: "Smartphone released", year: 2007 },
  ],
  1: [
    { event: "Printing press invented", year: 1440 },
    { event: "Columbus reaches Americas", year: 1492 },
    { event: "French Revolution", year: 1789 },
    { event: "Electric light bulb", year: 1879 },
    { event: "World War I begins", year: 1914 },
    { event: "World War II ends", year: 1945 },
  ],
  2: [
    { event: "Great Wall of China started", year: -700 },
    { event: "Roman Empire founded", year: -27 },
    { event: "Fall of Roman Empire", year: 476 },
    { event: "Magna Carta signed", year: 1215 },
    { event: "Renaissance begins", year: 1400 },
    { event: "Industrial Revolution", year: 1760 },
  ],
  3: [
    { event: "Indus Valley Civilization", year: -2500 },
    { event: "Egyptian Pyramids built", year: -2560 },
    { event: "Democracy in Athens", year: -508 },
    { event: "Maurya Empire founded", year: -322 },
    { event: "Silk Road established", year: -130 },
    { event: "Gupta Golden Age", year: 320 },
  ],
};

interface Round {
  events: TimelineEvent[];
  correctOrder: number[];
}

function generateRound(difficulty: number): Round {
  const pool = EVENTS_BY_DIFFICULTY[Math.min(difficulty, 3)];
  const count = Math.min(3 + difficulty, 5);
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  const correctOrder = shuffled
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.year - b.e.year)
    .map((x) => x.i);

  return { events: shuffled, correctOrder };
}

export function TimelineChallenge({ onComplete, ageStage }: TimelineChallengeProps) {
  const timeLimit = 120;
  const [difficulty, setDifficulty] = useState(0);
  const [round, setRound] = useState<Round>(() => generateRound(0));
  const [userOrder, setUserOrder] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundNum, setRoundNum] = useState(0);
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
      maxScore: attempted * 25,
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

  const toggleEvent = (idx: number) => {
    if (feedback) return;
    if (userOrder.includes(idx)) {
      setUserOrder(userOrder.filter((i) => i !== idx));
    } else {
      setUserOrder([...userOrder, idx]);
    }
  };

  const submitOrder = () => {
    if (userOrder.length !== round.events.length) return;
    responseTimes.current.push(Date.now() - qStart.current);
    setAttempted((p) => p + 1);

    const isCorrect = userOrder.every((v, i) => v === round.correctOrder[i]);
    let newDiff = difficulty;

    if (isCorrect) {
      setScore((p) => p + 25);
      setCorrect((p) => p + 1);
      const ns = streak + 1;
      setStreak(ns);
      if (ns >= 2) { newDiff = Math.min(difficulty + 1, 3); setStreak(0); playLevelUpSound(); }
      setFeedback("✅ Perfect order!");
      playCorrectSound();
    } else {
      setScore((p) => p - 5);
      setStreak(0);
      newDiff = Math.max(difficulty - 1, 0);
      setFeedback("❌ Wrong order!");
      playWrongSound();
    }
    setDifficulty(newDiff);

    setTimeout(() => {
      setFeedback(null);
      setRoundNum((p) => p + 1);
      setRound(generateRound(newDiff));
      setUserOrder([]);
      qStart.current = Date.now();
      playNextSound();
    }, 1500);
  };

  const timerColor = timeLeft > 60 ? "#22C55E" : timeLeft > 20 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col">
          <span className="text-sm font-medium" style={{ color: "#F59E0B" }}>Round {roundNum + 1}</span>
          <span className="text-xs px-2 py-0.5 rounded-full mt-1" style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B" }}>
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

      <p className="text-xs text-center" style={{ color: "rgba(241,245,249,0.5)" }}>
        📅 Arrange these events from oldest to newest by clicking them in order
      </p>

      {feedback && (
        <div className="text-xl font-bold animate-fade-in" style={{ color: feedback.includes("✅") ? "#22C55E" : "#EF4444" }}>
          {feedback}
          {feedback.includes("✅") ? null : (
            <div className="text-xs mt-2" style={{ color: "rgba(241,245,249,0.5)" }}>
              Correct: {round.correctOrder.map((i) => round.events[i].event).join(" → ")}
            </div>
          )}
        </div>
      )}

      {!feedback && (
        <>
          {/* User's current order */}
          {userOrder.length > 0 && (
            <div className="w-full space-y-1">
              <p className="text-xs font-bold" style={{ color: "rgba(241,245,249,0.4)" }}>Your order:</p>
              {userOrder.map((idx, pos) => (
                <div key={pos} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(245,158,11,0.3)", color: "#F59E0B" }}>{pos + 1}</span>
                  <span className="text-sm" style={{ color: "#F1F5F9" }}>{round.events[idx].event}</span>
                </div>
              ))}
            </div>
          )}

          {/* Available events */}
          <div className="w-full space-y-2">
            {round.events.map((event, i) => {
              const isPlaced = userOrder.includes(i);
              return (
                <button key={i} onClick={() => toggleEvent(i)}
                  className="w-full p-4 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-95"
                  style={{
                    background: isPlaced ? "rgba(255,255,255,0.03)" : "rgba(245,158,11,0.1)",
                    border: `1px solid ${isPlaced ? "rgba(255,255,255,0.05)" : "rgba(245,158,11,0.3)"}`,
                    color: isPlaced ? "rgba(241,245,249,0.3)" : "#F1F5F9",
                  }}>
                  <span className="font-medium">{event.event}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setUserOrder([])}
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ background: "rgba(239,68,68,0.2)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              🔄 Reset
            </button>
            <button onClick={submitOrder} disabled={userOrder.length !== round.events.length}
              className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-30"
              style={{ background: "rgba(34,197,94,0.3)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.4)" }}>
              ✅ Submit Order
            </button>
          </div>
        </>
      )}
    </div>
  );
}
