import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGameProfile } from "@/hooks/useGameProfile";
import { useGamification } from "@/hooks/useGamification";
import { getAgeStage } from "@/components/gamification/config/ageStages";
import { getBrainLevel, getNextBrainLevel, getBrainLevelProgress, BRAIN_LEVELS } from "@/components/gamification/config/brainLevels";
import { GAME_CATEGORIES, SUBJECT_GAMES, getSubjectGames } from "@/components/gamification/config/gameCategories";
import { MathBlitz } from "@/components/gamification/games/MathBlitz";
import { WordBuilder } from "@/components/gamification/games/WordBuilder";
import { CauseEffect } from "@/components/gamification/games/CauseEffect";
import { TimelineChallenge } from "@/components/gamification/games/TimelineChallenge";
import { useNavigate } from "react-router-dom";
import {
  Brain, Zap, Trophy, Target, Flame, Star, ChevronRight,
  Gamepad2, TrendingUp, Gift, Calendar, Award, Sparkles,
  BookOpen, Beaker, Globe, Calculator, Clock, ArrowLeft,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

/* ═══════ Animated Background (reused pattern) ═══════ */
function HubBackground() {
  const orbs = useMemo(() => Array.from({ length: 4 }, (_, i) => ({
    id: i,
    size: 200 + Math.random() * 200,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: ["#6366F1", "#A855F7", "#22C55E", "#F59E0B"][i],
    duration: 20 + Math.random() * 15,
  })), []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      {orbs.map(o => (
        <div key={o.id} className="absolute rounded-full animate-pulse" style={{
          width: o.size, height: o.size, left: `${o.x}%`, top: `${o.y}%`,
          background: `radial-gradient(circle, ${o.color}12, transparent 70%)`,
          filter: "blur(40px)", animationDuration: `${o.duration}s`,
        }} />
      ))}
    </div>
  );
}

/* ═══════ Glass Card ═══════ */
function GlassCard({ children, className = "", glow = "", onClick }: {
  children: React.ReactNode; className?: string; glow?: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={`rounded-2xl p-5 relative overflow-hidden ${onClick ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]" : ""} transition-all duration-300 ${className}`}
      style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: glow ? `0 0 30px ${glow}15, inset 0 1px 0 rgba(255,255,255,0.1)` : "inset 0 1px 0 rgba(255,255,255,0.1)" }}>
      {children}
    </div>
  );
}

type HubView = "dashboard" | "playing";

interface ActiveGame {
  key: string;
  name: string;
  category: string;
  subject: string | null;
}

