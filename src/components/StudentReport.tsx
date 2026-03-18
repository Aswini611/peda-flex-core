import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { analyzeResponses, getReportConfig, type DimensionScore } from "@/data/reportTheories";
import { BookOpen, Brain, TrendingUp, AlertTriangle, Download } from "lucide-react";

interface StudentReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentAge: number;
  ageGroup: number;
  responses: Record<string, any>;
  submittedAt: string;
}

export const StudentReport = ({
  open,
  onOpenChange,
  studentName,
  studentAge,
  ageGroup,
  responses,
  submittedAt,
}: StudentReportProps) => {
  const reportConfig = getReportConfig(ageGroup);
  const scores = analyzeResponses(ageGroup, responses as Record<string, number>);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!reportConfig || !scores) return null;

  const highCount = scores.filter((s) => s.level === "High").length;
  const developingCount = scores.filter((s) => s.level === "Developing").length;

  const handleDownload = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const levelColor = (level: string) => {
      switch (level) {
        case "High": return { bg: "#d1fae5", text: "#047857", border: "#a7f3d0" };
        case "Moderate": return { bg: "#fef3c7", text: "#b45309", border: "#fde68a" };
        case "Developing": return { bg: "#fee2e2", text: "#dc2626", border: "#fecaca" };
        default: return { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" };
      }
    };

    const dimensionsHtml = scores.map((score) => {
      const colors = levelColor(score.level);
      const barColor = score.percentage >= 70 ? "#10b981" : score.percentage >= 40 ? "#f59e0b" : "#f87171";
      return `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
            <div>
              <div style="font-weight:600;font-size:14px;">${score.dimension}</div>
              <div style="font-size:12px;color:#6b7280;">${score.theory}</div>
            </div>
            <span style="background:${colors.bg};color:${colors.text};border:1px solid ${colors.border};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">${score.level}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
            <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
              <div style="width:${score.percentage}%;height:100%;background:${barColor};border-radius:4px;"></div>
            </div>
            <span style="font-size:13px;font-weight:600;min-width:40px;text-align:right;">${score.percentage}%</span>
          </div>
          <p style="font-size:12px;color:#6b7280;margin:0 0 4px 0;">${score.description}</p>
          <p style="font-size:12px;color:#374151;margin:0;line-height:1.5;">${score.interpretation}</p>
        </div>`;
    }).join("");

    const theoriesBadges = reportConfig.theories.map(t => 
      `<span style="background:#ede9fe;color:#7c3aed;padding:2px 8px;border-radius:12px;font-size:11px;">${t}</span>`
    ).join(" ");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${reportConfig.title} - ${studentName}</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:32px;color:#111;}
      @media print{body{padding:16px;}}</style></head><body>
      <h1 style="font-size:20px;margin:0 0 8px 0;">📘 ${reportConfig.title}</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="background:#f3f4f6;padding:2px 10px;border-radius:12px;font-size:12px;border:1px solid #e5e7eb;">${studentName}</span>
        <span style="background:#f3f4f6;padding:2px 10px;border-radius:12px;font-size:12px;border:1px solid #e5e7eb;">Age: ${studentAge}</span>
        <span style="background:#f3f4f6;padding:2px 10px;border-radius:12px;font-size:12px;border:1px solid #e5e7eb;">Group: ${ageGroup}+</span>
        <span style="background:#e0e7ff;padding:2px 10px;border-radius:12px;font-size:12px;">${new Date(submittedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;">${theoriesBadges}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#047857;">${highCount}</div>
          <div style="font-size:12px;color:#059669;">Strong Areas</div>
        </div>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#b45309;">${scores.length - highCount - developingCount}</div>
          <div style="font-size:12px;color:#d97706;">Moderate Areas</div>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#dc2626;">${developingCount}</div>
          <div style="font-size:12px;color:#ef4444;">Needs Attention</div>
        </div>
      </div>
      ${dimensionsHtml}
      <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:24px;">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "High":
        return "bg-emerald-500/15 text-emerald-700 border-emerald-200";
      case "Moderate":
        return "bg-amber-500/15 text-amber-700 border-amber-200";
      case "Developing":
        return "bg-red-500/15 text-red-700 border-red-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 70) return "[&>div]:bg-emerald-500";
    if (percentage >= 40) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-red-400";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-primary" />
              {reportConfig.title}
            </DialogTitle>
            <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 mr-6">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">{studentName}</Badge>
            <Badge variant="outline">Age: {studentAge}</Badge>
            <Badge variant="outline">Group: {ageGroup}+</Badge>
            <Badge variant="secondary">
              {new Date(submittedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {reportConfig.theories.map((theory) => (
              <Badge key={theory} className="bg-primary/10 text-primary border-primary/20 text-xs">
                {theory}
              </Badge>
            ))}
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[60vh] px-6 py-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-3 text-center">
                <TrendingUp className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-emerald-700">{highCount}</div>
                <div className="text-xs text-emerald-600">Strong Areas</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3 text-center">
                <Brain className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-amber-700">
                  {scores.length - highCount - developingCount}
                </div>
                <div className="text-xs text-amber-600">Moderate Areas</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3 text-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-red-600">{developingCount}</div>
                <div className="text-xs text-red-500">Needs Attention</div>
              </CardContent>
            </Card>
          </div>

          {/* Dimension Details */}
          <div className="space-y-4">
            {scores.map((score, index) => (
              <DimensionCard key={index} score={score} getLevelColor={getLevelColor} getProgressColor={getProgressColor} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const DimensionCard = ({
  score,
  getLevelColor,
  getProgressColor,
}: {
  score: DimensionScore;
  getLevelColor: (level: string) => string;
  getProgressColor: (percentage: number) => string;
}) => (
  <Card>
    <CardHeader className="pb-2 pt-4 px-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-semibold">{score.dimension}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{score.theory}</p>
        </div>
        <Badge className={`${getLevelColor(score.level)} text-xs`}>{score.level}</Badge>
      </div>
    </CardHeader>
    <CardContent className="px-4 pb-4">
      <div className="flex items-center gap-3 mb-2">
        <Progress value={score.percentage} className={`h-2 flex-1 ${getProgressColor(score.percentage)}`} />
        <span className="text-sm font-semibold text-foreground w-12 text-right">{score.percentage}%</span>
      </div>
      <p className="text-xs text-muted-foreground mb-1">{score.description}</p>
      <p className="text-xs text-foreground/80 leading-relaxed">{score.interpretation}</p>
    </CardContent>
  </Card>
);
