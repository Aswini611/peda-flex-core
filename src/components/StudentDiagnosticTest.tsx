import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, ArrowRight, ArrowLeft, BookOpen, ClipboardList } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface DiagnosticRequest {
  id: string;
  class_name: string;
  section: string;
  subject: string;
  questions: any[];
  approved_count: number | null;
  assigned_at: string | null;
}

interface Question {
  id: number;
  question: string;
  options: Record<string, string>;
  correct: string;
  explanation: string;
}

export const StudentDiagnosticTest = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTest, setActiveTest] = useState<DiagnosticRequest | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  // Fetch assigned diagnostic tests for this student's class
  const { data: availableTests, isLoading } = useQuery({
    queryKey: ["student-diagnostic-tests", user?.id],
    queryFn: async () => {
      // Get student's class info
      const { data: studentData } = await supabase
        .from("students")
        .select("grade")
        .eq("profile_id", user!.id)
        .maybeSingle();

      // Get class_students to find student's class and section
      const { data: classStudentData } = await supabase
        .from("class_students")
        .select("classes(name, section)")
        .eq("student_id", (await supabase.from("students").select("id").eq("profile_id", user!.id).maybeSingle()).data?.id || "");

      // Get all assigned diagnostic requests
      const { data: requests, error } = await supabase
        .from("diagnostic_requests")
        .select("id, class_name, section, subject, questions, approved_count, assigned_at")
        .eq("status", "assigned")
        .not("questions", "is", null);

      if (error) throw error;

      // Get already submitted tests
      const { data: submissions } = await supabase
        .from("diagnostic_submissions")
        .select("request_id")
        .eq("student_id", user!.id);

      const submittedIds = new Set((submissions || []).map((s: any) => s.request_id));

      // Filter: only show tests the student hasn't already taken
      return ((requests || []) as DiagnosticRequest[]).filter(
        r => !submittedIds.has(r.id) && r.questions && r.questions.length > 0
      );
    },
    enabled: !!user?.id,
  });

  const handleStartTest = (test: DiagnosticRequest) => {
    setActiveTest(test);
    setCurrentQ(0);
    setAnswers({});
    setShowResults(false);
    setScore(0);
  };

  const handleAnswer = (questionIdx: number, optionKey: string) => {
    setAnswers(prev => ({ ...prev, [questionIdx]: optionKey }));
  };

  const handleSubmit = async () => {
    if (!activeTest || !user) return;
    setSubmitting(true);

    try {
      const questions = activeTest.questions as Question[];
      let correct = 0;
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correct) correct++;
      });

      const { error } = await supabase.from("diagnostic_submissions").insert({
        request_id: activeTest.id,
        student_id: user.id,
        answers: answers,
        score: correct,
        total_questions: questions.length,
      } as any);

      if (error) throw error;

      setScore(correct);
      setShowResults(true);
      toast.success("Diagnostic test submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["student-diagnostic-tests"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  // Results view
  if (showResults && activeTest) {
    const questions = activeTest.questions as Question[];
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="space-y-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Diagnostic Complete!</h2>
            <p className="text-muted-foreground mb-4">
              {activeTest.subject} — {activeTest.class_name} {activeTest.section}
            </p>
            <div className="text-4xl font-bold text-primary mb-2">
              {score}/{questions.length}
            </div>
            <Badge variant={percentage >= 70 ? "default" : percentage >= 40 ? "secondary" : "destructive"}>
              {percentage}%
            </Badge>
            <Button className="mt-6" onClick={() => { setActiveTest(null); setShowResults(false); }}>
              Back to Diagnostics
            </Button>
          </CardContent>
        </Card>

        {/* Review answers */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Review Your Answers</h3>
            {questions.map((q, idx) => {
              const studentAnswer = answers[idx];
              const isCorrect = studentAnswer === q.correct;
              return (
                <div key={idx} className="border border-border rounded-lg p-4">
                  <p className="font-medium text-sm text-foreground mb-2">
                    <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold mr-2 ${
                      isCorrect ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                    }`}>
                      {idx + 1}
                    </span>
                    {q.question}
                  </p>
                  <div className="grid grid-cols-2 gap-2 ml-8 mb-2">
                    {Object.entries(q.options).map(([key, val]) => (
                      <div
                        key={key}
                        className={`text-xs px-3 py-1.5 rounded border ${
                          key === q.correct
                            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                            : key === studentAnswer && key !== q.correct
                            ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        <span className="font-semibold mr-1">{key}.</span> {val}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground ml-8 mt-1">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active test - quiz view
  if (activeTest) {
    const questions = activeTest.questions as Question[];
    const totalQuestions = questions.length;
    const question = questions[currentQ];
    const answeredCount = Object.keys(answers).length;
    const progress = Math.round((answeredCount / totalQuestions) * 100);
    const isLastQuestion = currentQ === totalQuestions - 1;
    const allAnswered = answeredCount === totalQuestions;

    return (
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Diagnostic Test</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeTest.subject} — {activeTest.class_name} {activeTest.section} · {answeredCount} of {totalQuestions} answered
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{progress}%</span>
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Question area */}
          <div className="flex-1 min-w-0">
            <Card className="mb-5 shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="animate-fade-in" key={currentQ}>
                  <div className="flex gap-3 mb-8">
                    <span className="inline-flex items-center justify-center h-8 w-8 min-w-[2rem] rounded-full bg-accent text-accent-foreground text-sm font-bold">
                      {currentQ + 1}
                    </span>
                    <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed pt-0.5">
                      {question.question}
                    </p>
                  </div>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    {Object.entries(question.options).map(([key, val]) => {
                      const selected = answers[currentQ] === key;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            handleAnswer(currentQ, key);
                            if (!isLastQuestion) {
                              setTimeout(() => setCurrentQ(q => q + 1), 350);
                            }
                          }}
                          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all ${
                            selected
                              ? "border-accent bg-accent/10 text-accent shadow-sm"
                              : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/50"
                          }`}
                        >
                          <span className="font-bold text-sm shrink-0">{key}.</span>
                          <span>{val}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                disabled={currentQ === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="flex gap-2">
                {!isLastQuestion && answers[currentQ] !== undefined && (
                  <Button onClick={() => setCurrentQ(q => q + 1)}>
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                {isLastQuestion && answers[currentQ] !== undefined && (
                  <div className="flex flex-col items-end gap-1">
                    <Button onClick={handleSubmit} disabled={submitting || !allAnswered}>
                      {submitting ? "Submitting..." : "Submit Test"} <CheckCircle className="h-4 w-4 ml-1" />
                    </Button>
                    {!allAnswered && (
                      <span className="text-xs text-destructive">
                        {totalQuestions - answeredCount} question{totalQuestions - answeredCount > 1 ? "s" : ""} unanswered
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigator */}
          <div className="hidden lg:block w-[220px] shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-foreground mb-3">Questions</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((_, idx) => {
                    const isCurrent = idx === currentQ;
                    const answered = answers[idx] !== undefined;
                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentQ(idx)}
                        className={`h-8 w-8 rounded-full text-xs font-medium transition-all flex items-center justify-center ${
                          isCurrent
                            ? "ring-2 ring-accent ring-offset-1 ring-offset-card bg-card text-foreground font-bold"
                            : answered
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // List view - available diagnostic tests
  if (isLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  }

  if (!availableTests || availableTests.length === 0) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">No Diagnostic Tests Available</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your teacher will assign diagnostic tests when ready. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        Available Diagnostic Tests
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableTests.map(test => (
          <Card key={test.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{test.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    {test.class_name} - {test.section}
                  </p>
                </div>
                <Badge variant="outline">{test.questions.length} Qs</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Assigned: {test.assigned_at ? new Date(test.assigned_at).toLocaleDateString() : "—"}
              </p>
              <Button className="w-full gap-1.5" onClick={() => handleStartTest(test)}>
                <BookOpen className="h-4 w-4" />
                Start Diagnostic Test
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
