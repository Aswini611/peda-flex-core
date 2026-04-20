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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Home, Lock, FileText, CheckCircle2, Clock } from "lucide-react";

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

  // Roster of all students in this class+section (mirrors Reports tab source)
  const { data: roster = [] } = useQuery({
    queryKey: ["analytics-roster", selectedClass, selectedSection, assignmentIds.join(",")],
    enabled: !!selectedClass && !!selectedSection && isAuthorized,
    queryFn: async () => {
      const map = new Map<string, { student_id: string | null; student_name: string }>();

      // Primary source: student_assessments (same as Reports tab)
      const { data: assessRows } = await supabase
        .from("student_assessments")
        .select("student_name, submitted_by, student_class, section")
        .eq("student_class", selectedClass)
        .eq("section", selectedSection.toUpperCase());
      for (const r of assessRows || []) {
        const key = (r.submitted_by || r.student_name).toLowerCase();
        if (!map.has(key)) map.set(key, { student_id: r.submitted_by, student_name: r.student_name });
      }

      // Fallback: include any student who already submitted homework for this class
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

  // Build per-student aggregated row: submissions count, latest submission, evaluated count
  const rows = useMemo(() => {
    return roster.map((stu) => {
      const studentSubs = submissions.filter(
        (s: any) => s.student_id === stu.student_id || s.student_name === stu.student_name
      );
      const latest = studentSubs[0] || null;
      const evaluatedCount = studentSubs.filter((s: any) => s.teacher_score != null).length;
      return {
        student_id: stu.student_id,
        student_name: stu.student_name,
        submissionsCount: studentSubs.length,
        totalAssignments: assignments.length,
        evaluatedCount,
        latest,
        allSubs: studentSubs,
      };
    }).sort((a, b) => a.student_name.localeCompare(b.student_name));
  }, [roster, submissions, assignments]);


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
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{assignments.length} assignment{assignments.length !== 1 ? "s" : ""}</Badge>
                <Badge variant="secondary">{rows.length} student{rows.length !== 1 ? "s" : ""}</Badge>
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">
                  {rows.filter(r => r.submissionsCount > 0).length} submitted
                </Badge>
                <Badge variant="outline">
                  {rows.filter(r => r.submissionsCount === 0).length} not submitted
                </Badge>
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
                  <TableHead>Latest Submission</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const hasSubmission = r.submissionsCount > 0;
                  return (
                    <TableRow key={r.student_id || r.student_name}>
                      <TableCell className="font-medium">{r.student_name}</TableCell>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {r.latest?.submitted_at ? new Date(r.latest.submitted_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!hasSubmission}
                          onClick={() => {
                            // Open the latest submission (with assignment context)
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
    </AppLayout>
  );
};

export default Analytics;
