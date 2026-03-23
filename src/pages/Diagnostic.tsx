import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, ArrowRight, ArrowLeft, CheckCircle, Search } from "lucide-react";
import { getAgeGroupConfig, type AgeGroupConfig } from "@/data/assessmentQuestions";
import { getTeacherAgeGroupConfig, type TeacherAgeGroupConfig } from "@/data/teacherAssessmentQuestions";
import { getVarkAgeGroupConfig, type VarkAgeGroupConfig } from "@/data/varkQuestions";
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

// ─── Student Assessment ───────────────────────────────────────

interface Teacher {
  id: string;
  full_name: string;
}

const StudentAssessment = ({ userId, studentName }: { userId?: string; studentName: string }) => {
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
  const [varkConfig, setVarkConfig] = useState<VarkAgeGroupConfig | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [varkAnswers, setVarkAnswers] = useState<Record<number, string>>({});
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
    const vCfg = getVarkAgeGroupConfig(ageGroup);
    setVarkConfig(vCfg || null);
    setVarkAnswers({});
    setCurrentQ(0);
    setPhase("quiz");
  };

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleVarkAnswer = (questionId: number, modality: string) => {
    setVarkAnswers((prev) => ({ ...prev, [questionId]: modality }));
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
        responses: { ...finalAnswers, vark: varkAnswers },
        submitted_by: userId,
        student_class: studentClass,
        section: section.trim(),
        curriculum: curriculum,
      } as any);
      if (error) throw error;
      setPhase("done");
      toast.success("You have successfully completed the Assessment! 🎉");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const assessmentCount = config?.questions.length || 30;
  const varkCount = varkConfig?.questions.length || 20;
  const totalQuestions = assessmentCount + varkCount;
  const totalAnswered = Object.keys(answers).length + Object.keys(varkAnswers).length;
  const progress = Math.round((totalAnswered / totalQuestions) * 100);

  // ─── Form Phase ───
  if (phase === "form") {
    return (
      <AppLayout>
        <PageHeader title="Student Assessment" subtitle="Complete your learning profile assessment" />
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6 space-y-5">
            <div className="text-center mb-2">
              <ClipboardList className="h-10 w-10 text-primary mx-auto mb-2" />
              <h2 className="text-lg font-semibold text-foreground">Let's get started</h2>
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

  // ─── Unified Quiz Phase (30 Assessment + 20 VARK = 50 Questions) ───
  if (phase === "quiz") {
    if (!config) return null;
    const isVarkQuestion = currentQ >= assessmentCount;
    const varkIndex = currentQ - assessmentCount;
    const isLastQuestion = currentQ === totalQuestions - 1;
    const allAnswered = totalAnswered === totalQuestions;

    // Current question display number (1-based)
    const displayNum = currentQ + 1;

    return (
      <AppLayout>
        <PageHeader
          title="Student Assessment"
          subtitle={`${config.label} — ${config.model}`}
        />

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Question {displayNum} of {totalQuestions}</span>
            <span>{totalAnswered} answered</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {isVarkQuestion ? "VARK Learning Style Questions" : "Assessment Questions"}
          </p>
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {!isVarkQuestion ? (
              // Assessment question (Likert scale)
              <div className="animate-fade-in" key={currentQ}>
                <p className="text-lg font-medium text-foreground mb-6">
                  <span className="text-primary font-bold mr-2">{displayNum}.</span>
                  {config.questions[currentQ].text}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {config.options.map((opt) => {
                    const qId = config.questions[currentQ].id;
                    const selected = answers[qId] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          handleAnswer(qId, opt.value);
                          if (!isLastQuestion) {
                            setTimeout(() => setCurrentQ((q) => q + 1), 350);
                          }
                        }}
                        className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left text-sm font-medium transition-all ${
                          selected
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // VARK question (MCQ)
              varkConfig && (
                <div className="animate-fade-in" key={`vark-${varkIndex}`}>
                  <p className="text-lg font-medium text-foreground mb-6">
                    <span className="text-primary font-bold mr-2">{displayNum}.</span>
                    {varkConfig.questions[varkIndex].text}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {varkConfig.questions[varkIndex].options.map((opt) => {
                      const vqId = varkConfig.questions[varkIndex].id;
                      const selected = varkAnswers[vqId] === opt.modality;
                      return (
                        <button
                          key={opt.label}
                          onClick={() => {
                            handleVarkAnswer(vqId, opt.modality);
                            if (!isLastQuestion) {
                              setTimeout(() => setCurrentQ((q) => q + 1), 350);
                            }
                          }}
                          className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left text-sm font-medium transition-all ${
                            selected
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                          }`}
                        >
                          <span className="text-lg font-bold text-primary/70 w-6">{opt.label}.</span>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
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
              const currentAnswered = isVarkQuestion
                ? varkConfig && varkAnswers[varkConfig.questions[varkIndex].id] !== undefined
                : answers[config.questions[currentQ].id] !== undefined;

              if (!isLastQuestion && currentAnswered) {
                return (
                  <Button onClick={() => setCurrentQ((q) => q + 1)}>
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                );
              }
              if (isLastQuestion && currentAnswered) {
                return (
                  <div className="flex flex-col items-end gap-1">
                    <Button onClick={() => handleSubmitWithAnswers(answers)} disabled={submitting || !allAnswered}>
                      {submitting ? "Submitting..." : "Submit Assessment"} <CheckCircle className="h-4 w-4 ml-1" />
                    </Button>
                    {!allAnswered && (
                      <span className="text-xs text-destructive">
                        {totalQuestions - totalAnswered} question{totalQuestions - totalAnswered > 1 ? "s" : ""} unanswered
                      </span>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Question dots navigation */}
        <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
          {Array.from({ length: totalQuestions }, (_, i) => {
            const isVark = i >= assessmentCount;
            const answered = isVark
              ? varkConfig && varkAnswers[varkConfig.questions[i - assessmentCount].id] !== undefined
              : answers[config.questions[i].id] !== undefined;
            return (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`h-7 w-7 rounded-full text-xs font-medium transition-all ${
                  i === currentQ
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                    : answered
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
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
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={studentSearchOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedStudentName || (loadingStudents ? "Loading students..." : "Search and select a student...")}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search student name..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No students found.</CommandEmpty>
                      <CommandGroup>
                        {filteredStudents.map((student) => (
                          <CommandItem
                            key={student.id}
                            value={student.full_name || student.id}
                            onSelect={() => {
                              setSelectedStudentId(student.id);
                              setSelectedStudentName(student.full_name || "Unknown");
                              setStudentSearchOpen(false);
                              setSearchQuery("");
                            }}
                          >
                            {student.full_name || "Unnamed Student"}
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
  const allAnswered = answeredCount === totalQuestions;

  return (
    <AppLayout>
      <PageHeader
        title="Teacher Assessment"
        subtitle={`${config.label} — Assessing: ${selectedStudentName}`}
      />

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Question {currentQ + 1} of {totalQuestions}</span>
          <span>{answeredCount} answered</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="animate-fade-in" key={currentQ}>
            <p className="text-lg font-medium text-foreground mb-6">
              <span className="text-primary font-bold mr-2">{question.id}.</span>
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
                      if (!isLastQuestion) {
                        setTimeout(() => setCurrentQ((q) => q + 1), 350);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left text-sm font-medium transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
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
          {!isLastQuestion && answers[question.id] !== undefined && (
            <Button onClick={() => setCurrentQ((q) => q + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {isLastQuestion && answers[question.id] !== undefined && (
            <div className="flex flex-col items-end gap-1">
              <Button onClick={handleSubmit} disabled={submitting || !allAnswered}>
                {submitting ? "Submitting..." : "Submit Assessment"} <CheckCircle className="h-4 w-4 ml-1" />
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

      {/* Question dots navigation */}
      <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
        {config.questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentQ(i)}
            className={`h-7 w-7 rounded-full text-xs font-medium transition-all ${
              i === currentQ
                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                : answers[q.id] !== undefined
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {q.id}
          </button>
        ))}
      </div>
    </AppLayout>
  );
};

export default Diagnostic;
