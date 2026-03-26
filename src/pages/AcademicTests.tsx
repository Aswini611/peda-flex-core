import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  BookOpen, CheckCircle2, XCircle, ChevronRight, Trophy, Clock, RotateCcw,
  GraduationCap, Sparkles, ArrowRight, Loader2, History, Target, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `Class ${i + 1}` })),
];

const SECTION_OPTIONS = ["A", "B", "C", "D", "E"];

const SUBJECT_OPTIONS = [
  { value: "Mathematics", label: "Mathematics" },
  { value: "Science", label: "Science" },
  { value: "English", label: "English" },
  { value: "Social Studies", label: "Social Studies" },
  { value: "Hindi", label: "Hindi" },
  { value: "Computer Science", label: "Computer Science" },
  { value: "Environmental Science", label: "EVS" },
  { value: "General Knowledge", label: "General Knowledge" },
];

interface MCQQuestion {
  id: number;
  question: string;
  options: Record<string, string>;
  correct: string;
  explanation: string;
}

type Phase = "select" | "loading" | "test" | "result";

export default function AcademicTests() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("select");
  const [studentClass, setStudentClass] = useState("");
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Fetch past tests
  const { data: pastTests, refetch: refetchTests } = useQuery({
    queryKey: ["academic-tests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_tests")
        .select("*")
        .eq("student_id", user!.id)
        .order("completed_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleStartTest = async () => {
    if (!studentClass || !subject) {
      toast.error("Please select class and subject");
      return;
    }
    setPhase("loading");
    try {
      const { data, error } = await supabase.functions.invoke("generate-mcqs", {
        body: { studentClass, section, subject },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setQuestions(data.questions);
      setCurrentQ(0);
      setAnswers({});
      setSelectedOption(null);
      setShowAnswer(false);
      setScore(0);
      setStartTime(Date.now());
      setPhase("test");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate questions");
      setPhase("select");
    }
  };

  const handleSelectOption = (option: string) => {
    if (showAnswer) return;
    setSelectedOption(option);
  };

  const handleConfirm = () => {
    if (!selectedOption) return;
    const isCorrect = selectedOption === questions[currentQ].correct;
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((prev) => ({ ...prev, [currentQ]: selectedOption }));
    setShowAnswer(true);
  };

  const handleNext = async () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelectedOption(null);
      setShowAnswer(false);
    } else {
      // Test complete - save to DB
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
      const finalScore = Object.entries(answers).reduce((acc, [idx, ans]) => {
        // Include current answer too
        return acc;
      }, score);
      // score already includes current answer via handleConfirm

      try {
        await supabase.from("academic_tests").insert({
          student_id: user!.id,
          student_class: studentClass,
          section: section || null,
          subject,
          questions: questions as any,
          answers: answers as any,
          score,
          total_questions: questions.length,
        });
        refetchTests();
      } catch (err) {
        console.error("Failed to save test:", err);
      }
      setPhase("result");
    }
  };

  const handleReset = () => {
    setPhase("select");
    setQuestions([]);
    setAnswers({});
    setSelectedOption(null);
    setShowAnswer(false);
    setScore(0);
    setCurrentQ(0);
  };

  const getOptionStyle = (key: string) => {
    if (!showAnswer) {
      return selectedOption === key
        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
        : "border-border hover:border-primary/50 hover:bg-accent/50";
    }
    if (key === questions[currentQ].correct) return "border-emerald-500 bg-emerald-50 text-emerald-800";
    if (key === selectedOption && key !== questions[currentQ].correct)
      return "border-red-500 bg-red-50 text-red-800";
    return "border-border opacity-50";
  };

  const progressPercent = questions.length > 0 ? ((currentQ + (showAnswer ? 1 : 0)) / questions.length) * 100 : 0;

  return (
    <AppLayout>
      <PageHeader title="Academic Tests" subtitle="Test your knowledge with AI-generated MCQs" />

      {/* ─── SELECT PHASE ─── */}
      {phase === "select" && (
        <div className="space-y-6 animate-fade-in">
          <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                <GraduationCap className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">Start a New Test</CardTitle>
              <p className="text-sm text-muted-foreground">Select your class, section, and subject to generate questions</p>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md mx-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium">Class <span className="text-red-500">*</span></label>
                <Select value={studentClass} onValueChange={setStudentClass}>
                  <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>
                    {CLASS_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Section</label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger><SelectValue placeholder="Select Section (Optional)" /></SelectTrigger>
                  <SelectContent>
                    {SECTION_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>Section {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject <span className="text-red-500">*</span></label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                  <SelectContent>
                    {SUBJECT_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleStartTest} className="w-full gap-2 mt-2" size="lg" disabled={!studentClass || !subject}>
                <Sparkles className="h-4 w-4" /> Generate & Start Test
              </Button>
            </CardContent>
          </Card>

          {/* Past Tests */}
          {pastTests && pastTests.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" /> Recent Tests
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {pastTests.map((test: any) => (
                  <Card key={test.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">{test.subject}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(test.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {CLASS_OPTIONS.find(c => c.value === test.student_class)?.label || test.student_class}
                          {test.section ? ` - ${test.section}` : ""}
                        </span>
                        <div className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5 text-primary" />
                          <span className={cn("text-sm font-bold",
                            test.score >= 7 ? "text-emerald-600" : test.score >= 4 ? "text-amber-600" : "text-red-500"
                          )}>
                            {test.score}/{test.total_questions}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── LOADING PHASE ─── */}
      {phase === "loading" && (
        <Card className="animate-fade-in">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <div className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Generating Your Questions...</h3>
            <p className="text-sm text-muted-foreground">AI is crafting {subject} questions for {CLASS_OPTIONS.find(c => c.value === studentClass)?.label}</p>
          </CardContent>
        </Card>
      )}

      {/* ─── TEST PHASE ─── */}
      {phase === "test" && questions.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <Progress value={progressPercent} className="flex-1 h-3 [&>div]:bg-primary" />
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              {currentQ + 1}/{questions.length}
            </span>
          </div>

          {/* Score indicator */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="gap-1">
              <Trophy className="h-3 w-3 text-amber-500" /> Score: {score}
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              Q{currentQ + 1} of {questions.length}
            </Badge>
          </div>

          {/* Question card */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base leading-relaxed">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold mr-2">
                  {currentQ + 1}
                </span>
                {questions[currentQ].question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(questions[currentQ].options).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleSelectOption(key)}
                  disabled={showAnswer}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                    getOptionStyle(key)
                  )}
                >
                  <span className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors",
                    showAnswer && key === questions[currentQ].correct
                      ? "bg-emerald-500 text-white"
                      : showAnswer && key === selectedOption
                        ? "bg-red-500 text-white"
                        : selectedOption === key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                  )}>
                    {showAnswer && key === questions[currentQ].correct ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : showAnswer && key === selectedOption ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      key
                    )}
                  </span>
                  <span className="text-sm">{value}</span>
                </button>
              ))}

              {/* Explanation */}
              {showAnswer && (
                <div className={cn(
                  "mt-4 rounded-lg p-3 text-sm animate-fade-in",
                  selectedOption === questions[currentQ].correct
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border border-amber-200 text-amber-800"
                )}>
                  <p className="font-medium mb-1">
                    {selectedOption === questions[currentQ].correct ? "✅ Correct!" : "❌ Incorrect"}
                  </p>
                  <p>{questions[currentQ].explanation}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2">
                {!showAnswer ? (
                  <Button onClick={handleConfirm} disabled={!selectedOption} className="gap-2">
                    Confirm Answer <CheckCircle2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="gap-2">
                    {currentQ < questions.length - 1 ? (
                      <>Next Question <ChevronRight className="h-4 w-4" /></>
                    ) : (
                      <>View Results <Trophy className="h-4 w-4" /></>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── RESULT PHASE ─── */}
      {phase === "result" && (
        <div className="space-y-6 animate-fade-in">
          <Card className="border-2 overflow-hidden">
            <div className={cn(
              "p-8 text-center text-white",
              score >= 7 ? "bg-gradient-to-br from-emerald-500 to-emerald-700" :
              score >= 4 ? "bg-gradient-to-br from-amber-500 to-amber-700" :
              "bg-gradient-to-br from-red-500 to-red-700"
            )}>
              <Award className="h-16 w-16 mx-auto mb-3 drop-shadow-lg" />
              <h2 className="text-3xl font-bold mb-1">{score}/{questions.length}</h2>
              <p className="text-lg opacity-90">
                {score >= 8 ? "Outstanding!" : score >= 6 ? "Great Job!" : score >= 4 ? "Good Effort!" : "Keep Practicing!"}
              </p>
              <p className="text-sm opacity-75 mt-1">{subject} • {CLASS_OPTIONS.find(c => c.value === studentClass)?.label}</p>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {Object.entries(answers).filter(([i, a]) => a === questions[Number(i)].correct).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {Object.entries(answers).filter(([i, a]) => a !== questions[Number(i)].correct).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Wrong</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round((score / questions.length) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
              </div>

              {/* Review answers */}
              <h3 className="font-semibold text-sm mb-3">Answer Review</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {questions.map((q, i) => {
                  const isCorrect = answers[i] === q.correct;
                  return (
                    <div key={i} className={cn(
                      "rounded-lg border p-3 text-sm",
                      isCorrect ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"
                    )}>
                      <div className="flex items-start gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium">{q.question}</p>
                          {!isCorrect && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Your answer: {answers[i]} ({q.options[answers[i]]}) •
                              Correct: {q.correct} ({q.options[q.correct]})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleReset} variant="outline" className="flex-1 gap-2">
                  <RotateCcw className="h-4 w-4" /> Take Another Test
                </Button>
                <Button onClick={() => { setPhase("loading"); handleStartTest(); }} className="flex-1 gap-2">
                  <Sparkles className="h-4 w-4" /> Retry Same Subject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
