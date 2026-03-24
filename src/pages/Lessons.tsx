import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowRight, CheckCircle, Clock } from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  subject: string;
  curriculum: string;
  duration_minutes: number;
  created_at: string;
  vark_target?: string;
  approach?: string;
};

export default function Lessons() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLessons, setTotalLessons] = useState(0);
  const [lessonStats, setLessonStats] = useState({
    completed: 0,
    inProgress: 0,
    notStarted: 0,
  });

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        // Get all lessons (all teachers can see all lessons for assignment)
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("lessons")
          .select("id, title, subject, curriculum, duration_minutes, created_at, vark_target, approach")
          .order("created_at", { ascending: false });

        if (lessonsError) throw lessonsError;

        setLessons(lessonsData || []);
        setTotalLessons(lessonsData?.length || 0);

        // Get stats on lesson scores
        if (lessonsData && lessonsData.length > 0) {
          const lessonIds = lessonsData.map((l) => l.id);

          // Count lessons with scores completed
          const { data: performanceData } = await supabase
            .from("performance_records")
            .select("lesson_id, posttest_score")
            .in("lesson_id", lessonIds);

          const completedLessonIds = new Set(
            performanceData?.filter((p) => p.posttest_score !== null).map((p) => p.lesson_id) || []
          );
          const inProgressLessonIds = new Set(
            performanceData?.filter((p) => p.posttest_score === null).map((p) => p.lesson_id) || []
          );

          setLessonStats({
            completed: completedLessonIds.size,
            inProgress: inProgressLessonIds.size,
            notStarted: lessonIds.length - completedLessonIds.size - inProgressLessonIds.size,
          });
        }
      } catch (error) {
        console.error("Error fetching lessons:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchLessons();
    }
  }, [user?.id]);

  const handleEnterScores = (lessonId: string) => {
    navigate(`/lessons/${lessonId}/scores`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <PageHeader
          title="Lesson Plans"
          subtitle="Your lesson management hub - enter scores and track student progress"
        />

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={BookOpen}
            label="Total Lessons"
            value={totalLessons}
          />
          <StatCard
            icon={CheckCircle}
            label="Completed"
            value={lessonStats.completed}
            trend={{ value: Math.round((lessonStats.completed / Math.max(1, totalLessons)) * 100), direction: "up" }}
          />
          <StatCard
            icon={Clock}
            label="In Progress"
            value={lessonStats.inProgress}
          />
          <StatCard
            icon={BookOpen}
            label="Not Started"
            value={lessonStats.notStarted}
          />
        </div>

        {/* Lessons Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Your Lessons</h2>

          {loading ? (
            <LoadingSpinner />
          ) : lessons.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="pt-8">
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Lessons Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create curative lessons first to start recording student progress.
                  </p>
                  <Button onClick={() => navigate("/curative")}>
                    Create Lesson Plans
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessons.map((lesson) => (
                <Card key={lesson.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-2">{lesson.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                        {lesson.curriculum?.toUpperCase() || "CBSE"}
                      </span>
                      <span className="text-xs text-muted-foreground">{lesson.duration_minutes} min</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Subject:</strong> {lesson.subject}</p>
                      {lesson.vark_target && (
                        <p><strong>Target Style:</strong> {lesson.vark_target}</p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleEnterScores(lesson.id)}
                      className="w-full"
                      size="sm"
                    >
                      Enter Scores
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