const GameHub = () => {
  const { profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const { profile, subjects, loading, recordSession } = useGameProfile();
  const { awardXp } = useGamification();
  const [view, setView] = useState<HubView>("dashboard");
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const studentName = authProfile?.full_name || "Student";
  const age = profile?.student_age || 12;
  const ageStage = getAgeStage(age);
  const brainXp = profile?.brain_xp || 0;
  const brainLevel = getBrainLevel(brainXp);
  const nextLevel = getNextBrainLevel(brainXp);
  const brainProgress = getBrainLevelProgress(brainXp);

  const today = new Date().toISOString().split("T")[0];
  const gamesToday = profile?.games_today_date === today ? profile.games_today : 0;
  const dailyGoal = profile?.daily_goal || 3;
  const dailyProgress = Math.min((gamesToday / dailyGoal) * 100, 100);

  // Get all available games for this student
  const availableGames = useMemo(() => {
    const games: { key: string; name: string; category: string; subject: string | null; emoji: string; color: string; description: string }[] = [];

    // Add cognitive round
    games.push({ key: "cognitive_round", name: "Cognitive Round", category: "cognitive", subject: null, emoji: "🧠", color: "#6366F1", description: "5 brain-training mini-games" });

    // Add subject-specific games
    SUBJECT_GAMES.forEach(sg => {
      const subjectGames = getSubjectGames(sg.subject, age);
      subjectGames.forEach(g => {
        games.push({ key: g.key, name: g.name, category: g.category, subject: sg.subject, emoji: g.emoji, color: sg.color, description: g.description });
      });
    });

    return games;
  }, [age]);

  const filteredGames = selectedCategory
    ? availableGames.filter(g => g.category === selectedCategory)
    : availableGames;

  const startGame = (game: typeof availableGames[0]) => {
    if (game.key === "cognitive_round") {
      navigate("/gamification");
      return;
    }
    setActiveGame({ key: game.key, name: game.name, category: game.category, subject: game.subject });
    setView("playing");
  };

  const handleGameComplete = async (result: {
    score: number; maxScore: number; accuracy: number; avgResponseTime: number;
    questionsAttempted: number; questionsCorrect: number; timeUsed: number; difficultyReached: number;
  }) => {
    if (!activeGame) return;

    const brainXpGain = await recordSession({
      game_type: activeGame.key,
      game_category: activeGame.category,
      subject: activeGame.subject,
      score: result.score,
      max_score: result.maxScore,
      accuracy: result.accuracy,
      avg_response_time: result.avgResponseTime,
      difficulty_reached: result.difficultyReached,
      time_used: result.timeUsed,
      brain_level_at: brainLevel.key,
    });

    awardXp("complete_assessment", `Completed ${activeGame.name}`);
    toast.success(`+${brainXpGain || 10} Brain XP!`, { description: `${activeGame.name} complete — ${result.accuracy}% accuracy` });

    setView("dashboard");
    setActiveGame(null);
  };

  const renderActiveGame = () => {
    if (!activeGame) return null;
    const props = { ageStage: ageStage.key, brainLevel: brainLevel.key };

    switch (activeGame.key) {
      case "math_blitz":
      case "pattern_puzzle":
      case "equation_balance":
      case "math_quiz":
        return <MathBlitz onComplete={handleGameComplete} {...props} />;
      case "word_builder":
      case "grammar_rush":
      case "story_weaver":
      case "language_quiz":
        return <WordBuilder onComplete={handleGameComplete} ageStage={ageStage.key} />;
      case "cause_effect":
      case "element_sort":
      case "hypothesis_lab":
      case "science_quiz":
        return <CauseEffect onComplete={handleGameComplete} ageStage={ageStage.key} />;
      case "timeline_challenge":
      case "map_explorer":
      case "civilisation_builder":
      case "social_quiz":
        return <TimelineChallenge onComplete={handleGameComplete} ageStage={ageStage.key} />;
      default:
        return <MathBlitz onComplete={handleGameComplete} {...props} />;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0F172A, #1e1147, #312E81)" }}>
          <div className="text-center">
            <div className="text-6xl animate-bounce mb-4">🎮</div>
            <p style={{ color: "rgba(241,245,249,0.6)" }}>Loading your game universe...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ═══════ PLAYING VIEW ═══════ */
  if (view === "playing" && activeGame) {
    return (
      <div className="min-h-screen relative" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1e1147 50%, #312E81 100%)" }}>
        <HubBackground />
        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
          style={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <button onClick={() => { setView("dashboard"); setActiveGame(null); }}
            className="flex items-center gap-2 text-sm font-medium transition-all hover:scale-105"
            style={{ color: "rgba(241,245,249,0.6)" }}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>{activeGame.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${brainLevel.color}20`, color: brainLevel.color }}>
              {brainLevel.emoji} {brainLevel.label}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-screen pt-16 pb-8 px-4 relative z-10">
          {renderActiveGame()}
        </div>
      </div>
    );
  }

  /* ═══════ DASHBOARD VIEW ═══════ */
  return (
    <AppLayout>
      <div className="min-h-screen relative" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1e1147 50%, #312E81 100%)" }}>
        <HubBackground />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* ─── Header ─── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black"
                style={{ background: "linear-gradient(135deg, #6366F1, #A855F7, #F472B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Game Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm" style={{ color: "rgba(241,245,249,0.6)" }}>Welcome back,</span>
                <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>{studentName}</span>
                <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: `${ageStage.color}20`, color: ageStage.color }}>
                  {ageStage.emoji} {ageStage.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>Brain XP</span>
                <p className="text-lg font-black" style={{ color: brainLevel.color }}>{brainXp}</p>
              </div>
              <div className="px-4 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>Games</span>
                <p className="text-lg font-black" style={{ color: "#F1F5F9" }}>{profile?.total_games_played || 0}</p>
              </div>
            </div>
          </div>

          {/* ─── Top Row: Brain Level + Daily Goal + Engagement ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Brain Level Card */}
            <GlassCard glow={brainLevel.color} className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5" style={{ color: brainLevel.color }} />
                <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Brain Level</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-4xl">{brainLevel.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg font-black" style={{ color: brainLevel.color }}>{brainLevel.label}</span>
                    {nextLevel && (
                      <span className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>
                        Next: {nextLevel.emoji} {nextLevel.label} ({nextLevel.xpRequired - brainXp} XP)
                      </span>
                    )}
                  </div>
                  <div className="w-full h-3 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${brainProgress}%`, background: brainLevel.color }} />
                  </div>
                  <p className="text-xs mt-2" style={{ color: "rgba(241,245,249,0.4)" }}>{brainLevel.description}</p>
                </div>
              </div>
              {/* Brain level badges */}
              <div className="flex gap-2 mt-4">
                {BRAIN_LEVELS.map((bl) => (
                  <div key={bl.key} className="flex-1 text-center py-2 rounded-lg transition-all"
                    style={{
                      background: brainXp >= bl.xpRequired ? `${bl.color}20` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${brainXp >= bl.xpRequired ? `${bl.color}40` : "rgba(255,255,255,0.05)"}`,
                      opacity: brainXp >= bl.xpRequired ? 1 : 0.4,
                    }}>
                    <span className="text-lg">{bl.emoji}</span>
                    <p className="text-[9px] font-bold mt-0.5" style={{ color: brainXp >= bl.xpRequired ? bl.color : "rgba(241,245,249,0.3)" }}>
                      {bl.label}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Daily Goal + Engagement */}
            <div className="space-y-4">
              <GlassCard glow="#22C55E">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4" style={{ color: "#22C55E" }} />
                  <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Daily Goal</span>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-black" style={{ color: dailyProgress >= 100 ? "#22C55E" : "#F1F5F9" }}>
                    {gamesToday}
                  </span>
                  <span className="text-sm mb-1" style={{ color: "rgba(241,245,249,0.4)" }}>/ {dailyGoal} games</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${dailyProgress}%`, background: dailyProgress >= 100 ? "#22C55E" : "linear-gradient(90deg, #22C55E, #84CC16)" }} />
                </div>
                {dailyProgress >= 100 && (
                  <p className="text-xs mt-2 font-bold" style={{ color: "#22C55E" }}>🎉 Goal reached!</p>
                )}
              </GlassCard>

              <GlassCard glow="#F59E0B">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-4 w-4" style={{ color: "#F59E0B" }} />
                  <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <p className="text-lg font-black" style={{ color: "#F59E0B" }}>{Math.round(profile?.avg_accuracy || 0)}%</p>
                    <p className="text-[9px]" style={{ color: "rgba(241,245,249,0.4)" }}>Accuracy</p>
                  </div>
                  <div className="text-center py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <p className="text-lg font-black" style={{ color: "#38BDF8" }}>{Math.round((profile?.total_time_played || 0) / 60)}m</p>
                    <p className="text-[9px]" style={{ color: "rgba(241,245,249,0.4)" }}>Play Time</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* ─── Category Filter ─── */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setSelectedCategory(null)}
              className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all hover:scale-105"
              style={{
                background: !selectedCategory ? "linear-gradient(135deg, #6366F1, #A855F7)" : "rgba(255,255,255,0.05)",
                color: "#F1F5F9",
                border: !selectedCategory ? "none" : "1px solid rgba(255,255,255,0.1)",
              }}>
              🎮 All Games
            </button>
            {GAME_CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setSelectedCategory(cat.key)}
                className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all hover:scale-105"
                style={{
                  background: selectedCategory === cat.key ? `${cat.color}30` : "rgba(255,255,255,0.05)",
                  color: selectedCategory === cat.key ? cat.color : "rgba(241,245,249,0.6)",
                  border: `1px solid ${selectedCategory === cat.key ? `${cat.color}50` : "rgba(255,255,255,0.1)"}`,
                }}>
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {/* ─── Game Grid ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGames.map((game) => (
              <GlassCard key={game.key} glow={game.color} onClick={() => startGame(game)}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: `${game.color}20`, border: `1px solid ${game.color}30` }}>
                    {game.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black truncate" style={{ color: "#F1F5F9" }}>{game.name}</h3>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "rgba(241,245,249,0.5)" }}>{game.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {game.subject && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${game.color}15`, color: game.color }}>
                          {game.subject}
                        </span>
                      )}
                      <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(241,245,249,0.4)" }}>
                        {game.category}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 mt-1" style={{ color: "rgba(241,245,249,0.3)" }} />
                </div>
              </GlassCard>
            ))}
          </div>

          {/* ─── Recommended Section ─── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5" style={{ color: "#F59E0B" }} />
              <h2 className="text-lg font-black" style={{ color: "#F1F5F9" }}>Recommended for You</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableGames.slice(0, 4).map((game) => (
                <GlassCard key={`rec-${game.key}`} glow={game.color} onClick={() => startGame(game)}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{game.emoji}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: game.color }}>{game.name}</p>
                      <p className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>
                        Based on your {ageStage.label} stage
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* ─── Subject Progress ─── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5" style={{ color: "#38BDF8" }} />
              <h2 className="text-lg font-black" style={{ color: "#F1F5F9" }}>Subject Universes</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SUBJECT_GAMES.map(sg => {
                const subjectGames = getSubjectGames(sg.subject, age);
                return (
                  <GlassCard key={sg.subject} glow={sg.color} onClick={() => {
                    setSelectedCategory(null);
                    // Scroll to game grid
                  }}>
                    <div className="text-center">
                      <span className="text-3xl">{sg.emoji}</span>
                      <p className="text-sm font-bold mt-2" style={{ color: sg.color }}>{sg.subject}</p>
                      <p className="text-xs mt-1" style={{ color: "rgba(241,245,249,0.4)" }}>
                        {subjectGames.length} games available
                      </p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>

          {/* Bottom spacer for mobile nav */}
          <div className="h-20 md:h-8" />
        </div>
      </div>
    </AppLayout>
  );
};

export default GameHub;
