import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { GettingStartedBanner } from "@/components/GettingStartedBanner";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { Users, CheckCircle, Book, AlertTriangle, Target, BookOpen, Clock, Dumbbell, ClipboardCheck, TrendingUp, Brain, FileText, BarChart3, ArrowRight, Sparkles, GraduationCap, Lightbulb, LineChart } from "lucide-react";
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
import teacherHeroBg from "@/assets/teacher-hero-bg.jpg";

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

/* ───────────────────────────── STUDENT DASHBOARD ───────────────────────────── */

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

      {assessmentLoading ? (
        <LoadingSpinner className="mb-6" />
      ) : myAssessment && reportConfig && scores ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Your Assessment Results</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setReportOpen(true)} className="gap-1.5">
                <FileText className="h-4 w-4" /> View Full Report
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowReport(!showReport)}>
                {showReport ? "Hide Details" : "Show Details"}
              </Button>
            </div>
          </div>

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

      {myAssessment && (
        <StudentReport
          open={reportOpen}
          onOpenChange={setReportOpen}
          studentName={myAssessment.student_name}
          studentAge={myAssessment.student_age}
          ageGroup={myAssessment.age_group}
          responses={myAssessment.responses as Record<string, any>}
          submittedAt={myAssessment.created_at}
          studentClass={myAssessment.student_class || undefined}
          teacherName={teacherProfile?.full_name || undefined}
        />
      )}
    </AppLayout>
  );
};

/* ───────────────────────────── TEACHER HOME ───────────────────────────── */

const featureCards = [
  {
    icon: Users,
    title: "Student Reports",
    description: "View detailed diagnostic reports for every student — learning styles, multiple intelligences, and cognitive profiles all in one place.",
    path: "/teacher",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-600",
  },
  {
    icon: BookOpen,
    title: "AI Lesson Plan Generator",
    description: "Generate personalised, curriculum-aligned lesson plans powered by AI. Tailored to each student's VARK type and learning needs.",
    path: "/curative",
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-600",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Track normalised learning gains, class-wide performance trends, and identify mismatch alerts before they become problems.",
    path: "/analytics",
    color: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-600",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Assess Students",
    description: "Run diagnostic assessments to map each student's learning style, intelligence type, and cognitive profile.",
    icon: Brain,
  },
  {
    step: "02",
    title: "Review Reports",
    description: "Analyse detailed reports with VARK profiles, MI scores, and ZPD levels for every student.",
    icon: FileText,
  },
  {
    step: "03",
    title: "Generate Lesson Plans",
    description: "Use AI to create personalised lesson plans matched to each student's unique learning profile.",
    icon: Sparkles,
  },
  {
    step: "04",
    title: "Track Progress",
    description: "Monitor normalised gains and learning outcomes to continuously refine your teaching approach.",
    icon: LineChart,
  },
];

