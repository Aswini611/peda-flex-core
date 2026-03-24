import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { NormalizedGainBadge } from "@/components/NormalizedGainBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Users, User, TrendingUp, BarChart3, Lightbulb, CheckCircle, Lock, ClipboardCheck, FileText, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PerformanceEntryModal } from "@/components/PerformanceEntryModal";

const CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `Class ${i + 1}` })),
];

const DEFAULT_SECTIONS = ["A", "B", "C", "D", "E", "F"];

function calcNormalisedGain(pre: number, post: number): number {
  if (pre === 100) return 0;
  return (post - pre) / (100 - pre);
}

function gainInfo(g: number) {
  const label = g >= 0.7 ? "High Gain" : g >= 0.3 ? "Medium Gain" : "Low Gain";
  const variant = g >= 0.7 ? ("success" as const) : g >= 0.3 ? ("warning" as const) : ("danger" as const);
  return { label, variant };
}

function getClassSuggestions(avg: number, highest: number, lowest: number, gain: number | null) {
  const suggestions: string[] = [];
  if (gain !== null) {
    const info = gainInfo(gain);
    if (info.variant === "danger") {
      suggestions.push("The class normalised gain is low. Consider revisiting teaching strategies, using differentiated instruction, or incorporating more hands-on activities.");
      suggestions.push("Conduct a root-cause analysis to identify specific topics where students struggled the most.");
    } else if (info.variant === "warning") {
      suggestions.push("The class shows moderate improvement. Focus on reinforcing weak areas with targeted practice and peer learning.");
      suggestions.push("Consider grouping students by performance level for focused remediation sessions.");
    } else {
      suggestions.push("Excellent class performance! Continue with the current teaching methods and challenge students with enrichment activities.");
      suggestions.push("Identify high-performing students who can serve as peer tutors to support struggling classmates.");
    }
  }
  if (highest - lowest > 40) {
    suggestions.push("There is a wide performance gap in the class. Implement differentiated instruction to address varied learning needs.");
  }
  if (avg < 50) {
    suggestions.push("The class average is below 50%. A curriculum review and additional support sessions are strongly recommended.");
  }
  return suggestions;
}

function getIndividualSuggestions(score: number, gain: number | null) {
  const suggestions: string[] = [];
  if (gain !== null) {
    const info = gainInfo(gain);
    if (info.variant === "danger") {
      suggestions.push("This student shows low learning gain. One-on-one tutoring or a personalised learning plan is recommended.");
      suggestions.push("Assess whether the student's learning style (visual, auditory, kinesthetic) is being addressed in instruction.");
      suggestions.push("Consider breaking down complex concepts into smaller, more manageable chunks with frequent feedback.");
      suggestions.push("Implement regular formative assessments to identify gaps early and adjust instruction accordingly.");
      suggestions.push("Schedule weekly check-ins to monitor progress and provide additional support resources.");
      suggestions.push("Explore using multimedia resources (videos, animations, interactive simulations) to engage different learning modalities.");
    } else if (info.variant === "warning") {
      suggestions.push("Moderate improvement observed. Provide additional practice materials and encourage self-paced revision.");
      suggestions.push("Consider assigning targeted homework on weak areas identified in the assessment.");
      suggestions.push("Create study groups where this student can collaborate with peers and learn from each other.");
      suggestions.push("Provide constructive feedback highlighting specific areas for improvement with actionable steps.");
      suggestions.push("Use spaced repetition techniques to reinforce recently learned concepts and improve retention.");
      suggestions.push("Challenge the student with extension activities to push them toward higher achievement levels.");
    } else {
      suggestions.push("Strong learning gain achieved! Encourage this student with advanced problems and leadership opportunities in group work.");
      suggestions.push("This student could benefit from enrichment programs or inter-school competitions.");
      suggestions.push("Consider assigning peer tutoring roles where they can help struggling classmates.");
      suggestions.push("Provide advanced and challenging materials to maintain engagement and prevent boredom.");
      suggestions.push("Encourage participation in academic clubs, competitions, or special interest groups.");
      suggestions.push("Document and share success strategies with other students and teachers for wider impact.");
    }
  }
  if (score < 40) {
    suggestions.push("The assessment score is weak. Immediate academic intervention and parental consultation may be needed.");
    suggestions.push("Conduct a diagnostic assessment to identify specific knowledge gaps and misconceptions.");
  }
  return suggestions;
}

