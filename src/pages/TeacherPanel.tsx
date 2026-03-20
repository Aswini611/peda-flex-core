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
import { Users, FileText, Filter, BarChart3, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StudentReport } from "@/components/StudentReport";
import { analyzeResponses, getReportConfig } from "@/data/reportTheories";

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
        <ClassReport assessments={filteredAssessments} filterClass={filterClass} filterSection={filterSection} />
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

// ─── Class Report Component ───────────────────────
interface ClassReportProps {
  assessments: StudentAssessment[];
  filterClass: string;
  filterSection: string;
}

const ClassReport = ({ assessments, filterClass, filterSection }: ClassReportProps) => {
  const classLabel = CLASS_OPTIONS.find(c => c.value === filterClass)?.label || filterClass;

  // Aggregate scores across all students
  const aggregatedData = useMemo(() => {
    const allScores: { studentName: string; scores: { dimension: string; percentage: number; level: string }[] }[] = [];

    assessments.forEach(a => {
      const scores = analyzeResponses(a.age_group, a.responses as Record<string, number>);
      if (scores) {
        allScores.push({
          studentName: a.student_name,
          scores: scores.map(s => ({ dimension: s.dimension, percentage: s.percentage, level: s.level })),
        });
      }
    });

    // Get dimension averages
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

    // Class-wide stats
    const totalStudents = assessments.length;
    const avgAge = Math.round(assessments.reduce((sum, a) => sum + a.student_age, 0) / totalStudents);

    return { allScores, dimensionAverages, totalStudents, avgAge };
  }, [assessments]);

  const handleDownloadClassReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const studentRows = aggregatedData.allScores.map((s, i) => {
      const avgScore = s.scores.length > 0
        ? Math.round(s.scores.reduce((sum, sc) => sum + sc.percentage, 0) / s.scores.length)
        : 0;
      const strongAreas = s.scores.filter(sc => sc.level === "High").length;
      const needsAttention = s.scores.filter(sc => sc.level === "Developing").length;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:500;">${s.studentName}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${avgScore}%</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;color:#047857;">${strongAreas}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;color:#dc2626;">${needsAttention}</td>
      </tr>`;
    }).join("");

    const dimensionRows = aggregatedData.dimensionAverages.map(d => {
      const barColor = d.average >= 70 ? "#10b981" : d.average >= 40 ? "#f59e0b" : "#f87171";
      return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <span style="min-width:180px;font-size:13px;">${d.dimension}</span>
        <div style="flex:1;height:10px;background:#e5e7eb;border-radius:5px;overflow:hidden;">
          <div style="width:${d.average}%;height:100%;background:${barColor};border-radius:5px;"></div>
        </div>
        <span style="font-size:13px;font-weight:600;min-width:40px;text-align:right;">${d.average}%</span>
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Class Report - ${classLabel}${filterSection !== "all" ? ` Section ${filterSection}` : ""}</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#111;}
      table{width:100%;border-collapse:collapse;} th{text-align:left;padding:8px;border-bottom:2px solid #d1d5db;font-size:13px;color:#6b7280;}
      @media print{body{padding:16px;}}</style></head><body>
      <h1 style="font-size:22px;margin:0 0 4px 0;">📊 Class Report — ${classLabel}${filterSection !== "all" ? ` Section ${filterSection}` : ""}</h1>
      <p style="color:#6b7280;font-size:13px;margin:0 0 20px 0;">${aggregatedData.totalStudents} students · Average age: ${aggregatedData.avgAge}</p>
      <h2 style="font-size:16px;margin:0 0 12px 0;">Class Dimension Averages</h2>
      ${dimensionRows}
      <h2 style="font-size:16px;margin:24px 0 12px 0;">Individual Student Summary</h2>
      <table><thead><tr><th>#</th><th>Student</th><th style="text-align:center;">Avg Score</th><th style="text-align:center;">Strong</th><th style="text-align:center;">Needs Work</th></tr></thead>
      <tbody>${studentRows}</tbody></table>
      <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:24px;">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Class Report — {classLabel}{filterSection !== "all" ? ` Section ${filterSection}` : ""}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleDownloadClassReport} className="gap-1.5">
            <Download className="h-4 w-4" />
            Download Class Report
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {aggregatedData.totalStudents} students · Average age: {aggregatedData.avgAge}
        </p>
      </CardHeader>
      <CardContent>
        {/* Dimension Averages */}
        {aggregatedData.dimensionAverages.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-foreground mb-3">Class Dimension Averages</h3>
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

        {/* Student Summary Table */}
        <h3 className="text-sm font-semibold text-foreground mb-3">Individual Student Summary</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Avg Score</TableHead>
              <TableHead>Strong Areas</TableHead>
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
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.studentName}</TableCell>
                  <TableCell>
                    <Badge variant={avgScore >= 70 ? "default" : avgScore >= 40 ? "secondary" : "destructive"}>
                      {avgScore}%
                    </Badge>
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
  );
};

export default TeacherPanel;
