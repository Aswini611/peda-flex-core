import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { GettingStartedBanner } from "@/components/GettingStartedBanner";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { Users, CheckCircle, Book, AlertTriangle, Target, BookOpen, Clock, Dumbbell, ClipboardCheck, TrendingUp, Brain, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentReport } from "@/components/StudentReport";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { Json } from "@/integrations/supabase/types";
import { analyzeResponses, getReportConfig } from "@/data/reportTheories";
import { Progress } from "@/components/ui/progress";

const varkData = [
  { name: "Visual", value: 38, color: "#2563EB" },
  { name: "Auditory", value: 22, color: "#7C3AED" },
  { name: "Kinaesthetic", value: 28, color: "#059669" },
  { name: "Reading/Writing", value: 12, color: "#D97706" },
];

const gainData = [
  { subject: "Math", gain: 0.72 },
  { subject: "Science", gain: 0.65 },
  { subject: "English", gain: 0.58 },
  { subject: "History", gain: 0.61 },
  { subject: "Geography", gain: 0.49 },
];

const getBarColor = (val: number) =>
  val >= 0.7 ? "#059669" : val >= 0.5 ? "#2563EB" : "#D97706";

const alerts = [
  { group: "Kinaesthetic 8C", lesson: "Visual Lecture", mismatch: "80% fail rate", status: "Flagged" as const },
  { group: "Visual 8B", lesson: "Text Case Study", mismatch: "75% fail rate", status: "Flagged" as const },
  { group: "Auditory 8A", lesson: "Silent Reading", mismatch: "70% fail rate", status: "Resolved" as const },
  { group: "R/W Group 8C", lesson: "Video-only", mismatch: "65% fail rate", status: "Flagged" as const },
  { group: "Kinaesthetic 8B", lesson: "Flashcard drill", mismatch: "60% fail rate", status: "Resolved" as const },
];

const varkChartConfig = {
  visual: { label: "Visual", color: "#2563EB" },
  auditory: { label: "Auditory", color: "#7C3AED" },
  kinaesthetic: { label: "Kinaesthetic", color: "#059669" },
  reading: { label: "Reading/Writing", color: "#D97706" },
};

const gainChartConfig = {
  gain: { label: "Normalised Gain" },
};

interface LessonContent {
  lesson_objectives?: string[];
  activity_plan?: { title: string; description: string; duration_minutes: number; materials: string }[];
  practice_exercises?: { title: string; description: string; type: string }[];
  assessment_checkpoints?: { checkpoint: string; criteria: string; method: string }[];
  framework_summary?: string;
  student_name?: string;
  age_group?: number;
}

function parseLessonContent(content: Json | null): LessonContent | null {
  if (!content || typeof content !== "object" || Array.isArray(content)) return null;
  return content as unknown as LessonContent;
}

const getLevelColor = (level: string) => {
  switch (level) {
    case "High": return "bg-emerald-500/15 text-emerald-700 border-emerald-200";
    case "Moderate": return "bg-amber-500/15 text-amber-700 border-amber-200";
    case "Developing": return "bg-red-500/15 text-red-700 border-red-200";
    default: return "bg-muted text-muted-foreground";
  }
};

const getProgressColor = (percentage: number) => {
  if (percentage >= 70) return "[&>div]:bg-emerald-500";
  if (percentage >= 40) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-400";
};

