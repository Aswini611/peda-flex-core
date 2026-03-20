import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, FileText, Filter, BarChart3, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StudentReport } from "@/components/StudentReport";
import { analyzeResponses } from "@/data/reportTheories";
import { deriveVarkScores } from "@/data/varkMapping";
import { ClassReportView } from "@/components/ClassReportView";

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

// ─── Class Report Wrapper ───────────────────────
interface ClassReportProps {
  assessments: StudentAssessment[];
  filterClass: string;
  filterSection: string;
  teacherName?: string;
}

const ClassReport = ({ assessments, filterClass, filterSection, teacherName }: ClassReportProps) => {
  const classLabel = CLASS_OPTIONS.find(c => c.value === filterClass)?.label || filterClass;
  const [showFullReport, setShowFullReport] = useState(false);

  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const reportId = `APD-CLS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

  const handleDownloadClassReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = generateClassReportHtml({
      assessments,
      classLabel,
      filterSection,
      teacherName: teacherName || "N/A",
      reportDate,
      reportId,
    });
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <>
      {/* Inline summary card */}
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
            {assessments.length} students assessed · Click "View Full Report" for the complete APAS Class Diagnostic with charts, clusters & lesson directives
          </p>
        </CardHeader>
        <CardContent>
          <ClassReportView
            assessments={assessments}
            classLabel={classLabel}
            filterSection={filterSection}
            teacherName={teacherName || "N/A"}
            reportDate={reportDate}
            reportId={reportId}
          />
        </CardContent>
      </Card>

      {/* Full Report Dialog */}
      <Dialog open={showFullReport} onOpenChange={setShowFullReport}>
        <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden border-0 bg-[#f6f5f2]">
          <div className="flex items-center justify-end p-3 pb-0">
            <Button size="sm" variant="outline" onClick={handleDownloadClassReport} className="gap-1.5">
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </div>
          <ScrollArea className="max-h-[84vh] px-6 pb-6">
            <ClassReportView
              assessments={assessments}
              classLabel={classLabel}
              filterSection={filterSection}
              teacherName={teacherName || "N/A"}
              reportDate={reportDate}
              reportId={reportId}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Class Report HTML Generator (for PDF download with Chart.js) ───────────────────────
function generateClassReportHtml(params: {
  assessments: StudentAssessment[];
  classLabel: string;
  filterSection: string;
  teacherName: string;
  reportDate: string;
  reportId: string;
}): string {
  const { assessments, classLabel, filterSection, teacherName, reportDate, reportId } = params;

  // Compute data
  const allScores: { name: string; avg: number; vark: string; strong: number; needs: number }[] = [];
  const varkCounts: Record<string, number> = { Visual: 0, Auditory: 0, "Read/Write": 0, Kinesthetic: 0 };
  const varkGroups: Record<string, string[]> = { Visual: [], Auditory: [], "Read/Write": [], Kinesthetic: [] };
  const dimMap: Record<string, { total: number; count: number }> = {};

  assessments.forEach(a => {
    const scores = analyzeResponses(a.age_group, a.responses as Record<string, number>);
    const varkR = (a.responses as any)?.vark as Record<string, string> | undefined;
    const vark = deriveVarkScores(a.age_group, a.responses as Record<string, number>, varkR);
    if (!scores) return;
    const avg = Math.round(scores.reduce((s, d) => s + d.percentage, 0) / scores.length);
    allScores.push({ name: a.student_name, avg, vark: vark.dominant, strong: scores.filter(s => s.level === "High").length, needs: scores.filter(s => s.level === "Developing").length });
    varkCounts[vark.dominant]++;
    varkGroups[vark.dominant]?.push(a.student_name);
    scores.forEach(dim => {
      if (!dimMap[dim.dimension]) dimMap[dim.dimension] = { total: 0, count: 0 };
      dimMap[dim.dimension].total += dim.percentage;
      dimMap[dim.dimension].count += 1;
    });
  });

  const classAvg = allScores.length > 0 ? Math.round(allScores.reduce((s, a) => s + a.avg, 0) / allScores.length) : 0;
  const dominantVark = Object.entries(varkCounts).reduce((a, b) => a[1] >= b[1] ? a : b);
  const dimAvgs = Object.entries(dimMap).map(([d, v]) => ({ dimension: d, average: Math.round(v.total / v.count) }));

  const varkBadge = (type: string) => {
    const colors: Record<string, string> = { Visual: "background:#eff6ff;color:#1e40af;", Auditory: "background:#fffbeb;color:#92400e;", "Read/Write": "background:#f5f3ff;color:#4c1d95;", Kinesthetic: "background:#fff1ee;color:#9a3412;" };
    return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;letter-spacing:.5px;${colors[type] || ""}">${type}</span>`;
  };
  const scoreClr = (s: number) => s >= 70 ? "#16a34a" : s >= 50 ? "#d97706" : "#e55a3c";
  const varkColor: Record<string, string> = { Visual: "#2563eb", Auditory: "#d97706", "Read/Write": "#7c3aed", Kinesthetic: "#e55a3c" };

  const rosterRows = allScores.map((s, i) => `<tr style="border-bottom:0.5px solid var(--border);">
    <td style="padding:7px 10px;color:var(--ink3)">${i + 1}</td>
    <td style="padding:7px 10px;font-weight:500;color:var(--ink)">${s.name}</td>
    <td style="padding:7px 10px;text-align:center;"><span style="font-weight:600;color:${scoreClr(s.avg)}">${s.avg}%</span></td>
    <td style="padding:7px 10px;text-align:center;">${varkBadge(s.vark)}</td>
    <td style="padding:7px 10px;text-align:center;color:#16a34a;font-weight:500;">${s.strong}</td>
    <td style="padding:7px 10px;text-align:center;color:#e55a3c;font-weight:500;">${s.needs}</td>
  </tr>`).join("");

  const groupCards = [
    { key: "Visual", label: "Group A — Visual achievers", bg: "var(--blue-l)", border: "#93c5fd", labelColor: "var(--blue-d)", countBg: "#bfdbfe", strategy: "Diagram-first lesson templates. Colour-coded diagrams, labelled visual explainers, mind-map summaries." },
    { key: "Read/Write", label: "Group B — Read/Write processors", bg: "var(--teal-l)", border: "#6ee7c4", labelColor: "var(--teal-d)", countBg: "#99f6e4", strategy: "Structured note templates, written case studies, definition-first explanations." },
    { key: "Auditory", label: "Group C — Auditory learners", bg: "var(--amber-l)", border: "#fcd34d", labelColor: "var(--amber-d)", countBg: "#fde68a", strategy: "Discussion-based discovery, think-aloud protocols, podcast-style lesson summaries." },
    { key: "Kinesthetic", label: "Group D — Kinesthetic learners", bg: "var(--coral-l)", border: "#fca5a5", labelColor: "var(--coral-d)", countBg: "#fecaca", strategy: "Model-building tasks, hands-on activities, drag-and-drop simulations." },
  ].filter(g => (varkGroups[g.key] || []).length > 0).map(g => {
    const names = varkGroups[g.key] || [];
    const gAvg = Math.round(allScores.filter(s => names.includes(s.name)).reduce((a, b) => a + b.avg, 0) / names.length);
    return `<div style="background:${g.bg};border:1.5px solid ${g.border};border-radius:12px;padding:16px 18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:600;color:${g.labelColor};">${g.label}</span>
        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:${g.countBg};color:${g.labelColor};">${names.length} learners</span>
      </div>
      <div style="font-size:11px;color:var(--ink2);margin-bottom:8px;line-height:1.6;">${names.join(", ")}</div>
      <div style="border-top:0.5px solid rgba(0,0,0,0.08);padding-top:8px;">
        <strong style="display:block;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;color:var(--ink2);">Curative strategy</strong>
        <span style="font-size:11px;color:var(--ink3);line-height:1.5;">${g.strategy} Avg score: ${gAvg}%.</span>
      </div>
    </div>`;
  }).join("");

  const dimRows = dimAvgs.map(d => {
    const c = d.average >= 70 ? "#0e9a7b" : d.average >= 40 ? "#d97706" : "#e55a3c";
    return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <span style="min-width:180px;font-size:13px;color:var(--ink);">${d.dimension}</span>
      <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;"><div style="width:${d.average}%;height:100%;background:${c};border-radius:4px;"></div></div>
      <span style="font-size:13px;font-weight:600;min-width:40px;text-align:right;color:var(--ink2);">${d.average}%</span>
    </div>`;
  }).join("");

  // Score distribution
  const buckets = [0, 0, 0, 0, 0];
  allScores.forEach(s => { if (s.avg < 40) buckets[0]++; else if (s.avg < 55) buckets[1]++; else if (s.avg < 70) buckets[2]++; else if (s.avg < 85) buckets[3]++; else buckets[4]++; });

  // Lesson plan box
  const lessonCells = [
    { label: "Lesson Opener", val: `${dominantVark[0]}-anchor approach. Whole-class observation using dominant modality.` },
    { label: "Core Delivery", val: `Dual-channel: teacher narration + ${dominantVark[0].toLowerCase()} aids. Addresses ${dominantVark[0]} (${Math.round((dominantVark[1] as number / allScores.length) * 100)}%).` },
    { label: "Group Activity", val: "VARK-aligned group tasks per cluster. Each group receives modality-matched activities." },
    { label: "Scaffolding Level", val: `Class avg ${classAvg}%. 3-tier task cards: support / core / extension per VARK group.` },
    { label: "Assessment Check", val: "Exit ticket: 3-question formative. Auto-scored. Feeds Phase 3 analytics." },
    { label: "Teacher Tools", val: "VARK-aligned question bank, collaborative project boards, case study cards." },
  ].map(c => `<div class="lb-cell"><div class="lb-cell-label">${c.label}</div><div class="lb-cell-val">${c.val}</div></div>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>APAS Class Diagnostic Report - ${classLabel}</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
:root{--ink:#1c1c2e;--ink2:#3d3d5c;--ink3:#8282a8;--bg:#f6f5f2;--white:#ffffff;--border:#e4e2dc;--teal:#0e9a7b;--teal-l:#e1f5ee;--teal-d:#085041;--blue:#2563eb;--blue-l:#eff6ff;--blue-d:#1e40af;--amber:#d97706;--amber-l:#fffbeb;--amber-d:#92400e;--coral:#e55a3c;--coral-l:#fff1ee;--coral-d:#9a3412;--purple:#7c3aed;--purple-l:#f5f3ff;--purple-d:#4c1d95;--green:#16a34a;--green-l:#f0fdf4;--green-d:#14532d;--font:'Sora',sans-serif;--display:'Playfair Display',serif;}
body{font-family:var(--font);background:var(--bg);color:var(--ink);padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
.wrap{max-width:820px;margin:0 auto;padding:28px 20px;}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid var(--ink);margin-bottom:24px;}
.hdr-brand{font-family:var(--display);font-size:26px;letter-spacing:-0.5px;}.hdr-brand em{color:var(--teal);font-style:italic;}
.hdr-sub{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-top:3px;}
.hdr-right{text-align:right;font-size:12px;color:var(--ink3);}.hdr-right strong{display:block;font-size:13px;color:var(--ink2);font-weight:500;}
.badge{display:inline-block;background:var(--teal);color:#fff;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-top:5px;}
.meta-bar{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px;}
.meta-card{background:var(--white);border:0.5px solid var(--border);border-radius:10px;padding:12px 14px;}
.meta-card .lbl{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3);margin-bottom:4px;}
.meta-card .val{font-family:var(--display);font-size:20px;color:var(--ink);}
.meta-card .sub{font-size:11px;color:var(--ink3);margin-top:2px;}
.sec-title{font-family:var(--display);font-size:18px;color:var(--ink);margin-bottom:14px;display:flex;align-items:center;gap:8px;}
.sec-title::before{content:'';display:block;width:3px;height:20px;border-radius:2px;background:var(--teal);}
.sec{margin-bottom:28px;}
.roster{width:100%;border-collapse:collapse;font-size:12px;}
.roster th{text-align:left;font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink3);padding:8px 10px;border-bottom:1.5px solid var(--border);white-space:nowrap;}
.roster td{padding:7px 10px;border-bottom:0.5px solid var(--border);color:var(--ink2);vertical-align:middle;}
.charts-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;}
.chart-card{background:var(--white);border:0.5px solid var(--border);border-radius:12px;padding:16px;}
.chart-title{font-size:12px;font-weight:600;color:var(--ink2);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;}
.legend-row{display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:var(--ink3);margin-bottom:8px;}
.legend-row span{display:flex;align-items:center;gap:4px;}.lsq{width:10px;height:10px;border-radius:2px;display:inline-block;}
.groups-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
.lesson-box{background:var(--ink);color:#fff;border-radius:16px;padding:22px 26px;}
.lb-title{font-family:var(--display);font-size:17px;color:#fff;margin-bottom:3px;}
.lb-sub{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:18px;}
.lb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.lb-cell{background:rgba(255,255,255,.06);border-radius:8px;padding:12px 14px;border:0.5px solid rgba(255,255,255,.1);}
.lb-cell-label{font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:6px;}
.lb-cell-val{font-size:12px;color:rgba(255,255,255,.88);line-height:1.5;}
.footer{border-top:0.5px solid var(--border);padding-top:14px;margin-top:8px;display:flex;justify-content:space-between;align-items:center;}
.footer-note{font-size:11px;color:var(--ink3);}.footer-brand{font-family:var(--display);font-size:13px;color:var(--ink2);font-style:italic;}
@media print{body{padding:0;background:#fff!important;}.lesson-box{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}
</style></head><body><div class="wrap">

<div class="hdr">
  <div><div class="hdr-brand">APAS <em>Class Diagnostic</em></div></div>
  <div class="hdr-right"><div>Report ID: ${reportId}</div><strong>${reportDate}</strong><div class="badge">${allScores.length} Learners Assessed</div></div>
</div>

<div class="meta-bar">
  <div class="meta-card"><div class="lbl">Class</div><div class="val">${classLabel}${filterSection !== "all" ? `-${filterSection}` : ""}</div></div>
  <div class="meta-card"><div class="lbl">Class Avg Score</div><div class="val">${classAvg}%</div></div>
  <div class="meta-card"><div class="lbl">Dominant VARK</div><div class="val" style="color:var(--blue)">${dominantVark[0]}</div><div class="sub">${dominantVark[1]} of ${allScores.length} learners</div></div>
  <div class="meta-card"><div class="lbl">Class Teacher</div><div class="val">${teacherName}</div></div>
  <div class="meta-card"><div class="lbl">Students</div><div class="val">${allScores.length}</div></div>
</div>

<div class="sec">
  <div class="sec-title">Full learner roster — diagnostic snapshot</div>
  <table class="roster"><thead><tr>
    <th>#</th><th>Learner</th><th style="text-align:center">Avg Score</th><th style="text-align:center">VARK</th><th style="text-align:center">Strong</th><th style="text-align:center">Needs Attention</th>
  </tr></thead><tbody>${rosterRows}</tbody></table>
</div>

<div class="charts-row">
  <div class="chart-card">
    <div class="chart-title">VARK distribution — class of ${allScores.length}</div>
    <div class="legend-row">
      ${Object.entries(varkCounts).map(([k, v]) => `<span><span class="lsq" style="background:${varkColor[k]}"></span>${k} ${v}</span>`).join("")}
    </div>
    <div style="position:relative;height:200px;"><canvas id="varkChart"></canvas></div>
  </div>
  <div class="chart-card">
    <div class="chart-title">Score distribution</div>
    <div class="legend-row">
      <span><span class="lsq" style="background:#e55a3c"></span>Below 55%</span>
      <span><span class="lsq" style="background:#d97706"></span>55–69%</span>
      <span><span class="lsq" style="background:#0e9a7b"></span>70%+</span>
    </div>
    <div style="position:relative;height:200px;"><canvas id="scoreChart"></canvas></div>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Instructional clusters — curative grouping</div>
  <div class="groups-grid">${groupCards}</div>
</div>

<div class="sec">
  <div class="sec-title">Score spread — class readiness map</div>
  <div style="position:relative;height:220px;"><canvas id="zpdChart"></canvas></div>
</div>

<div class="sec">
  <div class="sec-title">Class dimension averages</div>
  ${dimRows}
</div>

<div class="sec">
  <div class="sec-title">Curative phase lesson plan directives</div>
  <div class="lesson-box">
    <div class="lb-title">AI-generated lesson plan parameters</div>
    <div class="lb-sub">Inputs for Phase 2 curative engine · ${classLabel}</div>
    <div class="lb-grid">${lessonCells}</div>
  </div>
</div>

<div class="footer">
  <div class="footer-note">Generated by APAS AI · Teacher: ${teacherName} · ${classLabel}${filterSection !== "all" ? ` Section ${filterSection}` : ""} · For instructional planning use only</div>
  <div class="footer-brand">APAS · ${new Date().getFullYear()}</div>
</div>

</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script>
const learners=${JSON.stringify(allScores.map(s => ({ n: s.name, s: s.avg, v: s.vark.charAt(0) })))};
const varkColor=${JSON.stringify(varkColor)};
const varkMap={"V":"Visual","A":"Auditory","R":"Read/Write","K":"Kinesthetic"};

new Chart(document.getElementById("varkChart"),{
  type:"doughnut",
  data:{labels:${JSON.stringify(Object.keys(varkCounts))},datasets:[{data:${JSON.stringify(Object.values(varkCounts))},backgroundColor:${JSON.stringify(Object.keys(varkCounts).map(k => varkColor[k]))},borderWidth:2,borderColor:"#ffffff"}]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}
});

new Chart(document.getElementById("scoreChart"),{
  type:"bar",
  data:{labels:["0–39%","40–54%","55–69%","70–84%","85%+"],datasets:[{data:${JSON.stringify(buckets)},backgroundColor:["#e55a3c","#e55a3c","#d97706","#0e9a7b","#0e9a7b"],borderRadius:4,borderSkipped:false}]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:11},color:"#8282a8"}},y:{grid:{color:"#e4e2dc"},ticks:{stepSize:2,font:{size:11},color:"#8282a8"},beginAtZero:true}}}
});

const varkFillMap={"V":"#2563eb","A":"#d97706","R":"#7c3aed","K":"#e55a3c"};
new Chart(document.getElementById("zpdChart"),{
  type:"bar",
  data:{labels:learners.map(l=>l.n.split(" ")[0]),datasets:[{label:"Avg score",data:learners.map(l=>l.s),backgroundColor:learners.map(l=>varkFillMap[l.v]||"#8282a8"),borderRadius:3,borderSkipped:false}]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>\`\${learners[ctx.dataIndex].n}: \${ctx.raw}% (\${varkMap[learners[ctx.dataIndex].v]})\`}}},scales:{x:{grid:{display:false},ticks:{font:{size:9},color:"#8282a8",maxRotation:45,autoSkip:false}},y:{grid:{color:"#e4e2dc"},ticks:{font:{size:11},color:"#8282a8"},min:0,max:100}}}
});
</script></body></html>`;
}

export default TeacherPanel;
