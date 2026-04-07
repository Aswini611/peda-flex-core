import { useState, useEffect, useMemo, useCallback } from "react";
import { DiagnosticRequestForm } from "@/components/DiagnosticRequestForm";
import { DiagnosticAssignPanel } from "@/components/DiagnosticAssignPanel";
import { StudentDiagnosticTest } from "@/components/StudentDiagnosticTest";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGamification } from "@/hooks/useGamification";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, ArrowRight, ArrowLeft, CheckCircle, Search, BookOpen, AlertTriangle } from "lucide-react";
import { getAgeGroupConfig, getDimensionStartIndex, type AgeGroupConfig } from "@/data/assessmentQuestions";
import { getTeacherAgeGroupConfig, type TeacherAgeGroupConfig } from "@/data/teacherAssessmentQuestions";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `Class ${i + 1}` })),
];

const TEACHER_AGE_OPTIONS = [
  { value: "3", label: "3 Years" },
  { value: "5", label: "5 Years" },
  { value: "10", label: "10 Years" },
];

const Diagnostic = () => {
  const { profile, user } = useAuth();
  const isStudent = profile?.role === "student";

  if (!isStudent) {
    return <DiagnosticTeacher />;
  }

  return <StudentAssessment userId={user?.id} studentName={profile?.full_name || ""} />;
};

// ─── Dimension Header Component (Exam-style) ───
const DimensionHeader = ({ name, current, total }: { name: string; description: string; current: number; total: number }) => (
  <div className="mb-4 px-4 py-2.5 rounded-md bg-muted/60 border border-border">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-foreground">{name}</span>
      <span className="text-xs text-muted-foreground">Question {current} of {total} in this section</span>
    </div>
  </div>
);

// ─── Helper: get current dimension info from flat index ───
function getCurrentDimensionInfo(config: AgeGroupConfig, flatIndex: number) {
  let cumulative = 0;
  for (let i = 0; i < config.dimensions.length; i++) {
    const dim = config.dimensions[i];
    if (flatIndex < cumulative + dim.questions.length) {
      return {
        dimension: dim,
        dimensionIndex: i,
        questionInDimension: flatIndex - cumulative + 1,
        totalInDimension: dim.questions.length,
        isFirstInDimension: flatIndex === cumulative,
      };
    }
    cumulative += dim.questions.length;
  }
  return null;
}

// ─── Student Assessment ───────────────────────────────────────

interface Teacher {
  id: string;
  full_name: string;
}

