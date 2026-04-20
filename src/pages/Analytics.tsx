import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Home, Lock } from "lucide-react";

const CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `Class ${i + 1}` })),
];

const DEFAULT_SECTIONS = ["A", "B", "C", "D", "E", "F"];

const Analytics = () => {
  const { profile, user } = useAuth();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const isAuthorized =
    profile?.role === "teacher" || profile?.role === "admin" || profile?.role === "school_admin";

  const getClassLabel = (val: string) =>
    CLASS_OPTIONS.find((c) => c.value === val)?.label || val;

  // Fetch at-home homework assignments for the selected class/section
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["analytics-athome-assignments", selectedClass, selectedSection, user?.id],
    enabled: !!selectedClass && !!selectedSection && !!user?.id && isAuthorized,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework_assignments")
        .select("*")
        .eq("assignment_type", "at-home")
        .eq("class_level", selectedClass)
        .eq("section", selectedSection.toUpperCase())
        .order("assigned_at", { ascending: false });
      if (error) {
        console.error("Error fetching at-home assignments:", error);
        return [];
      }
      return data || [];
    },
  });

  const assignmentIds = useMemo(() => assignments.map((a: any) => a.id), [assignments]);

  // Fetch submissions for these assignments
  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["analytics-athome-submissions", assignmentIds],
    enabled: assignmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework_submissions")
        .select("*")
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: false });
      if (error) {
        console.error("Error fetching submissions:", error);
        return [];
      }
      return data || [];
    },
  });

  // Group submissions by student
  const studentRows = useMemo(() => {
    const map = new Map<string, {
      studentName: string;
      total: number;
      completed: number;
      avgScore: number;
      latestAt: string | null;
    }>();

    for (const a of assignments) {
      const subs = submissions.filter((s: any) => s.assignment_id === a.id);
      for (const s of subs) {
        const key = s.student_id || s.student_name || "Unknown";
        const name = s.student_name || "Unknown Student";
        const existing = map.get(key) || {
          studentName: name,
          total: 0,
          completed: 0,
          avgScore: 0,
          latestAt: null as string | null,
        };
        existing.studentName = name;
        existing.total += 1;
        if (s.completed) existing.completed += 1;
        existing.avgScore += Number(s.submission_percentage || 0);
        const ts = s.submitted_at || s.updated_at || s.created_at;
        if (ts && (!existing.latestAt || ts > existing.latestAt)) existing.latestAt = ts;
        map.set(key, existing);
      }
    }

    return Array.from(map.values())
      .map((r) => ({ ...r, avgScore: r.total ? Math.round(r.avgScore / r.total) : 0 }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [assignments, submissions]);

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

  const loading = assignmentsLoading || subsLoading;

  return (
    <AppLayout>
      <PageHeader
        title="Analytics Phase"
        subtitle="At-home homework performance by class and section"
      />

      {/* Filters */}
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

      {/* Results */}
      {!selectedClass || !selectedSection ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Home className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Select a class and section to view at-home homework scores.
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Home className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No at-home homework has been assigned for {getClassLabel(selectedClass)} – Section {selectedSection} yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                At-Home Homework Scores — {getClassLabel(selectedClass)} · Section {selectedSection}
              </span>
              <Badge variant="secondary">
                {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} · {studentRows.length} student{studentRows.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Homework has been assigned but no submissions yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-center">Submissions</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="text-center">Avg Score</TableHead>
                    <TableHead>Last Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentRows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.studentName}</TableCell>
                      <TableCell className="text-center">{r.total}</TableCell>
                      <TableCell className="text-center">{r.completed}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            r.avgScore >= 75
                              ? "bg-emerald-500/15 text-emerald-700 border-emerald-200"
                              : r.avgScore >= 50
                                ? "bg-amber-500/15 text-amber-700 border-amber-200"
                                : "bg-red-500/15 text-red-700 border-red-200"
                          }
                        >
                          {r.avgScore}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.latestAt ? new Date(r.latestAt).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default Analytics;
