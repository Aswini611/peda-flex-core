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
import { Users, TrendingUp, Activity, ClipboardCheck, FileText, Lock, Eye, CheckCircle, Save, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter } from "recharts";
import { PerformanceEntryModal } from "@/components/PerformanceEntryModal";
import { BulkScoreEntryModal } from "@/components/BulkScoreEntryModal";
import { ScoreEntrySelectionModal } from "@/components/ScoreEntrySelectionModal";
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
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"pretest" | "posttest">("pretest");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"pretest" | "exit_ticket">("pretest");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<"pretest" | "posttest">("pretest");
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [savingOutcomes, setSavingOutcomes] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<"class" | "individual">("class");
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
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, subject, curriculum, class_level, section, vark_target, learning_outcomes")
        .eq("class_level", selectedClass)
        .eq("section", selectedSection)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClass && !!selectedSection,
  });

  const currentLesson =
    (lessons.find((l: any) => l.id === selectedLesson) ?? lessons[0]) as any | undefined;

  // Auto-pick the latest lesson for class+section so Analytics can render immediately
  useEffect(() => {
    if (!selectedClass || !selectedSection) return;
    setSelectedLesson(lessons[0]?.id || "");
    setShowPdfPreview(false);
  }, [lessons, selectedClass, selectedSection]);

  const { data: records = [], refetch: refetchRecords } = useQuery({
    queryKey: ["analytics-perf-records", selectedLesson],
    queryFn: async () => {
      if (!selectedLesson || !user?.id) return [];
      const { data, error } = await supabase
        .from("performance_records")
        .select("*")
        .eq("lesson_id", selectedLesson)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedLesson && !!user?.id,
  });

  // Helper function to get student IDs for the class/section
  const getLessonStudentIds = async () => {
    if (!selectedClass || !selectedSection || !user?.id) return [];
    const { data: classAssessments } = await supabase
      .from("student_assessments")
      .select("student_name")
      .eq("teacher_id", user.id)
      .eq("student_class", selectedClass)
      .eq("section", selectedSection);

    const normalizedAssessmentNames = new Set(
      (classAssessments || [])
        .map((assessment) => assessment.student_name?.trim().toLowerCase())
        .filter(Boolean)
    );

    const { data: allStudents } = await supabase
      .from("students")
      .select("id, profile_id");

    const allProfileIds = [...new Set((allStudents || []).map((student) => student.profile_id).filter(Boolean))];
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", allProfileIds);

    const profileById = new Map((allProfiles || []).map((profile) => [profile.id, profile]));
    const matchedStudents = (allStudents || []).filter((student) => {
      const profile = profileById.get(student.profile_id);
      const normalizedName = profile?.full_name?.trim().toLowerCase();
      return profile?.role === "student" && !!normalizedName && normalizedAssessmentNames.has(normalizedName);
    });

    return matchedStudents.map((student) => student.id);
  };

  const { data: lessonStudents = [] } = useQuery({
    queryKey: ["analytics-lesson-students", selectedClass, selectedSection, user?.id],
    queryFn: async () => {
      if (!selectedClass || !selectedSection || !user?.id) return [];

      let studentIds: string[] = [];

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
        .select("id, profile_id, vark_type, dominant_intelligence, zpd_score")
        .in("id", studentIds);

      if (studentsError) throw studentsError;

      const studentMap = new Map((students || []).map((s) => [s.id, s.profile_id]));
      const studentMetaMap = new Map(
        (students || []).map((s) => [
          s.id,
          {
            vark_type: s.vark_type ?? null,
            dominant_intelligence: s.dominant_intelligence ?? null,
            zpd_score: s.zpd_score ?? null,
          },
        ])
      );
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
        const meta = studentMetaMap.get(studentId);
        return {
          id: studentId,
          name: name || `Student ${studentId.slice(0, 8)}`,
          vark_type: meta?.vark_type ?? null,
          dominant_intelligence: meta?.dominant_intelligence ?? null,
          zpd_score: meta?.zpd_score ?? null,
        };
      });
    },
    enabled: !!selectedClass && !!selectedSection && !!user?.id,
  });

  const studentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    lessonStudents.forEach((student) => map.set(student.id, student.name));
    return map;
  }, [lessonStudents]);

  const studentMetaById = useMemo(() => {
    const map = new Map<
      string,
      { varkType: string | null; dominantIntelligence: string | null; zpdScore: number | null }
    >();
    lessonStudents.forEach((s: any) => {
      map.set(s.id, {
        varkType: s.vark_type ?? null,
        dominantIntelligence: s.dominant_intelligence ?? null,
        zpdScore: s.zpd_score ?? null,
      });
    });
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

  // Check if we have both pre-test and post-test scores for at least one student
  const hasCompleteData = useMemo(() => {
    return records.some(r => r.pretest_score != null && r.posttest_score != null);
  }, [records]);

  const calcNormalizedGain = (pretest: number, posttest: number) => {
    // Same formula as the DB generated column:
    // (post - pre) / (100 - pre), with denom guard when pre=100.
    const denom = 100 - pretest;
    if (denom <= 0) return 0;
    return (posttest - pretest) / denom;
  };

  const summary = useMemo(() => {
    const withGain = records.filter(r => r.pretest_score != null && r.posttest_score != null);
    if (withGain.length === 0) return null;
    const gains = withGain.map((r) => {
      const pre = Number(r.pretest_score);
      const post = Number(r.posttest_score);
      return r.normalized_gain != null ? Number(r.normalized_gain) : calcNormalizedGain(pre, post);
    });
    const avg = gains.reduce((a, b) => a + b, 0) / gains.length;
    const high = gains.filter(g => g >= 0.7).length;
    const medium = gains.filter(g => g >= 0.3 && g < 0.7).length;
    const low = gains.filter(g => g < 0.3).length;
    return { avg: Math.round(avg * 1000) / 1000, high, medium, low, total: withGain.length };
  }, [records, calcNormalizedGain]);

  // CLASS-LEVEL ANALYTICS
  const classAnalytics = useMemo(() => {
    if (records.length === 0) return null;

    const complete = records.filter(r => r.pretest_score != null && r.posttest_score != null);
    const pretestScores = complete.map(r => Number(r.pretest_score));
    const posttestScores = complete.map(r => Number(r.posttest_score));

    const avgPretest = pretestScores.length > 0
      ? pretestScores.reduce((a, b) => a + b, 0) / pretestScores.length
      : 0;
    const avgPosttest = posttestScores.length > 0
      ? posttestScores.reduce((a, b) => a + b, 0) / posttestScores.length
      : 0;

    const gains = complete.map((r) => {
      const pre = Number(r.pretest_score);
      const post = Number(r.posttest_score);
      const gain = r.normalized_gain != null ? Number(r.normalized_gain) : calcNormalizedGain(pre, post);
      return {
        studentId: r.student_id,
        name: studentNameMap.get(r.student_id) || `Student ${r.student_id.slice(0, 8)}`,
        posttest: post,
        gain,
      };
    });

    // Identify clusters using normalized gain (not raw post-test).
    const highPerformers = gains.filter(g => g.gain >= 0.7);
    const mediumPerformers = gains.filter(g => g.gain >= 0.3 && g.gain < 0.7);
    const lowPerformers = gains.filter(g => g.gain < 0.3);

    return {
      avgPretest: Math.round(avgPretest * 10) / 10,
      avgPosttest: Math.round(avgPosttest * 10) / 10,
      avgGain:
        gains.length > 0 ? Math.round((gains.reduce((a, b) => a + b.gain, 0) / gains.length) * 1000) / 1000 : 0,
      studentsWithScores: complete.length,
      totalStudents: lessonStudents.length,
      highPerformers,
      mediumPerformers,
      lowPerformers,
    };
  }, [records, studentNameMap, lessonStudents, calcNormalizedGain]);

  // INDIVIDUAL STUDENT ANALYTICS
  const selectedStudentRecord = useMemo(() => {
    if (!selectedStudent) return null;
    return records.find(r => r.student_id === selectedStudent) || null;
  }, [records, selectedStudent]);

  const individualAnalytics = useMemo(() => {
    if (!selectedStudentRecord || !classAnalytics) return null;

    const pretest = selectedStudentRecord.pretest_score != null ? Number(selectedStudentRecord.pretest_score) : null;
    const posttest = selectedStudentRecord.posttest_score != null ? Number(selectedStudentRecord.posttest_score) : null;
    const gain =
      pretest !== null && posttest !== null
        ? (selectedStudentRecord.normalized_gain != null
            ? Number(selectedStudentRecord.normalized_gain)
            : calcNormalizedGain(pretest, posttest))
        : null;

    // Determine performance level
    let performanceLevel = "Not Assessed";
    if (posttest !== null) {
      if (posttest >= 80) performanceLevel = "Excellent";
      else if (posttest >= 60) performanceLevel = "Good";
      else performanceLevel = "Needs Support";
    }
    
    // Compare to class average
    const vsClassAverage = posttest !== null ? posttest - classAnalytics.avgPosttest : null;
    const cluster =
      gain !== null
      ? (gain >= 0.7 ? "High Performer" : gain >= 0.3 ? "Average" : "Needs Support")
      : "Not Assessed";
    
    const studentMeta = studentMetaById.get(selectedStudent);
    const targetVark = currentLesson?.vark_target ?? null;
    const alignedToLesson =
      targetVark && studentMeta?.varkType
        ? studentMeta.varkType.toLowerCase() === String(targetVark).toLowerCase()
        : null;

    const weakAreas: string[] = [];
    if (gain != null && gain < 0.3) weakAreas.push("Low normalized gain (needs focused re-teaching)");
    const mastery = selectedStudentRecord.mastery_score != null ? Number(selectedStudentRecord.mastery_score) : null;
    const effort = selectedStudentRecord.effort_score != null ? Number(selectedStudentRecord.effort_score) : null;
    if (mastery != null && mastery < 60) weakAreas.push("Low mastery score (targeted practice needed)");
    if (effort != null && effort <= 2) weakAreas.push("Low effort score (engagement support needed)");

    const personalizedRecommendations: string[] = [];
    if (gain != null) {
      if (gain < 0.3) {
        personalizedRecommendations.push("Revisit fundamentals with guided examples and frequent checks for understanding.");
        personalizedRecommendations.push("Use more hands-on practice and scaffolded problem sets (small steps).");
      } else if (gain < 0.7) {
        personalizedRecommendations.push("Reinforce key skills using mixed strategies (visual + practice + feedback).");
        personalizedRecommendations.push("Provide targeted review for the concepts that didn’t transfer well.");
      } else {
        personalizedRecommendations.push("Continue enrichment and differentiate with extension tasks.");
        personalizedRecommendations.push("Maintain strong feedback loops to keep momentum.");
      }
    }
    if (alignedToLesson === false) {
      personalizedRecommendations.push("Adjust lesson delivery to better match the student’s learning preference (VARK alignment).");
    }
    if (mastery != null && mastery < 60) {
      personalizedRecommendations.push("Prioritize mastery gaps with short, repeated practice and targeted remediation.");
    }
    if (effort != null && effort <= 2) {
      personalizedRecommendations.push("Increase engagement with shorter activities, encouragement, and immediate feedback.");
    }

    return {
      name: studentNameMap.get(selectedStudent) || `Student ${selectedStudent.slice(0, 8)}`,
      pretest,
      posttest,
      gain,
      performanceLevel,
      vsClassAverage,
      cluster,
      improvement: pretest !== null && posttest !== null ? posttest - pretest : null,
      weakAreas,
      learningStyleAlignment:
        alignedToLesson === true
          ? `Aligned with lesson VARK (${studentMeta?.varkType})`
          : alignedToLesson === false
            ? `Misaligned (Student: ${studentMeta?.varkType}, Target: ${targetVark})`
            : "Unknown (missing VARK data)",
      personalizedRecommendations: personalizedRecommendations.length > 0 ? personalizedRecommendations : ["No recommendations available yet."],
    };
  }, [selectedStudentRecord, classAnalytics, studentNameMap, selectedStudent, calcNormalizedGain, studentMetaById, currentLesson]);

  const toTitleCase = (value: string) =>
    value
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

  const getLessonDisplayName = (lesson: any) => {
    if (!lesson) return "";
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
    const curriculumSuffix = lesson.curriculum ? ` (${toTitleCase(lesson.curriculum)})` : "";
    return `${classLabel} ${subjectLabel} Lesson Plan${curriculumSuffix}`;
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
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection(""); setSelectedLesson(""); setSelectedStudent(""); setAnalyticsView("class"); setShowPdfPreview(false); }}>
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
              <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setSelectedLesson(""); setSelectedStudent(""); setAnalyticsView("class"); setShowPdfPreview(false); }} disabled={!selectedClass}>
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
          {/* Student Selection */}
          {lessonStudents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  👤 Select Student
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select
                    value={selectedStudent}
                    onValueChange={(v) => {
                      setSelectedStudent(v);
                      setAnalyticsView(v ? "individual" : "class");
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="All Students (Class View)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Students (Class View)</SelectItem>
                      {lessonStudents.map(student => (
                        <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics View Toggle */}
          {lessonStudents.length > 0 && (
            <div className="flex gap-2 mb-6">
              <Button
                variant={analyticsView === "class" ? "default" : "outline"}
                onClick={() => {
                  setAnalyticsView("class");
                  setSelectedStudent("");
                }}
                className="gap-2"
              >
                📊 Class Analytics
              </Button>
              <Button
                variant={analyticsView === "individual" ? "default" : "outline"}
                onClick={() => setAnalyticsView("individual")}
                disabled={!selectedStudent}
                className="gap-2"
              >
                👤 Individual Analytics
              </Button>
            </div>
          )}

          {/* Selected Lesson Content */}
          {/* Score Recording Buttons */}
          {lessonStudents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-accent" />
                  Record Assessment Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setSelectionMode("pretest");
                      setSelectionModalOpen(true);
                    }}
                  >
                    <ClipboardCheck className="h-4 w-4 mr-1" /> Record Pre-test Scores
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setSelectionMode("posttest");
                      setSelectionModalOpen(true);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1" /> Record Post-test Scores
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

              {/* CLASS-LEVEL ANALYTICS */}
              {analyticsView === "class" && classAnalytics && (
                <div className="space-y-6">
                  {/* Class Overview Cards */}
                  <div className="grid gap-4 sm:grid-cols-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                      <CardContent className="pt-6 text-center">
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{classAnalytics.avgPretest.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Average Pre-test Score</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                      <CardContent className="pt-6 text-center">
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{classAnalytics.avgPosttest.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Average Post-test Score</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                      <CardContent className="pt-6 text-center">
                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{classAnalytics.studentsWithScores}</p>
                        <p className="text-xs text-muted-foreground mt-1">Students Assessed</p>
                        <p className="text-xs text-muted-foreground">of {classAnalytics.totalStudents}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                      <CardContent className="pt-6 text-center">
                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                          {((classAnalytics.avgPosttest - classAnalytics.avgPretest) / classAnalytics.avgPretest * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Class Improvement</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Performance Clusters */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        🎯 Performance Clusters
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{classAnalytics.highPerformers.length}</p>
                          <p className="text-sm font-semibold text-foreground mt-1">High Performers</p>
                            <p className="text-xs text-muted-foreground mt-1">Normalized Gain ≥ 0.7</p>
                          <div className="mt-3 space-y-1">
                            {classAnalytics.highPerformers.slice(0, 3).map(student => (
                              <p key={student.studentId} className="text-xs truncate">• {student.name}</p>
                            ))}
                            {classAnalytics.highPerformers.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{classAnalytics.highPerformers.length - 3} more</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{classAnalytics.mediumPerformers.length}</p>
                          <p className="text-sm font-semibold text-foreground mt-1">Average Performers</p>
                            <p className="text-xs text-muted-foreground mt-1">Normalized Gain 0.3–0.7</p>
                          <div className="mt-3 space-y-1">
                            {classAnalytics.mediumPerformers.slice(0, 3).map(student => (
                              <p key={student.studentId} className="text-xs truncate">• {student.name}</p>
                            ))}
                            {classAnalytics.mediumPerformers.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{classAnalytics.mediumPerformers.length - 3} more</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 border border-red-200 dark:border-red-800">
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{classAnalytics.lowPerformers.length}</p>
                          <p className="text-sm font-semibold text-foreground mt-1">Needs Support</p>
                            <p className="text-xs text-muted-foreground mt-1">Normalized Gain &lt; 0.3</p>
                          <div className="mt-3 space-y-1">
                            {classAnalytics.lowPerformers.slice(0, 3).map(student => (
                              <p key={student.studentId} className="text-xs truncate">• {student.name}</p>
                            ))}
                            {classAnalytics.lowPerformers.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{classAnalytics.lowPerformers.length - 3} more</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score Distribution Chart */}
                  {records.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">📊 Normalized Gain Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={[
                              { name: "Low (<0.3)", count: classAnalytics.lowPerformers.length },
                              { name: "Medium (0.3–0.7)", count: classAnalytics.mediumPerformers.length },
                              { name: "High (≥0.7)", count: classAnalytics.highPerformers.length },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="name" className="fill-muted-foreground" />
                            <YAxis domain={[0, Math.max(1, classAnalytics.totalStudents)]} className="fill-muted-foreground" />
                            <Tooltip />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Weak Areas (derived) */}
                  {classAnalytics.lowPerformers.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">🧩 Common Weak Areas</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <p>
                          {classAnalytics.lowPerformers.length} students are in the <strong>Low Gain</strong> group.
                          Consider reteaching fundamentals and using more guided practice/targeted feedback.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Suggested next step: review lesson delivery vs learner needs, then re-record after intervention.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* INDIVIDUAL STUDENT ANALYTICS */}
              {analyticsView === "individual" && selectedStudent && individualAnalytics && (
                <div className="space-y-6">
                  {/* Student Profile Card */}
                  <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 border-2 border-indigo-200 dark:border-indigo-800">
                    <CardHeader>
                      <CardTitle className="text-2xl">{individualAnalytics.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Lesson Performance Report</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-4">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Pre-test Score</p>
                          <p className="text-2xl font-bold text-foreground mt-1">
                            {individualAnalytics.pretest !== null ? `${individualAnalytics.pretest}` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Post-test Score</p>
                          <p className="text-2xl font-bold text-foreground mt-1">
                            {individualAnalytics.posttest !== null ? `${individualAnalytics.posttest}` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Improvement</p>
                          <p className="text-2xl font-bold text-success mt-1">
                            {individualAnalytics.improvement !== null ? `+${individualAnalytics.improvement}` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Performance Level</p>
                          <p className={`text-lg font-bold mt-1 ${
                            individualAnalytics.performanceLevel === "Excellent" ? "text-green-600 dark:text-green-400" :
                            individualAnalytics.performanceLevel === "Good" ? "text-yellow-600 dark:text-yellow-400" :
                            "text-red-600 dark:text-red-400"
                          }`}>
                            {individualAnalytics.performanceLevel}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comparison with Class */}
                  {classAnalytics && individualAnalytics.posttest !== null && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          📈 Individual vs Class Average
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={[
                              { name: "Pre-test", student: individualAnalytics.pretest || 0, class: classAnalytics.avgPretest },
                              { name: "Post-test", student: individualAnalytics.posttest, class: classAnalytics.avgPosttest },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="name" className="fill-muted-foreground" />
                            <YAxis domain={[0, 100]} className="fill-muted-foreground" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="student" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Student" />
                            <Bar dataKey="class" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Class Average" />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p className="text-sm">
                            {individualAnalytics.vsClassAverage !== null && (
                              <>
                                This student is <strong>
                                  {individualAnalytics.vsClassAverage > 0 ? "above" : "below"}
                                </strong> class average by <strong>{Math.abs(individualAnalytics.vsClassAverage).toFixed(1)} points</strong>
                              </>
                            )}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Learning Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        💡 Learning Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">LEARNING GAIN</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {individualAnalytics.gain !== null ? `${(Number(individualAnalytics.gain) * 100).toFixed(1)}%` : "—"}
                          </p>
                          <NormalizedGainBadge gain={individualAnalytics.gain || 0} className="mt-2" />
                        </div>
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">CLUSTER GROUP</p>
                          <p className={`text-2xl font-bold ${
                            individualAnalytics.cluster === "High Performer" ? "text-green-600 dark:text-green-400" :
                            individualAnalytics.cluster === "Average" ? "text-yellow-600 dark:text-yellow-400" :
                            "text-red-600 dark:text-red-400"
                          }`}>
                            {individualAnalytics.cluster}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Personalized Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        🎯 Personalized Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">🎯 Learning Style Alignment</p>
                          <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">{individualAnalytics.learningStyleAlignment}</p>
                        </div>

                        {individualAnalytics.weakAreas.length > 0 && (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">🧩 Weak Areas</p>
                            <ul className="list-disc list-inside text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                              {individualAnalytics.weakAreas.slice(0, 3).map((w, idx) => (
                                <li key={idx}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm font-semibold text-green-900 dark:text-green-100">📋 Personalized Recommendations</p>
                          <ul className="list-disc list-inside text-xs text-green-800 dark:text-green-200 mt-1">
                            {individualAnalytics.personalizedRecommendations.slice(0, 4).map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* No Data Message */}
              {selectedLesson && records.length === 0 && (
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

              <BulkScoreEntryModal
                open={bulkModalOpen}
                onOpenChange={setBulkModalOpen}
                mode={bulkModalMode}
                lessonId={selectedLesson}
                lessonTitle={getLessonDisplayName(currentLesson)}
                students={studentsForModal}
                existingRecords={records}
                onSaved={refetchRecords}
              />

              <ScoreEntrySelectionModal
                open={selectionModalOpen}
                onOpenChange={setSelectionModalOpen}
                mode={selectionMode}
                onSelectWholeClass={() => {
                  setBulkModalMode(selectionMode === "pretest" ? "pretest" : "posttest");
                  setBulkModalOpen(true);
                }}
                onSelectIndividual={() => {
                  setModalMode(selectionMode === "pretest" ? "pretest" : "exit_ticket");
                  setModalOpen(true);
                }}

              />
            </div>
          )}


          {!selectedLesson && lessons.length > 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Select a lesson plan above to view analytics and record scores</p>
              </CardContent>
            </Card>
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