const StudentAssessment = ({ userId, studentName }: { userId?: string; studentName: string }) => {
  const { awardXp } = useGamification();
  const [phase, setPhase] = useState<"form" | "quiz" | "done">("form");
  const name = studentName;
  const [age, setAge] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [section, setSection] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const [config, setConfig] = useState<AgeGroupConfig | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTeachers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "teacher");
      setTeachers((data as Teacher[]) || []);
      setLoadingTeachers(false);
    };
    fetchTeachers();
  }, []);

  const canStartQuiz = name.trim() && age && studentClass && section.trim() && curriculum && teacherId;

  const getAgeGroupFromAge = (ageVal: number) => {
    if (ageVal >= 3 && ageVal < 5) return 3;
    if (ageVal >= 5 && ageVal < 10) return 5;
    if (ageVal >= 10 && ageVal < 15) return 10;
    return 15;
  };

  const startQuiz = () => {
    const ageNum = parseInt(age);
    const ageGroup = getAgeGroupFromAge(ageNum);
    const cfg = getAgeGroupConfig(ageGroup);
    if (!cfg) return;
    setConfig(cfg);
    setAnswers({});
    setCurrentQ(0);
    setPhase("quiz");
  };

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitWithAnswers = async (finalAnswers: Record<number, number>) => {
    if (!userId || !config) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("student_assessments" as any).insert({
        student_name: name.trim(),
        student_age: parseInt(age),
        age_group: config.ageGroup,
        teacher_id: teacherId,
        responses: finalAnswers,
        submitted_by: userId,
        student_class: studentClass,
        section: section.trim(),
        curriculum: curriculum,
      } as any);
      if (error) throw error;
      setPhase("done");
      awardXp("complete_assessment", "Completed student assessment");
      toast.success("You have successfully completed the Assessment! 🎉");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const allQuestions = config?.questions || [];
  const totalQuestions = allQuestions.length;
  const totalAnswered = Object.keys(answers).length;
  const progress = Math.round((totalAnswered / (totalQuestions || 1)) * 100);

  // ─── Form Phase ───
  if (phase === "form") {
    return (
      <AppLayout>
        <PageHeader title="Student Diagnostic" subtitle="Complete assessments and diagnostic tests" />
        <div className="space-y-8">
          {/* Diagnostic Tests Section */}
          <StudentDiagnosticTest />

          {/* Learning Profile Assessment */}
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-6 space-y-5">
              <div className="text-center mb-2">
                <ClipboardList className="h-10 w-10 text-primary mx-auto mb-2" />
                <h2 className="text-lg font-semibold text-foreground">Learning Profile Assessment</h2>
                <p className="text-sm text-muted-foreground">Fill in your details to begin the assessment</p>
              </div>

              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={name}
                  readOnly
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  type="number"
                  min="3"
                  max="18"
                  placeholder="Enter your age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={studentClass} onValueChange={setStudentClass}>
                  <SelectTrigger><SelectValue placeholder="Select your class" /></SelectTrigger>
                  <SelectContent>
                    {CLASS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Section</Label>
                <Input
                  placeholder="Enter your section (e.g., A, B, C)"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Curriculum</Label>
                <Select value={curriculum} onValueChange={setCurriculum}>
                  <SelectTrigger><SelectValue placeholder="Select your curriculum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CBSE">CBSE</SelectItem>
                    <SelectItem value="IB">IB</SelectItem>
                    <SelectItem value="Cambridge">Cambridge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class Teacher</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingTeachers ? "Loading teachers..." : "Select your teacher"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name || "Unnamed Teacher"}
                      </SelectItem>
                    ))}
                    {!loadingTeachers && teachers.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No teachers found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" size="lg" onClick={startQuiz} disabled={!canStartQuiz}>
                Start Assessment <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // ─── Done Phase ───
  if (phase === "done") {
    return (
      <AppLayout>
        <PageHeader title="Student Assessment" subtitle="Assessment completed" />
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Assessment Submitted!</h2>
            <p className="text-muted-foreground max-w-sm">
              You have successfully submitted your assessment. Your teacher will review your responses.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // ─── Unified Quiz Phase (Exam-style) ───
  if (phase === "quiz") {
    if (!config) return null;
    const question = allQuestions[currentQ];
    if (!question) return null;
    const isLastQuestion = currentQ === totalQuestions - 1;
    const MIN_REQUIRED = 15;
    const canSubmit = totalAnswered >= MIN_REQUIRED;
    const displayNum = currentQ + 1;

    const dimInfo = getCurrentDimensionInfo(config, currentQ);

    return (
      <AppLayout>
        <div className="w-full">
          {/* Top exam bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Student Assessment</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalAnswered} of {totalQuestions} answered
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">{progress}%</span>
              <div className="w-32">
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="flex gap-6">
            {/* Left: Question area */}
            <div className="flex-1 min-w-0">
              {/* Dimension indicator */}
              {dimInfo && (
                <div className="mb-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                    {dimInfo.dimension.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    — Question {dimInfo.questionInDimension} of {dimInfo.totalInDimension}
                  </span>
                </div>
              )}

              {/* Question Card */}
              <Card className="mb-5 shadow-sm">
                <CardContent className="p-6 sm:p-8">
                  <div className="animate-fade-in" key={currentQ}>
                    <div className="flex gap-3 mb-8">
                      <span className="inline-flex items-center justify-center h-8 w-8 min-w-[2rem] rounded-full bg-accent text-accent-foreground text-sm font-bold">
                        {displayNum}
                      </span>
                      <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed pt-0.5">
                        {question.text}
                      </p>
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      {config.options.map((opt) => {
                        const selected = answers[question.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              handleAnswer(question.id, opt.value);
                            }}
                            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all ${
                              selected
                                ? "border-accent bg-accent/10 text-accent shadow-sm"
                                : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/50"
                            }`}
                          >
                            <span className="text-xl shrink-0">{opt.emoji}</span>
                            <span className="truncate">{opt.label}</span>
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
                  onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
                  disabled={currentQ === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </Button>

                <div className="flex gap-2">
                  {(() => {
                    const currentAnswered = answers[question.id] !== undefined;
                    if (!isLastQuestion && currentAnswered) {
                      return (
                        <>
                          <Button onClick={() => setCurrentQ((q) => q + 1)}>
                            Next <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                          {canSubmit && (
                            <Button variant="outline" onClick={() => handleSubmitWithAnswers(answers)} disabled={submitting}>
                              {submitting ? "Submitting..." : "Submit Now"} <CheckCircle className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                        </>
                      );
                    }
                    if (isLastQuestion && currentAnswered) {
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <Button onClick={() => handleSubmitWithAnswers(answers)} disabled={submitting || !canSubmit}>
                            {submitting ? "Submitting..." : "Submit Assessment"} <CheckCircle className="h-4 w-4 ml-1" />
                          </Button>
                          {!canSubmit && (
                            <span className="text-xs text-destructive">
                              Answer at least {MIN_REQUIRED} questions ({MIN_REQUIRED - totalAnswered} more needed)
                            </span>
                          )}
                          {canSubmit && totalAnswered < totalQuestions && (
                            <span className="text-xs text-muted-foreground">
                              {totalAnswered}/{totalQuestions} answered — you can submit now or continue
                            </span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            {/* Right: Question Navigator Panel */}
            <div className="hidden lg:block w-[280px] shrink-0">
              <Card className="sticky top-4 overflow-auto max-h-[calc(100vh-120px)]">
                <CardContent className="p-4 space-y-4">
                  {config.dimensions.map((dim, dimIdx) => {
                    const startIdx = getDimensionStartIndex(config, dimIdx);
                    return (
                      <div key={dim.name}>
                        <p className="text-xs font-bold text-foreground mb-2 leading-tight">{dim.name}</p>
                        <div className="flex flex-wrap gap-1">
                          {dim.questions.map((q, qIdx) => {
                            const flatIdx = startIdx + qIdx;
                            const answered = answers[q.id] !== undefined;
                            const isCurrent = flatIdx === currentQ;
                            return (
                              <button
                                key={q.id}
                                onClick={() => setCurrentQ(flatIdx)}
                                className={`h-7 w-7 rounded-full text-[11px] font-medium transition-all flex items-center justify-center ${
                                  isCurrent
                                    ? "ring-2 ring-accent ring-offset-1 ring-offset-card bg-card text-foreground font-bold"
                                    : answered
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                                }`}
                              >
                                {q.id}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return null;
};

// ─── Teacher/Admin Diagnostic ───────────────────

interface StudentProfile {
  id: string;
  full_name: string | null;
}

const DiagnosticTeacher = () => {
  const { user } = useAuth();
  const { awardXp } = useGamification();
  const [phase, setPhase] = useState<"form" | "quiz" | "done">("form");
  const [ageGroup, setAgeGroup] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearchOpen, setStudentSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [config, setConfig] = useState<TeacherAgeGroupConfig | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "student");
      setStudents((data as StudentProfile[]) || []);
      setLoadingStudents(false);
    };
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    return students.filter((s) =>
      (s.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const canStartQuiz = ageGroup && selectedStudentId;

  const startQuiz = () => {
    const cfg = getTeacherAgeGroupConfig(parseInt(ageGroup));
    if (!cfg) return;
    setConfig(cfg);
    setAnswers({});
    setCurrentQ(0);
    setPhase("quiz");
  };

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!user?.id || !config) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("teacher_assessments" as any).insert({
        teacher_id: user.id,
        student_profile_id: selectedStudentId,
        student_name: selectedStudentName,
        age_group: config.ageGroup,
        responses: answers,
      } as any);
      if (error) throw error;
      setPhase("done");
      awardXp("complete_assessment", "Submitted teacher assessment");
      toast.success("Teacher assessment submitted successfully! 🎉");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = config?.questions.length || 30;
  const progress = Math.round((answeredCount / totalQuestions) * 100);

  // ─── Form Phase ───
  if (phase === "form") {
    return (
      <AppLayout>
        <PageHeader title="Teacher Assessment" subtitle="Assess a student's developmental profile" />
        <div className="space-y-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-6 space-y-5">
              <div className="text-center mb-2">
                <ClipboardList className="h-10 w-10 text-primary mx-auto mb-2" />
                <h2 className="text-lg font-semibold text-foreground">Start a New Assessment</h2>
                <p className="text-sm text-muted-foreground">Select the age group and student to begin</p>
              </div>

              <div className="space-y-2">
                <Label>For which age group are you teaching?</Label>
                <Select value={ageGroup} onValueChange={setAgeGroup}>
                  <SelectTrigger><SelectValue placeholder="Select age group" /></SelectTrigger>
                  <SelectContent>
                    {TEACHER_AGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Name of the Student</Label>
                <Popover open={studentSearchOpen} onOpenChange={setStudentSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {selectedStudentName ? (
                        <span className="truncate">{selectedStudentName}</span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-2"><Search className="h-4 w-4" /> Search and select student...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search student..." value={searchQuery} onValueChange={setSearchQuery} />
                      <CommandList>
                        <CommandEmpty>{loadingStudents ? "Loading…" : "No student found."}</CommandEmpty>
                        <CommandGroup>
                          {filteredStudents.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={s.full_name || s.id}
                              onSelect={() => {
                                setSelectedStudentId(s.id);
                                setSelectedStudentName(s.full_name || "");
                                setStudentSearchOpen(false);
                                setSearchQuery("");
                              }}
                            >
                              {s.full_name || "Unnamed"}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <Button className="w-full" size="lg" onClick={startQuiz} disabled={!canStartQuiz}>
                Start Assessment <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Diagnostic Question Request Form */}
          <DiagnosticRequestForm />

          {/* Assign approved questions */}
          <DiagnosticAssignPanel />
        </div>
      </AppLayout>
    );
  }

  // ─── Done Phase ───
  if (phase === "done") {
    return (
      <AppLayout>
        <PageHeader title="Teacher Assessment" subtitle="Assessment completed" />
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Assessment Submitted!</h2>
            <p className="text-muted-foreground max-w-sm">
              Your assessment for <strong>{selectedStudentName}</strong> has been recorded successfully.
            </p>
            <Button className="mt-6" onClick={() => { setPhase("form"); setSelectedStudentId(""); setSelectedStudentName(""); setAgeGroup(""); }}>
              Assess Another Student
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // ─── Quiz Phase ───
  if (!config) return null;
  const question = config.questions[currentQ];
  const isLastQuestion = currentQ === totalQuestions - 1;
  const MIN_REQUIRED = 15;
  const canSubmit = answeredCount >= MIN_REQUIRED;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Teacher Assessment</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Assessing: {selectedStudentName} — {answeredCount} of {totalQuestions} answered
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{progress}%</span>
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: Question */}
          <div>
            <Card className="mb-5 shadow-sm">
              <CardContent className="p-8">
                <div className="animate-fade-in" key={currentQ}>
                  <p className="text-lg font-medium text-foreground mb-8 leading-relaxed">
                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold mr-3">
                      {question.id}
                    </span>
                    {question.text}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {config.options.map((opt) => {
                      const selected = answers[question.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            handleAnswer(question.id, opt.value);
                          }}
                          className={`flex items-center gap-3 rounded-lg border p-4 text-left text-sm font-medium transition-all ${
                            selected
                              ? "border-accent bg-accent/10 text-accent shadow-sm"
                              : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/50"
                          }`}
                        >
                          <span className="text-2xl">{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
                disabled={currentQ === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="flex gap-2">
                {!isLastQuestion && answers[question.id] !== undefined && (
                  <div className="flex gap-2">
                    <Button onClick={() => setCurrentQ((q) => q + 1)}>
                      Next <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                    {canSubmit && (
                      <Button variant="outline" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Submitting..." : "Submit Now"} <CheckCircle className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
                {isLastQuestion && answers[question.id] !== undefined && (
                  <div className="flex flex-col items-end gap-1">
                    <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
                      {submitting ? "Submitting..." : "Submit Assessment"} <CheckCircle className="h-4 w-4 ml-1" />
                    </Button>
                    {!canSubmit && (
                      <span className="text-xs text-destructive">
                        Answer at least {MIN_REQUIRED} questions ({MIN_REQUIRED - answeredCount} more needed)
                      </span>
                    )}
                    {canSubmit && answeredCount < totalQuestions && (
                      <span className="text-xs text-muted-foreground">
                        {answeredCount}/{totalQuestions} answered — you can submit now or continue
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Question Navigator */}
          <Card className="h-fit sticky top-4 overflow-auto max-h-[calc(100vh-120px)]">
            <CardContent className="p-5">
              <div className="grid grid-cols-10 gap-1.5">
                {config.questions.map((q, i) => {
                  const isCurrent = i === currentQ;
                  const answered = answers[q.id] !== undefined;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQ(i)}
                      className={`h-8 w-8 rounded-full text-xs font-medium transition-all flex items-center justify-center ${
                        isCurrent
                          ? "ring-2 ring-accent ring-offset-2 ring-offset-card bg-card text-foreground font-bold"
                          : answered
                          ? "bg-muted-foreground text-card"
                          : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                      }`}
                    >
                      {q.id}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Diagnostic;