const Analytics = () => {
  const { profile, user } = useAuth();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Class-level gain calculator
  const [classPretest, setClassPretest] = useState("");
  const [classPosttest, setClassPosttest] = useState("");
  const [classGain, setClassGain] = useState<number | null>(null);
  const [classGainCalculated, setClassGainCalculated] = useState(false);

  // Individual gain calculator
  const [indPretest, setIndPretest] = useState("");
  const [indPosttest, setIndPosttest] = useState("");
  const [indGain, setIndGain] = useState<number | null>(null);
  const [indGainCalculated, setIndGainCalculated] = useState(false);

  // Authorization check - only teachers can access Analytics
  if (profile?.role !== "teacher") {
    return (
      <AppLayout>
        <PageHeader
          title="Pillar 3: The Analytics Phase"
          subtitle="Class & Individual Student Performance Analytics"
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Lock className="h-12 w-12 text-danger mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground max-w-md">
              Only teachers can access the Analytics Page. Students can view their individual assessment reports on the Dashboard.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const getClassLabel = (value: string) => CLASS_OPTIONS.find(c => c.value === value)?.label || value;

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

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["analytics-students", selectedClass, selectedSection, user?.id],
    queryFn: async () => {
      if (!selectedClass || !selectedSection || !user?.id) return [];
      const { data, error } = await supabase
        .from("student_assessments")
        .select("id, student_name, student_age, responses, created_at")
        .eq("student_class", selectedClass)
        .eq("section", selectedSection)
        .eq("teacher_id", user.id)
        .order("student_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClass && !!selectedSection && !!user?.id,
  });

  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students;
    return students.filter(s =>
      s.student_name.toLowerCase().includes(studentSearchQuery.toLowerCase())
    );
  }, [students, studentSearchQuery]);

  const studentAnalytics = useMemo(() => {
    return students.map((s) => {
      const responses = s.responses as Record<string, any> || {};
      const scores = Object.values(responses).map(Number).filter((v) => !isNaN(v));
      const totalScore = scores.reduce((a, b) => a + b, 0);
      const maxScore = scores.length * 5;
      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      return {
        id: s.id,
        name: s.student_name,
        age: s.student_age,
        assessmentScore: percentage,
        totalQuestions: scores.length,
        createdAt: s.created_at,
      };
    });
  }, [students]);

  const classSummary = useMemo(() => {
    if (studentAnalytics.length === 0) return null;
    const scores = studentAnalytics.map(s => s.assessmentScore);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const aboveAvg = scores.filter(s => s >= avg).length;
    return { avg, highest, lowest, total: scores.length, aboveAvg };
  }, [studentAnalytics]);

  const selectedStudent = selectedStudentId
    ? studentAnalytics.find(s => s.id === selectedStudentId)
    : null;

  const handleClassGainCalc = () => {
    const pre = Number(classPretest);
    const post = Number(classPosttest);
    if (isNaN(pre) || isNaN(post) || pre < 0 || pre > 100 || post < 0 || post > 100) {
      toast.error("Enter valid scores between 0 and 100");
      return;
    }
    const g = calcNormalisedGain(pre, post);
    setClassGain(Math.round(g * 1000) / 1000);
    setClassGainCalculated(true);
  };

  const handleIndGainCalc = () => {
    const pre = Number(indPretest);
    const post = Number(indPosttest);
    if (isNaN(pre) || isNaN(post) || pre < 0 || pre > 100 || post < 0 || post > 100) {
      toast.error("Enter valid scores between 0 and 100");
      return;
    }
    const g = calcNormalisedGain(pre, post);
    setIndGain(Math.round(g * 1000) / 1000);
    setIndGainCalculated(true);
  };

  const resetClassGain = () => {
    setClassPretest("");
    setClassPosttest("");
    setClassGain(null);
    setClassGainCalculated(false);
  };

  const resetIndGain = () => {
    setIndPretest("");
    setIndPosttest("");
    setIndGain(null);
    setIndGainCalculated(false);
  };

  const classSuggestions = classGainCalculated && classSummary
    ? getClassSuggestions(classSummary.avg, classSummary.highest, classSummary.lowest, classGain)
    : [];

  const individualSuggestions = indGainCalculated && selectedStudent
    ? getIndividualSuggestions(selectedStudent.assessmentScore, indGain)
    : [];

  return (
    <AppLayout>
      <PageHeader
        title="Pillar 3: The Analytics Phase"
        subtitle="Class & Individual Student Performance Analytics"
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
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection(""); setSelectedStudentId(null); resetClassGain(); resetIndGain(); }}>
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
              <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setSelectedStudentId(null); resetClassGain(); resetIndGain(); }} disabled={!selectedClass}>
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
        <Tabs defaultValue="performance" className="mb-6" onValueChange={() => { resetClassGain(); resetIndGain(); setSelectedStudentId(null); }}>
          <TabsList className="mb-4">
            <TabsTrigger value="performance" className="gap-1.5">
              <Activity className="h-4 w-4" /> Performance Tracking
            </TabsTrigger>
            <TabsTrigger value="class" className="gap-1.5">
              <BarChart3 className="h-4 w-4" /> Class Analytics
            </TabsTrigger>
            <TabsTrigger value="individual" className="gap-1.5">
              <User className="h-4 w-4" /> Individual Analytics
            </TabsTrigger>
          </TabsList>

          {/* ─── PERFORMANCE TRACKING TAB ─── */}
          <TabsContent value="performance">
            <PerformanceTrackingTab selectedClass={selectedClass} selectedSection={selectedSection} userId={user?.id} />
          </TabsContent>

          {/* ─── CLASS ANALYTICS TAB ─── */}
          <TabsContent value="class">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">
                  {getClassLabel(selectedClass)} — Section {selectedSection} · Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStudents ? (
                  <p className="text-sm text-muted-foreground">Loading students...</p>
                ) : studentAnalytics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students found in {getClassLabel(selectedClass)} Section {selectedSection}.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Assessment Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentAnalytics.map((s, i) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{s.age}</TableCell>
                          <TableCell>{s.assessmentScore}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Gain Calculator for Class */}
            {studentAnalytics.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-5 w-5 text-accent" />
                    Normalised Gain Calculator (g) — Class Level
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground font-mono bg-muted rounded-md px-3 py-2">
                    g = (posttest − pretest) / (100 − pretest)
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3 items-end">
                    <div className="space-y-2">
                      <Label>Pretest Score (%)</Label>
                      <Input type="number" min={0} max={100} value={classPretest} onChange={(e) => setClassPretest(e.target.value)} placeholder="0 – 100" />
                    </div>
                    <div className="space-y-2">
                      <Label>Posttest Score (%)</Label>
                      <Input type="number" min={0} max={100} value={classPosttest} onChange={(e) => setClassPosttest(e.target.value)} placeholder="0 – 100" />
                    </div>
                    <Button onClick={handleClassGainCalc}>
                      <Calculator className="h-4 w-4 mr-1" /> Calculate Gain
                    </Button>
                  </div>

                  {classGain !== null && (
                    <div className="animate-fade-in rounded-lg border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div>
                        <p className="text-3xl font-bold text-foreground">{classGain.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Normalised Gain (g)</p>
                      </div>
                      <div>
                        <StatusBadge variant={gainInfo(classGain).variant}>{gainInfo(classGain).label}</StatusBadge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Class Analytics — shown only after gain calculation */}
            {classGainCalculated && classSummary && (
              <div className="animate-fade-in space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-5 w-5 text-accent" />
                      Class Performance Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="rounded-lg border border-border p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{classSummary.total}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total Students</p>
                      </div>
                      <div className="rounded-lg border border-border p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{classSummary.avg}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Class Average</p>
                      </div>
                      <div className="rounded-lg border border-border p-4 text-center">
                        <p className="text-2xl font-bold text-success">{classSummary.highest}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Highest Score</p>
                      </div>
                      <div className="rounded-lg border border-border p-4 text-center">
                        <p className="text-2xl font-bold text-danger">{classSummary.lowest}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Lowest Score</p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Age</TableHead>
                          <TableHead>Assessment Score</TableHead>
                          <TableHead>Performance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentAnalytics.map((s, i) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{i + 1}</TableCell>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.age}</TableCell>
                            <TableCell>{s.assessmentScore}%</TableCell>
                            <TableCell>
                              <StatusBadge variant={s.assessmentScore >= 70 ? "success" : s.assessmentScore >= 40 ? "warning" : "danger"}>
                                {s.assessmentScore >= 70 ? "Strong" : s.assessmentScore >= 40 ? "Moderate" : "Weak"}
                              </StatusBadge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Suggestions Card */}
                {classSuggestions.length > 0 && (
                  <Card className="border-accent/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-accent">
                        <Lightbulb className="h-5 w-5" />
                        Suggestions for Class Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {classSuggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─── INDIVIDUAL ANALYTICS TAB ─── */}
          <TabsContent value="individual">
            <div className="grid gap-6 md:grid-cols-[280px_1fr]">
              {/* Student Selector */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-sm">Students ({students.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-3">
                  <Input
                    type="text"
                    placeholder="Search student name..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="text-sm"
                  />
                  <div className="max-h-[350px] overflow-y-auto space-y-1">
                    {loadingStudents ? (
                      <p className="text-xs text-muted-foreground">Loading...</p>
                    ) : filteredStudents.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {studentSearchQuery ? "No students found matching your search." : "No students found."}
                      </p>
                    ) : (
                      filteredStudents.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setSelectedStudentId(s.id); resetIndGain(); }}
                          className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                            selectedStudentId === s.id
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          {s.student_name}
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Individual Detail */}
              <div className="space-y-6">
                {selectedStudent ? (
                  <>
                    {/* Student Info */}
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="text-lg font-semibold text-foreground">{selectedStudent.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Age: {selectedStudent.age} · {getClassLabel(selectedClass)} Section {selectedSection}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Individual Gain Calculator */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Calculator className="h-5 w-5 text-accent" />
                          Normalised Gain Calculator (g) — {selectedStudent.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-xs text-muted-foreground font-mono bg-muted rounded-md px-3 py-2">
                          g = (posttest − pretest) / (100 − pretest)
                        </p>
                        <div className="grid gap-4 sm:grid-cols-3 items-end">
                          <div className="space-y-2">
                            <Label>Pretest Score (%)</Label>
                            <Input type="number" min={0} max={100} value={indPretest} onChange={(e) => setIndPretest(e.target.value)} placeholder="0 – 100" />
                          </div>
                          <div className="space-y-2">
                            <Label>Posttest Score (%)</Label>
                            <Input type="number" min={0} max={100} value={indPosttest} onChange={(e) => setIndPosttest(e.target.value)} placeholder="0 – 100" />
                          </div>
                          <Button onClick={handleIndGainCalc}>
                            <Calculator className="h-4 w-4 mr-1" /> Calculate Gain
                          </Button>
                        </div>

                        {indGain !== null && (
                          <div className="animate-fade-in rounded-lg border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div>
                              <p className="text-3xl font-bold text-foreground">{indGain.toFixed(3)}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Normalised Gain (g)</p>
                            </div>
                            <div>
                              <StatusBadge variant={gainInfo(indGain).variant}>{gainInfo(indGain).label}</StatusBadge>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Individual Analytics — shown only after gain calculation */}
                    {indGainCalculated && (
                      <div className="animate-fade-in space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Performance Summary</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-3">
                              <div className="rounded-lg border border-border p-4">
                                <p className="text-2xl font-bold text-foreground">{selectedStudent.assessmentScore}%</p>
                                <p className="text-xs text-muted-foreground mt-1">Assessment Score</p>
                              </div>
                              <div className="rounded-lg border border-border p-4">
                                <p className="text-2xl font-bold text-foreground">{selectedStudent.totalQuestions}</p>
                                <p className="text-xs text-muted-foreground mt-1">Total Assessment Items</p>
                              </div>
                              <div className="rounded-lg border border-border p-4">
                                <StatusBadge
                                  variant={selectedStudent.assessmentScore >= 70 ? "success" : selectedStudent.assessmentScore >= 40 ? "warning" : "danger"}
                                >
                                  {selectedStudent.assessmentScore >= 70 ? "Strong" : selectedStudent.assessmentScore >= 40 ? "Moderate" : "Weak"}
                                </StatusBadge>
                                <p className="text-xs text-muted-foreground mt-2">Performance Level</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Suggestions Card */}
                        {individualSuggestions.length > 0 && (
                          <Card className="border-accent/30">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-base text-accent">
                                <Lightbulb className="h-5 w-5" />
                                Suggestions for {selectedStudent.name}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-3">
                                {individualSuggestions.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <CheckCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <User className="h-10 w-10 mb-3 opacity-40" />
                      <p className="text-sm">Select a student to calculate their gain and view analytics</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
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
