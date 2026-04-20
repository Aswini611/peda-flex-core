import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Home, Lock, FileText, CheckCircle2, Clock, BarChart3, TrendingUp, ChevronDown, Award, AlertTriangle, Calendar } from "lucide-react";

const CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `Class ${i + 1}` })),
];

const DEFAULT_SECTIONS = ["A", "B", "C", "D", "E", "F"];

interface AnswerItem { question: string; answer: string }

const Analytics = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [reviewing, setReviewing] = useState<any | null>(null);
  const [scoreInput, setScoreInput] = useState<string>("");
  const [feedbackInput, setFeedbackInput] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [classAnalyticsOpen, setClassAnalyticsOpen] = useState(false);
  const [studentAnalytics, setStudentAnalytics] = useState<any | null>(null);

  const isAuthorized =
    profile?.role === "teacher" || profile?.role === "admin" || profile?.role === "school_admin";

  const getClassLabel = (val: string) =>
    CLASS_OPTIONS.find((c) => c.value === val)?.label || val;

  const { data: assignments = [] } = useQuery({
    queryKey: ["analytics-athome-assignments", selectedClass, selectedSection, user?.id],
    enabled: !!selectedClass && !!selectedSection && !!user?.id && isAuthorized,
    queryFn: async () => {
      const { data } = await supabase
        .from("homework_assignments")
        .select("*")
        .eq("assignment_type", "at-home")
        .eq("class_level", selectedClass)
        .eq("section", selectedSection.toUpperCase())
        .order("assigned_at", { ascending: false });
      return data || [];
    },
  });

  const assignmentIds = useMemo(() => assignments.map((a: any) => a.id), [assignments]);

  const { data: roster = [] } = useQuery({
    queryKey: ["analytics-roster", selectedClass, selectedSection, assignmentIds.join(",")],
    enabled: !!selectedClass && !!selectedSection && isAuthorized,
    queryFn: async () => {
      const map = new Map<string, { student_id: string | null; student_name: string }>();
      const { data: assessRows } = await supabase
        .from("student_assessments")
        .select("student_name, submitted_by, student_class, section")
        .eq("student_class", selectedClass)
        .eq("section", selectedSection.toUpperCase());
      for (const r of assessRows || []) {
        const key = (r.submitted_by || r.student_name).toLowerCase();
        if (!map.has(key)) map.set(key, { student_id: r.submitted_by, student_name: r.student_name });
      }
      if (assignmentIds.length > 0) {
        const { data: subRows } = await supabase
          .from("homework_submissions")
          .select("student_id, student_name")
          .in("assignment_id", assignmentIds);
        for (const r of subRows || []) {
          const key = (r.student_id || r.student_name || "").toLowerCase();
          if (!key) continue;
          if (!map.has(key)) map.set(key, { student_id: r.student_id, student_name: r.student_name || "Unknown" });
        }
      }
      return Array.from(map.values());
    },
  });

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["analytics-athome-submissions", assignmentIds],
    enabled: assignmentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("homework_submissions")
        .select("*")
        .in("assignment_id", assignmentIds)
        .eq("completed", true)
        .order("submitted_at", { ascending: false });
      return data || [];
    },
  });

  const rows = useMemo(() => {
    return roster.map((stu) => {
      const studentSubs = submissions.filter(
        (s: any) => s.student_id === stu.student_id || s.student_name === stu.student_name
      );
      const latest = studentSubs[0] || null;
      const evaluatedCount = studentSubs.filter((s: any) => s.teacher_score != null).length;
      const evaluatedSubs = studentSubs.filter((s: any) => s.teacher_score != null);
      const avgScore = evaluatedSubs.length
        ? evaluatedSubs.reduce((sum, s: any) => sum + Number(s.teacher_score), 0) / evaluatedSubs.length
        : null;
      return {
        student_id: stu.student_id,
        student_name: stu.student_name,
        submissionsCount: studentSubs.length,
        totalAssignments: assignments.length,
        evaluatedCount,
        avgScore,
        latest,
        allSubs: studentSubs,
      };
    }).sort((a, b) => a.student_name.localeCompare(b.student_name));
  }, [roster, submissions, assignments]);

  // Class-wide analytics
  const classAnalytics = useMemo(() => {
    const totalStudents = rows.length;
    const submittedStudents = rows.filter(r => r.submissionsCount > 0).length;
    const submissionRate = totalStudents ? Math.round((submittedStudents / totalStudents) * 100) : 0;
    const evaluatedSubs = submissions.filter((s: any) => s.teacher_score != null);
    const avgScore = evaluatedSubs.length
      ? evaluatedSubs.reduce((sum, s: any) => sum + Number(s.teacher_score), 0) / evaluatedSubs.length
      : 0;
    const pendingEval = submissions.filter((s: any) => s.teacher_score == null).length;

    // Per-assignment breakdown
    const perAssignment = assignments.map((a: any) => {
      const subs = submissions.filter((s: any) => s.assignment_id === a.id);
      const evals = subs.filter((s: any) => s.teacher_score != null);
      const avg = evals.length
        ? evals.reduce((sum, s: any) => sum + Number(s.teacher_score), 0) / evals.length
        : 0;
      return {
        name: (a.topic || a.period_title || "Untitled").substring(0, 20),
        fullName: a.topic || a.period_title || "Untitled",
        avgScore: Math.round(avg),
        submitted: subs.length,
        evaluated: evals.length,
      };
    });

    // Score distribution histogram (buckets of 10)
    const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(b => ({
      range: `${b}-${b + 10}`,
      count: evaluatedSubs.filter((s: any) => {
        const sc = Number(s.teacher_score);
        return sc >= b && (b === 90 ? sc <= 100 : sc < b + 10);
      }).length,
    }));

    // Top & bottom performers (only those evaluated)
    const performers = rows
      .filter(r => r.avgScore != null)
      .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
    const top = performers.slice(0, 5);
    const bottom = performers.slice(-5).reverse();

    return { totalStudents, submittedStudents, submissionRate, avgScore, pendingEval, perAssignment, buckets, top, bottom };
  }, [rows, submissions, assignments]);

  // Individual student trend
  const studentTrend = useMemo(() => {
    if (!studentAnalytics) return [];
    return [...studentAnalytics.allSubs]
      .filter((s: any) => s.teacher_score != null)
      .sort((a: any, b: any) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
      .map((s: any) => {
        const a = assignments.find((x: any) => x.id === s.assignment_id);
        return {
          name: (a?.topic || a?.period_title || "Untitled").substring(0, 15),
          score: Number(s.teacher_score),
          date: new Date(s.submitted_at).toLocaleDateString(),
        };
      });
  }, [studentAnalytics, assignments]);

  const openReview = (sub: any) => {
    setReviewing(sub);
    setScoreInput(sub.teacher_score != null ? String(sub.teacher_score) : "");
    setFeedbackInput(sub.teacher_feedback || "");
  };

  const saveScore = async () => {
    if (!reviewing) return;
    const score = parseInt(scoreInput, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error("Enter a score between 0 and 100");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("homework_submissions")
      .update({
        teacher_score: score,
        teacher_feedback: feedbackInput,
        evaluated_at: new Date().toISOString(),
        evaluated_by: user?.id,
      })
      .eq("id", reviewing.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Score saved");
    queryClient.invalidateQueries({ queryKey: ["analytics-athome-submissions", assignmentIds] });
    setReviewing(null);
  };

  if (!isAuthorized) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground">This page is available to teachers and admins.</p>
        </div>
      </AppLayout>
    );
  }

  const reviewingAnswers: AnswerItem[] = Array.isArray(reviewing?.answers) ? reviewing.answers : [];

  return (
    <AppLayout>
      <PageHeader
        title="Analytics Phase"
        subtitle="Review at-home homework answers and assign scores"
      />

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Class & Section</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Class</label>
            <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection(""); }}>
              <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
              <SelectContent>
                {CLASS_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Section</label>
            <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
              <SelectTrigger><SelectValue placeholder="Choose section" /></SelectTrigger>
              <SelectContent>
                {DEFAULT_SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>Section {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedClass || !selectedSection ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Home className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Select a class and section to view at-home homework submissions.
            </p>
          </CardContent>
        </Card>
      ) : subsLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No at-home homework has been assigned for {getClassLabel(selectedClass)} – Section {selectedSection} yet.
            </p>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No students found in this class & section. Add students first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Students — {getClassLabel(selectedClass)} · Section {selectedSection}
              </span>
              <div className="flex gap-2 flex-wrap items-center">
                {/* Clickable assignments badge */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-7 gap-1">
                      <FileText className="h-3 w-3" />
                      {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-3 border-b">
                      <p className="text-sm font-semibold">At-Home Assignments</p>
                      <p className="text-xs text-muted-foreground">{assignments.length} total</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y">
                      {assignments.map((a: any) => {
                        const subs = submissions.filter((s: any) => s.assignment_id === a.id);
                        return (
                          <div key={a.id} className="p-3 hover:bg-muted/50">
                            <p className="text-sm font-medium line-clamp-2">
                              {a.topic || a.period_title || "Untitled"}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : "—"}
                              {a.subject && <span>· {a.subject}</span>}
                            </div>
                            <div className="flex gap-1 mt-2">
                              <Badge variant="outline" className="text-[10px] h-5">
                                {subs.length} submitted
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5">
                                {subs.filter((s: any) => s.teacher_score != null).length} evaluated
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                <Badge variant="secondary">{rows.length} student{rows.length !== 1 ? "s" : ""}</Badge>
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">
                  {rows.filter(r => r.submissionsCount > 0).length} submitted
                </Badge>
                <Badge variant="outline">
                  {rows.filter(r => r.submissionsCount === 0).length} not submitted
                </Badge>

                <Button size="sm" onClick={() => setClassAnalyticsOpen(true)} className="h-7 gap-1">
                  <BarChart3 className="h-3 w-3" /> Class Analytics
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Submitted</TableHead>
                  <TableHead className="text-center">Evaluated</TableHead>
                  <TableHead className="text-center">Avg Score</TableHead>
                  <TableHead>Latest Submission</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const hasSubmission = r.submissionsCount > 0;
                  return (
                    <TableRow key={r.student_id || r.student_name}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => hasSubmission && setStudentAnalytics(r)}
                          disabled={!hasSubmission}
                          className="text-left hover:text-primary hover:underline disabled:no-underline disabled:cursor-default disabled:hover:text-foreground"
                        >
                          {r.student_name}
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        {hasSubmission ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {r.submissionsCount} / {r.totalAssignments}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" /> Not submitted
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {hasSubmission ? `${r.evaluatedCount} / ${r.submissionsCount}` : "—"}
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium">
                        {r.avgScore != null ? `${Math.round(r.avgScore)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.latest?.submitted_at ? new Date(r.latest.submitted_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!hasSubmission}
                          onClick={() => {
                            const latestWithAssignment = {
                              ...r.latest,
                              assignment: assignments.find((a: any) => a.id === r.latest.assignment_id),
                            };
                            openReview(latestWithAssignment);
                          }}
                        >
                          {hasSubmission ? "Review Answers" : "Awaiting"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Review Answers Dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewing?.student_name} — {reviewing?.assignment?.topic || "Homework"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {reviewingAnswers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No answers recorded.</p>
            ) : (
              reviewingAnswers.map((a, i) => (
                <div key={i} className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-sm font-semibold mb-1">Q{i + 1}. {a.question}</p>
                  <p className="text-sm text-foreground/85 whitespace-pre-wrap">
                    <span className="text-muted-foreground">Answer: </span>
                    {a.answer?.trim() || <em className="text-muted-foreground">No answer</em>}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div>
              <label className="text-sm font-medium mb-1 block">Score (0–100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                placeholder="Enter score"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Feedback (optional)</label>
              <Textarea
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Comments for the student…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Cancel</Button>
            <Button onClick={saveScore} disabled={saving}>
              {saving ? "Saving…" : "Save Score"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Analytics Dialog */}
      <Dialog open={classAnalyticsOpen} onOpenChange={setClassAnalyticsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Class Analytics — {getClassLabel(selectedClass)} · Section {selectedSection}
            </DialogTitle>
          </DialogHeader>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Submission Rate</p>
                <p className="text-2xl font-bold">{classAnalytics.submissionRate}%</p>
                <p className="text-[10px] text-muted-foreground">{classAnalytics.submittedStudents}/{classAnalytics.totalStudents} students</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Class Avg Score</p>
                <p className="text-2xl font-bold">{Math.round(classAnalytics.avgScore)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Submissions</p>
                <p className="text-2xl font-bold">{submissions.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Pending Evaluation</p>
                <p className="text-2xl font-bold text-amber-600">{classAnalytics.pendingEval}</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-assignment bar chart */}
          {classAnalytics.perAssignment.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Average Score by Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ avgScore: { label: "Avg Score", color: "hsl(var(--primary))" } }} className="h-[220px]">
                  <BarChart data={classAnalytics.perAssignment}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis domain={[0, 100]} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avgScore" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Score distribution */}
          {submissions.some((s: any) => s.teacher_score != null) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ count: { label: "Students", color: "hsl(var(--chart-2))" } }} className="h-[200px]">
                  <BarChart data={classAnalytics.buckets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Top & Bottom performers */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" /> Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {classAnalytics.top.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No evaluated submissions yet.</p>
                ) : classAnalytics.top.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span>{i + 1}. {p.student_name}</span>
                    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">{Math.round(p.avgScore || 0)}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {classAnalytics.bottom.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No evaluated submissions yet.</p>
                ) : classAnalytics.bottom.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span>{p.student_name}</span>
                    <Badge variant="outline" className="text-amber-700 border-amber-200">{Math.round(p.avgScore || 0)}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Student Analytics Dialog */}
      <Dialog open={!!studentAnalytics} onOpenChange={(o) => !o && setStudentAnalytics(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {studentAnalytics?.student_name} — Performance Analytics
            </DialogTitle>
          </DialogHeader>

          {studentAnalytics && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-2xl font-bold">{studentAnalytics.submissionsCount} / {studentAnalytics.totalAssignments}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Evaluated</p>
                    <p className="text-2xl font-bold">{studentAnalytics.evaluatedCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold">{studentAnalytics.avgScore != null ? `${Math.round(studentAnalytics.avgScore)}%` : "—"}</p>
                  </CardContent>
                </Card>
              </div>

              {studentTrend.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Score Trend Across Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{ score: { label: "Score", color: "hsl(var(--primary))" } }} className="h-[240px]">
                      <LineChart data={studentTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis domain={[0, 100]} fontSize={11} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    No evaluated submissions yet — score the student's homework to see the trend.
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">All Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentAnalytics.allSubs.map((s: any) => {
                        const a = assignments.find((x: any) => x.id === s.assignment_id);
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="text-sm">{a?.topic || a?.period_title || "Untitled"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell className="text-center text-sm font-medium">
                              {s.teacher_score != null ? `${s.teacher_score}%` : <span className="text-muted-foreground">Pending</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setStudentAnalytics(null);
                                  openReview({ ...s, assignment: a });
                                }}
                              >
                                Review
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Analytics;
