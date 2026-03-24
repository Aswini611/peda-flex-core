import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/hooks/useGamification";
// Score entry page for recording pre-test and post-test scores
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

type Student = {
  id: string;
  name: string;
};

type ScoreEntry = {
  id: string;
  student_id: string;
  lesson_id: string;
  pretest_score?: number;
  posttest_score?: number;
  effort_score?: number;
  recorded_at: string;
};

type StudentWithScores = Student & {
  scores?: ScoreEntry;
};

export default function ScoreEntry() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { awardXp } = useGamification();

  const [lesson, setLesson] = useState<any>(null);
  const [students, setStudents] = useState<StudentWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEntry, setSavingEntry] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [entryScores, setEntryScores] = useState<Record<string, number>>({});
  const [exitScores, setExitScores] = useState<Record<string, number>>({});
  const [effortScores, setEffortScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch lesson details
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("id, title, subject, curriculum, duration_minutes")
          .eq("id", lessonId)
          .single();

        if (lessonError) throw lessonError;
        setLesson(lessonData);

        // Fetch students assigned to this lesson
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("lesson_assignments")
          .select("student_id, students(id, profile_id, profiles(full_name))")
          .eq("lesson_id", lessonId);

        if (assignmentError && assignmentError.code !== "PGRST200") {
          console.error("Assignment fetch error:", assignmentError);
        }

        let studentList: Student[] = [];
        if (assignmentData && assignmentData.length > 0) {
          studentList = assignmentData.map((assignment: any) => {
            const student = assignment.students as any;
            return {
              id: student.id,
              name: student.profiles?.full_name || `Student ${student.id.slice(0, 8)}`,
            };
          });
        }

        setStudents(studentList);

        // Fetch existing scores for this lesson
        const { data: scoresData } = await supabase
          .from("performance_records")
          .select("id, student_id, pretest_score, posttest_score, effort_score")
          .eq("lesson_id", lessonId);

        if (scoresData) {
          const scoresEntryMap: Record<string, number> = {};
          const scoresExitMap: Record<string, number> = {};
          const effortMap: Record<string, number> = {};

          scoresData.forEach((score) => {
            if (score.pretest_score !== null) {
              scoresEntryMap[score.student_id] = score.pretest_score;
            }
            if (score.posttest_score !== null) {
              scoresExitMap[score.student_id] = score.posttest_score;
            }
            if (score.effort_score !== null) {
              effortMap[score.student_id] = score.effort_score;
            }
          });

          setEntryScores(scoresEntryMap);
          setExitScores(scoresExitMap);
          setEffortScores(effortMap);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load lesson or students",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (lessonId && user?.id) {
      fetchData();
    }
  }, [lessonId, user?.id, toast]);
            }
          });

          setEntryScores(scoresEntryMap);
          setExitScores(scoresExitMap);
          setEffortScores(effortMap);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load lesson or students",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (lessonId && user?.id) {
      fetchData();
    }
  }, [lessonId, user?.id, toast]);

  const handleEntryScoreChange = (studentId: string, value: string) => {
    const score = value === "" ? undefined : Math.max(0, Math.min(100, parseInt(value) || 0));
    setEntryScores((prev) => {
      const updated = { ...prev };
      if (score === undefined) delete updated[studentId];
      else updated[studentId] = score;
      return updated;
    });
  };

  const handleExitScoreChange = (studentId: string, value: string) => {
    const score = value === "" ? undefined : Math.max(0, Math.min(100, parseInt(value) || 0));
    setExitScores((prev) => {
      const updated = { ...prev };
      if (score === undefined) delete updated[studentId];
      else updated[studentId] = score;
      return updated;
    });
  };

  const handleEffortScoreChange = (studentId: string, rating: number) => {
    setEffortScores((prev) => {
      const updated = { ...prev };
      if (rating === 0) delete updated[studentId];
      else updated[studentId] = rating;
      return updated;
    });
  };

  const saveEntryScores = async () => {
    setSaving(true);
    try {
      const records = students.map((student) => ({
        student_id: student.id,
        lesson_id: lessonId,
        pretest_score: entryScores[student.id] || null,
      }));

      // Upsert records
      for (const record of records) {
        if (record.pretest_score !== null) {
          const { error } = await supabase
            .from("performance_records")
            .upsert(record, { onConflict: "student_id,lesson_id" });

          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: "Entry scores saved successfully!",
      });
    } catch (error) {
      console.error("Error saving entry scores:", error);
      toast({
        title: "Error",
        description: "Failed to save entry scores",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveExitScoresAndGenerateAnalytics = async () => {
    setSaving(true);
    try {
      // Save exit and effort scores
      const records = students.map((student) => ({
        student_id: student.id,
        lesson_id: lessonId,
        posttest_score: exitScores[student.id] || null,
        effort_score: effortScores[student.id] || null,
      }));

      // Upsert records
      for (const record of records) {
        if (record.posttest_score !== null || record.effort_score !== null) {
          const { error } = await supabase
            .from("performance_records")
            .upsert(record, { onConflict: "student_id,lesson_id" });

          if (error) throw error;
        }
      }

      // Award XP
      const xpAction = await supabase
        .from("xp_transactions")
        .insert({
          user_id: user?.id,
          xp_amount: 25,
          action: "exit_scores_submitted",
          description: `Submitted exit scores for lesson: ${lesson?.title}`,
        });

      // Update user gamification
      if (!xpAction.error) {
        const { data: currentXp } = await supabase
          .from("user_gamification")
          .select("total_xp")
          .eq("user_id", user?.id)
          .single();

        if (currentXp) {
          await supabase
            .from("user_gamification")
            .update({
              total_xp: (currentXp.total_xp || 0) + 25,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user?.id);
        }
      }

      // Check for low-gain alerts
      const { data: performanceData } = await supabase
        .from("performance_records")
        .select("student_id, pretest_score, posttest_score, normalized_gain")
        .eq("lesson_id", lessonId);

      if (performanceData) {
        const lowGainCount = performanceData.filter(
          (p) => (p.normalized_gain || 0) < 0.3 && p.posttest_score !== null
        ).length;

        if (lowGainCount >= 2) {
          // Create alert
          await supabase.from("mismatch_alerts").insert({
            student_group: "multiple_students",
            lesson_type: lesson?.subject,
            trigger_condition: `${lowGainCount} students with learning gain < 0.3`,
            fail_rate: Math.round((lowGainCount / students.length) * 100),
            recommendation: "Review teaching approach or provide additional support",
            status: "flagged",
          });
        }
      }

      toast({
        title: "Success",
        description: "Exit scores saved! Redirecting to analytics...",
      });

      // Navigate to analytics page
      setTimeout(() => {
        navigate(`/lessons/${lessonId}/analytics`);
      }, 1500);
    } catch (error) {
      console.error("Error saving exit scores:", error);
      toast({
        title: "Error",
        description: "Failed to save exit scores",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <PageHeader
            title="Error"
            subtitle="Lesson not found"
          />
          <Button onClick={() => navigate("/lessons")}>Back to Lessons</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <PageHeader
          title={`Score Entry: ${lesson.title}`}
          subtitle="Record entry and exit ticket scores for your students"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entry">
              Entry Ticket (Pre-Test)
            </TabsTrigger>
            <TabsTrigger value="exit">
              Exit Ticket (Post-Test)
            </TabsTrigger>
          </TabsList>

          {/* Entry Ticket Tab */}
          <TabsContent value="entry" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Entry Scores</CardTitle>
                <CardDescription>
                  Scores recorded BEFORE the lesson (0-100)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.length === 0 ? (
                    <p className="text-muted-foreground">No students found</p>
                  ) : (
                    students.map((student) => (
                      <div key={student.id} className="flex items-end gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <Label className="text-base font-medium">{student.name}</Label>
                        </div>
                        <div className="w-32">
                          <Label className="text-sm">Score</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={entryScores[student.id] ?? ""}
                            onChange={(e) =>
                              handleEntryScoreChange(student.id, e.target.value)
                            }
                            placeholder="0-100"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Button
                  onClick={saveEntryScores}
                  disabled={saving || Object.keys(entryScores).length === 0}
                  className="w-full mt-6"
                >
                  {saving ? "Saving..." : "Save Entry Scores"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exit Ticket Tab */}
          <TabsContent value="exit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Exit Scores & Effort</CardTitle>
                <CardDescription>
                  Scores recorded AFTER the lesson + student effort rating
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {students.length === 0 ? (
                  <p className="text-muted-foreground">No students found</p>
                ) : (
                  students.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">{student.name}</Label>
                        {entryScores[student.id] !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            Entry: {entryScores[student.id]}
                          </span>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm">Exit Score (0-100)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={exitScores[student.id] ?? ""}
                          onChange={(e) =>
                            handleExitScoreChange(student.id, e.target.value)
                          }
                          placeholder="0-100"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm">Effort (Rate 1-5 stars)</Label>
                        <div className="flex gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => handleEffortScoreChange(student.id, rating)}
                              className={`transition-colors ${
                                effortScores[student.id] === rating
                                  ? "text-yellow-500"
                                  : "text-gray-300 hover:text-yellow-300"
                              }`}
                            >
                              <Star
                                className="w-6 h-6"
                                fill={
                                  effortScores[student.id] === rating
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <Button
                  onClick={saveExitScoresAndGenerateAnalytics}
                  disabled={
                    saving || Object.keys(exitScores).length === 0
                  }
                  className="w-full"
                  size="lg"
                >
                  {saving
                    ? "Saving & Generating..."
                    : "Save Exit Scores & Generate Analytics"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Button
          variant="outline"
          onClick={() => navigate("/lessons")}
          className="mt-4"
        >
          Back to Lessons
        </Button>
      </div>
    </div>
  );
}
