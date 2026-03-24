import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";

interface StudentOption {
  id: string;
  name: string;
}

interface PerformanceEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "pretest" | "exit_ticket";
  lessonId: string;
  lessonTitle: string;
  students: StudentOption[];
  existingRecords?: Array<{ student_id: string; pretest_score: number | null }>;
  onSaved: () => void;
}

export function PerformanceEntryModal({
  open, onOpenChange, mode, lessonId, lessonTitle, students, existingRecords = [], onSaved,
}: PerformanceEntryModalProps) {
  const { awardXp } = useGamification();
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [pretestScore, setPretestScore] = useState("");
  const [posttestScore, setPosttestScore] = useState("");
  const [masteryScore, setMasteryScore] = useState("");
  const [effortScore, setEffortScore] = useState("");
  const [saving, setSaving] = useState(false);

  const existingMap = new Map(existingRecords.map(r => [r.student_id, r.pretest_score]));

  const availableStudents = mode === "pretest"
    ? students.filter(s => !existingMap.has(s.id))
    : students.filter(s => existingMap.has(s.id));

  const calcNormalizedGain = (pre: number, post: number): number => {
    if (pre >= 100) return 1.0;
    return (post - pre) / (100 - pre);
  };

  const handleSave = async () => {
    if (!selectedStudent) { toast.error("Select a student"); return; }

    setSaving(true);
    try {
      if (mode === "pretest") {
        const pre = Number(pretestScore);
        if (isNaN(pre) || pre < 0 || pre > 100) { toast.error("Enter a valid score (0–100)"); setSaving(false); return; }

        const { error } = await supabase.from("performance_records").insert({
          student_id: selectedStudent,
          lesson_id: lessonId,
          pretest_score: pre,
        });
        if (error) throw error;
        toast.success("Pre-test recorded ✓");
      } else {
        const post = Number(posttestScore);
        const mastery = Number(masteryScore);
        const effort = Number(effortScore);
        if (isNaN(post) || post < 0 || post > 100) { toast.error("Enter a valid post-test score (0–100)"); setSaving(false); return; }
        if (isNaN(mastery) || mastery < 0 || mastery > 100) { toast.error("Enter a valid mastery score (0–100)"); setSaving(false); return; }
        if (isNaN(effort) || effort < 1 || effort > 5) { toast.error("Enter effort score (1–5)"); setSaving(false); return; }

        const preScore = existingMap.get(selectedStudent) ?? 0;
        const normalizedGain = calcNormalizedGain(preScore, post);

        const { error } = await supabase
          .from("performance_records")
          .update({
            posttest_score: post,
            mastery_score: mastery,
            effort_score: effort,
            normalized_gain: Math.round(normalizedGain * 1000) / 1000,
          })
          .eq("lesson_id", lessonId)
          .eq("student_id", selectedStudent);
        if (error) throw error;

        toast.success("Post-test recorded ✓");
        awardXp("record_exit_ticket", "Recorded post-test scores");

        // Check mismatch alert trigger
        await checkMismatchAlert(lessonId);
      }

      // Reset form
      setSelectedStudent("");
      setPretestScore("");
      setPosttestScore("");
      setMasteryScore("");
      setEffortScore("");
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const checkMismatchAlert = async (lessonId: string) => {
    try {
      const { data: records } = await supabase
        .from("performance_records")
        .select("student_id, normalized_gain")
        .eq("lesson_id", lessonId)
        .not("normalized_gain", "is", null);

      if (!records) return;
      const lowGainStudents = records.filter(r => (r.normalized_gain ?? 1) < 0.3);
      if (lowGainStudents.length >= 2) {
        const failRate = Math.round((lowGainStudents.length / records.length) * 100);

        // Check if alert already exists for this lesson
        const { data: existing } = await supabase
          .from("mismatch_alerts")
          .select("id")
          .eq("lesson_type", lessonId)
          .eq("status", "flagged")
          .limit(1);

        if (existing && existing.length > 0) return;

        await supabase.from("mismatch_alerts").insert({
          student_group: "Lesson students",
          lesson_type: lessonId,
          fail_rate: failRate,
          trigger_condition: `Low normalized gain < 0.3 for ${lowGainStudents.length} students`,
          recommendation: "Review lesson delivery method and check VARK alignment",
          status: "flagged",
        });
      }
    } catch (err) {
      console.error("Mismatch alert check failed:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "pretest" ? "Record Pre-test Score" : "Record Exit Ticket"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{lessonTitle}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {availableStudents.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableStudents.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {mode === "pretest" ? "All students already have pre-test scores" : "No students with pre-test scores yet"}
              </p>
            )}
          </div>

          {mode === "pretest" ? (
            <div className="space-y-2">
              <Label>Pre-test Score (0–100)</Label>
              <Input type="number" min={0} max={100} value={pretestScore} onChange={e => setPretestScore(e.target.value)} placeholder="Enter score" />
            </div>
          ) : (
            <>
              {selectedStudent && existingMap.has(selectedStudent) && (
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  Pre-test score: <strong>{existingMap.get(selectedStudent)}</strong>
                </div>
              )}
              <div className="space-y-2">
                <Label>Post-test Score (0–100)</Label>
                <Input type="number" min={0} max={100} value={posttestScore} onChange={e => setPosttestScore(e.target.value)} placeholder="Enter score" />
              </div>
              <div className="space-y-2">
                <Label>Mastery Score (0–100)</Label>
                <Input type="number" min={0} max={100} value={masteryScore} onChange={e => setMasteryScore(e.target.value)} placeholder="Enter score" />
              </div>
              <div className="space-y-2">
                <Label>Effort Score (1–5)</Label>
                <Select value={effortScore} onValueChange={setEffortScore}>
                  <SelectTrigger><SelectValue placeholder="Select effort" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(v => (
                      <SelectItem key={v} value={String(v)}>{v} — {["", "Minimal", "Low", "Moderate", "Good", "Excellent"][v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !selectedStudent}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
