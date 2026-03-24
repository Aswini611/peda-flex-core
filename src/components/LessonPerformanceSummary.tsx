import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NormalizedGainBadge } from "@/components/NormalizedGainBadge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Users } from "lucide-react";

interface PerformanceRecord {
  id: string;
  student_id: string;
  pretest_score: number | null;
  posttest_score: number | null;
  mastery_score: number | null;
  effort_score: number | null;
  normalized_gain: number | null;
  student_name?: string;
}

interface LessonPerformanceSummaryProps {
  records: PerformanceRecord[];
  lessonTitle: string;
}

export function LessonPerformanceSummary({ records, lessonTitle }: LessonPerformanceSummaryProps) {
  const completedRecords = records.filter((r) => r.normalized_gain !== null);

  const stats = useMemo(() => {
    if (completedRecords.length === 0) return null;
    const gains = completedRecords.map((r) => r.normalized_gain as number);
    const avg = gains.reduce((a, b) => a + b, 0) / gains.length;
    const high = gains.filter((g) => g >= 0.7).length;
    const medium = gains.filter((g) => g >= 0.3 && g < 0.7).length;
    const low = gains.filter((g) => g < 0.3).length;
    return { avg: Math.round(avg * 1000) / 1000, high, medium, low, total: completedRecords.length };
  }, [completedRecords]);

  if (records.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-accent" />
          Performance Summary — {lessonTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats ? (
          <>
            {/* Gain Gauge */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{stats.avg.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground mt-1">Class Avg Gain</p>
                <NormalizedGainBadge gain={stats.avg} showValue={false} className="mt-2" />
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold text-success">{stats.high}</p>
                <p className="text-xs text-muted-foreground mt-1">High Gain (≥0.7)</p>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold text-warning">{stats.medium}</p>
                <p className="text-xs text-muted-foreground mt-1">Medium (0.3–0.7)</p>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold text-danger">{stats.low}</p>
                <p className="text-xs text-muted-foreground mt-1">Low Gain (&lt;0.3)</p>
              </div>
            </div>

            {/* Gain gauge bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>Class Average Normalized Gain</span>
                <span>1.0</span>
              </div>
              <Progress value={Math.max(0, Math.min(100, stats.avg * 100))} className="h-3" />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{records.length} pre-test(s) recorded. Complete exit tickets to see performance summary.</span>
          </div>
        )}

        {/* Student breakdown table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Pre-test</TableHead>
              <TableHead>Post-test</TableHead>
              <TableHead>Gain</TableHead>
              <TableHead>Mastery</TableHead>
              <TableHead>Effort</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{i + 1}</TableCell>
                <TableCell>{r.student_name || r.student_id.slice(0, 8)}</TableCell>
                <TableCell>{r.pretest_score ?? "—"}</TableCell>
                <TableCell>{r.posttest_score ?? "—"}</TableCell>
                <TableCell><NormalizedGainBadge gain={r.normalized_gain} /></TableCell>
                <TableCell>{r.mastery_score ?? "—"}</TableCell>
                <TableCell>{r.effort_score ? `${r.effort_score}/5` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
