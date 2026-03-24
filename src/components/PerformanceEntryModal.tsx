import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGamification } from "@/hooks/useGamification";
import { ClipboardCheck, FileCheck2 } from "lucide-react";

interface Student {
  id: string;
  name: string;
  student_id?: string; // from students table
}

interface PerformanceEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "pretest" | "exitticket";
  lessonId: string;
  lessonTitle: string;
  students: Student[];
  onSaved: () => void;
}

export function PerformanceEntryModal({
  open, onOpenChange, mode, lessonId, lessonTitle, students, onSaved,
}: PerformanceEntryModalProps) {
  const { user } = useAuth();
  const { awardXp } = useGamification();
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [pretestScore, setPretestScore] = useState("");
  const [posttestScore, setPosttestScore] = useState("");
  const [effortScore, setEffortScore] = useState("");
  const [masteryScore, setMasteryScore] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSelectedStudentId("");
    setPretestScore("");
    setPosttestScore("");
    setEffortScore("");
    setMasteryScore("");
  };

  const handleSavePretest = async () => {
    if (!selectedStudentId) { toast.error("Select a student"); return; }
    const pre = Number(pretestScore);
    if (isNaN(pre) || pre < 0 || pre > 100) { toast.error("Enter a valid score (0–100)"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("performance_records").insert({
        student_id: selectedStudentId,
        lesson_id: lessonId,
        pretest_score: pre,
      });
      if (error) throw error;
      toast.success("Pre-test recorded ✓");
      reset();
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save pre-test");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExitTicket = async () => {
    if (!selectedStudentId) { toast.error("Select a student"); return; }
    const post = Number(posttestScore);
    const effort = Number(effortScore);
    const mastery = Number(masteryScore);
    if (isNaN(post) || post < 0 || post > 100) { toast.error("Post-test score must be 0–100"); return; }
    if (isNaN(effort) || effort < 1 || effort > 5) { toast.error("Effort score must be 1–5"); return; }
    if (isNaN(mastery) || mastery < 0 || mastery > 100) { toast.error("Mastery score must be 0–100"); return; }

    setSaving(true);
    try {
      // Fetch existing pretest score
      const { data: existing } = await supabase
        .from("performance_records")
        .select("id, pretest_score")
        .eq("student_id", selectedStudentId)
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (!existing) {
        toast.error("No pre-test record found for this student and lesson. Record pre-test first.");
        setSaving(false);
        return;
      }

      const pre = existing.pretest_score ?? 0;
      const normalizedGain = pre >= 100 ? 1.0 : (post - pre) / (100 - pre);
      const clampedGain = Math.max(-1, Math.min(1, Math.round(normalizedGain * 1000) / 1000));

      const { error } = await supabase
        .from("performance_records")
        .update({
          posttest_score: post,
          effort_score: effort,
          mastery_score: mastery,
          normalized_gain: clampedGain,
        })
        .eq("id", existing.id);

      if (error) throw error;

      // Award XP
      awardXp("record_exit_ticket", "Recorded exit ticket scores");

      // Auto-trigger mismatch alert check
      await checkMismatchAlert(lessonId, selectedStudentId);

      toast.success("Exit ticket recorded ✓");
      reset();
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save exit ticket");
    } finally {
      setSaving(false);
    }
  };

  const checkMismatchAlert = async (lessonId: string, studentId: string) => {
    try {
      // Get all performance records for this lesson
      const { data: records } = await supabase
        .from("performance_records")
        .select("normalized_gain, student_id")
        .eq("lesson_id", lessonId)
        .not("normalized_gain", "is", null);

      if (!records || records.length < 2) return;

      const lowGainCount = records.filter((r) => (r.normalized_gain as number) < 0.3).length;
      if (lowGainCount < 2) return;

      const failRate = Math.round((lowGainCount / records.length) * 100);

      // Get lesson info
      const { data: lesson } = await supabase
        .from("lessons")
        .select("subject, title")
        .eq("id", lessonId)
        .maybeSingle();

      // Check if alert already exists for this lesson
      const { data: existingAlert } = await supabase
        .from("mismatch_alerts")
        .select("id")
        .eq("lesson_type", lesson?.subject || "Unknown")
        .eq("trigger_condition", `Low normalized gain < 0.3 for ${lowGainCount} students in "${lesson?.title || "lesson"}"`)
        .maybeSingle();

      if (existingAlert) return;

      await supabase.from("mismatch_alerts").insert({
        student_group: "Lesson: " + (lesson?.title || "Unknown"),
        lesson_type: lesson?.subject || "Unknown",
        fail_rate: failRate,
        trigger_condition: `Low normalized gain < 0.3 for ${lowGainCount} students in "${lesson?.title || "lesson"}"`,
        recommendation: "Review lesson delivery method and check VARK alignment. Consider differentiated instruction for struggling learners.",
        status: "flagged",
      });
    } catch (err) {
      console.error("Mismatch alert check failed:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "pretest" ? (
              <><ClipboardCheck className="h-5 w-5 text-accent" /> Record Pre-test Score</>
            ) : (
              <><FileCheck2 className="h-5 w-5 text-accent" /> Record Exit Ticket</>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Lesson: {lessonTitle}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "pretest" ? (
            <div className="space-y-2">
              <Label>Pre-test Score (0–100)</Label>
              <Input type="number" min={0} max={100} value={pretestScore} onChange={(e) => setPretestScore(e.target.value)} placeholder="Enter score" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Post-test Score (0–100)</Label>
                <Input type="number" min={0} max={100} value={posttestScore} onChange={(e) => setPosttestScore(e.target.value)} placeholder="Enter score" />
              </div>
              <div className="space-y-2">
                <Label>Effort Score (1–5)</Label>
                <Input type="number" min={1} max={5} value={effortScore} onChange={(e) => setEffortScore(e.target.value)} placeholder="1 = Low, 5 = High" />
              </div>
              <div className="space-y-2">
                <Label>Mastery Score (0–100)</Label>
                <Input type="number" min={0} max={100} value={masteryScore} onChange={(e) => setMasteryScore(e.target.value)} placeholder="Enter mastery score" />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={mode === "pretest" ? handleSavePretest : handleSaveExitTicket} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
