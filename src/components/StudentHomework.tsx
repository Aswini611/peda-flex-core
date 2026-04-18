import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck, CheckCircle, Clock, BookOpen, Send, Loader2, Award } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface HomeworkQuestion {
  question: string;
  index: number;
}

// Extract questions from exit ticket content
const extractQuestionsFromExitTicket = (exitTicketContent: string): string[] => {
  if (!exitTicketContent) return [];
  
  // Remove markdown headers and metadata lines
  let cleanContent = exitTicketContent
    .replace(/^###\s*Assessment[\s\S]*?\n/i, '')
    .replace(/^(📝\s*\d+\.\s*)?Assessment[^\n]*\n/i, '')
    .replace(/^(Format:|Collection Method:|Success Criteria:|Follow-up:)[^\n]*\n?/gim, '')
    .replace(/^(Format|Collection|Success|Follow).*$/gm, '')
    .trim();
  
  // Extract numbered questions (1. 2. 3. etc.)
  const questionPattern = /^\s*\d+\.\s*(.+?)(?=^\s*\d+\.|$)/gm;
  const questions: string[] = [];
  let match;
  
  while ((match = questionPattern.exec(cleanContent)) !== null) {
    const question = match[1].trim();
    if (question && question.length > 0) {
      questions.push(question);
    }
  }
  
  // If no numbered questions found, try to extract from bullet points
  if (questions.length === 0) {
    const bulletPattern = /^[-*]\s+(.+?)$/gm;
    while ((match = bulletPattern.exec(cleanContent)) !== null) {
      questions.push(match[1].trim());
    }
  }
  
  return questions;
};

const StudentHomework = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, Record<number, string>>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Get student's class/section from student_assessments (same as Reports tab)
  const { data: studentClassInfo } = useQuery({
    queryKey: ["student-class-info", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data } = await supabase
        .from("student_assessments")
        .select("student_class, section")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      console.log("StudentHomework: Found student class info:", data);
      return data || null;
    },
    enabled: !!user?.id,
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["student-homework", user?.id, studentClassInfo],
    queryFn: async () => {
      if (!studentClassInfo?.student_class || !studentClassInfo?.section) {
        console.log("StudentHomework: Missing class or section info");
        return [];
      }

      console.log("StudentHomework: Querying for assignments with:", {
        class_level: studentClassInfo.student_class,
        section: studentClassInfo.section,
      });

      // Normalize section to uppercase for matching
      const normalizedSection = (studentClassInfo.section || "").toUpperCase().trim();

      // Fetch homework matching the student's class/section
      const { data, error } = await supabase
        .from("homework_assignments")
        .select("*")
        .eq("class_level", studentClassInfo.student_class)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching assignments:", error);
        throw error;
      }

      // Filter by section (case-insensitive)
      const filtered = (data || []).filter(assignment => {
        const assignmentSection = (assignment.section || "").toUpperCase().trim();
        return assignmentSection === normalizedSection && assignment.assignment_type === "at-home";
      });

      console.log("StudentHomework: Found assignments after filtering:", filtered);
      return filtered;
    },
    enabled: !!user?.id && !!studentClassInfo?.student_class && !!studentClassInfo?.section,
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

    // Validate all questions are answered
    const unanswered = questions.filter((_, i) => !myAnswers[i]?.trim());
    if (unanswered.length > 0) {
      toast.error(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }

    // Calculate submission percentage: (answered questions / total questions) * 100
    const totalQuestions = questions.length;
    const answeredQuestions = questions.filter((_, i) => myAnswers[i]?.trim()).length;
    const submissionPercentage = totalQuestions > 0 
      ? Math.round((answeredQuestions / totalQuestions) * 100) 
      : 0;

    setSubmitting(assignmentId);
    try {
      const answerArray = questions.map((q, i) => ({
        question: q.question,
        answer: myAnswers[i] || "",
      }));

      const { error } = await supabase.from("homework_submissions").update({
        answers: answerArray as any,
        submission_percentage: submissionPercentage,
        completed: true,
        completed_at: new Date().toISOString(),
      }).eq("assignment_id", assignmentId).eq("student_id", user!.id);

      if (error) throw error;
      toast.success(`✓ Homework submitted!\n✓ Submission: ${submissionPercentage}%`);
      queryClient.invalidateQueries({ queryKey: ["homework-submissions"] });
    } catch (e: any) {
      // If update fails (record doesn't exist), try insert
      try {
        const answerArray = questions.map((q, i) => ({
          question: q.question,
          answer: myAnswers[i] || "",
        }));

        await supabase.from("homework_submissions").insert({
          assignment_id: assignmentId,
          student_id: user!.id,
          answers: answerArray as any,
          submission_percentage: submissionPercentage,
          completed: true,
          completed_at: new Date().toISOString(),
        });

        toast.success(`✓ Homework submitted!\n✓ Submission: ${submissionPercentage}%`);
        queryClient.invalidateQueries({ queryKey: ["homework-submissions"] });
      } catch (fallbackError: any) {
        toast.error(fallbackError.message || "Failed to submit homework");
      }
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
        // Extract questions from exit_ticket_content field
        let questionsArray: HomeworkQuestion[] = [];
        
        if (assignment.exit_ticket_content) {
          // Extract questions from exit ticket markdown content
          const extractedQs = extractQuestionsFromExitTicket(assignment.exit_ticket_content);
          questionsArray = extractedQs.map((q, i) => ({
            question: q,
            index: i,
          }));
        }

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
              {questionsArray.map((q, idx) => (
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

              {isSubmitted ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">
                      Submission: {submission?.submission_percentage || submission?.score || 0}%
                    </h4>
                  </div>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    Submitted on {new Date(submission?.completed_at).toLocaleString()}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => handleSubmit(assignment.id, questionsArray)}
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
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StudentHomework;
