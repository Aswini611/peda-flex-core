import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Brain, Zap, Trophy, Timer, ChevronRight, Play,
  ArrowRight, X, Shield, Eye, BarChart3, Monitor, GraduationCap, AlertTriangle,
  Sparkles, Star, Target, Flame, Gamepad2, Award, Rocket, Music,
} from "lucide-react";
import { playCountdownBeep, playGoSound, playVictorySound, playClickSound } from "@/components/gamification/sounds";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

/* ═══════════════════════════════════════════════════════════
   ANIMATED BACKGROUND — floating orbs + grid
   ═══════════════════════════════════════════════════════════ */
function AnimatedBackground() {
  const orbs = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    id: i,
    size: 200 + Math.random() * 300,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: ["#6366F1", "#A855F7", "#38BDF8", "#F472B6", "#84CC16", "#F59E0B"][i],
    duration: 15 + Math.random() * 20,
    delay: Math.random() * -20,
  })), []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      {/* Floating orbs */}
      {orbs.map(o => (
        <div key={o.id} className="absolute rounded-full orb-float" style={{
          width: o.size, height: o.size,
          left: `${o.x}%`, top: `${o.y}%`,
          background: `radial-gradient(circle, ${o.color}15, transparent 70%)`,
          filter: "blur(40px)",
          animationDuration: `${o.duration}s`,
          animationDelay: `${o.delay}s`,
        }} />
      ))}

      {/* Shooting stars */}
      <div className="shooting-star" style={{ top: "15%", animationDelay: "0s" }} />
      <div className="shooting-star" style={{ top: "45%", animationDelay: "4s" }} />
      <div className="shooting-star" style={{ top: "75%", animationDelay: "8s" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLOATING PARTICLES — tiny sparkles
   ═══════════════════════════════════════════════════════════ */
function FloatingParticles() {
  const particles = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 3,
    x: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 8,
    opacity: 0.2 + Math.random() * 0.5,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full particle-rise" style={{
          width: p.size, height: p.size,
          left: `${p.x}%`,
          bottom: "-10px",
          background: "#fff",
          opacity: p.opacity,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CELEBRATION — confetti + ribbons + flowers
   ═══════════════════════════════════════════════════════════ */
const FLOWERS = ["🌸", "🌺", "🌼", "🌻", "🌷", "💐", "🏵️", "🌹"];
const RIBBONS = ["🎀", "🎗️", "🎊", "🎉", "✨", "⭐", "🎆", "🎇"];

function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 50 }, (_, i) => {
    const colors = ["#38BDF8", "#A855F7", "#84CC16", "#F59E0B", "#F472B6", "#22C55E", "#6366F1"];
    return { id: `c-${i}`, color: colors[i % colors.length], left: `${Math.random() * 100}%`, delay: Math.random() * 2, duration: 2.5 + Math.random() * 2, size: 6 + Math.random() * 10, round: Math.random() > 0.5 };
  });
  const flowers = Array.from({ length: 20 }, (_, i) => ({ id: `f-${i}`, emoji: FLOWERS[i % FLOWERS.length], left: `${Math.random() * 100}%`, delay: Math.random() * 2.5, duration: 3 + Math.random() * 2.5, size: 20 + Math.random() * 16, sway: (Math.random() - 0.5) * 120 }));
  const ribbons = Array.from({ length: 16 }, (_, i) => ({ id: `r-${i}`, emoji: RIBBONS[i % RIBBONS.length], left: `${Math.random() * 100}%`, delay: Math.random() * 1.5, duration: 2.8 + Math.random() * 2, size: 22 + Math.random() * 14, sway: (Math.random() - 0.5) * 80 }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div key={p.id} className="absolute celebration-fall" style={{ left: p.left, top: "-20px", width: p.size, height: p.size, backgroundColor: p.color, borderRadius: p.round ? "50%" : "2px", animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }} />
      ))}
      {flowers.map(f => (
        <div key={f.id} className="absolute celebration-sway-fall" style={{ left: f.left, top: "-40px", fontSize: f.size, animationDelay: `${f.delay}s`, animationDuration: `${f.duration}s`, ["--sway" as string]: `${f.sway}px` }}>{f.emoji}</div>
      ))}
      {ribbons.map(r => (
        <div key={r.id} className="absolute celebration-sway-fall" style={{ left: r.left, top: "-40px", fontSize: r.size, animationDelay: `${r.delay}s`, animationDuration: `${r.duration}s`, ["--sway" as string]: `${r.sway}px` }}>{r.emoji}</div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CIRCULAR TIMER
   ═══════════════════════════════════════════════════════════ */
function CircularTimer({ timeLeft, total, size = 80 }: { timeLeft: number; total: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = timeLeft / total;
  const color = pct > 0.5 ? "#22C55E" : pct > 0.2 ? "#F59E0B" : "#EF4444";
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" className="transition-all duration-1000" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dy="5" fill={color} fontSize={size / 4} fontWeight="bold"
        className="transform rotate-90" style={{ transformOrigin: "center" }}>{timeLeft}</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCORE TICKER — bouncy animated
   ═══════════════════════════════════════════════════════════ */
function ScoreTicker({ score }: { score: number }) {
  const [pop, setPop] = useState(false);
  const prevScore = useRef(score);
  useEffect(() => {
    if (score !== prevScore.current) { setPop(true); setTimeout(() => setPop(false), 400); prevScore.current = score; }
  }, [score]);
  return (
    <div className={`fixed top-4 right-4 z-40 px-5 py-2.5 rounded-2xl shadow-2xl transition-transform duration-300 ${pop ? "scale-125" : "scale-100"}`}
      style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(168,85,247,0.9))", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.2)" }}>
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-yellow-400 animate-pulse" />
        <span className="text-xl font-black tabular-nums" style={{ color: "#F1F5F9" }}>{score}</span>
        <span className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.6)" }}>pts</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROGRESS BAR — gradient animated
   ═══════════════════════════════════════════════════════════ */
function GameProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.5)" }}>Progress</span>
        <span className="text-xs font-bold" style={{ color: "#F1F5F9" }}>Game {Math.min(current + 1, total)} of {total}</span>
      </div>
      <div className="w-full h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out progress-glow"
          style={{ width: `${(current / total) * 100}%`, background: "linear-gradient(90deg, #6366F1, #A855F7, #F472B6)" }} />
      </div>
      {/* Game dots */}
      <div className="flex justify-between mt-2 px-1">
        {GAME_CONFIG.map((g, i) => (
          <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-500 ${i < current ? "scale-100" : i === current ? "scale-110 ring-2 ring-white/30" : "scale-90 opacity-40"}`}
            style={{ background: i < current ? g.color : i === current ? `${g.color}90` : "rgba(255,255,255,0.1)", color: i <= current ? "#0F172A" : "rgba(241,245,249,0.3)", fontWeight: 700 }}>
            {i < current ? "✓" : g.icon}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GLASS CARD wrapper
   ═══════════════════════════════════════════════════════════ */
function GlassCard({ children, className = "", glow = "" }: { children: React.ReactNode; className?: string; glow?: string }) {
  return (
    <div className={`rounded-2xl p-6 relative overflow-hidden ${className}`}
      style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: glow ? `0 0 40px ${glow}20, inset 0 1px 0 rgba(255,255,255,0.1)` : "inset 0 1px 0 rgba(255,255,255,0.1)" }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════════ */
function AnimatedCounter({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <>{display}</>;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const Gamification = () => {
  const { profile } = useAuth();
  const { awardXp } = useGamification();
  const studentName = profile?.full_name || "Student";

  const [phase, setPhase] = useState<GamePhase>("WELCOME");
  const [currentGame, setCurrentGame] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [countdown, setCountdown] = useState(3);
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
    if (countdown <= 0) { playGoSound(); setPhase("PLAYING"); return; }
    playCountdownBeep();
    const t = setTimeout(() => setCountdown(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]);

  // Confetti on post-game
  useEffect(() => {
    if (phase !== "POST_GAME") return;
    playVictorySound();
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, [phase]);

  const startRound = () => {
    startTimeRef.current = Date.now();
    timerActive.current = true;
    setElapsedTime(0);
    setPhase("PRE_GAME");
  };

  const startCountdown = () => { setCountdown(3); setPhase("COUNTDOWN"); };

  const handleGameComplete = (result: GameResult) => {
    setResults(prev => [...prev, result]);
    setPhase("POST_GAME");
  };

  const goToNextGame = () => {
    if (currentGame + 1 >= GAME_CONFIG.length) {
      timerActive.current = false;
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 6000);
      setPhase("RESULTS");
      awardXp("complete_assessment", "Completed Gamification Round");
    } else {
      setCurrentGame(p => p + 1);
      setPhase("PRE_GAME");
    }
  };

  const handleQuit = () => { timerActive.current = false; setPhase("RESULTS"); setQuitConfirm(false); };
  const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const totalScore = results.reduce((s, r) => s + r.rawScore, 0);

  const computeFinalScore = () => {
    if (results.length === 0) return 0;
    let weighted = 0, totalWeight = 0;
    results.forEach(r => {
      const config = GAME_CONFIG[r.gameIndex];
      const pct = r.maxScore > 0 ? (r.rawScore / r.maxScore) * 100 : 0;
      weighted += pct * config.weight;
      totalWeight += config.weight;
    });
    return totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
  };

  const cognitiveScore = computeFinalScore();
  const tier = TIER_BADGES.find(t => cognitiveScore >= t.min && cognitiveScore <= t.max) || TIER_BADGES[0];

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
    <div className="min-h-screen relative" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1e1147 50%, #312E81 100%)" }}>
      <AnimatedBackground />
      <FloatingParticles />
      <Confetti show={showConfetti} />

      {/* Elapsed timer */}
      {(phase === "PLAYING" || phase === "PRE_GAME" || phase === "COUNTDOWN" || phase === "POST_GAME") && (
        <div className="fixed top-4 left-4 z-40 flex items-center gap-2 px-4 py-2 rounded-2xl timer-glow"
          style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(16px)", border: "1px solid rgba(56,189,248,0.2)" }}>
          <Timer className="h-4 w-4 animate-pulse" style={{ color: "#38BDF8" }} />
          <span className="text-sm font-mono font-black tabular-nums" style={{ color: "#F1F5F9" }}>
            {formatElapsed(elapsedTime)}
          </span>
        </div>
      )}

      {phase === "PLAYING" && <ScoreTicker score={totalScore} />}

      {(phase === "PLAYING" || phase === "PRE_GAME" || phase === "COUNTDOWN" || phase === "POST_GAME") && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-72">
          <GameProgressBar current={currentGame} total={GAME_CONFIG.length} />
        </div>
      )}

      <div className="flex items-center justify-center min-h-screen p-4 pt-24 relative z-10">

        {/* ─── WELCOME ─── */}
        {phase === "WELCOME" && (
          <div className="text-center max-w-2xl mx-auto space-y-8 welcome-enter">
            {/* Animated hero icon with orbiting elements */}
            <div className="relative w-40 h-40 mx-auto">
              {/* Outer rotating gradient ring */}
              <div className="absolute inset-0 rounded-full animate-spin-slow" style={{ background: "conic-gradient(from 0deg, #6366F1, #A855F7, #F472B6, #38BDF8, #84CC16, #F59E0B, #6366F1)", padding: 4 }}>
                <div className="w-full h-full rounded-full" style={{ background: "#0F172A" }} />
              </div>
              {/* Inner pulsing glow */}
              <div className="absolute inset-3 rounded-full animate-pulse" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.3), transparent 70%)" }} />
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center text-6xl game-icon-bounce">🎮</div>
              {/* Orbiting particles */}
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="absolute w-3 h-3 rounded-full orbit-particle" style={{
                  background: ["#6366F1", "#A855F7", "#38BDF8", "#F59E0B"][i],
                  boxShadow: `0 0 12px ${["#6366F1", "#A855F7", "#38BDF8", "#F59E0B"][i]}`,
                  animationDelay: `${i * -1.5}s`,
                  top: "50%", left: "50%",
                }} />
              ))}
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight title-glow"
                style={{ background: "linear-gradient(135deg, #6366F1 0%, #A855F7 25%, #F472B6 50%, #38BDF8 75%, #84CC16 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Gamification Round
              </h1>
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-12" style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.5))" }} />
                <Sparkles className="h-5 w-5 animate-pulse" style={{ color: "#F59E0B" }} />
                <p className="text-xl font-medium" style={{ color: "rgba(241,245,249,0.7)" }}>
                  Welcome, <span className="font-black" style={{ background: "linear-gradient(135deg, #38BDF8, #6366F1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{studentName}</span>
                </p>
                <Sparkles className="h-5 w-5 animate-pulse" style={{ color: "#F59E0B" }} />
                <div className="h-px w-12" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.5), transparent)" }} />
              </div>
            </div>

            {/* Enhanced stat cards with animated icons */}
            <div className="flex justify-center gap-5">
              {[
                { icon: <Timer className="h-7 w-7" />, color: "#38BDF8", glow: "rgba(56,189,248,0.3)", label: "TIMED", value: "Per Game", emoji: "⏱️" },
                { icon: <Gamepad2 className="h-7 w-7" />, color: "#A855F7", glow: "rgba(168,85,247,0.3)", label: "GAMES", value: "5", emoji: "🎯" },
                { icon: <Trophy className="h-7 w-7" />, color: "#F59E0B", glow: "rgba(245,158,11,0.3)", label: "DIMENSIONS", value: "5", emoji: "🏆" },
              ].map((s, i) => (
                <div key={i} className="stat-card group relative px-7 py-5 rounded-2xl cursor-default transition-all duration-500 hover:scale-110 hover:-translate-y-2"
                  style={{ background: `linear-gradient(135deg, ${s.color}10, ${s.color}05)`, border: `1px solid ${s.color}30`, boxShadow: `0 4px 30px ${s.glow}`, animationDelay: `${i * 0.15}s` }}>
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at center, ${s.color}15, transparent 70%)` }} />
                  <div className="relative">
                    <div className="mx-auto mb-3 w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" style={{ background: `${s.color}20`, color: s.color, boxShadow: `0 0 20px ${s.color}20` }}>
                      {s.icon}
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: `${s.color}80` }}>{s.label}</p>
                    <p className="text-2xl font-black mt-1" style={{ color: "#F1F5F9" }}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* How to Play — enhanced */}
            <GlassCard className="text-left">
              <Accordion type="single" collapsible>
                <AccordionItem value="howtoplay" className="border-none">
                  <AccordionTrigger className="text-sm font-bold py-2 hover:no-underline" style={{ color: "#F1F5F9" }}>
                    <span className="flex items-center gap-2"><Target className="h-4 w-4" style={{ color: "#38BDF8" }} /> How to Play</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2.5 pt-2">
                      {GAME_CONFIG.map((g, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group"
                          style={{ background: `${g.color}08`, border: `1px solid ${g.color}15` }}>
                          <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{g.icon}</span>
                          <div>
                            <p className="text-sm font-bold" style={{ color: g.color }}>{g.name}</p>
                            <p className="text-xs" style={{ color: "rgba(241,245,249,0.5)" }}>{g.objective}</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-3 space-y-1.5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-xs font-bold flex items-center gap-1" style={{ color: "rgba(241,245,249,0.5)" }}><Star className="h-3 w-3" /> Tips</p>
                        {["Work quickly — speed affects your score", "You cannot go back to previous questions", "Games are adaptive — they get harder as you improve!", "Results are saved to your APAS profile"].map((tip, i) => (
                          <p key={i} className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>• {tip}</p>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </GlassCard>

            {/* T&C checkbox */}
            <div className="flex items-center justify-center gap-3">
              <Checkbox id="terms" checked={termsAccepted} onCheckedChange={c => setTermsAccepted(!!c)}
                className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500" />
              <label htmlFor="terms" className="text-sm cursor-pointer" style={{ color: "rgba(241,245,249,0.6)" }}>
                I agree to the{" "}
                <button onClick={() => setTermsOpen(true)} className="underline font-semibold hover:brightness-125 transition-all" style={{ color: "#38BDF8" }}>
                  Terms & Conditions
                </button>
              </label>
            </div>

            {/* Enhanced start button */}
            <button onClick={() => { playClickSound(); startRound(); }} disabled={!termsAccepted}
              className="group relative px-14 py-6 rounded-2xl text-xl font-black tracking-wide transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
              style={{
                background: termsAccepted ? "linear-gradient(135deg, #6366F1, #A855F7, #F472B6)" : "rgba(255,255,255,0.1)",
                color: "#F1F5F9",
                boxShadow: termsAccepted ? "0 0 60px rgba(99,102,241,0.5), 0 0 120px rgba(168,85,247,0.2), 0 8px 32px rgba(0,0,0,0.3)" : "none",
              }}>
              {termsAccepted && <>
                <span className="absolute inset-0 rounded-2xl opacity-50 blur-xl" style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)" }} />
                <span className="absolute inset-0 rounded-2xl animate-pulse opacity-20" style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)" }} />
                {/* Sparkle particles around button */}
                <span className="absolute -top-2 -right-2 text-lg animate-bounce">✨</span>
                <span className="absolute -bottom-1 -left-2 text-sm animate-bounce" style={{ animationDelay: "0.3s" }}>⭐</span>
              </>}
              <span className="relative flex items-center gap-3">
                <Rocket className="h-6 w-6 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-300" /> START ROUND
              </span>
            </button>

            {/* T&C Modal (unchanged) */}
            <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
              <DialogContent className="max-w-lg" style={{ background: "linear-gradient(135deg, #1E1B4B, #0F172A)", border: "1px solid rgba(255,255,255,0.1)", color: "#F1F5F9" }}>
                <DialogHeader>
                  <DialogTitle className="text-xl font-black flex items-center gap-2" style={{ color: "#F1F5F9" }}>
                    <Shield className="h-5 w-5" style={{ color: "#6366F1" }} /> Terms & Conditions
                  </DialogTitle>
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
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)", color: "#F1F5F9" }}>
                    Accept & Continue
                  </button>
                  <button onClick={() => setTermsOpen(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(241,245,249,0.6)" }}>
                    Decline
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ─── PRE_GAME ─── */}
        {phase === "PRE_GAME" && (
          <div className="text-center max-w-md mx-auto space-y-6 pregame-enter">
            {/* Animated game icon */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: GAME_CONFIG[currentGame].color }} />
              <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: `${GAME_CONFIG[currentGame].color}20`, border: `2px solid ${GAME_CONFIG[currentGame].color}40` }} />
              <div className="absolute inset-0 flex items-center justify-center text-5xl game-icon-bounce">{GAME_CONFIG[currentGame].icon}</div>
            </div>

            <div>
              <h2 className="text-3xl font-black" style={{ color: GAME_CONFIG[currentGame].color }}>
                {GAME_CONFIG[currentGame].name}
              </h2>
              <p className="text-sm mt-1 font-medium" style={{ color: "rgba(241,245,249,0.5)" }}>
                {GAME_CONFIG[currentGame].dimension}
              </p>
            </div>

            <p className="text-base font-medium" style={{ color: "#F1F5F9" }}>{GAME_CONFIG[currentGame].objective}</p>

            <GlassCard glow={GAME_CONFIG[currentGame].color}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: "rgba(241,245,249,0.4)" }}>HOW TO PLAY</p>
              {GAME_CONFIG[currentGame].rules.map((r, i) => (
                <div key={i} className="flex items-start gap-2 mb-2" style={{ animationDelay: `${i * 0.1}s` }}>
                  <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" style={{ color: GAME_CONFIG[currentGame].color }} />
                  <span className="text-sm text-left" style={{ color: "rgba(241,245,249,0.7)" }}>{r}</span>
                </div>
              ))}
            </GlassCard>

            <div className="flex justify-center gap-4">
              {[
                { emoji: "⏱", value: `${GAME_CONFIG[currentGame].timeLimit}s`, label: "Time" },
                { emoji: "📊", value: GAME_CONFIG[currentGame].scoring, label: "Scoring" },
              ].map((b, i) => (
                <div key={i} className="px-5 py-3 rounded-xl text-center" style={{ background: `${GAME_CONFIG[currentGame].color}10`, border: `1px solid ${GAME_CONFIG[currentGame].color}20` }}>
                  <span className="text-lg">{b.emoji}</span>
                  <p className="text-sm font-bold mt-1" style={{ color: "#F1F5F9" }}>{b.value}</p>
                  <p className="text-[10px] uppercase" style={{ color: "rgba(241,245,249,0.4)" }}>{b.label}</p>
                </div>
              ))}
            </div>

            <button onClick={startCountdown}
              className="group px-10 py-4 rounded-2xl font-black text-lg transition-all duration-300 hover:scale-110 active:scale-95"
              style={{ background: GAME_CONFIG[currentGame].color, color: "#0F172A", boxShadow: `0 0 40px ${GAME_CONFIG[currentGame].color}50` }}>
              <span className="flex items-center gap-2">Ready? Let's Go! <Zap className="h-5 w-5 group-hover:rotate-12 transition-transform" /></span>
            </button>
          </div>
        )}

        {/* ─── COUNTDOWN ─── */}
        {phase === "COUNTDOWN" && (
          <div className="text-center countdown-pop">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full animate-ping opacity-10" style={{ background: GAME_CONFIG[currentGame].color }} />
              </div>
              <div className="text-[10rem] font-black leading-none" style={{
                color: countdown > 0 ? GAME_CONFIG[currentGame].color : "#22C55E",
                textShadow: `0 0 80px ${countdown > 0 ? GAME_CONFIG[currentGame].color : "#22C55E"}80, 0 0 160px ${countdown > 0 ? GAME_CONFIG[currentGame].color : "#22C55E"}30`,
                filter: "drop-shadow(0 0 30px currentColor)",
              }}>
                {countdown > 0 ? countdown : "GO!"}
              </div>
            </div>
          </div>
        )}

        {/* ─── PLAYING ─── */}
        {phase === "PLAYING" && (
          <div className="w-full max-w-2xl mx-auto game-enter">
            <button onClick={() => setQuitConfirm(true)}
              className="fixed bottom-4 right-4 z-40 p-3 rounded-full transition-all hover:scale-110"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", backdropFilter: "blur(8px)" }}>
              <X className="h-5 w-5" style={{ color: "#EF4444" }} />
            </button>
            {renderGame()}
            <Dialog open={quitConfirm} onOpenChange={setQuitConfirm}>
              <DialogContent style={{ background: "linear-gradient(135deg, #1E1B4B, #0F172A)", border: "1px solid rgba(255,255,255,0.1)", color: "#F1F5F9" }}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2" style={{ color: "#F1F5F9" }}>
                    <AlertTriangle className="h-5 w-5" style={{ color: "#EF4444" }} /> Quit Game?
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm" style={{ color: "rgba(241,245,249,0.6)" }}>
                  Are you sure? Your progress will be saved with partial results.
                </p>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleQuit} className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
                    style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", color: "#EF4444" }}>
                    Yes, Quit
                  </button>
                  <button onClick={() => setQuitConfirm(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
                    style={{ background: "rgba(255,255,255,0.08)", color: "#F1F5F9" }}>
                    Continue Playing
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ─── POST_GAME ─── */}
        {phase === "POST_GAME" && results.length > 0 && (
          <div className="text-center max-w-md mx-auto space-y-6 postgame-enter">
            {(() => {
              const r = results[results.length - 1];
              const speedRating = r.avgResponseTime < 1500 ? "Fast ⚡" : r.avgResponseTime < 3000 ? "Average 🏃" : "Slow 🐢";
              return (
                <>
                  {/* Trophy animation */}
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: GAME_CONFIG[r.gameIndex].color }} />
                    <div className="absolute inset-0 flex items-center justify-center text-5xl trophy-bounce">🏆</div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black" style={{ color: GAME_CONFIG[r.gameIndex].color }}>
                      {r.gameName}
                    </h2>
                    <p className="text-lg font-bold mt-1" style={{ color: "#22C55E" }}>Complete! ✨</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Score", value: String(r.rawScore), color: "#6366F1" },
                      { label: "Accuracy", value: `${r.accuracy}%`, color: "#22C55E" },
                      { label: "Speed", value: speedRating, color: "#F59E0B" },
                    ].map((s, i) => (
                      <GlassCard key={i} glow={s.color} className="!p-4">
                        <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(241,245,249,0.4)" }}>{s.label}</p>
                        <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                      </GlassCard>
                    ))}
                  </div>

                  <GlassCard glow={GAME_CONFIG[r.gameIndex].color}>
                    <div className="flex items-center justify-center gap-3">
                      <Sparkles className="h-5 w-5" style={{ color: GAME_CONFIG[r.gameIndex].color }} />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(241,245,249,0.4)" }}>Badge Unlocked</p>
                        <p className="text-lg font-black" style={{ color: GAME_CONFIG[r.gameIndex].color }}>
                          {COGNITIVE_BADGES[r.gameIndex]}
                        </p>
                      </div>
                      <Sparkles className="h-5 w-5" style={{ color: GAME_CONFIG[r.gameIndex].color }} />
                    </div>
                  </GlassCard>

                  <button onClick={goToNextGame}
                    className="group px-10 py-4 rounded-2xl font-black text-base transition-all duration-300 hover:scale-110 active:scale-95 flex items-center gap-3 mx-auto"
                    style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)", color: "#F1F5F9", boxShadow: "0 0 40px rgba(99,102,241,0.4)" }}>
                    {currentGame + 1 >= GAME_CONFIG.length ? (
                      <>View Results <BarChart3 className="h-5 w-5 group-hover:scale-110 transition-transform" /></>
                    ) : (
                      <>Next Game <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>
                </>
              );
            })()}
          </div>
        )}

        {/* ─── RESULTS ─── */}
        {phase === "RESULTS" && (
          <div className="w-full max-w-2xl mx-auto space-y-8 pb-8 results-enter">
            <div className="text-center space-y-3">
              <div className="text-5xl mb-2">🏆</div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight"
                style={{ background: "linear-gradient(135deg, #6366F1, #A855F7, #F472B6, #38BDF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Final Results
              </h1>
              <p className="text-sm font-medium" style={{ color: "rgba(241,245,249,0.5)" }}>
                Completed in {formatElapsed(elapsedTime)}
              </p>
            </div>

            {/* Overall Score */}
            <GlassCard className="text-center" glow="#6366F1">
              <div className="relative inline-block">
                <CircularTimer timeLeft={cognitiveScore} total={100} size={180} />
              </div>
              <p className="text-xl font-black mt-3" style={{ color: "#F1F5F9" }}>
                Cognitive Score: <AnimatedCounter value={cognitiveScore} />/100
              </p>
              <div className="mt-2 inline-block px-6 py-2 rounded-full text-sm font-black"
                style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#A855F7" }}>
                {tier.emoji} {tier.label}
              </div>
            </GlassCard>

            {/* Radar Chart */}
            <GlassCard>
              <p className="text-[10px] uppercase tracking-widest font-bold text-center mb-3" style={{ color: "rgba(241,245,249,0.4)" }}>COGNITIVE PROFILE</p>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={GAME_CONFIG.map((g, i) => {
                  const r = results.find(r => r.gameIndex === i);
                  return { dimension: g.dimension.split(" ")[0], score: r ? Math.round((r.rawScore / Math.max(r.maxScore, 1)) * 100) : 0, fullMark: 100 };
                })}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: "rgba(241,245,249,0.6)", fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="score" stroke="#6366F1" fill="url(#radarGrad)" strokeWidth={2.5} dot={{ fill: "#A855F7", r: 4 }} />
                  <defs>
                    <linearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#A855F7" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Breakdown */}
            <GlassCard className="!p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                    {["Game", "Score", "Accuracy", "Time"].map(h => (
                      <th key={h} className={`p-4 font-bold text-[10px] uppercase tracking-widest ${h === "Game" ? "text-left" : "text-center"}`}
                        style={{ color: "rgba(241,245,249,0.4)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="transition-colors hover:bg-white/[0.03]" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td className="p-4 font-bold" style={{ color: GAME_CONFIG[r.gameIndex].color }}>
                        <span className="mr-2">{GAME_CONFIG[r.gameIndex].icon}</span>{r.gameName}
                      </td>
                      <td className="text-center p-4 font-black" style={{ color: "#F1F5F9" }}>{r.rawScore}</td>
                      <td className="text-center p-4 font-bold" style={{ color: r.accuracy >= 70 ? "#22C55E" : r.accuracy >= 40 ? "#F59E0B" : "#EF4444" }}>
                        {r.accuracy}%
                      </td>
                      <td className="text-center p-4" style={{ color: "rgba(241,245,249,0.6)" }}>{r.timeUsed}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>

            <div className="flex gap-3 justify-center">
              <button onClick={() => { setPhase("WELCOME"); setResults([]); setCurrentGame(0); setElapsedTime(0); setTermsAccepted(false); }}
                className="group px-8 py-4 rounded-2xl font-black text-sm transition-all duration-300 hover:scale-105"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#F1F5F9" }}>
                <span className="flex items-center gap-2">🔄 Retake Round</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global animation styles */}
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

        @keyframes orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 30px) scale(0.9); }
          75% { transform: translate(40px, 20px) scale(1.05); }
        }
        .orb-float { animation: orb-float ease-in-out infinite; }

        @keyframes particle-rise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-100vh) translateX(${Math.random() > 0.5 ? '' : '-'}40px); opacity: 0; }
        }
        .particle-rise { animation: particle-rise linear infinite; }

        @keyframes shooting-star {
          0% { transform: translateX(-100px) translateY(0); opacity: 0; width: 0; }
          5% { opacity: 1; }
          30% { opacity: 0; width: 200px; }
          100% { transform: translateX(100vw) translateY(200px); opacity: 0; width: 0; }
        }
        .shooting-star {
          position: absolute;
          height: 1px;
          background: linear-gradient(90deg, transparent, #38BDF8, transparent);
          animation: shooting-star 12s linear infinite;
        }

        @keyframes welcome-enter {
          0% { opacity: 0; transform: translateY(40px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .welcome-enter { animation: welcome-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes pregame-enter {
          0% { opacity: 0; transform: scale(0.8) rotate(-2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        .pregame-enter { animation: pregame-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

        @keyframes game-enter {
          0% { opacity: 0; transform: translateX(60px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .game-enter { animation: game-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes postgame-enter {
          0% { opacity: 0; transform: scale(0.9) translateY(30px); }
          60% { transform: scale(1.02) translateY(-5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .postgame-enter { animation: postgame-enter 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

        @keyframes results-enter {
          0% { opacity: 0; transform: translateY(60px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .results-enter { animation: results-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes countdown-pop {
          0% { opacity: 0; transform: scale(3); }
          50% { opacity: 1; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        .countdown-pop { animation: countdown-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

        @keyframes trophy-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-12px) rotate(-5deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-6px) rotate(5deg); }
        }
        .trophy-bounce { animation: trophy-bounce 2s ease-in-out infinite; }

        @keyframes game-icon-bounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.15) rotate(-5deg); }
          50% { transform: scale(1) rotate(0deg); }
          75% { transform: scale(1.1) rotate(5deg); }
        }
        .game-icon-bounce { animation: game-icon-bounce 2.5s ease-in-out infinite; }

        .title-glow { filter: drop-shadow(0 0 30px rgba(99,102,241,0.4)); }

        .timer-glow { box-shadow: 0 0 20px rgba(56,189,248,0.15), inset 0 1px 0 rgba(255,255,255,0.1); }

        .progress-glow { box-shadow: 0 0 12px rgba(99,102,241,0.4); }

        .stat-card { animation: welcome-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </div>
  );

  return <AppLayout>{gameWrapper}</AppLayout>;
};

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(241,245,249,0.4)" }}>{label}</p>
      <p className="text-xl font-black" style={{ color }}>{value}</p>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-bold" style={{ color: "#F1F5F9" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default Gamification;
