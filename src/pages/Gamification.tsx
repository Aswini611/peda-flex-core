import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGamification, type Achievement, type LeaderboardEntry } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Trophy, Star, Flame, Zap, Rocket, Award, Brain, BookOpen,
  GraduationCap, Crown, FileText, ClipboardCheck, Medal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, any> = {
  trophy: Trophy, star: Star, flame: Flame, zap: Zap, rocket: Rocket,
  award: Award, brain: Brain, "book-open": BookOpen,
  "graduation-cap": GraduationCap, crown: Crown, "file-text": FileText,
  "clipboard-check": ClipboardCheck,
};

const LEVEL_TITLES = [
  "Novice", "Apprentice", "Scholar", "Practitioner", "Expert",
  "Master", "Sage", "Luminary", "Virtuoso", "Legend",
];

const getLevelTitle = (level: number) => LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

const Gamification = () => {
  const { data, achievements, transactions, leaderboard, loading } = useGamification();
  const { user, profile } = useAuth();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  const earned = achievements.filter((a) => a.earned);
  const unearned = achievements.filter((a) => !a.earned);

  return (
    <AppLayout>
      <PageHeader title="Gamification" subtitle="Track your progress, earn XP, and unlock achievements" />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{data?.totalXp || 0}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold text-foreground">Lvl {data?.level || 1}</p>
            <p className="text-xs text-muted-foreground">{getLevelTitle(data?.level || 1)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4 text-center">
            <Flame className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold text-foreground">{data?.currentStreak || 0}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-foreground">{earned.length}</p>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Level {data?.level || 1} — {getLevelTitle(data?.level || 1)}
            </span>
            <span className="text-xs text-muted-foreground">
              {data?.xpToNextLevel || 0} XP to Level {(data?.level || 1) + 1}
            </span>
          </div>
          <Progress value={data?.levelProgress || 0} className="h-3" />
        </CardContent>
      </Card>

      <Tabs defaultValue="achievements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="history">XP History</TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          {earned.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Earned ({earned.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {earned.map((ach) => (
                  <AchievementCard key={ach.id} achievement={ach} />
                ))}
              </div>
            </div>
          )}
          {unearned.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Locked ({unearned.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unearned.map((ach) => (
                  <AchievementCard key={ach.id} achievement={ach} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary" /> Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No activity yet. Start earning XP!</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, idx) => (
                    <LeaderboardRow key={entry.user_id} entry={entry} rank={idx + 1} isMe={entry.user_id === user?.id} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* XP History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No XP earned yet. Complete an assessment to get started!</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{tx.description || tx.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        +{tx.xp_amount} XP
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const IconComp = ICON_MAP[achievement.icon] || Trophy;
  return (
    <Card className={cn(
      "transition-all duration-200",
      achievement.earned
        ? "bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 shadow-sm"
        : "opacity-50 grayscale"
    )}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          achievement.earned ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}>
          <IconComp className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{achievement.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{achievement.xp_reward} XP</Badge>
            {achievement.earned && (
              <span className="text-[10px] text-primary font-medium">✓ Earned</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardRow({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg transition-colors",
      isMe ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
    )}>
      <span className={cn(
        "text-lg font-bold w-8 text-center",
        rank <= 3 ? medalColors[rank - 1] : "text-muted-foreground"
      )}>
        {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {entry.full_name} {isMe && <span className="text-primary text-xs">(You)</span>}
        </p>
        <p className="text-xs text-muted-foreground capitalize">{entry.role} · Level {entry.level}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-foreground">{entry.total_xp} XP</p>
        {entry.current_streak > 0 && (
          <p className="text-[10px] text-orange-500 flex items-center gap-0.5 justify-end">
            <Flame className="h-3 w-3" /> {entry.current_streak}d
          </p>
        )}
      </div>
    </div>
  );
}

export default Gamification;
