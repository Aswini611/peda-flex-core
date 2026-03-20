import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, FileText, Filter, BarChart3, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StudentReport } from "@/components/StudentReport";
import { analyzeResponses, getReportConfig } from "@/data/reportTheories";
import { deriveVarkScores } from "@/data/varkMapping";

const CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `Class ${i + 1}` })),
];

interface StudentAssessment {
  id: string;
  student_name: string;
  student_age: number;
  age_group: number;
  responses: Record<string, any>;
  created_at: string;
  student_class: string | null;
  section: string | null;
}

const TeacherPanel = () => {
  const { user, profile } = useAuth();
  const [selectedAssessment, setSelectedAssessment] = useState<StudentAssessment | null>(null);
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [showClassReport, setShowClassReport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data: assessments, isLoading } = useQuery({
    queryKey: ["teacher-student-assessments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_assessments")
        .select("id, student_name, student_age, age_group, responses, created_at, student_class, section")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) as StudentAssessment[];
    },
    enabled: !!user?.id,
  });

  // Derive unique sections from data for the selected class
  const availableSections = useMemo(() => {
    if (!assessments) return [];
    const filtered = filterClass === "all" ? assessments : assessments.filter(a => a.student_class === filterClass);
    const sections = new Set(filtered.map(a => a.section).filter(Boolean) as string[]);
    return Array.from(sections).sort();
  }, [assessments, filterClass]);

  // Filtered assessments
  const filteredAssessments = useMemo(() => {
    if (!assessments) return [];
    return assessments.filter(a => {
      if (filterClass !== "all" && a.student_class !== filterClass) return false;
      if (filterSection !== "all" && a.section !== filterSection) return false;
      return true;
    });
  }, [assessments, filterClass, filterSection]);

  // Reset section filter when class changes
  // Paginated assessments
  const totalPages = Math.max(1, Math.ceil(filteredAssessments.length / rowsPerPage));
  const paginatedAssessments = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAssessments.slice(start, start + rowsPerPage);
  }, [filteredAssessments, currentPage, rowsPerPage]);

  const handleClassChange = (val: string) => {
    setFilterClass(val);
    setFilterSection("all");
    setShowClassReport(false);
    setCurrentPage(1);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Student Reports"
        subtitle="View and analyze student assessment reports by class and section"
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filters:</span>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Class</label>
              <Select value={filterClass} onValueChange={handleClassChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {CLASS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Section</label>
              <Select value={filterSection} onValueChange={(val) => { setFilterSection(val); setShowClassReport(false); setCurrentPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {availableSections.map(sec => (
                    <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Rows per page</label>
              <Select value={String(rowsPerPage)} onValueChange={(val) => { setRowsPerPage(Number(val)); setCurrentPage(1); }}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filterClass !== "all" && (
              <Button
                variant={showClassReport ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setShowClassReport(!showClassReport)}
              >
                <BarChart3 className="h-4 w-4" />
                {showClassReport ? "Show Individual Reports" : "View Class Report"}
              </Button>
            )}
          </div>
          {filteredAssessments.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Showing {filteredAssessments.length} student{filteredAssessments.length !== 1 ? "s" : ""}
              {filterClass !== "all" && ` in ${CLASS_OPTIONS.find(c => c.value === filterClass)?.label || filterClass}`}
              {filterSection !== "all" && ` Section ${filterSection}`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Class Report View */}
      {showClassReport && filteredAssessments.length > 0 && (
        <ClassReport assessments={filteredAssessments} filterClass={filterClass} filterSection={filterSection} teacherName={profile?.full_name || undefined} />
      )}

      {/* Individual Reports Table */}
      {!showClassReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No Assessments Found</h2>
                <p className="text-muted-foreground max-w-md">
                  {assessments && assessments.length > 0
                    ? "No students match the selected filters. Try changing the class or section."
                    : "Student assessment data will appear here once students complete their assessments and select you as their teacher."}
                </p>
              </div>
            ) : (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Age Group</TableHead>
                    <TableHead>Answered</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAssessments.map((assessment, index) => {
                    const responseCount = assessment.responses
                      ? Object.keys(assessment.responses).length
                      : 0;
                    const classLabel = CLASS_OPTIONS.find(c => c.value === assessment.student_class)?.label || assessment.student_class || "—";
                    const globalIndex = (currentPage - 1) * rowsPerPage + index;
                    return (
                      <TableRow key={assessment.id}>
                        <TableCell className="font-medium">{globalIndex + 1}</TableCell>
                        <TableCell className="font-medium">{assessment.student_name}</TableCell>
                        <TableCell>{assessment.student_age}</TableCell>
                        <TableCell>{classLabel}</TableCell>
                        <TableCell>{assessment.section || "—"}</TableCell>
                        <TableCell>{assessment.age_group}+</TableCell>
                        <TableCell>{responseCount}</TableCell>
                        <TableCell>
                          {new Date(assessment.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAssessment(assessment)}
                            className="gap-1"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredAssessments.length > rowsPerPage && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filteredAssessments.length)} of {filteredAssessments.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | string)[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        typeof p === "string" ? (
                          <span key={`e${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === currentPage ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </Button>
                        )
                      )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {selectedAssessment && (
        <StudentReport
          open={!!selectedAssessment}
          onOpenChange={(open) => !open && setSelectedAssessment(null)}
          studentName={selectedAssessment.student_name}
          studentAge={selectedAssessment.student_age}
          ageGroup={selectedAssessment.age_group}
          responses={selectedAssessment.responses}
          submittedAt={selectedAssessment.created_at}
          studentClass={selectedAssessment.student_class || undefined}
          teacherName={profile?.full_name || undefined}
        />
      )}
    </AppLayout>
  );
};

// ─── Class Report Component (APAS Class Diagnostic Report) ───────────────────────
interface ClassReportProps {
  assessments: StudentAssessment[];
  filterClass: string;
  filterSection: string;
  teacherName?: string;
}

const ClassReport = ({ assessments, filterClass, filterSection, teacherName }: ClassReportProps) => {
  const classLabel = CLASS_OPTIONS.find(c => c.value === filterClass)?.label || filterClass;
  const [showFullReport, setShowFullReport] = useState(false);

  const aggregatedData = useMemo(() => {
    const allScores: { studentName: string; studentAge: number; scores: { dimension: string; percentage: number; level: string }[]; varkDominant: string; varkScores: { visual: number; auditory: number; readWrite: number; kinesthetic: number } }[] = [];

    assessments.forEach(a => {
      const scores = analyzeResponses(a.age_group, a.responses as Record<string, number>);
      const varkResponses = (a.responses as any)?.vark as Record<string, string> | undefined;
      const vark = deriveVarkScores(a.age_group, a.responses as Record<string, number>, varkResponses);
      if (scores) {
        allScores.push({
          studentName: a.student_name,
          studentAge: a.student_age,
          scores: scores.map(s => ({ dimension: s.dimension, percentage: s.percentage, level: s.level })),
          varkDominant: vark.dominant,
          varkScores: { visual: vark.visual, auditory: vark.auditory, readWrite: vark.readWrite, kinesthetic: vark.kinesthetic },
        });
      }
    });

    // Dimension averages
    const dimensionMap: Record<string, { total: number; count: number }> = {};
    allScores.forEach(s => {
      s.scores.forEach(dim => {
        if (!dimensionMap[dim.dimension]) dimensionMap[dim.dimension] = { total: 0, count: 0 };
        dimensionMap[dim.dimension].total += dim.percentage;
        dimensionMap[dim.dimension].count += 1;
      });
    });
    const dimensionAverages = Object.entries(dimensionMap).map(([dimension, data]) => ({
      dimension,
      average: Math.round(data.total / data.count),
    }));

    // VARK distribution
    const varkCounts = { Visual: 0, Auditory: 0, "Read/Write": 0, Kinesthetic: 0 };
    allScores.forEach(s => { varkCounts[s.varkDominant as keyof typeof varkCounts]++; });

    // VARK groups
    const varkGroups: Record<string, string[]> = { Visual: [], Auditory: [], "Read/Write": [], Kinesthetic: [] };
    allScores.forEach(s => { varkGroups[s.varkDominant]?.push(s.studentName); });

    // Class avg score
    const classAvg = allScores.length > 0
      ? Math.round(allScores.reduce((sum, s) => sum + (s.scores.reduce((a, b) => a + b.percentage, 0) / (s.scores.length || 1)), 0) / allScores.length)
      : 0;

    const totalStudents = assessments.length;
    const avgAge = Math.round(assessments.reduce((sum, a) => sum + a.student_age, 0) / totalStudents);

    // Dominant VARK for class
    const dominantVark = Object.entries(varkCounts).reduce((a, b) => a[1] >= b[1] ? a : b);

    return { allScores, dimensionAverages, totalStudents, avgAge, varkCounts, varkGroups, classAvg, dominantVark };
  }, [assessments]);

  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const reportId = `APD-CLS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

  const handleDownloadClassReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = generateClassReportHtml({
      classLabel,
      filterSection,
      teacherName: teacherName || "N/A",
      reportDate,
      reportId,
      data: aggregatedData,
    });
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  // Group config for VARK clusters
  const groupConfig = [
    { key: "Visual", label: "Group A — Visual learners", color: "border-blue-300 bg-blue-50", labelColor: "text-blue-800", countBg: "bg-blue-200 text-blue-800", strategy: "Diagram-first lesson templates, colour-coded visual explainers, mind-map summaries." },
    { key: "Read/Write", label: "Group B — Read/Write processors", color: "border-teal-300 bg-teal-50", labelColor: "text-teal-800", countBg: "bg-teal-200 text-teal-800", strategy: "Structured note templates, written case studies, definition-first explanations." },
    { key: "Auditory", label: "Group C — Auditory learners", color: "border-amber-300 bg-amber-50", labelColor: "text-amber-800", countBg: "bg-amber-200 text-amber-800", strategy: "Discussion-based discovery, think-aloud protocols, podcast-style lesson summaries." },
    { key: "Kinesthetic", label: "Group D — Kinesthetic learners", color: "border-red-300 bg-red-50", labelColor: "text-red-800", countBg: "bg-red-200 text-red-800", strategy: "Model-building tasks, hands-on activities, drag-and-drop simulations." },
  ];

  const varkColorMap: Record<string, string> = {
    Visual: "bg-blue-100 text-blue-800",
    Auditory: "bg-amber-100 text-amber-800",
    "Read/Write": "bg-purple-100 text-purple-800",
    Kinesthetic: "bg-red-100 text-red-800",
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              APAS Class Diagnostic Report — {classLabel}{filterSection !== "all" ? ` Section ${filterSection}` : ""}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowFullReport(true)} className="gap-1.5">
                <FileText className="h-4 w-4" />
                View Full Report
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadClassReport} className="gap-1.5">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {aggregatedData.totalStudents} students · Average age: {aggregatedData.avgAge} · Class avg: {aggregatedData.classAvg}%
          </p>
        </CardHeader>
        <CardContent>
          {/* Meta cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1">Students</p>
              <p className="text-2xl font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>{aggregatedData.totalStudents}</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1">Class Avg</p>
              <p className="text-2xl font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>{aggregatedData.classAvg}%</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1">Dominant VARK</p>
              <p className="text-2xl font-bold text-blue-600" style={{ fontFamily: "'DM Serif Display', serif" }}>{aggregatedData.dominantVark[0]}</p>
              <p className="text-xs text-muted-foreground">{aggregatedData.dominantVark[1]} of {aggregatedData.totalStudents} learners</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1">Avg Age</p>
              <p className="text-2xl font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>{aggregatedData.avgAge}</p>
            </div>
          </div>

          {/* VARK Distribution */}
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="block w-1 h-4 rounded-sm bg-[#0e9a7b]" />
            VARK Distribution
          </h3>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {(["Visual", "Auditory", "Read/Write", "Kinesthetic"] as const).map(type => {
              const count = aggregatedData.varkCounts[type];
              const pct = aggregatedData.totalStudents > 0 ? Math.round((count / aggregatedData.totalStudents) * 100) : 0;
              return (
                <div key={type} className="bg-white border border-border rounded-xl p-4 text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{type}</p>
                  <p className="text-xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{pct}%</p>
                </div>
              );
            })}
          </div>

          {/* Instructional Clusters */}
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="block w-1 h-4 rounded-sm bg-[#0e9a7b]" />
            Instructional Clusters — Curative Grouping
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {groupConfig.map(g => {
              const names = aggregatedData.varkGroups[g.key] || [];
              if (names.length === 0) return null;
              return (
                <div key={g.key} className={`rounded-xl p-4 border-[1.5px] ${g.color}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-semibold ${g.labelColor}`}>{g.label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${g.countBg}`}>{names.length} learners</span>
                  </div>
                  <p className="text-xs text-foreground/70 mb-2">{names.join(", ")}</p>
                  <div className="border-t border-black/5 pt-2">
                    <p className="text-[10px] font-semibold tracking-[1px] uppercase text-foreground/60 mb-1">Curative Strategy</p>
                    <p className="text-xs text-foreground/70 leading-relaxed">{g.strategy}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator className="mb-4" />

          {/* Dimension Averages */}
          {aggregatedData.dimensionAverages.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="block w-1 h-4 rounded-sm bg-[#0e9a7b]" />
                Class Dimension Averages
              </h3>
              <div className="space-y-3 mb-6">
                {aggregatedData.dimensionAverages.map(d => (
                  <div key={d.dimension} className="flex items-center gap-3">
                    <span className="text-sm text-foreground min-w-[180px] truncate">{d.dimension}</span>
                    <Progress
                      value={d.average}
                      className={`h-2.5 flex-1 ${d.average >= 70 ? "[&>div]:bg-emerald-500" : d.average >= 40 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-400"}`}
                    />
                    <span className="text-sm font-semibold text-foreground w-12 text-right">{d.average}%</span>
                  </div>
                ))}
              </div>
              <Separator className="mb-4" />
            </>
          )}

          {/* Learner Roster */}
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="block w-1 h-4 rounded-sm bg-[#0e9a7b]" />
            Full Learner Roster
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Learner</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>VARK</TableHead>
                <TableHead>Strong</TableHead>
                <TableHead>Needs Attention</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregatedData.allScores.map((s, i) => {
                const avgScore = s.scores.length > 0
                  ? Math.round(s.scores.reduce((sum, sc) => sum + sc.percentage, 0) / s.scores.length)
                  : 0;
                const strongAreas = s.scores.filter(sc => sc.level === "High").length;
                const needsAttention = s.scores.filter(sc => sc.level === "Developing").length;
                return (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.studentName}</TableCell>
                    <TableCell>
                      <Badge variant={avgScore >= 70 ? "default" : avgScore >= 40 ? "secondary" : "destructive"}>
                        {avgScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${varkColorMap[s.varkDominant] || "bg-gray-100 text-gray-700"}`}>
                        {s.varkDominant}
                      </span>
                    </TableCell>
                    <TableCell className="text-emerald-600 font-medium">{strongAreas}</TableCell>
                    <TableCell className="text-red-500 font-medium">{needsAttention}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Full Report Dialog */}
      <Dialog open={showFullReport} onOpenChange={setShowFullReport}>
        <DialogContent className="max-w-4xl max-h-[92vh] p-0 overflow-hidden border-0 bg-[#f7f5f0]">
          <div className="flex items-center justify-end p-3 pb-0">
            <Button size="sm" variant="outline" onClick={handleDownloadClassReport} className="gap-1.5">
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </div>
          <ScrollArea className="max-h-[84vh] px-6 pb-6">
            <ClassReportContent
              classLabel={classLabel}
              filterSection={filterSection}
              teacherName={teacherName || "N/A"}
              reportDate={reportDate}
              reportId={reportId}
              data={aggregatedData}
              groupConfig={groupConfig}
              varkColorMap={varkColorMap}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Class Report Content (in-dialog view) ───────────────────────
interface ClassReportContentProps {
  classLabel: string;
  filterSection: string;
  teacherName: string;
  reportDate: string;
  reportId: string;
  data: any;
  groupConfig: any[];
  varkColorMap: Record<string, string>;
}

const ClassReportContent = ({ classLabel, filterSection, teacherName, reportDate, reportId, data, groupConfig, varkColorMap }: ClassReportContentProps) => {
  return (
    <div className="space-y-6 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-start pb-5 border-b-2 border-[#1a1a2e]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            APAS <span className="text-[#0e9a7b] italic">Class Diagnostic</span> Report
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#6b6b8a] font-light">{reportId}</p>
          <p className="text-sm font-medium text-[#3a3a5c] mt-0.5">{reportDate}</p>
          <span className="inline-block bg-[#0e9a7b] text-white text-[10px] font-semibold tracking-[1.5px] uppercase px-2.5 py-1 rounded-full mt-1.5">
            {data.totalStudents} Learners Assessed
          </span>
        </div>
      </div>

      {/* META BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e2e0d8] rounded-xl p-4">
          <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#6b6b8a] mb-1">Class</p>
          <p className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: "'DM Serif Display', serif" }}>{classLabel}{filterSection !== "all" ? ` - ${filterSection}` : ""}</p>
        </div>
        <div className="bg-white border border-[#e2e0d8] rounded-xl p-4">
          <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#6b6b8a] mb-1">Class Avg Score</p>
          <p className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: "'DM Serif Display', serif" }}>{data.classAvg}%</p>
        </div>
        <div className="bg-white border border-[#e2e0d8] rounded-xl p-4">
          <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#6b6b8a] mb-1">Dominant VARK</p>
          <p className="text-xl font-bold text-blue-600" style={{ fontFamily: "'DM Serif Display', serif" }}>{data.dominantVark[0]}</p>
          <p className="text-xs text-[#6b6b8a]">{data.dominantVark[1]} of {data.totalStudents} learners</p>
        </div>
        <div className="bg-white border border-[#e2e0d8] rounded-xl p-4">
          <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#6b6b8a] mb-1">Class Teacher</p>
          <p className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: "'DM Serif Display', serif" }}>{teacherName}</p>
        </div>
      </div>

      {/* LEARNER ROSTER TABLE */}
      <div>
        <h2 className="text-lg font-bold text-[#1a1a2e] mb-4 flex items-center gap-2.5" style={{ fontFamily: "'DM Serif Display', serif" }}>
          <span className="block w-1 h-5 rounded-sm bg-[#0e9a7b]" />
          Full Learner Roster — Diagnostic Snapshot
        </h2>
        <div className="bg-white border border-[#e2e0d8] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#e2e0d8]">
                <th className="text-left text-[10px] font-semibold tracking-[1.5px] uppercase text-[#6b6b8a] px-3 py-2.5">#</th>
                <th className="text-left text-[10px] font-semibold tracking-[1.5px] uppercase text-[#6b6b8a] px-3 py-2.5">Learner</th>
                <th className="text-center text-[10px] font-semibold tracking-[1.5px] uppercase text-[#6b6b8a] px-3 py-2.5">Avg Score</th>
                <th className="text-center text-[10px] font-semibold tracking-[1.5px] uppercase text-[#6b6b8a] px-3 py-2.5">VARK</th>
                <th className="text-center text-[10px] font-semibold tracking-[1.5px] uppercase text-[#6b6b8a] px-3 py-2.5">Strong</th>
                <th className="text-center text-[10px] font-semibold tracking-[1.5px] uppercase text-[#6b6b8a] px-3 py-2.5">Needs Attention</th>
              </tr>
            </thead>
            <tbody>
              {data.allScores.map((s: any, i: number) => {
                const avgScore = s.scores.length > 0
                  ? Math.round(s.scores.reduce((sum: number, sc: any) => sum + sc.percentage, 0) / s.scores.length)
                  : 0;
                const scoreColor = avgScore >= 70 ? "#16a34a" : avgScore >= 50 ? "#d97706" : "#e55a3c";
                const strongAreas = s.scores.filter((sc: any) => sc.level === "High").length;
                const needsAttention = s.scores.filter((sc: any) => sc.level === "Developing").length;
                return (
                  <tr key={i} className="border-b border-[#e2e0d8] last:border-b-0 hover:bg-[#fafaf8]">
                    <td className="px-3 py-2 text-[#6b6b8a]">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-[#1a1a2e]">{s.studentName}</td>
                    <td className="px-3 py-2 text-center font-semibold" style={{ color: scoreColor }}>{avgScore}%</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${varkColorMap[s.varkDominant] || "bg-gray-100 text-gray-700"}`}>
                        {s.varkDominant}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-emerald-600 font-medium">{strongAreas}</td>
                    <td className="px-3 py-2 text-center text-red-500 font-medium">{needsAttention}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* VARK DISTRIBUTION */}
      <div>
        <h2 className="text-lg font-bold text-[#1a1a2e] mb-4 flex items-center gap-2.5" style={{ fontFamily: "'DM Serif Display', serif" }}>
          <span className="block w-1 h-5 rounded-sm bg-[#0e9a7b]" />
          VARK Distribution — Class of {data.totalStudents}
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {([
            { key: "Visual", letter: "V", color: "#2563eb", bgColor: "bg-blue-50 border-blue-200" },
            { key: "Auditory", letter: "A", color: "#d97706", bgColor: "bg-amber-50 border-amber-200" },
            { key: "Read/Write", letter: "R", color: "#7c3aed", bgColor: "bg-purple-50 border-purple-200" },
            { key: "Kinesthetic", letter: "K", color: "#e55a3c", bgColor: "bg-red-50 border-red-200" },
          ] as const).map(v => {
            const count = data.varkCounts[v.key];
            const pct = data.totalStudents > 0 ? Math.round((count / data.totalStudents) * 100) : 0;
            return (
              <div key={v.key} className={`border rounded-xl p-4 text-center ${v.bgColor}`}>
                <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: v.color }}>{v.letter}</div>
                <p className="text-xs font-medium text-[#6b6b8a] mb-2">{v.key}</p>
                <div className="h-2 bg-[#e2e0d8] rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: v.color }} />
                </div>
                <p className="text-sm font-semibold text-[#3a3a5c]">{count} ({pct}%)</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* INSTRUCTIONAL CLUSTERS */}
      <div>
        <h2 className="text-lg font-bold text-[#1a1a2e] mb-4 flex items-center gap-2.5" style={{ fontFamily: "'DM Serif Display', serif" }}>
          <span className="block w-1 h-5 rounded-sm bg-[#0e9a7b]" />
          Instructional Clusters — Curative Grouping
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groupConfig.map((g: any) => {
            const names = data.varkGroups[g.key] || [];
            if (names.length === 0) return null;
            return (
              <div key={g.key} className={`rounded-xl p-4 border-[1.5px] ${g.color}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-semibold ${g.labelColor}`}>{g.label}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${g.countBg}`}>{names.length} learners</span>
                </div>
                <p className="text-xs text-[#3a3a5c] mb-2 leading-relaxed">{names.join(", ")}</p>
                <div className="border-t border-black/5 pt-2">
                  <p className="text-[10px] font-semibold tracking-[1px] uppercase text-[#6b6b8a] mb-1">Curative Strategy</p>
                  <p className="text-xs text-[#3a3a5c] leading-relaxed">{g.strategy}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DIMENSION ANALYSIS */}
      <div>
        <h2 className="text-lg font-bold text-[#1a1a2e] mb-4 flex items-center gap-2.5" style={{ fontFamily: "'DM Serif Display', serif" }}>
          <span className="block w-1 h-5 rounded-sm bg-[#0e9a7b]" />
          Class Dimension Averages
        </h2>
        <div className="space-y-3">
          {data.dimensionAverages.map((d: any) => {
            const barColor = d.average >= 70 ? "#0e9a7b" : d.average >= 40 ? "#d97706" : "#e55a3c";
            return (
              <div key={d.dimension} className="bg-white border border-[#e2e0d8] rounded-xl px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#1a1a2e] min-w-[180px]">{d.dimension}</span>
                  <div className="flex-1 h-2 bg-[#e2e0d8] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.average}%`, background: barColor }} />
                  </div>
                  <span className="text-sm font-bold text-[#3a3a5c] w-12 text-right">{d.average}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-[#e2e0d8] pt-4 flex justify-between items-center">
        <p className="text-[11px] text-[#6b6b8a]">
          Generated by APAS AI · Teacher: {teacherName} · {classLabel}{filterSection !== "all" ? ` Section ${filterSection}` : ""} · For instructional planning use only
        </p>
        <p className="text-sm text-[#3a3a5c] italic" style={{ fontFamily: "'DM Serif Display', serif" }}>
          APAS · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

// ─── Class Report HTML Generator (for PDF download) ───────────────────────
function generateClassReportHtml(params: {
  classLabel: string;
  filterSection: string;
  teacherName: string;
  reportDate: string;
  reportId: string;
  data: any;
}): string {
  const { classLabel, filterSection, teacherName, reportDate, reportId, data } = params;

  const varkBadge = (type: string) => {
    const colors: Record<string, string> = {
      Visual: "background:#eff6ff;color:#1e40af;",
      Auditory: "background:#fffbeb;color:#92400e;",
      "Read/Write": "background:#f5f3ff;color:#4c1d95;",
      Kinesthetic: "background:#fff1ee;color:#9a3412;",
    };
    return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;${colors[type] || ""}">${type}</span>`;
  };

  const rosterRows = data.allScores.map((s: any, i: number) => {
    const avgScore = s.scores.length > 0
      ? Math.round(s.scores.reduce((sum: number, sc: any) => sum + sc.percentage, 0) / s.scores.length)
      : 0;
    const scoreColor = avgScore >= 70 ? "#16a34a" : avgScore >= 50 ? "#d97706" : "#e55a3c";
    const strong = s.scores.filter((sc: any) => sc.level === "High").length;
    const needs = s.scores.filter((sc: any) => sc.level === "Developing").length;
    return `<tr style="border-bottom:0.5px solid #e4e2dc;">
      <td style="padding:7px 10px;color:#8282a8;">${i + 1}</td>
      <td style="padding:7px 10px;font-weight:500;color:#1c1c2e;">${s.studentName}</td>
      <td style="padding:7px 10px;text-align:center;font-weight:600;color:${scoreColor};">${avgScore}%</td>
      <td style="padding:7px 10px;text-align:center;">${varkBadge(s.varkDominant)}</td>
      <td style="padding:7px 10px;text-align:center;color:#16a34a;font-weight:500;">${strong}</td>
      <td style="padding:7px 10px;text-align:center;color:#e55a3c;font-weight:500;">${needs}</td>
    </tr>`;
  }).join("");

  const varkCards = [
    { key: "Visual", letter: "V", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
    { key: "Auditory", letter: "A", color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
    { key: "Read/Write", letter: "R", color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
    { key: "Kinesthetic", letter: "K", color: "#e55a3c", bg: "#fff1ee", border: "#fca5a5" },
  ].map(v => {
    const count = data.varkCounts[v.key];
    const pct = data.totalStudents > 0 ? Math.round((count / data.totalStudents) * 100) : 0;
    return `<div style="background:${v.bg};border:1.5px solid ${v.border};border-radius:12px;padding:16px 12px;text-align:center;">
      <div style="font-family:'Playfair Display',serif;font-size:30px;color:${v.color};margin-bottom:4px;">${v.letter}</div>
      <div style="font-size:11px;font-weight:500;color:#8282a8;margin-bottom:8px;">${v.key}</div>
      <div style="background:#e4e2dc;border-radius:4px;height:8px;"><div style="height:8px;border-radius:4px;background:${v.color};width:${pct}%;"></div></div>
      <div style="font-size:13px;font-weight:600;color:#3d3d5c;margin-top:6px;">${count} (${pct}%)</div>
    </div>`;
  }).join("");

  const groupCards = [
    { key: "Visual", label: "Group A — Visual learners", bg: "#eff6ff", border: "#93c5fd", labelColor: "#1e40af", strategy: "Diagram-first lesson templates, colour-coded visual explainers, mind-map summaries." },
    { key: "Read/Write", label: "Group B — Read/Write processors", bg: "#e1f5ee", border: "#6ee7c4", labelColor: "#085041", strategy: "Structured note templates, written case studies, definition-first explanations." },
    { key: "Auditory", label: "Group C — Auditory learners", bg: "#fffbeb", border: "#fcd34d", labelColor: "#92400e", strategy: "Discussion-based discovery, think-aloud protocols, podcast-style lesson summaries." },
    { key: "Kinesthetic", label: "Group D — Kinesthetic learners", bg: "#fff1ee", border: "#fca5a5", labelColor: "#9a3412", strategy: "Model-building tasks, hands-on activities, drag-and-drop simulations." },
  ].filter(g => (data.varkGroups[g.key] || []).length > 0).map(g => {
    const names = data.varkGroups[g.key] || [];
    return `<div style="background:${g.bg};border:1.5px solid ${g.border};border-radius:12px;padding:16px 18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:600;color:${g.labelColor};">${g.label}</span>
        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:${g.border};color:${g.labelColor};">${names.length} learners</span>
      </div>
      <div style="font-size:11px;color:#3d3d5c;margin-bottom:8px;line-height:1.6;">${names.join(", ")}</div>
      <div style="border-top:0.5px solid rgba(0,0,0,0.08);padding-top:8px;">
        <strong style="display:block;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;color:#3d3d5c;">Curative Strategy</strong>
        <span style="font-size:11px;color:#8282a8;line-height:1.5;">${g.strategy}</span>
      </div>
    </div>`;
  }).join("");

  const dimensionRows = data.dimensionAverages.map((d: any) => {
    const barColor = d.average >= 70 ? "#0e9a7b" : d.average >= 40 ? "#d97706" : "#e55a3c";
    return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <span style="min-width:180px;font-size:13px;color:#1c1c2e;">${d.dimension}</span>
      <div style="flex:1;height:8px;background:#e4e2dc;border-radius:4px;overflow:hidden;"><div style="width:${d.average}%;height:100%;background:${barColor};border-radius:4px;"></div></div>
      <span style="font-size:13px;font-weight:600;min-width:40px;text-align:right;color:#3d3d5c;">${d.average}%</span>
    </div>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>APAS Class Diagnostic Report - ${classLabel}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Sora:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Sora',sans-serif;background:#f6f5f2;color:#1c1c2e;padding:0;
    -webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
  .report{max-width:780px;margin:0 auto;padding:32px 24px;}
  .sec-title{font-family:'Playfair Display',serif;font-size:18px;color:#1c1c2e;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
  .sec-title::before{content:'';display:block;width:3px;height:20px;border-radius:2px;background:#0e9a7b;}
  .sec{margin-bottom:28px;}
  @media print{body{padding:0;background:#fff!important;}}
</style>
</head><body><div class="report">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid #1c1c2e;margin-bottom:24px;">
    <div>
      <div style="font-family:'Playfair Display',serif;font-size:26px;letter-spacing:-0.5px;">APAS <em style="color:#0e9a7b;">Class Diagnostic</em> Report</div>
    </div>
    <div style="text-align:right;font-size:12px;color:#8282a8;">
      <div>Report ID: ${reportId}</div>
      <strong style="display:block;font-size:13px;color:#3d3d5c;font-weight:500;">${reportDate}</strong>
      <span style="display:inline-block;background:#0e9a7b;color:#fff;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-top:5px;">${data.totalStudents} Learners Assessed</span>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;">
    <div style="background:#fff;border:0.5px solid #e4e2dc;border-radius:10px;padding:12px 14px;">
      <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#8282a8;margin-bottom:4px;">Class</div>
      <div style="font-family:'Playfair Display',serif;font-size:20px;">${classLabel}${filterSection !== "all" ? ` - ${filterSection}` : ""}</div>
    </div>
    <div style="background:#fff;border:0.5px solid #e4e2dc;border-radius:10px;padding:12px 14px;">
      <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#8282a8;margin-bottom:4px;">Class Avg Score</div>
      <div style="font-family:'Playfair Display',serif;font-size:20px;">${data.classAvg}%</div>
    </div>
    <div style="background:#fff;border:0.5px solid #e4e2dc;border-radius:10px;padding:12px 14px;">
      <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#8282a8;margin-bottom:4px;">Dominant VARK</div>
      <div style="font-family:'Playfair Display',serif;font-size:20px;color:#2563eb;">${data.dominantVark[0]}</div>
      <div style="font-size:11px;color:#8282a8;">${data.dominantVark[1]} of ${data.totalStudents}</div>
    </div>
    <div style="background:#fff;border:0.5px solid #e4e2dc;border-radius:10px;padding:12px 14px;">
      <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#8282a8;margin-bottom:4px;">Class Teacher</div>
      <div style="font-family:'Playfair Display',serif;font-size:20px;">${teacherName}</div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">Full Learner Roster — Diagnostic Snapshot</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;background:#fff;border:0.5px solid #e4e2dc;border-radius:12px;overflow:hidden;">
      <thead><tr style="border-bottom:1.5px solid #e4e2dc;">
        <th style="text-align:left;font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#8282a8;padding:8px 10px;">#</th>
        <th style="text-align:left;font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#8282a8;padding:8px 10px;">Learner</th>
        <th style="text-align:center;font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#8282a8;padding:8px 10px;">Avg Score</th>
        <th style="text-align:center;font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#8282a8;padding:8px 10px;">VARK</th>
        <th style="text-align:center;font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#8282a8;padding:8px 10px;">Strong</th>
        <th style="text-align:center;font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#8282a8;padding:8px 10px;">Needs Attention</th>
      </tr></thead>
      <tbody>${rosterRows}</tbody>
    </table>
  </div>

  <div class="sec">
    <div class="sec-title">VARK Distribution — Class of ${data.totalStudents}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">${varkCards}</div>
  </div>

  <div class="sec">
    <div class="sec-title">Instructional Clusters — Curative Grouping</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">${groupCards}</div>
  </div>

  <div class="sec">
    <div class="sec-title">Class Dimension Averages</div>
    ${dimensionRows}
  </div>

  <div style="border-top:0.5px solid #e4e2dc;padding-top:14px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:11px;color:#8282a8;">Generated by APAS AI · Teacher: ${teacherName} · ${classLabel}${filterSection !== "all" ? ` Section ${filterSection}` : ""} · For instructional planning use only</div>
    <div style="font-family:'Playfair Display',serif;font-size:13px;color:#3d3d5c;font-style:italic;">APAS · ${new Date().getFullYear()}</div>
  </div>
</div></body></html>`;
}

export default TeacherPanel;
