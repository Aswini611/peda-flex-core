import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getBrainLevel, getNextBrainLevel, getBrainLevelProgress, BrainLevel } from "@/components/gamification/config/brainLevels";
import { getAgeStage, AgeStage } from "@/components/gamification/config/ageStages";

export interface GameProfile {
  id: string;
  student_id: string;
  age_stage: string;
  brain_level: string;
  brain_xp: number;
  student_age: number | null;
  preferred_subjects: string[];
  total_games_played: number;
  total_time_played: number;
  avg_accuracy: number;
  last_played_at: string | null;
  daily_goal: number;
  games_today: number;
  games_today_date: string | null;
  surprise_reward_available: boolean;
}

export interface GameSession {
  id: string;
  game_type: string;
  game_category: string;
  subject: string | null;
  score: number;
  max_score: number;
  accuracy: number;
  avg_response_time: number;
  difficulty_reached: number;
  brain_level_at: string;
  time_used: number;
  completed_at: string;
}

export interface PersonalizationData {
  profile: GameProfile | null;
  ageStage: AgeStage;
  brainLevel: BrainLevel;
  nextBrainLevel: BrainLevel | null;
  brainProgress: number;
  recentSessions: GameSession[];
  availableSubjects: string[];
  weakSubjects: string[];
  strongSubjects: string[];
  recommendedGames: string[];
  dailyProgress: number;
  streak: number;
}

export function useGameProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GameProfile | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch or create game profile
      let { data: gp } = await supabase
        .from("student_game_profiles")
        .select("*")
        .eq("student_id", user.id)
        .maybeSingle();

      if (!gp) {
        // Get student age from student_assessments
        const { data: assessment } = await supabase
          .from("student_assessments")
          .select("student_age, student_class")
          .eq("submitted_by", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const studentAge = assessment?.student_age || null;
        const ageStage = getAgeStage(studentAge);

        const { data: newProfile } = await supabase
          .from("student_game_profiles")
          .insert({
            student_id: user.id,
            student_age: studentAge,
            age_stage: ageStage.key,
          })
          .select()
          .single();
        gp = newProfile;
      }

      if (gp) {
        setProfile(gp as any);
      }

      // Fetch recent game sessions
      const { data: sessData } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("student_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(50);

      setSessions((sessData || []) as any);

      // Fetch available subjects from textbooks bucket
      // Get student class first
      const { data: assess } = await supabase
        .from("student_assessments")
        .select("student_class")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assess?.student_class) {
        const { data: files } = await supabase.storage
          .from("textbooks")
          .list(assess.student_class);
        
        if (files && files.length > 0) {
          const subjectNames = files
            .filter((f: any) => f.name && !f.name.startsWith("."))
            .map((f: any) => f.name.replace(/\.[^/.]+$/, ""));
          setSubjects(subjectNames);
        }
      }

      // Fallback subjects
      if (subjects.length === 0) {
        setSubjects(["Mathematics", "Science", "English", "Social Studies"]);
      }
    } catch (err) {
      console.error("Game profile fetch error:", err);
      setSubjects(["Mathematics", "Science", "English", "Social Studies"]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const recordSession = useCallback(async (session: Omit<GameSession, "id" | "completed_at">) => {
    if (!user?.id || !profile) return;

    try {
      await supabase.from("game_sessions").insert({
        student_id: user.id,
        ...session,
      });

      // Update profile
      const today = new Date().toISOString().split("T")[0];
      const gamesToday = profile.games_today_date === today ? profile.games_today + 1 : 1;
      const newTotalGames = profile.total_games_played + 1;
      const newTotalTime = profile.total_time_played + session.time_used;
      const newAvgAccuracy = ((profile.avg_accuracy * profile.total_games_played) + session.accuracy) / newTotalGames;
      
      // Award brain XP based on performance
      const brainXpGain = Math.round(session.score * (session.accuracy / 100) * 0.5) + 10;
      const newBrainXp = profile.brain_xp + brainXpGain;
      const newBrainLevel = getBrainLevel(newBrainXp);

      await supabase
        .from("student_game_profiles")
        .update({
          total_games_played: newTotalGames,
          total_time_played: newTotalTime,
          avg_accuracy: Math.round(newAvgAccuracy),
          brain_xp: newBrainXp,
          brain_level: newBrainLevel.key,
          games_today: gamesToday,
          games_today_date: today,
          last_played_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("student_id", user.id);

      fetchProfile();
      return brainXpGain;
    } catch (err) {
      console.error("Record session error:", err);
    }
  }, [user?.id, profile, fetchProfile]);

  // Compute personalization data
  const getPersonalization = useCallback((): PersonalizationData => {
    const ageStage = getAgeStage(profile?.student_age);
    const brainXp = profile?.brain_xp || 0;
    const brainLevel = getBrainLevel(brainXp);
    const nextBrainLevel = getNextBrainLevel(brainXp);
    const brainProgress = getBrainLevelProgress(brainXp);

    // Analyze subject performance
    const subjectScores: Record<string, { total: number; count: number }> = {};
    sessions.forEach((s) => {
      if (s.subject) {
        if (!subjectScores[s.subject]) subjectScores[s.subject] = { total: 0, count: 0 };
        subjectScores[s.subject].total += s.accuracy;
        subjectScores[s.subject].count += 1;
      }
    });

    const subjectAvgs = Object.entries(subjectScores).map(([subject, data]) => ({
      subject,
      avgAccuracy: data.total / data.count,
    }));

    const weakSubjects = subjectAvgs.filter((s) => s.avgAccuracy < 60).map((s) => s.subject);
    const strongSubjects = subjectAvgs.filter((s) => s.avgAccuracy >= 75).map((s) => s.subject);

    // Recommend games: prioritize weak subjects and unexplored categories
    const playedGameTypes = new Set(sessions.map((s) => s.game_type));
    const recommendedGames: string[] = [];
    
    // Add weak subject games first
    weakSubjects.forEach((subject) => {
      recommendedGames.push(`${subject.toLowerCase()}_quiz`);
    });

    // Add cognitive games if not played recently
    if (!sessions.slice(0, 5).some((s) => s.game_category === "cognitive")) {
      recommendedGames.push("pattern_puzzle", "cause_effect");
    }

    const today = new Date().toISOString().split("T")[0];
    const dailyProgress = profile?.games_today_date === today
      ? Math.min((profile.games_today / profile.daily_goal) * 100, 100)
      : 0;

    return {
      profile,
      ageStage,
      brainLevel,
      nextBrainLevel,
      brainProgress,
      recentSessions: sessions,
      availableSubjects: subjects,
      weakSubjects,
      strongSubjects,
      recommendedGames,
      dailyProgress,
      streak: 0,
    };
  }, [profile, sessions, subjects]);

  return {
    profile,
    sessions,
    subjects,
    loading,
    recordSession,
    getPersonalization,
    refetch: fetchProfile,
  };
}
