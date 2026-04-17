import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck, CheckCircle, Clock, BookOpen, Send, Loader2 } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface HomeworkQuestion {
  question: string;
  index: number;
}

const StudentHomework = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, Record<number, string>>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  // First fetch the student's class/section assignments
  const { data: studentClasses } = useQuery({
    queryKey: ["student-classes", user?.id],
    queryFn: async () => {
      // Get the student record for this profile
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", user!.id)
        .maybeSingle();
      if (!student) return [];

      const { data, error } = await supabase
        .from("class_students")
        .select("class_id, classes(name, section)")
        .eq("student_id", student.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["student-homework", user?.id, studentClasses],
    queryFn: async () => {
      if (!studentClasses || studentClasses.length === 0) return [];

      // Build filter: fetch homework matching any of the student's class/section combos
      let query = supabase
        .from("homework_assignments")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      // Filter by class_level and section from student's enrolled classes
      const conditions = studentClasses.map((sc: any) => {
        const cls = sc.classes as any;
        return `and(class_level.eq.${cls.name},section.eq.${cls.section})`;
      });
      query = query.or(conditions.join(","));

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!studentClasses,
  });

  const { data: submissions } = useQuery({
    queryKey: ["homework-submissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework_submissions")
        .select("*")
        .eq("student_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const submittedIds = new Set((submissions || []).map((s: any) => s.assignment_id));

  const handleAnswerChange = (assignmentId: string, qIndex: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [assignmentId]: { ...(prev[assignmentId] || {}), [qIndex]: value },
    }));
  };

  const handleSubmit = async (assignmentId: string, questions: HomeworkQuestion[]) => {
    const myAnswers = answers[assignmentId] || {};
    const unanswered = questions.filter((_, i) => !myAnswers[i]?.trim());
    if (unanswered.length > 0) {
      toast.error(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }

    setSubmitting(assignmentId);
    try {
      const answerArray = questions.map((q, i) => ({
        question: q.question,
        answer: myAnswers[i] || "",
      }));

      const { error } = await supabase.from("homework_submissions").insert({
        assignment_id: assignmentId,
        student_id: user!.id,
        answers: answerArray as any,
      });

      if (error) throw error;
      toast.success("Homework submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["homework-submissions"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to submit homework");
    } finally {
      setSubmitting(null);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (!assignments || assignments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Homework Yet</h3>
          <p className="text-muted-foreground max-w-md">
            Your teacher hasn't assigned any homework yet. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment: any) => {
        const questions: HomeworkQuestion[] = (assignment.questions || []).map((q: any, i: number) => ({
          question: typeof q === "string" ? q : q.question || q.text || `Question ${i + 1}`,
          index: i,
        }));
        const isSubmitted = submittedIds.has(assignment.id);
        const submission = (submissions || []).find((s: any) => s.assignment_id === assignment.id);

        return (
          <Card key={assignment.id} className="border-2 border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {assignment.period_title || assignment.title || "Homework"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div className="flex flex-wrap gap-2">
                      {assignment.subject && (
                        <Badge variant="secondary" className="text-xs">
                          {assignment.subject}
                        </Badge>
                      )}
                      {assignment.topic && (
                        <Badge variant="outline" className="text-xs">
                          {assignment.topic}
                        </Badge>
                      )}
                    </div>
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {assignment.period_number && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Period {assignment.period_number}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(assignment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {isSubmitted ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 gap-1 whitespace-nowrap">
                    <CheckCircle className="h-3 w-3" /> Submitted
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 whitespace-nowrap">
                    <Clock className="h-3 w-3" /> Pending
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-medium text-foreground">{q.question}</p>
                  </div>
                  {isSubmitted ? (
                    <div className="ml-8 p-3 bg-muted/50 rounded-lg border border-border">
                      <p className="text-sm text-foreground/80">
                        {(submission?.answers as any)?.[idx]?.answer || "—"}
                      </p>
                    </div>
                  ) : (
                    <Textarea
                      className="ml-8"
                      placeholder="Type your answer here..."
                      value={answers[assignment.id]?.[idx] || ""}
                      onChange={(e) => handleAnswerChange(assignment.id, idx, e.target.value)}
                      rows={2}
                    />
                  )}
                </div>
              ))}

              {!isSubmitted && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSubmit(assignment.id, questions)}
                    disabled={submitting === assignment.id}
                    className="gap-2"
                  >
                    {submitting === assignment.id ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Submit Homework</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StudentHomework;
