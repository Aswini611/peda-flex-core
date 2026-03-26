import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NormalizedGainBadge } from "@/components/NormalizedGainBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Lock, BarChart3, Users, User, TrendingUp, TrendingDown, AlertTriangle, Activity, Target, Brain, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line,
} from "recharts";

const CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `Class ${i + 1}` })),
];

const DEFAULT_SECTIONS = ["A", "B", "C", "D", "E", "F"];

const GAIN_COLORS = { high: "hsl(160, 84%, 39%)", medium: "hsl(32, 95%, 44%)", low: "hsl(0, 72%, 51%)" };

const Analytics = () => {
  const { profile, user } = useAuth();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [activeTab, setActiveTab] = useState("class");

  const isAuthorized = profile?.role === "teacher" || profile?.role === "admin";

  const getClassLabel = (val: string) => CLASS_OPTIONS.find(c => c.value === val)?.label || val;

  // Fetch sections
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
      const unique = [...new Set(data.map(d => d.section).filter(Boolean))] as string[];
      return [...new Set([...unique, ...DEFAULT_SECTIONS])].sort();
    },
    enabled: !!selectedClass && !!user?.id,
  });

  // Fetch students in selected class/section from student_assessments
  const { data: classStudents = [] } = useQuery({
    queryKey: ["analytics-students", selectedClass, selectedSection, user?.id],
    queryFn: async () => {
      if (!selectedClass || !selectedSection || !user?.id) return [];
      const { data } = await supabase
        .from("student_assessments")
        .select("id, student_name, student_age, age_group, responses, created_at, curriculum")
        .eq("student_class", selectedClass)
        .eq("section", selectedSection)
        .eq("teacher_id", user.id);
      return data || [];
    },
    enabled: !!selectedClass && !!selectedSection && !!user?.id,
  });

  // Fetch lessons for this class/section
  const { data: lessons = [] } = useQuery({
    queryKey: ["analytics-lessons", selectedClass, selectedSection],
    queryFn: async () => {
      if (!selectedClass || !selectedSection) return [];
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("class_level", selectedClass)
        .eq("section", selectedSection)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedClass && !!selectedSection,
  });

  // Fetch performance records for lessons
  const lessonIds = lessons.map(l => l.id);
  const { data: performanceRecords = [] } = useQuery({
    queryKey: ["analytics-performance", lessonIds],
    queryFn: async () => {
      if (lessonIds.length === 0) return [];
      const { data } = await supabase
        .from("performance_records")
        .select("*")
        .in("lesson_id", lessonIds);
      return data || [];
    },
    enabled: lessonIds.length > 0,
  });

  // Fetch mismatch alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ["analytics-alerts", lessonIds],
    queryFn: async () => {
      if (lessonIds.length === 0) return [];
      const { data } = await supabase
        .from("mismatch_alerts")
        .select("*")
        .in("lesson_type", lessonIds)
        .eq("status", "flagged");
      return data || [];
    },
    enabled: lessonIds.length > 0,
  });

  // Computed analytics
  const classAnalytics = useMemo(() => {
    if (performanceRecords.length === 0) return null;

    const withGain = performanceRecords.filter(r => r.normalized_gain != null && r.student_id !== "class_level");
    const withPretest = performanceRecords.filter(r => r.pretest_score != null && r.student_id !== "class_level");
    const withPosttest = performanceRecords.filter(r => r.posttest_score != null && r.student_id !== "class_level");

    const gains = withGain.map(r => Number(r.normalized_gain));
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
    const highGain = gains.filter(g => g >= 0.7).length;
    const medGain = gains.filter(g => g >= 0.3 && g < 0.7).length;
    const lowGain = gains.filter(g => g < 0.3).length;

    const avgPretest = withPretest.length > 0
      ? Math.round(withPretest.reduce((s, r) => s + (r.pretest_score || 0), 0) / withPretest.length)
      : 0;
    const avgPosttest = withPosttest.length > 0
      ? Math.round(withPosttest.reduce((s, r) => s + (r.posttest_score || 0), 0) / withPosttest.length)
      : 0;

    const withMastery = performanceRecords.filter(r => r.mastery_score != null && r.student_id !== "class_level");
    const withEffort = performanceRecords.filter(r => r.effort_score != null && r.student_id !== "class_level");
    const avgMastery = withMastery.length > 0
      ? Math.round(withMastery.reduce((s, r) => s + (r.mastery_score || 0), 0) / withMastery.length)
      : 0;
    const avgEffort = withEffort.length > 0
      ? (withEffort.reduce((s, r) => s + (r.effort_score || 0), 0) / withEffort.length).toFixed(1)
      : "0";

    // Per-lesson analytics
    const lessonAnalytics = lessons.map(lesson => {
      const recs = performanceRecords.filter(r => r.lesson_id === lesson.id && r.student_id !== "class_level");
      const lessonGains = recs.filter(r => r.normalized_gain != null).map(r => Number(r.normalized_gain));
      const lessonAvgGain = lessonGains.length > 0 ? lessonGains.reduce((a, b) => a + b, 0) / lessonGains.length : null;
      const lessonPre = recs.filter(r => r.pretest_score != null);
      const lessonPost = recs.filter(r => r.posttest_score != null);
      return {
        id: lesson.id,
        title: lesson.title,
        subject: lesson.subject || "General",
        studentsTracked: recs.length,
        avgPretest: lessonPre.length > 0 ? Math.round(lessonPre.reduce((s, r) => s + (r.pretest_score || 0), 0) / lessonPre.length) : null,
        avgPosttest: lessonPost.length > 0 ? Math.round(lessonPost.reduce((s, r) => s + (r.posttest_score || 0), 0) / lessonPost.length) : null,
        avgGain: lessonAvgGain != null ? Math.round(lessonAvgGain * 1000) / 1000 : null,
        hasAlert: alerts.some(a => a.lesson_type === lesson.id),
      };
    }).filter(l => l.studentsTracked > 0);

    // Gain distribution for pie
    const gainDistribution = [
      { name: "High Gain (≥0.7)", value: highGain, fill: GAIN_COLORS.high },
      { name: "Medium Gain (0.3–0.7)", value: medGain, fill: GAIN_COLORS.medium },
      { name: "Low Gain (<0.3)", value: lowGain, fill: GAIN_COLORS.low },
    ].filter(d => d.value > 0);

    // Score improvement bar data
    const improvementData = lessonAnalytics
      .filter(l => l.avgPretest != null && l.avgPosttest != null)
      .map(l => ({
        name: l.subject || l.title.slice(0, 15),
        pretest: l.avgPretest!,
        posttest: l.avgPosttest!,
        gain: l.avgGain,
      }));

    return {
      totalRecords: performanceRecords.filter(r => r.student_id !== "class_level").length,
      avgGain: Math.round(avgGain * 1000) / 1000,
      highGain, medGain, lowGain,
      avgPretest, avgPosttest,
      avgMastery, avgEffort,
      lessonAnalytics,
      gainDistribution,
      improvementData,
      alertCount: alerts.length,
    };
  }, [performanceRecords, lessons, alerts]);

  // Per-student analytics
  const studentAnalytics = useMemo(() => {
    if (!selectedStudent || performanceRecords.length === 0) return null;

    const studentRecords = performanceRecords.filter(r => r.student_id === selectedStudent);
    if (studentRecords.length === 0) return null;

    const withGain = studentRecords.filter(r => r.normalized_gain != null);
    const gains = withGain.map(r => Number(r.normalized_gain));
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;

    const lessonDetails = studentRecords.map(r => {
      const lesson = lessons.find(l => l.id === r.lesson_id);
      return {
        lessonTitle: lesson?.title || "Unknown",
        subject: lesson?.subject || "General",
        pretest: r.pretest_score,
        posttest: r.posttest_score,
        gain: r.normalized_gain != null ? Number(r.normalized_gain) : null,
        mastery: r.mastery_score,
        effort: r.effort_score,
        date: r.recorded_at,
      };
    });

    const trendData = lessonDetails
      .filter(d => d.pretest != null && d.posttest != null)
      .map(d => ({
        name: d.subject,
        pretest: d.pretest!,
        posttest: d.posttest!,
        gain: d.gain != null ? Math.round(d.gain * 100) : 0,
      }));

    // Mastery vs Effort radar
    const radarData = lessonDetails
      .filter(d => d.mastery != null && d.effort != null)
      .map(d => ({
        subject: d.subject,
        mastery: d.mastery!,
        effort: (d.effort! / 5) * 100,
      }));

    return {
      totalLessons: studentRecords.length,
      avgGain: Math.round(avgGain * 1000) / 1000,
      lessonDetails,
      trendData,
      radarData,
    };
  }, [selectedStudent, performanceRecords, lessons]);

  const studentName = classStudents.find(s => s.id === selectedStudent)?.student_name || "";

  const isReady = selectedClass && selectedSection;
  const hasData = classAnalytics && classAnalytics.totalRecords > 0;

  return (
    <AppLayout>
      <PageHeader
        title="Analytics"
        subtitle="Pillar 3 · Measuring outcomes & efficacy"
      />

      {/* Selectors */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Class</label>
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection(""); setSelectedStudent(""); }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {CLASS_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Section</label>
              <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setSelectedStudent(""); }} disabled={!selectedClass}>
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>
                  {sections.filter(s => !!s).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Student <span className="text-muted-foreground font-normal normal-case">(optional)</span>
              </label>
              <Select value={selectedStudent || "__all__"} onValueChange={(v) => { setSelectedStudent(v === "__all__" ? "" : v); setActiveTab(v === "__all__" ? "class" : "individual"); }} disabled={!selectedSection}>
                <SelectTrigger><SelectValue placeholder="All students" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Students (Class View)</SelectItem>
                  {classStudents.filter(s => !!s.id).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.student_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isReady && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" /> {classStudents.length} Learners
              </Badge>
              <Badge variant="outline" className="gap-1">
                <BarChart3 className="h-3 w-3" /> {lessons.length} Lessons
              </Badge>
              {alerts.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {alerts.length} Mismatch Alert{alerts.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* No selection state */}
      {!isReady && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Select Class & Section</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Choose a class and section above to view performance analytics, normalized gain calculations, and mastery vs. effort analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ready but no data */}
      {isReady && !hasData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No Performance Data Yet</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              No pre-test or post-test scores have been recorded for {getClassLabel(selectedClass)}-{selectedSection}. 
              Generate a lesson plan first, then record scores from the Lesson Plan page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Analytics Content */}
      {isReady && hasData && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="class" className="gap-1.5">
              <Users className="h-4 w-4" /> Class Analytics
            </TabsTrigger>
            <TabsTrigger value="individual" className="gap-1.5" disabled={!selectedStudent}>
              <User className="h-4 w-4" /> Individual Analytics
            </TabsTrigger>
          </TabsList>

          {/* ═══ CLASS VIEW ═══ */}
          <TabsContent value="class" className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox
                icon={<TrendingUp className="h-5 w-5 text-success" />}
                label="Avg Normalized Gain"
                value={classAnalytics!.avgGain.toFixed(3)}
                sub={<NormalizedGainBadge gain={classAnalytics!.avgGain} showValue={false} />}
              />
              <StatBox
                icon={<Target className="h-5 w-5 text-accent" />}
                label="Avg Pre → Post"
                value={`${classAnalytics!.avgPretest}% → ${classAnalytics!.avgPosttest}%`}
                sub={<span className="text-xs text-success">+{classAnalytics!.avgPosttest - classAnalytics!.avgPretest}% improvement</span>}
              />
              <StatBox
                icon={<Brain className="h-5 w-5 text-info" />}
                label="Avg Mastery"
                value={`${classAnalytics!.avgMastery}%`}
                sub={<span className="text-xs text-muted-foreground">Content understanding</span>}
              />
              <StatBox
                icon={<Activity className="h-5 w-5 text-warning" />}
                label="Avg Effort"
                value={`${classAnalytics!.avgEffort}/5`}
                sub={<span className="text-xs text-muted-foreground">Student engagement</span>}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gain Distribution Pie */}
              {classAnalytics!.gainDistribution.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Normalized Gain Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      g = (Posttest% − Pretest%) / (100% − Pretest%)
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={classAnalytics!.gainDistribution}
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={85}
                          paddingAngle={2} dataKey="value"
                        >
                          {classAnalytics!.gainDistribution.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} stroke="hsl(var(--card))" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`${value} students`, name]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Pre vs Post Bar Chart */}
              {classAnalytics!.improvementData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Score Improvement by Subject
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={classAnalytics!.improvementData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="pretest" name="Pre-test" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="posttest" name="Post-test" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Mismatch Alerts */}
            {alerts.length > 0 && (
              <Card className="border-danger/30 bg-danger/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-danger">
                    <AlertTriangle className="h-4 w-4" /> Delivery Mismatch Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    Triggered when 2+ students show low normalized gain (&lt;0.3) for the same lesson. Review VARK alignment.
                  </p>
                  <div className="space-y-2">
                    {alerts.map(alert => {
                      const lesson = lessons.find(l => l.id === alert.lesson_type);
                      return (
                        <div key={alert.id} className="flex items-start gap-3 rounded-lg border border-danger/20 bg-card p-3">
                          <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{lesson?.title || "Unknown Lesson"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{alert.trigger_condition}</p>
                            <p className="text-xs text-danger mt-1">Fail rate: {alert.fail_rate}% · {alert.recommendation}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Per-Lesson Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Lesson-by-Lesson Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lesson</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">Students</TableHead>
                        <TableHead className="text-center">Avg Pre-test</TableHead>
                        <TableHead className="text-center">Avg Post-test</TableHead>
                        <TableHead className="text-center">Avg Gain</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classAnalytics!.lessonAnalytics.map(la => (
                        <TableRow key={la.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{la.title}</TableCell>
                          <TableCell>{la.subject}</TableCell>
                          <TableCell className="text-center">{la.studentsTracked}</TableCell>
                          <TableCell className="text-center">{la.avgPretest != null ? `${la.avgPretest}%` : "—"}</TableCell>
                          <TableCell className="text-center">{la.avgPosttest != null ? `${la.avgPosttest}%` : "—"}</TableCell>
                          <TableCell className="text-center">
                            {la.avgGain != null ? <NormalizedGainBadge gain={la.avgGain} /> : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {la.hasAlert ? (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <AlertTriangle className="h-3 w-3" /> Mismatch
                              </Badge>
                            ) : la.avgGain != null && la.avgGain >= 0.3 ? (
                              <Badge className="bg-success/15 text-success text-[10px]">On Track</Badge>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Student Roster with Scores */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Individual Student Scores
                </CardTitle>
                <p className="text-xs text-muted-foreground">Click a student name to view detailed individual analytics</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">Lessons</TableHead>
                        <TableHead className="text-center">Avg Pre-test</TableHead>
                        <TableHead className="text-center">Avg Post-test</TableHead>
                        <TableHead className="text-center">Avg Gain</TableHead>
                        <TableHead className="text-center">Avg Mastery</TableHead>
                        <TableHead className="text-center">Avg Effort</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classStudents.map((student, i) => {
                        const recs = performanceRecords.filter(r => r.student_id === student.id);
                        const withG = recs.filter(r => r.normalized_gain != null);
                        const avgG = withG.length > 0 ? withG.reduce((s, r) => s + Number(r.normalized_gain), 0) / withG.length : null;
                        const withPre = recs.filter(r => r.pretest_score != null);
                        const withPost = recs.filter(r => r.posttest_score != null);
                        const avgPre = withPre.length > 0 ? Math.round(withPre.reduce((s, r) => s + (r.pretest_score || 0), 0) / withPre.length) : null;
                        const avgPost = withPost.length > 0 ? Math.round(withPost.reduce((s, r) => s + (r.posttest_score || 0), 0) / withPost.length) : null;
                        const withM = recs.filter(r => r.mastery_score != null);
                        const avgM = withM.length > 0 ? Math.round(withM.reduce((s, r) => s + (r.mastery_score || 0), 0) / withM.length) : null;
                        const withE = recs.filter(r => r.effort_score != null);
                        const avgE = withE.length > 0 ? (withE.reduce((s, r) => s + (r.effort_score || 0), 0) / withE.length).toFixed(1) : null;

                        return (
                          <TableRow
                            key={student.id}
                            className="cursor-pointer hover:bg-accent/5"
                            onClick={() => { setSelectedStudent(student.id); setActiveTab("individual"); }}
                          >
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium text-accent">{student.student_name}</TableCell>
                            <TableCell className="text-center">{recs.length}</TableCell>
                            <TableCell className="text-center">{avgPre != null ? `${avgPre}%` : "—"}</TableCell>
                            <TableCell className="text-center">{avgPost != null ? `${avgPost}%` : "—"}</TableCell>
                            <TableCell className="text-center">
                              {avgG != null ? <NormalizedGainBadge gain={Math.round(avgG * 1000) / 1000} /> : "—"}
                            </TableCell>
                            <TableCell className="text-center">{avgM != null ? `${avgM}%` : "—"}</TableCell>
                            <TableCell className="text-center">{avgE != null ? `${avgE}/5` : "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ INDIVIDUAL VIEW ═══ */}
          <TabsContent value="individual" className="space-y-6">
            {!selectedStudent ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <User className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h2 className="text-lg font-semibold text-foreground mb-2">Select a Student</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Use the student dropdown above or click a student name in the Class Analytics table.
                  </p>
                </CardContent>
              </Card>
            ) : !studentAnalytics ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h2 className="text-lg font-semibold text-foreground mb-2">No Data for {studentName}</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    No performance records found for this student. Record pre-test and post-test scores first.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Student Header */}
                <Card className="bg-accent/5 border-accent/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-accent/15 flex items-center justify-center">
                        <User className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{studentName}</h2>
                        <p className="text-sm text-muted-foreground">
                          {getClassLabel(selectedClass)}-{selectedSection} · {studentAnalytics.totalLessons} lesson{studentAnalytics.totalLessons !== 1 ? "s" : ""} tracked
                        </p>
                      </div>
                      <div className="ml-auto">
                        <NormalizedGainBadge gain={studentAnalytics.avgGain} className="text-sm px-3 py-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Score Trend Line */}
                  {studentAnalytics.trendData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Score Trend Across Subjects
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={studentAnalytics.trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                            <Tooltip />
                            <Bar dataKey="pretest" name="Pre-test" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="posttest" name="Post-test" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Mastery vs Effort Radar */}
                  {studentAnalytics.radarData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Mastery vs Effort
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">Determines if failure is instructional or content-based</p>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <RadarChart data={studentAnalytics.radarData}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                            <Radar name="Mastery" dataKey="mastery" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} />
                            <Radar name="Effort" dataKey="effort" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.2} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                            <Tooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Detailed Records Table */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Performance Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lesson / Subject</TableHead>
                            <TableHead className="text-center">Pre-test</TableHead>
                            <TableHead className="text-center">Post-test</TableHead>
                            <TableHead className="text-center">Normalized Gain</TableHead>
                            <TableHead className="text-center">Mastery</TableHead>
                            <TableHead className="text-center">Effort</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentAnalytics.lessonDetails.map((d, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <p className="font-medium text-foreground">{d.lessonTitle}</p>
                                <p className="text-xs text-muted-foreground">{d.subject}</p>
                              </TableCell>
                              <TableCell className="text-center">{d.pretest ?? "—"}</TableCell>
                              <TableCell className="text-center">{d.posttest ?? "—"}</TableCell>
                              <TableCell className="text-center">
                                {d.gain != null ? <NormalizedGainBadge gain={d.gain} /> : "—"}
                              </TableCell>
                              <TableCell className="text-center">{d.mastery != null ? `${d.mastery}%` : "—"}</TableCell>
                              <TableCell className="text-center">
                                {d.effort != null ? `${d.effort}/5` : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Interpretation */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      AI Interpretation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GainInterpretation gain={studentAnalytics.avgGain} name={studentName} details={studentAnalytics.lessonDetails} />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
};

/* ─── Sub-components ─── */

function StatBox({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span></div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        {sub && <div className="mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function GainInterpretation({ gain, name, details }: { gain: number; name: string; details: any[] }) {
  const lowMasteryHighEffort = details.filter(d => d.mastery != null && d.effort != null && d.mastery < 50 && d.effort >= 4);
  const highMasteryLowEffort = details.filter(d => d.mastery != null && d.effort != null && d.mastery >= 70 && d.effort <= 2);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start gap-2">
        <span className="shrink-0 mt-0.5">{gain >= 0.7 ? "🟢" : gain >= 0.3 ? "🟡" : "🔴"}</span>
        <p className="text-foreground">
          <strong>{name}</strong> shows a normalized gain of <strong>{gain.toFixed(3)}</strong> — classified as{" "}
          <strong>{gain >= 0.7 ? "High Gain" : gain >= 0.3 ? "Medium Gain" : "Low Gain"}</strong>.
          {gain >= 0.7
            ? " Instruction is well-aligned with this student's learning profile."
            : gain >= 0.3
              ? " There is room for improvement. Consider reviewing VARK alignment for subjects with lower scores."
              : " APAS flags a potential delivery mismatch. A pedagogical pivot is recommended."}
        </p>
      </div>

      {lowMasteryHighEffort.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <p className="text-foreground/85">
            <strong>Instructional issue detected:</strong> {name} shows low mastery but high effort in {lowMasteryHighEffort.map(d => d.subject).join(", ")}. 
            The problem is likely with content delivery, not student motivation. Consider switching modality.
          </p>
        </div>
      )}

      {highMasteryLowEffort.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/5 p-3">
          <Brain className="h-4 w-4 text-info mt-0.5 shrink-0" />
          <p className="text-foreground/85">
            <strong>Engagement gap:</strong> {name} demonstrates high mastery but low effort in {highMasteryLowEffort.map(d => d.subject).join(", ")}. 
            Consider providing more challenging material or extension activities.
          </p>
        </div>
      )}
    </div>
  );
}

export default Analytics;
