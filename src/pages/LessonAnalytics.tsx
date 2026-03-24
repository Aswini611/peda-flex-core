import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Download, AlertCircle, CheckCircle, AlertTriangle, TrendingUp, Users } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type PerformanceData = {
  student_id: string;
  student_name: string;
  pretest_score: number;
  posttest_score: number;
  effort_score: number;
  normalized_gain: number;
};

type AnalyticsMetrics = {
  averageGain: number;
  totalStudents: number;
  highGainCount: number;
  lowGainCount: number;
  effectiveness: "high" | "medium" | "low";
};

export default function LessonAnalytics() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [lesson, setLesson] = useState<any | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch lesson details
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("id, title, subject, curriculum, duration_minutes")
          .eq("id", lessonId)
          .single();

        if (lessonError) throw lessonError;
        setLesson(lessonData);

        // Fetch performance records with student names
        const { data: records, error: recordsError } = await supabase
          .from("performance_records")
          .select(
            `id,
            student_id,
            pretest_score,
            posttest_score,
            effort_score,
            normalized_gain,
            students(profile_id, profiles(full_name))`
          )
          .eq("lesson_id", lessonId)
          .not("posttest_score", "is", null);

        if (recordsError && recordsError.code !== "PGRST200") {
          console.error("Performance records error:", recordsError);
        }

        const performance = (records || [])
          .filter((r) => r.posttest_score !== null)
          .map((r: any) => ({
            student_id: r.student_id,
            student_name: (r.students?.profiles as any)?.full_name || `Student ${r.student_id.slice(0, 8)}`,
            pretest_score: r.pretest_score || 0,
            posttest_score: r.posttest_score || 0,
            effort_score: r.effort_score || 0,
            normalized_gain: Number(r.normalized_gain) || 0,
          }));

        setPerformanceData(performance);

        // Calculate metrics
        if (performance.length > 0) {
          const avgGain =
            performance.reduce((sum, p) => sum + p.normalized_gain, 0) /
            performance.length;
          const highGain = performance.filter((p) => p.normalized_gain >= 0.7).length;
          const lowGain = performance.filter((p) => p.normalized_gain < 0.3).length;

          let effectiveness: "high" | "medium" | "low";
          if (avgGain >= 0.7) effectiveness = "high";
          else if (avgGain >= 0.4) effectiveness = "medium";
          else effectiveness = "low";

          setMetrics({
            averageGain: Math.round(avgGain * 100) / 100,
            totalStudents: performance.length,
            highGainCount: highGain,
            lowGainCount: lowGain,
            effectiveness,
          });
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        toast({
          title: "Error",
          description: "Failed to load analytics data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (lessonId) {
      fetchAnalytics();
    }
  }, [lessonId, toast]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const element = document.getElementById("analytics-content");
      if (!element) return;

      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF();

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(`${lesson?.title}-analytics.pdf`);

      toast({
        title: "Success",
        description: "Analytics exported to PDF",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const getEffectivenessColor = (effectiveness: string) => {
    switch (effectiveness) {
      case "high":
        return "bg-green-100 text-green-900 border-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-900 border-yellow-300";
      case "low":
        return "bg-red-100 text-red-900 border-red-300";
      default:
        return "";
    }
  };

  const getEffectivenessMessage = (effectiveness: string) => {
    switch (effectiveness) {
      case "high":
        return "🟢 Great instruction! Students learned a lot";
      case "medium":
        return "🟡 OK but some students struggled";
      case "low":
        return "🔴 Needs improvement - consider different approach";
      default:
        return "";
    }
  };

  const getGainColor = (gain: number) => {
    if (gain >= 0.7) return "bg-green-100 text-green-700";
    if (gain >= 0.3) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const getGainStatus = (gain: number) => {
    if (gain >= 0.7) return "Mastered";
    if (gain >= 0.3) return "Developing";
    return "Needs Support";
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!lesson || !metrics) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <PageHeader
            title="Error"
            subtitle="Analytics data not found"
          />
          <Button onClick={() => navigate("/lessons")}>Back to Lessons</Button>
        </div>
      </div>
    );
  }

  const chartData = performanceData.map((p) => ({
    name: p.student_name.split(" ")[0],
    Before: p.pretest_score,
    After: p.posttest_score,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <PageHeader
            title={`Analytics: ${lesson.title}`}
            subtitle="Automatic learning insights and effectiveness analysis"
          />
          <Button onClick={handleExportPDF} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exporting..." : "Export to PDF"}
          </Button>
        </div>

        <div id="analytics-content" className="space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              icon={TrendingUp}
              label="Average Learning Gain"
              value={metrics.averageGain.toFixed(2)}
              trend={{ value: Math.round(metrics.averageGain * 100), direction: "up" }}
            />
            <StatCard
              icon={Users}
              label="Total Students"
              value={metrics.totalStudents}
            />
            <StatCard
              icon={CheckCircle}
              label="High Gain (≥0.7)"
              value={metrics.highGainCount}
              trend={{ value: Math.round((metrics.highGainCount / metrics.totalStudents) * 100), direction: "up" }}
            />
            <StatCard
              icon={AlertCircle}
              label="Low Gain (<0.3)"
              value={metrics.lowGainCount}
              trend={metrics.lowGainCount > 0 ? { value: Math.round((metrics.lowGainCount / metrics.totalStudents) * 100), direction: "down" } : undefined}
            />
          </div>

          {/* Effectiveness Banner */}
          <Card
            className={`border-2 ${getEffectivenessColor(metrics.effectiveness)}`}
          >
            <CardContent className="pt-6">
              <p className="text-lg font-semibold">
                {getEffectivenessMessage(metrics.effectiveness)}
              </p>
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Student Progress Comparison</CardTitle>
              <CardDescription>Before vs After lesson performance</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceData.length === 0 ? (
                <p className="text-muted-foreground">No performance data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Before" fill="#94a3b8" />
                    <Bar dataKey="After" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Detailed Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Student-by-Student Breakdown</CardTitle>
              <CardDescription>Individual learning metrics and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-3 font-semibold">Student</th>
                      <th className="pb-3 font-semibold">Entry Score</th>
                      <th className="pb-3 font-semibold">Exit Score</th>
                      <th className="pb-3 font-semibold">Learning Gain</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Effort</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.map((data) => (
                      <tr key={data.student_id} className="border-b">
                        <td className="py-3">{data.student_name}</td>
                        <td className="py-3">{data.pretest_score}</td>
                        <td className="py-3 font-medium">{data.posttest_score}</td>
                        <td className="py-3">
                          <Badge
                            className={`font-mono ${getGainColor(
                              data.normalized_gain
                            )}`}
                          >
                            {(data.normalized_gain * 100).toFixed(0)}%
                          </Badge>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getGainColor(
                              data.normalized_gain
                            )}`}
                          >
                            {getGainStatus(data.normalized_gain)}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="text-yellow-500">
                            {"★".repeat(Math.round(data.effort_score))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Alert Message */}
          {metrics.lowGainCount >= 2 && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Auto-Alert Created</p>
                    <p className="text-red-800 text-sm mt-1">
                      {metrics.lowGainCount} students had low learning gain (&lt;0.3).
                      An alert has been created and logged in your Alerts section for
                      follow-up.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => navigate("/lessons")}
          >
            Back to Lessons
          </Button>
          <Button variant="outline" onClick={() => navigate("/analytics")}>
            View Class Analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