const StudentDashboard = () => {
  const { profile, user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["student-assignments", user?.id],
    queryFn: async () => {
      let { data: studentRecord } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", user!.id)
        .maybeSingle();

      if (!studentRecord) {
        const { data: newStudent } = await supabase
          .from("students")
          .insert([{ profile_id: user!.id }])
          .select("id")
          .single();
        studentRecord = newStudent ?? null;
      }

      if (!studentRecord) return [];

      const { data, error } = await supabase
        .from("lesson_assignments")
        .select("id, status, assigned_at, lesson_id, lessons(id, title, approach, duration_minutes, content, curriculum, subject)")
        .eq("student_id", studentRecord.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: myAssessment, isLoading: assessmentLoading } = useQuery({
    queryKey: ["my-assessment", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_assessments")
        .select("*")
        .eq("submitted_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: teacherProfile } = useQuery({
    queryKey: ["teacher-profile", myAssessment?.teacher_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", myAssessment!.teacher_id)
        .maybeSingle();
      return data;
    },
    enabled: !!myAssessment?.teacher_id,
  });

  const reportConfig = myAssessment ? getReportConfig(myAssessment.age_group) : null;
  const scores = myAssessment ? analyzeResponses(myAssessment.age_group, myAssessment.responses as Record<string, number>) : null;

  return (
    <AppLayout>
      <PageHeader
        title={`Welcome back, ${profile?.full_name || "Student"}`}
        subtitle={today}
      />

      {/* Assessment Results Section */}
      {assessmentLoading ? (
        <LoadingSpinner className="mb-6" />
      ) : myAssessment && reportConfig && scores ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Your Assessment Results</h2>
            <Button variant="outline" size="sm" onClick={() => setShowReport(!showReport)}>
              {showReport ? "Hide Details" : "View Full Report"}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-3 text-center">
                <TrendingUp className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-emerald-700">
                  {scores.filter(s => s.level === "High").length}
                </div>
                <div className="text-xs text-emerald-600">Strong Areas</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3 text-center">
                <Brain className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-amber-700">
                  {scores.filter(s => s.level === "Moderate").length}
                </div>
                <div className="text-xs text-amber-600">Moderate Areas</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3 text-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-red-600">
                  {scores.filter(s => s.level === "Developing").length}
                </div>
                <div className="text-xs text-red-500">Needs Attention</div>
              </CardContent>
            </Card>
          </div>

          {/* Full Report Details */}
          {showReport && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {reportConfig.theories.map((theory) => (
                  <Badge key={theory} className="bg-primary/10 text-primary border-primary/20 text-xs">
                    {theory}
                  </Badge>
                ))}
              </div>
              {scores.map((score, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-semibold">{score.dimension}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{score.theory}</p>
                      </div>
                      <Badge className={`${getLevelColor(score.level)} text-xs`}>{score.level}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Progress value={score.percentage} className={`h-2 flex-1 ${getProgressColor(score.percentage)}`} />
                      <span className="text-sm font-semibold text-foreground w-12 text-right">{score.percentage}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{score.description}</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{score.interpretation}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <h2 className="text-lg font-semibold text-foreground mb-4">Your Assigned Lesson Plans</h2>

      {isLoading ? (
        <LoadingSpinner />
      ) : !assignments || assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Lessons Assigned Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Your teacher hasn't assigned any lesson plans yet. Complete your assessment so your teacher can create personalised lessons for you.
            </p>
            <Link to="/diagnostic">
              <Button>Go to Assessments</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const lesson = assignment.lessons as any;
            if (!lesson) return null;
            const content = parseLessonContent(lesson.content);
            const isExpanded = expandedId === assignment.id;

            return (
              <Card key={assignment.id} className="animate-fade-in">
                <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : assignment.id)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{lesson.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned on {new Date(assignment.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Clock className="h-3 w-3" /> {lesson.duration_minutes || "—"} min
                      </Badge>
                      <Badge variant="outline" className="text-xs">{lesson.approach || lesson.curriculum}</Badge>
                      <StatusBadge variant={assignment.status === "completed" ? "success" : "info"}>
                        {assignment.status}
                      </StatusBadge>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && content && (
                  <CardContent className="pt-0 space-y-4">
                    <Separator />

                    {content.framework_summary && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{content.framework_summary}</p>
                    )}

                    {content.lesson_objectives && content.lesson_objectives.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-primary" /> Lesson Objectives
                        </h4>
                        <div className="space-y-1.5">
                          {content.lesson_objectives.map((obj, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-xs bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                              <p className="text-sm">{obj}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {content.activity_plan && content.activity_plan.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-primary" /> Activity Plan
                        </h4>
                        <div className="space-y-2">
                          {content.activity_plan.map((activity, i) => (
                            <div key={i} className="rounded-lg border border-border p-3">
                              <div className="flex items-start justify-between mb-1">
                                <h5 className="font-medium text-sm">{activity.title}</h5>
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <Clock className="h-2.5 w-2.5" /> {activity.duration_minutes} min
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                              <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground">Materials:</span> {activity.materials}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {content.practice_exercises && content.practice_exercises.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <Dumbbell className="h-4 w-4 text-primary" /> Practice Exercises
                        </h4>
                        <div className="space-y-2">
                          {content.practice_exercises.map((ex, i) => (
                            <div key={i} className="rounded-lg border border-border p-3">
                              <div className="flex items-start justify-between mb-1">
                                <h5 className="font-medium text-sm">{ex.title}</h5>
                                <Badge variant="secondary" className="text-[10px]">{ex.type}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{ex.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {content.assessment_checkpoints && content.assessment_checkpoints.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <ClipboardCheck className="h-4 w-4 text-primary" /> Assessment Checkpoints
                        </h4>
                        <div className="space-y-2">
                          {content.assessment_checkpoints.map((cp, i) => (
                            <div key={i} className="rounded-lg border border-border p-3">
                              <h5 className="font-medium text-sm mb-1">{cp.checkpoint}</h5>
                              <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Criteria:</span> {cp.criteria}</p>
                              <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Method:</span> {cp.method}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

const Dashboard = () => {
  const { profile, user } = useAuth();
  const isStudent = profile?.role === "student";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (isStudent) {
    return <StudentDashboard />;
  }

  const { data: assessmentCount, isLoading: countLoading } = useQuery({
    queryKey: ["student-assessments-count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_assessments")
        .select("id")
        .eq("teacher_id", user!.id);
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user?.id,
  });

  return (
    <AppLayout>
      <GettingStartedBanner />
      <PageHeader
        title={`Welcome back, ${profile?.full_name || "User"}`}
        subtitle={today}
      />

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <div>
              <div className="text-5xl font-bold text-foreground">
                {countLoading ? <LoadingSpinner /> : assessmentCount}
              </div>
              <p className="text-lg text-muted-foreground mt-2">Students Completed Assessment</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Dashboard;
