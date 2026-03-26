import { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGamification } from "@/hooks/useGamification";
import {
  GamePhase, GameResult, GAME_CONFIG, TIER_BADGES, COGNITIVE_BADGES,
} from "@/components/gamification/types";
import { PatternFlash } from "@/components/gamification/PatternFlash";
import { NumberBalance } from "@/components/gamification/NumberBalance";
import { WordProof } from "@/components/gamification/WordProof";
import { ShapeSequence } from "@/components/gamification/ShapeSequence";
import { RapidSort } from "@/components/gamification/RapidSort";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Brain, Zap, Trophy, Timer, ChevronDown, ChevronRight, Play,
  ArrowRight, X, Shield, Eye, BarChart3, Monitor, GraduationCap, AlertTriangle,
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Celebration (Confetti + Ribbons + Flowers) ─────────
const FLOWERS = ["🌸", "🌺", "🌼", "🌻", "🌷", "💐", "🏵️", "🌹"];
const RIBBONS = ["🎀", "🎗️", "🎊", "🎉", "✨", "⭐", "🎆", "🎇"];

function Confetti({ show }: { show: boolean }) {
  if (!show) return null;

  const pieces = Array.from({ length: 40 }, (_, i) => {
    const colors = ["#38BDF8", "#A855F7", "#84CC16", "#F59E0B", "#F472B6", "#22C55E", "#6366F1"];
    return {
      id: `c-${i}`,
      type: "confetti" as const,
      color: colors[i % colors.length],
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      duration: 2.5 + Math.random() * 2,
      size: 6 + Math.random() * 8,
      round: Math.random() > 0.5,
    };
  });

  const flowers = Array.from({ length: 18 }, (_, i) => ({
    id: `f-${i}`,
    type: "flower" as const,
    emoji: FLOWERS[i % FLOWERS.length],
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 2.5,
    duration: 3 + Math.random() * 2.5,
    size: 18 + Math.random() * 16,
    sway: (Math.random() - 0.5) * 120,
  }));

  const ribbons = Array.from({ length: 14 }, (_, i) => ({
    id: `r-${i}`,
    type: "ribbon" as const,
    emoji: RIBBONS[i % RIBBONS.length],
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 1.5,
    duration: 2.8 + Math.random() * 2,
    size: 20 + Math.random() * 14,
    sway: (Math.random() - 0.5) * 80,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Confetti pieces */}
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute celebration-fall"
          style={{
            left: p.left,
            top: "-20px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      {/* Flowers */}
      {flowers.map((f) => (
        <div
          key={f.id}
          className="absolute celebration-sway-fall"
          style={{
            left: f.left,
            top: "-40px",
            fontSize: f.size,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
            ["--sway" as string]: `${f.sway}px`,
          }}
        >
          {f.emoji}
        </div>
      ))}
      {/* Ribbons */}
      {ribbons.map((r) => (
        <div
          key={r.id}
          className="absolute celebration-sway-fall"
          style={{
            left: r.left,
            top: "-40px",
            fontSize: r.size,
            animationDelay: `${r.delay}s`,
            animationDuration: `${r.duration}s`,
            ["--sway" as string]: `${r.sway}px`,
          }}
        >
          {r.emoji}
        </div>
      ))}
      <style>{`
        @keyframes celebration-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .celebration-fall { animation: celebration-fall linear forwards; }

        @keyframes celebration-sway-fall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          25% { transform: translateY(25vh) translateX(var(--sway, 40px)) rotate(90deg); }
          50% { transform: translateY(50vh) translateX(calc(var(--sway, 40px) * -0.5)) rotate(180deg); }
          75% { transform: translateY(75vh) translateX(var(--sway, 40px)) rotate(270deg); opacity: 0.8; }
          100% { transform: translateY(100vh) translateX(0) rotate(360deg); opacity: 0; }
        }
        .celebration-sway-fall { animation: celebration-sway-fall ease-in-out forwards; }
      `}</style>
    </div>
  );
}

// ─── Circular Timer ──────────────────────────────────────
function CircularTimer({ timeLeft, total, size = 80 }: { timeLeft: number; total: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = timeLeft / total;
  const color = pct > 0.5 ? "#22C55E" : pct > 0.2 ? "#F59E0B" : "#EF4444";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        className="transition-all duration-1000"
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dy="5" fill={color} fontSize={size / 4} fontWeight="bold"
        className="transform rotate-90" style={{ transformOrigin: "center" }}>
        {timeLeft}
      </text>
    </svg>
  );
}

// ─── Score Ticker ────────────────────────────────────────
function ScoreTicker({ score }: { score: number }) {
  return (
    <div className="fixed top-4 right-4 z-40 px-4 py-2 rounded-xl shadow-lg"
      style={{ background: "rgba(99,102,241,0.9)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4" style={{ color: "#F59E0B" }} />
        <span className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{score}</span>
        <span className="text-xs" style={{ color: "rgba(241,245,249,0.6)" }}>pts</span>
      </div>
    </div>
  );
}

// ─── Progress Bar ────────────────────────────────────────
function GameProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: "rgba(241,245,249,0.5)" }}>Progress</span>
        <span className="text-xs font-medium" style={{ color: "#F1F5F9" }}>Game {Math.min(current + 1, total)} of {total}</span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(current / total) * 100}%`, background: "linear-gradient(90deg, #6366F1, #A855F7, #F472B6)" }} />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
const Gamification = () => {
  const { profile } = useAuth();
  const { awardXp } = useGamification();
  const studentName = profile?.full_name || "Student";

  const [phase, setPhase] = useState<GamePhase>("WELCOME");
  const [currentGame, setCurrentGame] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [bufferCount, setBufferCount] = useState(10);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [quitConfirm, setQuitConfirm] = useState(false);
  const timerActive = useRef(false);
  const startTimeRef = useRef<number>(0);

  // Elapsed time tracker
  useEffect(() => {
    if (!timerActive.current) return;
    const t = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Countdown
  useEffect(() => {
    if (phase !== "COUNTDOWN") return;
    if (countdown <= 0) {
      setPhase("PLAYING");
      return;
    }
    const t = setTimeout(() => setCountdown((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]);

  // Buffer between games
  useEffect(() => {
    if (phase !== "POST_GAME") return;
    // Show confetti
    setShowConfetti(true);
    const confettiTimer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(confettiTimer);
  }, [phase]);

  const startRound = () => {
    startTimeRef.current = Date.now();
    timerActive.current = true;
    setElapsedTime(0);
    setPhase("PRE_GAME");
  };

  const startCountdown = () => {
    setCountdown(3);
    setPhase("COUNTDOWN");
  };

  const handleGameComplete = (result: GameResult) => {
    setResults((prev) => [...prev, result]);
    setPhase("POST_GAME");
  };

  const goToNextGame = () => {
    if (currentGame + 1 >= GAME_CONFIG.length) {
      timerActive.current = false;
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      setPhase("RESULTS");
      // Award XP
      awardXp("complete_assessment", "Completed Gamification Round");
    } else {
      setCurrentGame((p) => p + 1);
      setPhase("PRE_GAME");
    }
  };

  const handleQuit = () => {
    timerActive.current = false;
    setPhase("RESULTS");
    setQuitConfirm(false);
  };

  const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const totalScore = results.reduce((s, r) => s + r.rawScore, 0);

  // Compute cognitive score
  const computeFinalScore = () => {
    if (results.length === 0) return 0;
    let weighted = 0;
    let totalWeight = 0;
    results.forEach((r) => {
      const config = GAME_CONFIG[r.gameIndex];
      const pct = r.maxScore > 0 ? (r.rawScore / r.maxScore) * 100 : 0;
      weighted += pct * config.weight;
      totalWeight += config.weight;
    });
    return totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
  };

  const cognitiveScore = computeFinalScore();
  const tier = TIER_BADGES.find((t) => cognitiveScore >= t.min && cognitiveScore <= t.max) || TIER_BADGES[0];

  const renderGame = () => {
    const props = { onComplete: handleGameComplete, studentName };
    switch (currentGame) {
      case 0: return <PatternFlash {...props} />;
      case 1: return <NumberBalance {...props} />;
      case 2: return <WordProof {...props} />;
      case 3: return <ShapeSequence {...props} />;
      case 4: return <RapidSort {...props} />;
      default: return null;
    }
  };

  const gameWrapper = (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0F172A 0%, #312E81 100%)" }}>
      <Confetti show={showConfetti} />

      {/* Elapsed timer - always visible during play */}
      {(phase === "PLAYING" || phase === "PRE_GAME" || phase === "COUNTDOWN" || phase === "POST_GAME") && (
        <div className="fixed top-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: "rgba(15,23,42,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Timer className="h-4 w-4" style={{ color: "#38BDF8" }} />
          <span className="text-sm font-mono font-bold" style={{ color: "#F1F5F9" }}>
            {formatElapsed(elapsedTime)}
          </span>
        </div>
      )}

      {phase === "PLAYING" && <ScoreTicker score={totalScore + (results.length < currentGame ? 0 : 0)} />}

      {(phase === "PLAYING" || phase === "PRE_GAME" || phase === "COUNTDOWN" || phase === "POST_GAME") && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-64">
          <GameProgressBar current={currentGame} total={GAME_CONFIG.length} />
        </div>
      )}

      <div className="flex items-center justify-center min-h-screen p-4 pt-20">
        {/* ─── WELCOME ────────────────────────── */}
        {phase === "WELCOME" && (
          <div className="text-center max-w-xl mx-auto animate-fade-in space-y-8">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #A855F7, #F472B6)" }}>
                🎮 Gamification Round
              </h1>
              <p className="text-lg" style={{ color: "rgba(241,245,249,0.7)" }}>
                Welcome, <span className="font-semibold" style={{ color: "#38BDF8" }}>{studentName}</span>
              </p>
            </div>

            <div className="flex justify-center gap-6">
              <div className="px-5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Timer className="h-5 w-5 mx-auto mb-1" style={{ color: "#38BDF8" }} />
                <p className="text-xs" style={{ color: "rgba(241,245,249,0.5)" }}>Timed</p>
                <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>Per Game</p>
              </div>
              <div className="px-5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Brain className="h-5 w-5 mx-auto mb-1" style={{ color: "#A855F7" }} />
                <p className="text-xs" style={{ color: "rgba(241,245,249,0.5)" }}>Games</p>
                <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>5</p>
              </div>
              <div className="px-5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Trophy className="h-5 w-5 mx-auto mb-1" style={{ color: "#F59E0B" }} />
                <p className="text-xs" style={{ color: "rgba(241,245,249,0.5)" }}>Dimensions</p>
                <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>5</p>
              </div>
            </div>

            {/* How to Play */}
            <div className="text-left rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Accordion type="single" collapsible>
                <AccordionItem value="howtoplay" className="border-none">
                  <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline" style={{ color: "#F1F5F9" }}>
                    📖 How to Play
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {GAME_CONFIG.map((g, i) => (
                        <div key={i} className="flex items-start gap-3 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                          <span className="text-lg">{g.icon}</span>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: g.color }}>{g.name}</p>
                            <p className="text-xs" style={{ color: "rgba(241,245,249,0.5)" }}>{g.objective}</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 space-y-1">
                        <p className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>💡 Tips:</p>
                        <p className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>• Work quickly — speed affects your score</p>
                        <p className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>• You cannot go back to previous questions</p>
                        <p className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>• Games are adaptive — they get harder as you improve</p>
                        <p className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>• Results are saved to your APAS profile</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* T&C */}
            <div className="flex items-center justify-center gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
              />
              <label htmlFor="terms" className="text-sm cursor-pointer" style={{ color: "rgba(241,245,249,0.6)" }}>
                I agree to the{" "}
                <button onClick={() => setTermsOpen(true)} className="underline font-medium" style={{ color: "#38BDF8" }}>
                  Terms & Conditions
                </button>
              </label>
            </div>

            <button
              onClick={startRound}
              disabled={!termsAccepted}
              className="relative px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              style={{
                background: termsAccepted ? "linear-gradient(135deg, #6366F1, #A855F7)" : "rgba(255,255,255,0.1)",
                color: "#F1F5F9",
                boxShadow: termsAccepted ? "0 0 40px rgba(99,102,241,0.4)" : "none",
              }}
            >
              {termsAccepted && <span className="absolute inset-0 rounded-2xl animate-pulse opacity-30"
                style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)" }} />}
              <span className="relative flex items-center gap-2">
                <Play className="h-5 w-5" /> START ROUND
              </span>
            </button>

            {/* T&C Modal */}
            <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
              <DialogContent className="max-w-lg" style={{ background: "#1E1B4B", border: "1px solid rgba(255,255,255,0.1)", color: "#F1F5F9" }}>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold" style={{ color: "#F1F5F9" }}>📋 Terms & Conditions</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-96 pr-4">
                  <div className="space-y-5 text-sm" style={{ color: "rgba(241,245,249,0.7)" }}>
                    <Section icon={<Shield className="h-4 w-4" style={{ color: "#38BDF8" }} />} title="Fair Play Policy">
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Complete the assessment independently without external help.</li>
                        <li>Use of calculators, reference materials, or assistance is prohibited.</li>
                        <li>Screen sharing, recording, or distribution of game content is not allowed.</li>
                      </ul>
                    </Section>
                    <Section icon={<Eye className="h-4 w-4" style={{ color: "#A855F7" }} />} title="Data & Privacy">
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Performance data is collected and stored securely to generate your cognitive profile.</li>
                        <li>Data is used only for educational analytics and personalized learning.</li>
                        <li>Data will not be shared with third parties without your consent.</li>
                      </ul>
                    </Section>
                    <Section icon={<BarChart3 className="h-4 w-4" style={{ color: "#84CC16" }} />} title="Scoring & Results">
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Scores are calculated algorithmically and are final.</li>
                        <li>Results are available immediately on your dashboard.</li>
                        <li>You may retake the round once every 7 days.</li>
                      </ul>
                    </Section>
                    <Section icon={<Monitor className="h-4 w-4" style={{ color: "#F59E0B" }} />} title="Technical Requirements">
                      <ul className="list-disc pl-4 space-y-1">
                        <li>A stable internet connection is required.</li>
                        <li>Do not refresh or close the browser during the round.</li>
                        <li>APAS is not responsible for technical failures on the student's end.</li>
                      </ul>
                    </Section>
                    <Section icon={<GraduationCap className="h-4 w-4" style={{ color: "#F472B6" }} />} title="Academic Use">
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Results may be shared with your institution's educators for learning support.</li>
                        <li>Results do not constitute official academic grades unless specified.</li>
                      </ul>
                    </Section>
                    <Section icon={<AlertTriangle className="h-4 w-4" style={{ color: "#EF4444" }} />} title="Conduct">
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Any attempt to exploit bugs, manipulate scores, or tamper with the system will result in disqualification and possible account suspension.</li>
                      </ul>
                    </Section>
                  </div>
                </ScrollArea>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setTermsAccepted(true); setTermsOpen(false); }}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                    style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)", color: "#F1F5F9" }}>
                    Accept & Continue
                  </button>
                  <button onClick={() => setTermsOpen(false)}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                    style={{ background: "rgba(255,255,255,0.1)", color: "rgba(241,245,249,0.6)" }}>
                    Decline
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ─── PRE_GAME ───────────────────────── */}
        {phase === "PRE_GAME" && (
          <div className="text-center max-w-md mx-auto animate-fade-in space-y-6">
            <div className="text-6xl mb-4">{GAME_CONFIG[currentGame].icon}</div>
            <h2 className="text-3xl font-extrabold" style={{ color: GAME_CONFIG[currentGame].color }}>
              {GAME_CONFIG[currentGame].name}
            </h2>
            <p className="text-sm" style={{ color: "rgba(241,245,249,0.6)" }}>
              {GAME_CONFIG[currentGame].dimension}
            </p>
            <p className="text-base" style={{ color: "#F1F5F9" }}>{GAME_CONFIG[currentGame].objective}</p>

            <div className="space-y-2 text-left p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "rgba(241,245,249,0.4)" }}>HOW TO PLAY</p>
              {GAME_CONFIG[currentGame].rules.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" style={{ color: GAME_CONFIG[currentGame].color }} />
                  <span className="text-sm" style={{ color: "rgba(241,245,249,0.7)" }}>{r}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <div className="px-4 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
                <span className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>⏱</span>
                <span className="text-sm font-bold ml-1" style={{ color: "#F1F5F9" }}>{GAME_CONFIG[currentGame].timeLimit}s</span>
              </div>
              <div className="px-4 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
                <span className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>📊</span>
                <span className="text-sm font-bold ml-1" style={{ color: "#F1F5F9" }}>{GAME_CONFIG[currentGame].scoring}</span>
              </div>
            </div>

            <button onClick={startCountdown}
              className="px-8 py-3 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: GAME_CONFIG[currentGame].color, color: "#0F172A" }}>
              Ready? Let's Go! 🚀
            </button>
          </div>
        )}

        {/* ─── COUNTDOWN ──────────────────────── */}
        {phase === "COUNTDOWN" && (
          <div className="text-center animate-scale-in">
            <div className="text-9xl font-black" style={{
              color: countdown > 0 ? GAME_CONFIG[currentGame].color : "#22C55E",
              textShadow: `0 0 60px ${GAME_CONFIG[currentGame].color}80`,
            }}>
              {countdown > 0 ? countdown : "GO!"}
            </div>
          </div>
        )}

        {/* ─── PLAYING ────────────────────────── */}
        {phase === "PLAYING" && (
          <div className="w-full max-w-2xl mx-auto animate-fade-in">
            {/* Quit button */}
            <button onClick={() => setQuitConfirm(true)}
              className="fixed bottom-4 right-4 z-40 p-2 rounded-full"
              style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <X className="h-5 w-5" style={{ color: "#EF4444" }} />
            </button>

            {renderGame()}

            {/* Quit confirmation */}
            <Dialog open={quitConfirm} onOpenChange={setQuitConfirm}>
              <DialogContent style={{ background: "#1E1B4B", border: "1px solid rgba(255,255,255,0.1)", color: "#F1F5F9" }}>
                <DialogHeader>
                  <DialogTitle style={{ color: "#F1F5F9" }}>Quit Game?</DialogTitle>
                </DialogHeader>
                <p className="text-sm" style={{ color: "rgba(241,245,249,0.6)" }}>
                  Are you sure? Your progress will be saved with partial results.
                </p>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleQuit} className="flex-1 py-2 rounded-xl font-semibold text-sm"
                    style={{ background: "rgba(239,68,68,0.3)", border: "1px solid rgba(239,68,68,0.5)", color: "#EF4444" }}>
                    Yes, Quit
                  </button>
                  <button onClick={() => setQuitConfirm(false)} className="flex-1 py-2 rounded-xl font-semibold text-sm"
                    style={{ background: "rgba(255,255,255,0.1)", color: "#F1F5F9" }}>
                    Continue Playing
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ─── POST_GAME ──────────────────────── */}
        {phase === "POST_GAME" && results.length > 0 && (
          <div className="text-center max-w-md mx-auto animate-fade-in space-y-6">
            {(() => {
              const r = results[results.length - 1];
              const speedRating = r.avgResponseTime < 1500 ? "Fast ⚡" : r.avgResponseTime < 3000 ? "Average 🏃" : "Slow 🐢";
              return (
                <>
                  <div className="text-5xl mb-2">{GAME_CONFIG[r.gameIndex].icon}</div>
                  <h2 className="text-2xl font-bold" style={{ color: GAME_CONFIG[r.gameIndex].color }}>
                    {r.gameName} — Complete!
                  </h2>

                  <div className="grid grid-cols-3 gap-4">
                    <StatBox label="Score" value={String(r.rawScore)} color="#6366F1" />
                    <StatBox label="Accuracy" value={`${r.accuracy}%`} color="#22C55E" />
                    <StatBox label="Speed" value={speedRating} color="#F59E0B" />
                  </div>

                  <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <p className="text-xs mb-1" style={{ color: "rgba(241,245,249,0.4)" }}>Badge Unlocked</p>
                    <p className="text-lg font-bold" style={{ color: GAME_CONFIG[r.gameIndex].color }}>
                      {COGNITIVE_BADGES[r.gameIndex]}
                    </p>
                  </div>

                  <button onClick={goToNextGame}
                    className="px-8 py-3 rounded-xl font-bold text-base transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
                    style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)", color: "#F1F5F9" }}>
                    {currentGame + 1 >= GAME_CONFIG.length ? (
                      <>View Results <BarChart3 className="h-5 w-5" /></>
                    ) : (
                      <>Next Game <ArrowRight className="h-5 w-5" /></>
                    )}
                  </button>
                </>
              );
            })()}
          </div>
        )}

        {/* ─── RESULTS ────────────────────────── */}
        {phase === "RESULTS" && (
          <div className="w-full max-w-2xl mx-auto animate-fade-in space-y-6 pb-8">
            <div className="text-center space-y-3">
              <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #A855F7, #F472B6)" }}>
                🏆 Final Results
              </h1>
              <p className="text-sm" style={{ color: "rgba(241,245,249,0.5)" }}>
                Completed in {formatElapsed(elapsedTime)}
              </p>
            </div>

            {/* Overall Score Gauge */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <CircularTimer timeLeft={cognitiveScore} total={100} size={160} />
              </div>
              <p className="text-lg font-bold mt-2" style={{ color: "#F1F5F9" }}>
                Cognitive Score: {cognitiveScore}/100
              </p>
              <div className="mt-1 px-4 py-1.5 rounded-full text-sm font-bold"
                style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#A855F7" }}>
                {tier.emoji} {tier.label}
              </div>
            </div>

            {/* Radar Chart */}
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-semibold text-center mb-2" style={{ color: "rgba(241,245,249,0.4)" }}>COGNITIVE PROFILE</p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={GAME_CONFIG.map((g, i) => {
                  const r = results.find((r) => r.gameIndex === i);
                  return {
                    dimension: g.dimension.split(" ")[0],
                    score: r ? Math.round((r.rawScore / Math.max(r.maxScore, 1)) * 100) : 0,
                  };
                })}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: "rgba(241,245,249,0.6)", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="score" stroke="#6366F1" fill="#6366F1" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                    <th className="text-left p-3 font-semibold" style={{ color: "rgba(241,245,249,0.5)" }}>Game</th>
                    <th className="text-center p-3 font-semibold" style={{ color: "rgba(241,245,249,0.5)" }}>Score</th>
                    <th className="text-center p-3 font-semibold" style={{ color: "rgba(241,245,249,0.5)" }}>Accuracy</th>
                    <th className="text-center p-3 font-semibold" style={{ color: "rgba(241,245,249,0.5)" }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td className="p-3 font-medium" style={{ color: GAME_CONFIG[r.gameIndex].color }}>
                        {GAME_CONFIG[r.gameIndex].icon} {r.gameName}
                      </td>
                      <td className="text-center p-3 font-bold" style={{ color: "#F1F5F9" }}>{r.rawScore}</td>
                      <td className="text-center p-3" style={{ color: r.accuracy >= 70 ? "#22C55E" : r.accuracy >= 40 ? "#F59E0B" : "#EF4444" }}>
                        {r.accuracy}%
                      </td>
                      <td className="text-center p-3" style={{ color: "rgba(241,245,249,0.6)" }}>{r.timeUsed}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => { setPhase("WELCOME"); setResults([]); setCurrentGame(0); setElapsedTime(0); setTermsAccepted(false); }}
                className="px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#F1F5F9" }}>
                🔄 Retake Round
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return <AppLayout>{gameWrapper}</AppLayout>;
};

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p className="text-xs mb-1" style={{ color: "rgba(241,245,249,0.4)" }}>{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-semibold" style={{ color: "#F1F5F9" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default Gamification;
