import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NormalizedGainBadge } from "@/components/NormalizedGainBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Users, TrendingUp, Activity, ClipboardCheck, FileText, Lock, Eye, CheckCircle, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PerformanceEntryModal } from "@/components/PerformanceEntryModal";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `Class ${i + 1}` })),
];

const DEFAULT_SECTIONS = ["A", "B", "C", "D", "E", "F"];

const getClassLabel = (value: string) => CLASS_OPTIONS.find(c => c.value === value)?.label || value;

const Analytics = () => {
  const { profile, user } = useAuth();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedLesson, setSelectedLesson] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"pretest" | "exit_ticket">("pretest");
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [savingOutcomes, setSavingOutcomes] = useState(false);
  const { data: sections = [] } = useQuery({
    queryKey: ["analytics-sections", selectedClass, user?.id],
    queryFn: async () => {
      if (!selectedClass || !user?.id) return DEFAULT_SECTIONS;
      const { data } = await supabase
        .from("student_assessments")
        .select("section")
        .eq("student_class", selectedClass)
        .eq("teacher_id", user.id);
      if (!data || data.length === 0) return DEFAULT_SECTIONS;
      const unique = [...new Set(data.map((d) => d.section).filter(Boolean))] as string[];
      return [...new Set([...unique, ...DEFAULT_SECTIONS])].sort();
    },
    enabled: !!selectedClass && !!user?.id,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["analytics-lessons", selectedClass, selectedSection, user?.id],
    queryFn: async () => {
      if (!selectedClass || !selectedSection) return [];
      const { data } = await supabase
        .from("lessons")
        .select("id, title, subject, curriculum, class_level, section, lesson_content, learning_outcomes")
        .eq("class_level", selectedClass)
        .eq("section", selectedSection)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedClass && !!selectedSection,
  });

  const currentLesson = lessons.find(l => l.id === selectedLesson);

  // Sync learning outcomes when lesson changes
  useEffect(() => {
    if (currentLesson?.learning_outcomes) {
      setLearningOutcomes(currentLesson.learning_outcomes);
    } else {
      setLearningOutcomes("");
    }
  }, [currentLesson?.id, currentLesson?.learning_outcomes]);

  const saveLearningOutcomes = async () => {
    if (!selectedLesson) return;
    setSavingOutcomes(true);
    try {
      const { error } = await supabase
        .from("lessons")
        .update({ learning_outcomes: learningOutcomes } as any)
        .eq("id", selectedLesson);
      if (error) throw error;
      toast.success("Learning outcomes saved ✓");
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSavingOutcomes(false);
    }
  };

  const { data: records = [], refetch: refetchRecords } = useQuery({
    queryKey: ["analytics-perf-records", selectedLesson],
    queryFn: async () => {
      if (!selectedLesson) return [];
      const { data } = await supabase
        .from("performance_records")
        .select("*")
        .eq("lesson_id", selectedLesson);
      return data || [];
    },
    enabled: !!selectedLesson,
  });

  const { data: lessonStudents = [] } = useQuery({
    queryKey: ["analytics-lesson-students", selectedLesson, selectedClass, selectedSection, user?.id],
    queryFn: async () => {
      if (!selectedLesson) return [];

      const { data: assignments, error: assignmentsError } = await supabase
        .from("lesson_assignments")
        .select("student_id")
        .eq("lesson_id", selectedLesson);

      if (assignmentsError) throw assignmentsError;

      let studentIds = [...new Set((assignments || []).map((a) => a.student_id).filter(Boolean))];

      if (studentIds.length === 0) {
        const studentIdsFromRecords = [...new Set(records.map((record) => record.student_id).filter(Boolean))];
        studentIds = studentIdsFromRecords;
      }

      if (studentIds.length === 0 && user?.id && selectedClass && selectedSection) {
        const { data: classAssessments, error: classAssessmentsError } = await supabase
          .from("student_assessments")
          .select("student_name")
          .eq("teacher_id", user.id)
          .eq("student_class", selectedClass)
          .eq("section", selectedSection);

        if (classAssessmentsError) throw classAssessmentsError;

        const normalizedAssessmentNames = new Set(
          (classAssessments || [])
            .map((assessment) => assessment.student_name?.trim().toLowerCase())
            .filter(Boolean)
        );

        const { data: allStudents, error: allStudentsError } = await supabase
          .from("students")
          .select("id, profile_id");

        if (allStudentsError) throw allStudentsError;

        const allProfileIds = [...new Set((allStudents || []).map((student) => student.profile_id).filter(Boolean))];
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", allProfileIds);

        if (allProfilesError) throw allProfilesError;

        const profileById = new Map((allProfiles || []).map((profile) => [profile.id, profile]));

        const matchedStudents = (allStudents || []).filter((student) => {
          const profile = profileById.get(student.profile_id);
          const normalizedName = profile?.full_name?.trim().toLowerCase();
          return profile?.role === "student" && !!normalizedName && normalizedAssessmentNames.has(normalizedName);
        });

        studentIds = matchedStudents.map((student) => student.id);
      }

      if (studentIds.length === 0) {
        const { data: fallbackStudents, error: fallbackStudentsError } = await supabase
          .from("students")
          .select("id, profile_id");

        if (fallbackStudentsError) throw fallbackStudentsError;
        studentIds = (fallbackStudents || []).map((student) => student.id);
      }

      if (studentIds.length === 0) return [];

      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, profile_id")
        .in("id", studentIds);

      if (studentsError) throw studentsError;

      const studentMap = new Map((students || []).map((s) => [s.id, s.profile_id]));
      const profileIds = [...new Set((students || []).map((s) => s.profile_id).filter(Boolean))];

      let profileNameMap = new Map<string, string>();
      if (profileIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds);

        if (profilesError) throw profilesError;
        profileNameMap = new Map((profiles || []).map((p) => [p.id, p.full_name || ""]));
      }

      return studentIds.map((studentId) => {
        const profileId = studentMap.get(studentId);
        const name = profileId ? profileNameMap.get(profileId) : undefined;
        return { id: studentId, name: name || `Student ${studentId.slice(0, 8)}` };
      });
    },
    enabled: !!selectedLesson,
  });

  const studentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    lessonStudents.forEach((student) => map.set(student.id, student.name));
    return map;
  }, [lessonStudents]);

  const studentsForModal = lessonStudents;

  const existingRecords = records.map(r => ({
    student_id: r.student_id,
    pretest_score: r.pretest_score,
  }));

  const chartData = useMemo(() => {
    return records
      .filter(r => r.pretest_score != null && r.posttest_score != null)
      .map(r => ({
        name: studentNameMap.get(r.student_id) || r.student_id.slice(0, 8),
        "Pre-test": r.pretest_score,
        "Post-test": r.posttest_score,
      }));
  }, [records, studentNameMap]);

  const summary = useMemo(() => {
    const withGain = records.filter(r => r.normalized_gain != null);
    if (withGain.length === 0) return null;
    const gains = withGain.map(r => Number(r.normalized_gain));
    const avg = gains.reduce((a, b) => a + b, 0) / gains.length;
    const high = gains.filter(g => g >= 0.7).length;
    const medium = gains.filter(g => g >= 0.3 && g < 0.7).length;
    const low = gains.filter(g => g < 0.3).length;
    return { avg: Math.round(avg * 1000) / 1000, high, medium, low, total: withGain.length };
  }, [records]);

  const toTitleCase = (value: string) =>
    value
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

  const getLessonDisplayName = (lesson: typeof lessons[0]) => {
    const classLabel = getClassLabel(lesson.class_level || selectedClass || "");
    const classValue = lesson.class_level || selectedClass || "";
    const classPrefixes = [
      classLabel,
      classValue ? `Class ${classValue}` : "",
      classValue,
    ].filter(Boolean);

    let rawSubject = (lesson.subject || "General").trim();
    for (const prefix of classPrefixes) {
      const pattern = new RegExp(`^${prefix}\\s*`, "i");
      rawSubject = rawSubject.replace(pattern, "").trim();
    }

    rawSubject = rawSubject.replace(/^class\s*\d+\s*/i, "").trim();
    const subjectLabel = toTitleCase(rawSubject || "General");
    return `${classLabel} ${subjectLabel} Lesson Plan`;
  };

  // Role guard - after all hooks
  if (profile?.role !== "teacher") {
    return (
      <AppLayout>
        <PageHeader title="Pillar 3: The Analytics Phase" subtitle="Performance Analytics & Tracking" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Lock className="h-12 w-12 text-danger mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground max-w-md">Only teachers can access the Analytics Page.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Pillar 3: The Analytics Phase"
        subtitle="Performance Analytics & Tracking"
      />

      {/* Class & Section Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-accent" />
            Select Class & Section
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection(""); setSelectedLesson(""); setShowPdfPreview(false); }}>
                <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {CLASS_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setSelectedLesson(""); setShowPdfPreview(false); }} disabled={!selectedClass}>
                <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                <SelectContent>
                  {sections.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && selectedSection && (
        <div className="space-y-6">
          {/* Lesson Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-accent" />
                Select Lesson Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Lesson Plan</Label>
                <Select value={selectedLesson} onValueChange={(v) => { setSelectedLesson(v); setShowPdfPreview(false); }}>
                  <SelectTrigger><SelectValue placeholder="Choose a lesson plan" /></SelectTrigger>
                  <SelectContent>
                    {lessons.map(l => (
                      <SelectItem key={l.id} value={l.id}>{getLessonDisplayName(l)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {lessons.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No lesson plans found for {getClassLabel(selectedClass)} Section {selectedSection}. Generate one from the Lesson Plan Generator first.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Selected Lesson Content */}
          {selectedLesson && currentLesson && (
            <>
              {/* Lesson Header & Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{getLessonDisplayName(currentLesson)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setModalMode("pretest"); setModalOpen(true); }}>
                      <ClipboardCheck className="h-4 w-4 mr-1" /> Record Pre-test Score
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setModalMode("exit_ticket"); setModalOpen(true); }}>
                      <FileText className="h-4 w-4 mr-1" /> Record Post-test Score
                    </Button>
                    {currentLesson.lesson_content && (
                      <Button size="sm" variant="outline" onClick={() => setShowPdfPreview(!showPdfPreview)}>
                        <Eye className="h-4 w-4 mr-1" /> {showPdfPreview ? "Hide" : "View"} Lesson Plan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Learning Outcomes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Learning Outcomes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Enter the learning outcomes for this lesson. What should students be able to do by the end?
                  </p>
                  <Textarea
                    placeholder={"By the end of the lesson, students will be able to:\n• Identify...\n• Explain...\n• Solve..."}
                    value={learningOutcomes}
                    onChange={(e) => setLearningOutcomes(e.target.value)}
                    rows={6}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={saveLearningOutcomes} disabled={savingOutcomes}>
                    <Save className="h-4 w-4 mr-1" />
                    {savingOutcomes ? "Saving..." : "Save Learning Outcomes"}
                  </Button>
                </CardContent>
              </Card>

              {showPdfPreview && currentLesson.lesson_content && (
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-[hsl(var(--muted))] p-6 sm:p-8">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-foreground">
                        <div>
                          <h2 className="font-serif text-2xl text-foreground">
                            APAS <span className="text-accent italic">Lesson Plan</span>
                          </h2>
                          <p className="text-[10px] font-semibold tracking-[2px] uppercase text-muted-foreground mt-1">
                            Differentiated Lesson Plan
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-muted-foreground">
                            {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                          <span className="inline-block bg-accent text-accent-foreground text-[9px] font-semibold tracking-[1.5px] uppercase px-2.5 py-0.5 rounded-full mt-1">
                            AI Generated
                          </span>
                        </div>
                      </div>

                      {/* Info Card */}
                      <div className="bg-foreground text-background rounded-xl p-5 mb-6 grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-[9px] font-semibold tracking-[1.5px] uppercase opacity-45">Class</p>
                          <p className="font-serif text-base">{getClassLabel(currentLesson.class_level || "")}</p>
                          <p className="text-[11px] opacity-55">Section {currentLesson.section}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold tracking-[1.5px] uppercase opacity-45">Subject</p>
                          <p className="font-serif text-base">{currentLesson.subject || "General"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold tracking-[1.5px] uppercase opacity-45">Report Type</p>
                          <p className="font-serif text-base">Lesson Plan</p>
                          <p className="text-[11px] opacity-55">Differentiated</p>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80
                        [&_h1]:font-serif [&_h1]:text-lg [&_h1]:border-b-2 [&_h1]:border-accent [&_h1]:pb-1 [&_h1]:mt-6 [&_h1]:mb-3
                        [&_h2]:font-serif [&_h2]:text-[15px] [&_h2]:border-l-4 [&_h2]:border-accent [&_h2]:pl-3 [&_h2]:mt-5 [&_h2]:mb-2
                        [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5
                        [&_p]:text-[12px] [&_p]:leading-relaxed [&_p]:text-foreground/70
                        [&_li]:text-[12px] [&_li]:text-foreground/70
                        [&_table]:text-[11px] [&_th]:bg-muted [&_th]:text-[9px] [&_th]:uppercase [&_th]:tracking-wide
                        [&_blockquote]:border-l-4 [&_blockquote]:border-warning [&_blockquote]:bg-warning/10 [&_blockquote]:rounded-r-lg [&_blockquote]:px-4 [&_blockquote]:py-3
                        max-h-[600px] overflow-y-auto
                      ">
                        <ReactMarkdown>{currentLesson.lesson_content}</ReactMarkdown>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-border pt-3 mt-5 flex justify-between items-center">
                        <p className="text-[10px] text-muted-foreground">Auto-generated by APAS AI engine. For academic use only.</p>
                        <p className="font-serif text-[13px] text-muted-foreground italic">APAS · {new Date().getFullYear()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary Cards */}
              {summary && (
                <div className="grid gap-4 sm:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-foreground">{summary.avg.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Class Avg Normalized Gain</p>
                      <NormalizedGainBadge gain={summary.avg} showValue={false} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-success">{summary.high}</p>
                      <p className="text-xs text-muted-foreground mt-1">High Gain (≥0.7)</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-warning">{summary.medium}</p>
                      <p className="text-xs text-muted-foreground mt-1">Medium Gain (0.3–0.7)</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-danger">{summary.low}</p>
                      <p className="text-xs text-muted-foreground mt-1">Low Gain (&lt;0.3)</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Bar Chart */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pre-test vs Post-test Scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <YAxis domain={[0, 100]} className="fill-muted-foreground" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Pre-test" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Post-test" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Performance Table */}
              {records.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Student Performance Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Pre-test</TableHead>
                          <TableHead>Post-test</TableHead>
                          <TableHead>Normalized Gain</TableHead>
                          <TableHead>Mastery</TableHead>
                          <TableHead>Effort</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map(r => (
                          <TableRow key={r.id}>
                            <TableCell>{studentNameMap.get(r.student_id) || r.student_id.slice(0, 8)}</TableCell>
                            <TableCell>{r.pretest_score ?? "—"}</TableCell>
                            <TableCell>{r.posttest_score ?? "—"}</TableCell>
                            <TableCell>
                              {r.normalized_gain != null ? (
                                <NormalizedGainBadge gain={Number(r.normalized_gain)} />
                              ) : "—"}
                            </TableCell>
                            <TableCell>{r.mastery_score ?? "—"}</TableCell>
                            <TableCell>{r.effort_score != null ? `${r.effort_score}/5` : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {records.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ClipboardCheck className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm">No performance records yet. Start by recording pre-test scores.</p>
                  </CardContent>
                </Card>
              )}

              <PerformanceEntryModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                mode={modalMode}
                lessonId={selectedLesson}
                lessonTitle={getLessonDisplayName(currentLesson)}
                students={studentsForModal}
                existingRecords={existingRecords}
                onSaved={refetchRecords}
              />
            </>
          )}

          {!selectedLesson && lessons.length > 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Select a lesson plan above to view analytics and record scores</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(!selectedClass || !selectedSection) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Select a class and section above to view analytics</p>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default Analytics;
