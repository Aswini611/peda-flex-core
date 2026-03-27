import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGameProfile } from "@/hooks/useGameProfile";
import { useGamification } from "@/hooks/useGamification";
import { getBrainLevel, getNextBrainLevel, getBrainLevelProgress, BRAIN_LEVELS } from "@/components/gamification/config/brainLevels";
import { GAME_CATEGORIES } from "@/components/gamification/config/gameCategories";
import {
  selectGamesForStudent,
  getRecommendedGames,
  computeDifficulty,
  type SelectedGame,
  type Difficulty,
} from "@/components/gamification/engine/gameSelectionEngine";
import { MathBlitz } from "@/components/gamification/games/MathBlitz";
import { WordBuilder } from "@/components/gamification/games/WordBuilder";
import { CauseEffect } from "@/components/gamification/games/CauseEffect";
import { TimelineChallenge } from "@/components/gamification/games/TimelineChallenge";
import { useNavigate } from "react-router-dom";
import {
  Brain, Target, Flame, ChevronRight,
  Sparkles, BookOpen, ArrowLeft, Info, Shield, Zap,
} from "lucide-react";
import { toast } from "sonner";

/* ═══════ Background ═══════ */
function HubBackground() {
  const orbs = useMemo(() => Array.from({ length: 4 }, (_, i) => ({
    id: i, size: 200 + Math.random() * 200,
    x: Math.random() * 100, y: Math.random() * 100,
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

/* ═══════ Difficulty badge ═══════ */
const DIFF_COLORS: Record<Difficulty, { bg: string; text: string; label: string }> = {
  easy: { bg: "rgba(34,197,94,0.15)", text: "#22C55E", label: "Easy" },
  medium: { bg: "rgba(245,158,11,0.15)", text: "#F59E0B", label: "Medium" },
  hard: { bg: "rgba(239,68,68,0.15)", text: "#EF4444", label: "Hard" },
};

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const d = DIFF_COLORS[difficulty];
  return (
    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: d.bg, color: d.text }}>
      {d.label}
    </span>
  );
}

type HubView = "dashboard" | "playing";

interface ActiveGame {
  key: string;
  name: string;
  category: string;
  subject: string | null;
}

/* ═══════════════════════════════════════════════════════ */
/*  GAME HUB                                              */
/* ═══════════════════════════════════════════════════════ */
const GameHub = () => {
  const { profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const { profile, sessions, loading, recordSession } = useGameProfile();
  const { awardXp } = useGamification();
  const [view, setView] = useState<HubView>("dashboard");
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const studentName = authProfile?.full_name || "Student";
  const age = profile?.student_age || authProfile?.age || 12;
  const brainXp = profile?.brain_xp || 0;
  const brainLevel = getBrainLevel(brainXp);
  const nextLevel = getNextBrainLevel(brainXp);
  const brainProgress = getBrainLevelProgress(brainXp);
  const avgAccuracy = profile?.avg_accuracy ?? null;

  const today = new Date().toISOString().split("T")[0];
  const gamesToday = profile?.games_today_date === today ? profile.games_today : 0;
  const dailyGoal = profile?.daily_goal || 3;
  const dailyProgress = Math.min((gamesToday / dailyGoal) * 100, 100);

  /* ── Run selection engine ── */
  const selectionResult = useMemo(
    () => selectGamesForStudent(age, avgAccuracy, selectedSubject, selectedCategory),
    [age, avgAccuracy, selectedSubject, selectedCategory],
  );

  const recommended = useMemo(() => {
    const recentKeys = sessions.slice(0, 10).map((s) => s.game_type);
    const weakSubjects: string[] = [];
    const subjectScores: Record<string, { total: number; count: number }> = {};
    sessions.forEach((s) => {
      if (s.subject) {
        if (!subjectScores[s.subject]) subjectScores[s.subject] = { total: 0, count: 0 };
        subjectScores[s.subject].total += s.accuracy;
        subjectScores[s.subject].count += 1;
      }
    });
    Object.entries(subjectScores).forEach(([subject, data]) => {
      if (data.total / data.count < 60) weakSubjects.push(subject);
    });
    return getRecommendedGames(age, avgAccuracy, weakSubjects, recentKeys);
  }, [age, avgAccuracy, sessions]);

  const startGame = (game: SelectedGame | ActiveGame) => {
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
    const ageStage = selectionResult.stage;
    const props = { ageStage: ageStage.key, brainLevel: brainLevel.key };

    switch (activeGame.key) {
      case "math_blitz": case "math_quiz":
        return <MathBlitz onComplete={handleGameComplete} {...props} />;
      case "word_builder": case "grammar_rush": case "story_weaver": case "language_quiz":
        return <WordBuilder onComplete={handleGameComplete} ageStage={ageStage.key} />;
      case "cause_effect": case "element_sort": case "hypothesis_lab": case "science_quiz":
        return <CauseEffect onComplete={handleGameComplete} ageStage={ageStage.key} />;
      case "timeline_challenge": case "map_explorer": case "civilisation_builder": case "social_quiz":
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

  /* ═══ PLAYING VIEW ═══ */
  if (view === "playing" && activeGame) {
    return (
      <div className="min-h-screen relative" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1e1147 50%, #312E81 100%)" }}>
        <HubBackground />
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
          style={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <button onClick={() => { setView("dashboard"); setActiveGame(null); }}
            className="flex items-center gap-2 text-sm font-medium transition-all hover:scale-105"
            style={{ color: "rgba(241,245,249,0.6)" }}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>{activeGame.name}</span>
          <div className="flex items-center gap-2">
            <DifficultyBadge difficulty={selectionResult.difficulty} />
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

  /* ═══ DASHBOARD VIEW ═══ */
  const stage = selectionResult.stage;
  const difficulty = selectionResult.difficulty;
  const subjects = ["Mathematics", "Science", "English", "Social Studies"];

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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm" style={{ color: "rgba(241,245,249,0.6)" }}>Welcome back,</span>
                <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>{studentName}</span>
                <span className="text-sm px-2 py-0.5 rounded-full font-bold" style={{ background: `${stage.color}20`, color: stage.color }}>
                  {stage.emoji} {stage.label}
                </span>
                <DifficultyBadge difficulty={difficulty} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>Brain XP</span>
                <p className="text-lg font-black" style={{ color: brainLevel.color }}>{brainXp}</p>
              </div>
              <div className="px-4 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>Age</span>
                <p className="text-lg font-black" style={{ color: "#F1F5F9" }}>{age}</p>
              </div>
              <div className="px-4 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>Games</span>
                <p className="text-lg font-black" style={{ color: "#F1F5F9" }}>{profile?.total_games_played || 0}</p>
              </div>
            </div>
          </div>

          {/* ─── Stage Info Banner ─── */}
          <GlassCard glow={stage.color}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ background: `${stage.color}20`, border: `1px solid ${stage.color}40` }}>
                {stage.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black" style={{ color: stage.color }}>{stage.label} Stage</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(241,245,249,0.5)" }}>
                    Age {stage.ageRange[0]}–{stage.ageRange[1]}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: "rgba(241,245,249,0.6)" }}>{stage.description}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-xs flex items-center gap-1" style={{ color: "rgba(241,245,249,0.4)" }}>
                    <Shield className="h-3 w-3" /> Complexity: <strong className="capitalize" style={{ color: stage.color }}>{stage.gameComplexity}</strong>
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: "rgba(241,245,249,0.4)" }}>
                    <Zap className="h-3 w-3" /> Difficulty: <strong style={{ color: DIFF_COLORS[difficulty].text }}>{DIFF_COLORS[difficulty].label}</strong>
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: "rgba(241,245,249,0.4)" }}>
                    <Info className="h-3 w-3" /> {selectionResult.games.length} games available
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ─── Top Row: Brain Level + Daily Goal ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <p className="text-lg font-black" style={{ color: "#F59E0B" }}>{Math.round(avgAccuracy || 0)}%</p>
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

          {/* ─── Recommended for You ─── */}
          {recommended.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5" style={{ color: "#F59E0B" }} />
                <h2 className="text-lg font-black" style={{ color: "#F1F5F9" }}>Recommended for You</h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                  AI-picked
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recommended.map((game) => (
                  <GlassCard key={`rec-${game.key}`} glow={DIFF_COLORS[game.difficulty].text} onClick={() => startGame(game as any)}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{game.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "#F1F5F9" }}>{game.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(241,245,249,0.4)" }}>{game.instruction}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <DifficultyBadge difficulty={game.difficulty} />
                          {game.subject && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(241,245,249,0.5)" }}>
                              {game.subject}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "rgba(241,245,249,0.3)" }} />
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {/* ─── Filters: Category + Subject ─── */}
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setSelectedCategory(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all hover:scale-105"
                style={{
                  background: !selectedCategory ? "linear-gradient(135deg, #6366F1, #A855F7)" : "rgba(255,255,255,0.05)",
                  color: "#F1F5F9", border: !selectedCategory ? "none" : "1px solid rgba(255,255,255,0.1)",
                }}>
                🎮 All
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
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setSelectedSubject(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all hover:scale-105"
                style={{
                  background: !selectedSubject ? "rgba(241,245,249,0.1)" : "rgba(255,255,255,0.03)",
                  color: !selectedSubject ? "#F1F5F9" : "rgba(241,245,249,0.4)",
                  border: `1px solid ${!selectedSubject ? "rgba(241,245,249,0.2)" : "rgba(255,255,255,0.06)"}`,
                }}>
                All Subjects
              </button>
              {subjects.map(sub => (
                <button key={sub} onClick={() => setSelectedSubject(sub)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all hover:scale-105"
                  style={{
                    background: selectedSubject === sub ? "rgba(241,245,249,0.1)" : "rgba(255,255,255,0.03)",
                    color: selectedSubject === sub ? "#F1F5F9" : "rgba(241,245,249,0.4)",
                    border: `1px solid ${selectedSubject === sub ? "rgba(241,245,249,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Game Grid ─── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" style={{ color: "#38BDF8" }} />
                <h2 className="text-lg font-black" style={{ color: "#F1F5F9" }}>
                  {selectedSubject || "All"} Games
                </h2>
              </div>
              <span className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>
                {selectionResult.games.length} games for {stage.label}
              </span>
            </div>

            {selectionResult.games.length === 0 ? (
              <GlassCard>
                <div className="text-center py-8">
                  <span className="text-4xl">🔒</span>
                  <p className="text-sm mt-3 font-bold" style={{ color: "#F1F5F9" }}>No games match these filters</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(241,245,249,0.4)" }}>Try a different category or subject</p>
                </div>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectionResult.games.map((game) => (
                  <GlassCard key={game.key} glow={DIFF_COLORS[game.difficulty].text} onClick={() => startGame(game as any)}>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {game.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black truncate" style={{ color: "#F1F5F9" }}>{game.name}</h3>
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "rgba(241,245,249,0.5)" }}>
                          {game.instruction}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <DifficultyBadge difficulty={game.difficulty} />
                          {game.subject && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(241,245,249,0.4)" }}>
                              {game.subject}
                            </span>
                          )}
                          <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.03)", color: "rgba(241,245,249,0.3)" }}>
                            {game.category}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 mt-1" style={{ color: "rgba(241,245,249,0.3)" }} />
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>

          <div className="h-20 md:h-8" />
        </div>
      </div>
    </AppLayout>
  );
};

export default GameHub;