const TeacherHome = () => {
  const { profile, user } = useAuth();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

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

  const { data: lessonCount } = useQuery({
    queryKey: ["teacher-lesson-count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id");
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user?.id,
  });

  return (
    <AppLayout>
      {/* Hero Section */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-b-2xl">
        <div
          className="relative px-8 py-12 md:py-16"
          style={{
            backgroundImage: `url(${teacherHeroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sidebar-primary))]/90 to-[hsl(var(--sidebar-primary))]/70" />
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="h-6 w-6 text-white/80" />
              <span className="text-sm font-medium text-white/70 uppercase tracking-wider">APAS Teacher Portal</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Welcome back, {profile?.full_name || "Teacher"}
            </h1>
            <p className="text-base text-white/70 mb-1">{today}</p>
            <p className="text-sm text-white/60 max-w-lg mt-3 leading-relaxed">
              Adaptive Personalised Assessment System — empowering you with AI-driven diagnostics, personalised lesson plans, and actionable learning analytics.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {countLoading ? "—" : assessmentCount}
              </p>
              <p className="text-sm text-muted-foreground">Assessments Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <BookOpen className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{lessonCount ?? "—"}</p>
              <p className="text-sm text-muted-foreground">Lesson Plans Created</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
              <Lightbulb className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">AI-Powered</p>
              <p className="text-sm text-muted-foreground">Personalised Learning</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What You Can Do */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-foreground mb-1">What You Can Do</h2>
        <p className="text-sm text-muted-foreground mb-6">Explore the core tools designed to enhance your teaching effectiveness.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {featureCards.map((feature) => (
            <Link key={feature.path} to={feature.path} className="group">
              <Card className="h-full border-border/60 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30">
                <CardContent className="p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">How APAS Works</h2>
        <p className="text-sm text-muted-foreground mb-6">A simple four-step workflow to personalise every student's learning journey.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workflowSteps.map((step, i) => (
            <div key={i} className="relative">
              <Card className="h-full border-border/60">
                <CardContent className="p-5">
                  <span className="text-3xl font-black text-primary/15 absolute top-3 right-4">{step.step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

/* ───────────────────────────── ADMIN HOME ───────────────────────────── */

const adminFeatureCards = [
  {
    icon: Users,
    title: "Student Reports",
    description: "View detailed diagnostic reports for every student across all classes — learning styles, multiple intelligences, and cognitive profiles.",
    path: "/teacher",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-600",
  },
  {
    icon: AlertTriangle,
    title: "Real-time Alerts",
    description: "Monitor system-wide mismatch alerts, flagged performance issues, and intervention recommendations across all classes.",
    path: "/alerts",
    color: "from-amber-500/20 to-amber-600/10",
    iconColor: "text-amber-600",
  },
  {
    icon: GraduationCap,
    title: "Master User Panel",
    description: "Manage classes, allot students and teachers, configure diagnostic questions, and import students via Excel.",
    path: "/admin",
    color: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-600",
  },
];

const AdminHome = () => {
  const { profile } = useAuth();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [classesRes, studentsRes, teachersRes, assessmentsRes, alertsRes] = await Promise.all([
        supabase.from("classes").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("student_assessments").select("id", { count: "exact", head: true }),
        supabase.from("mismatch_alerts").select("id", { count: "exact", head: true }).eq("status", "flagged"),
      ]);
      return {
        classes: classesRes.count ?? 0,
        students: studentsRes.count ?? 0,
        teachers: teachersRes.count ?? 0,
        assessments: assessmentsRes.count ?? 0,
        activeAlerts: alertsRes.count ?? 0,
      };
    },
  });

  return (
    <AppLayout>
      {/* Hero Section */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-b-2xl">
        <div
          className="relative px-8 py-12 md:py-16"
          style={{
            backgroundImage: `url(${teacherHeroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sidebar-primary))]/90 to-[hsl(var(--sidebar-primary))]/70" />
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-6 w-6 text-white/80" />
              <span className="text-sm font-medium text-white/70 uppercase tracking-wider">APAS Admin Console</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Welcome, {profile?.full_name || "Master User"}
            </h1>
            <p className="text-base text-white/70 mb-1">{today}</p>
            <p className="text-sm text-white/60 max-w-lg mt-3 leading-relaxed">
              APAS (Adaptive Pedagogy & Analytics System) is a futuristic AI Operating System designed to personalise learning at scale. As an admin, you oversee the entire ecosystem — classes, teachers, students, diagnostics, and system-wide analytics — all from one place.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {[
          { label: "Classes", value: stats?.classes, icon: Book, color: "bg-primary/10", iconColor: "text-primary" },
          { label: "Students", value: stats?.students, icon: Users, color: "bg-blue-500/10", iconColor: "text-blue-600" },
          { label: "Teachers", value: stats?.teachers, icon: GraduationCap, color: "bg-emerald-500/10", iconColor: "text-emerald-600" },
          { label: "Assessments", value: stats?.assessments, icon: CheckCircle, color: "bg-violet-500/10", iconColor: "text-violet-600" },
          { label: "Active Alerts", value: stats?.activeAlerts, icon: AlertTriangle, color: "bg-amber-500/10", iconColor: "text-amber-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* About APAS */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-foreground mb-1">About APAS</h2>
        <p className="text-sm text-muted-foreground mb-4">Understanding the system you manage.</p>
        <Card className="border-border/60">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-foreground leading-relaxed">
              <strong>APAS</strong> (Adaptive Pedagogy & Analytics System) is a next-generation AI-powered educational platform that personalises learning for every student. It uses a collaborative network of AI agents — Planner, Executor, Analyst, Tutor, and Creator — to provide a highly individualised experience across CBSE, IB, and Cambridge curricula.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border p-4 bg-primary/5">
                <Brain className="h-5 w-5 text-primary mb-2" />
                <h4 className="text-sm font-semibold text-foreground mb-1">Diagnostic Intelligence</h4>
                <p className="text-xs text-muted-foreground">Maps every student's VARK learning style, multiple intelligences, and Zone of Proximal Development using research-backed assessments.</p>
              </div>
              <div className="rounded-lg border border-border p-4 bg-emerald-500/5">
                <Sparkles className="h-5 w-5 text-emerald-600 mb-2" />
                <h4 className="text-sm font-semibold text-foreground mb-1">AI Lesson Generation</h4>
                <p className="text-xs text-muted-foreground">Generates curriculum-aligned, personalised lesson plans tailored to each student's unique cognitive profile and learning needs.</p>
              </div>
              <div className="rounded-lg border border-border p-4 bg-violet-500/5">
                <LineChart className="h-5 w-5 text-violet-600 mb-2" />
                <h4 className="text-sm font-semibold text-foreground mb-1">Analytics & Tracking</h4>
                <p className="text-xs text-muted-foreground">Tracks normalised learning gains, identifies performance mismatches, and provides real-time alerts for proactive intervention.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What You Can Do */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-foreground mb-1">Admin Capabilities</h2>
        <p className="text-sm text-muted-foreground mb-6">Your tools for overseeing and managing the entire APAS ecosystem.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {adminFeatureCards.map((feature) => (
            <Link key={feature.path} to={feature.path} className="group">
              <Card className="h-full border-border/60 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30">
                <CardContent className="p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Admin Workflow */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">Admin Workflow</h2>
        <p className="text-sm text-muted-foreground mb-6">Your role in the APAS ecosystem.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Setup Classes", description: "Create classes with sections, or bulk import students via Excel to auto-create classes.", icon: Book },
            { step: "02", title: "Assign Teachers", description: "Allot teachers to classes and assign diagnostic question sets by age group.", icon: GraduationCap },
            { step: "03", title: "Monitor Reports", description: "Review all student diagnostic reports across every class and teacher in the system.", icon: FileText },
            { step: "04", title: "Manage Alerts", description: "Oversee real-time mismatch alerts and ensure timely interventions across the system.", icon: AlertTriangle },
          ].map((step, i) => (
            <div key={i} className="relative">
              <Card className="h-full border-border/60">
                <CardContent className="p-5">
                  <span className="text-3xl font-black text-primary/15 absolute top-3 right-4">{step.step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

/* ───────────────────────────── ROUTER ───────────────────────────── */

const Dashboard = () => {
  const { profile } = useAuth();

  if (profile?.role === "student") {
    return <StudentDashboard />;
  }

  if (profile?.role === "admin") {
    return <AdminHome />;
  }

  return <TeacherHome />;
};

export default Dashboard;
