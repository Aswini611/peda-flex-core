import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, Loader2, Calendar, Clock, Lock, Unlock,
  RefreshCw, Plus, ChevronDown, ChevronUp, CalendarDays, Target,
  BookOpen, ClipboardCheck, Package, Pencil, X, Check, FileText,
  Eye, Download, GraduationCap, Users
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

interface PeriodPlan {
  day: number;
  period: number;
  topic: string;
  objective: string;
  activity: string;
  materials: string;
  assessment: string;
  duration_minutes: number;
}

interface LessonOption {
  id: string;
  title: string;
  subject: string | null;
  topic: string | null;
  lesson_content: string | null;
  class_level: string | null;
  section: string | null;
}

interface PeriodPlanGeneratorProps {
  // no longer requires parent class/section
}

const CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `Class ${i + 1}` })),
];

const DEFAULT_SECTIONS = ["A", "B", "C", "D", "E", "F"];

const getClassLabel = (val: string): string => {
  const found = CLASS_OPTIONS.find((c) => c.value === val);
  return found ? found.label : val;
};

const PeriodPlanGenerator = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const [periodsPerWeek, setPeriodsPerWeek] = useState("5");
  const [periodDuration, setPeriodDuration] = useState("40");
  const [totalTeachingDays, setTotalTeachingDays] = useState("20");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PeriodPlan | null>(null);
  const [periodPlans, setPeriodPlans] = useState<PeriodPlan[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [showLessonPreview, setShowLessonPreview] = useState(false);
  const [manualForm, setManualForm] = useState<PeriodPlan>({
    day: 1, period: 1, topic: "", objective: "", activity: "",
    materials: "", assessment: "", duration_minutes: 40,
  });

  // Fetch all lessons for the selected class
  const { data: classLessons = [] } = useQuery<LessonOption[]>({
    queryKey: ["class-lessons", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data } = await supabase
        .from("lessons")
        .select("id, title, subject, lesson_content, class_level, section")
        .eq("class_level", selectedClass)
        .order("created_at", { ascending: false });
      // topic column exists in DB but not in generated types yet, so cast
      return (data || []).map((d: any) => ({ ...d, topic: d.topic || null }));
    },
    enabled: !!selectedClass,
  });

  // Selected lesson object
  const selectedLesson = classLessons.find((l) => l.id === selectedLessonId) || null;

  // Fetch saved period plan for selected lesson
  const { data: savedPlan } = useQuery({
    queryKey: ["saved-period-plan", selectedLessonId],
    queryFn: async () => {
      if (!selectedLessonId) return null;
      const { data } = await supabase
        .from("period_plans")
        .select("*")
        .eq("lesson_id", selectedLessonId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedLessonId,
  });

  // When class changes, reset lesson selection
  useEffect(() => {
    setSelectedLessonId("");
    setPeriodPlans([]);
    setSavedPlanId(null);
    setIsLocked(false);
  }, [selectedClass]);

  // Load saved plan data
  useEffect(() => {
    if (savedPlan) {
      const planData = savedPlan.plan_data as unknown;
      setPeriodPlans(Array.isArray(planData) ? planData as PeriodPlan[] : []);
      setIsLocked(savedPlan.is_locked);
      setSavedPlanId(savedPlan.id);
      setPeriodsPerWeek(String(savedPlan.periods_per_week));
      setPeriodDuration(String(savedPlan.period_duration));
      setTotalTeachingDays(String(savedPlan.total_teaching_days));
    } else if (selectedLessonId) {
      // Reset when switching to a lesson with no saved plan
      setPeriodPlans([]);
      setSavedPlanId(null);
      setIsLocked(false);
    }
  }, [savedPlan, selectedLessonId]);

  useEffect(() => {
    if (selectedLessonId) setCurrentLessonId(selectedLessonId);
  }, [selectedLessonId]);

  const handleGenerate = async () => {
    if (!selectedLesson?.lesson_content) {
      toast.error("Selected lesson plan has no content.");
      return;
    }
    setIsGenerating(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-period-plans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            lessonContent: selectedLesson.lesson_content,
            classLevel: selectedClass,
            section: selectedSection,
            subject: selectedLesson?.subject,
            periodsPerWeek: parseInt(periodsPerWeek),
            periodDuration: parseInt(periodDuration),
            totalTeachingDays: parseInt(totalTeachingDays),
          }),
        }
      );
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Generation failed");
      }
      const data = await resp.json();
      const plans = Array.isArray(data.plan) ? data.plan : [data.plan];
      setPeriodPlans(plans);
      setIsLocked(false);
      await savePlan(plans, false);
      toast.success("Period plan generated successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate period plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (index: number) => {
    if (!selectedLesson?.lesson_content) return;
    setIsRegenerating(index);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-period-plans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            lessonContent: selectedLesson.lesson_content,
            classLevel: selectedClass,
            section: selectedSection,
            subject: selectedLesson?.subject,
            periodsPerWeek: parseInt(periodsPerWeek),
            periodDuration: parseInt(periodDuration),
            totalTeachingDays: parseInt(totalTeachingDays),
            regeneratePeriod: index,
          }),
        }
      );
      if (!resp.ok) throw new Error("Regeneration failed");
      const data = await resp.json();
      const updated = [...periodPlans];
      updated[index] = data.plan;
      setPeriodPlans(updated);
      await savePlan(updated, isLocked);
      toast.success(`Period ${index + 1} regenerated!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to regenerate");
    } finally {
      setIsRegenerating(null);
    }
  };

  const savePlan = async (plans: PeriodPlan[], locked: boolean) => {
    if (!currentLessonId || !user?.id) return;
    const payload = {
      lesson_id: currentLessonId,
      teacher_id: user.id,
      class_level: selectedClass,
      section: selectedSection,
      subject: selectedLesson?.subject || null,
      periods_per_week: parseInt(periodsPerWeek),
      period_duration: parseInt(periodDuration),
      total_teaching_days: parseInt(totalTeachingDays),
      plan_data: plans as any,
      is_locked: locked,
      updated_at: new Date().toISOString(),
    };

    if (savedPlanId) {
      await supabase.from("period_plans").update(payload).eq("id", savedPlanId);
    } else {
      const { data } = await supabase.from("period_plans").insert(payload).select("id").single();
      if (data) setSavedPlanId(data.id);
    }
    queryClient.invalidateQueries({ queryKey: ["saved-period-plan"] });
  };

  const handleSaveEdit = async (index: number) => {
    if (!editForm) return;
    const updated = [...periodPlans];
    updated[index] = editForm;
    setPeriodPlans(updated);
    setEditingIndex(null);
    setEditForm(null);
    await savePlan(updated, isLocked);
    toast.success("Period updated!");
  };

  const handleToggleLock = async () => {
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    await savePlan(periodPlans, newLocked);
    toast.success(newLocked ? "Plan locked" : "Plan unlocked");
  };

  const handleAddManual = async () => {
    if (!manualForm.topic.trim()) {
      toast.error("Topic is required");
      return;
    }
    const updated = [...periodPlans, { ...manualForm, duration_minutes: parseInt(periodDuration) }];
    setPeriodPlans(updated);
    setShowManualAdd(false);
    setManualForm({
      day: 1, period: 1, topic: "", objective: "", activity: "",
      materials: "", assessment: "", duration_minutes: 40,
    });
    await savePlan(updated, isLocked);
    toast.success("Period added!");
  };

  const groupedByDay = periodPlans.reduce<Record<number, PeriodPlan[]>>((acc, plan) => {
    const d = plan.day || 1;
    if (!acc[d]) acc[d] = [];
    acc[d].push(plan);
    return acc;
  }, {});

  const days = Object.keys(groupedByDay).map(Number).sort((a, b) => a - b);

  // Build dropdown label for each lesson
  const getLessonLabel = (l: LessonOption) => {
    const cls = getClassLabel(selectedClass);
    const sub = l.subject || "General";
    const topic = l.topic ? ` – ${l.topic}` : "";
    return `${cls} ${sub}${topic}`;
  };

  const handleDownloadLesson = () => {
    if (!selectedLesson?.lesson_content) return;
    const label = getLessonLabel(selectedLesson);
    const blob = new Blob([selectedLesson.lesson_content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label.replace(/[^a-zA-Z0-9 –-]/g, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lesson plan downloaded!");
  };

  return (
    <Card className="border-2 border-primary/10 shadow-lg animate-fade-in">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <CalendarDays className="h-5 w-5" />
            Period-wise Lesson Plan
          </CardTitle>
          {periodPlans.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleLock}
                className="gap-1.5 text-xs"
              >
                {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                {isLocked ? "Locked" : "Unlocked"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Class & Section Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="group">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block group-hover:text-primary transition-colors">Select Class</label>
            <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection(""); setSelectedLessonId(""); }}>
              <SelectTrigger className="transition-all duration-300 hover:border-primary/50">
                <SelectValue placeholder="Choose a class..." />
              </SelectTrigger>
              <SelectContent>
                {CLASS_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" />{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="group">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block group-hover:text-primary transition-colors">Select Section</label>
            <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
              <SelectTrigger className="transition-all duration-300 hover:border-primary/50">
                <SelectValue placeholder={!selectedClass ? "Select a class first..." : "Choose a section..."} />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />Section {s}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedClass && selectedSection && (
          <>
        {/* Lesson Plan Dropdown */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Select Lesson Plan
          </label>
          <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
            <SelectTrigger className="transition-all duration-300 hover:border-primary/50">
              <SelectValue placeholder={classLessons.length === 0 ? "No lesson plans found for this class" : "Choose a lesson plan..."} />
            </SelectTrigger>
            <SelectContent>
              {classLessons.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  <span className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    {getLessonLabel(l)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {classLessons.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Generate a lesson plan above first, then it will appear here.
            </p>
          )}
          {/* View & Download buttons */}
          {selectedLesson && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowLessonPreview(true)}
                disabled={!selectedLesson.lesson_content}
              >
                <Eye className="h-3.5 w-3.5" /> View Lesson Plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleDownloadLesson}
                disabled={!selectedLesson.lesson_content}
              >
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </div>
          )}
        </div>

        {/* Lesson Plan Preview Dialog */}
        <Dialog open={showLessonPreview} onOpenChange={setShowLessonPreview}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {selectedLesson ? getLessonLabel(selectedLesson) : "Lesson Plan"}
              </DialogTitle>
            </DialogHeader>
            <div className="prose prose-sm max-w-none dark:prose-invert mt-2">
              <ReactMarkdown>
                {selectedLesson?.lesson_content || "No content available."}
              </ReactMarkdown>
            </div>
            <div className="flex justify-end pt-3 border-t border-border">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadLesson}>
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Show config & actions only when a lesson is selected */}
        {selectedLessonId && (
          <>
            {/* Timetable Config */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Periods / Week
                </label>
                <Select value={periodsPerWeek} onValueChange={setPeriodsPerWeek} disabled={isLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} periods</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Period Duration
                </label>
                <Select value={periodDuration} onValueChange={setPeriodDuration} disabled={isLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[25, 30, 35, 40, 45, 50, 55, 60].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} minutes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Teaching Days
                </label>
                <Select value={totalTeachingDays} onValueChange={setTotalTeachingDays} disabled={isLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} days</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || isLocked || !selectedLesson?.lesson_content}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate Period Plan (AI)</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowManualAdd(!showManualAdd)}
                disabled={isLocked}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Create / Edit Manually
              </Button>
            </div>

            {!selectedLesson?.lesson_content && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 border border-dashed border-border">
                ⚠️ The selected lesson plan has no content. Please regenerate the lesson plan first.
              </div>
            )}
          </>
        )}

        {/* Manual Add Form */}
        {showManualAdd && !isLocked && selectedLessonId && (
          <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" /> Add New Period
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Day</label>
                  <Input
                    type="number"
                    min={1}
                    value={manualForm.day}
                    onChange={(e) => setManualForm({ ...manualForm, day: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Period</label>
                  <Input
                    type="number"
                    min={1}
                    value={manualForm.period}
                    onChange={(e) => setManualForm({ ...manualForm, period: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Topic *</label>
                <Input
                  value={manualForm.topic}
                  onChange={(e) => setManualForm({ ...manualForm, topic: e.target.value })}
                  placeholder="e.g. Introduction to Fractions"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Objective</label>
                <Input
                  value={manualForm.objective}
                  onChange={(e) => setManualForm({ ...manualForm, objective: e.target.value })}
                  placeholder="Students will be able to..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Activity</label>
                <Textarea
                  value={manualForm.activity}
                  onChange={(e) => setManualForm({ ...manualForm, activity: e.target.value })}
                  placeholder="Teaching activity description..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Materials</label>
                  <Input
                    value={manualForm.materials}
                    onChange={(e) => setManualForm({ ...manualForm, materials: e.target.value })}
                    placeholder="Textbook, whiteboard..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Assessment</label>
                  <Input
                    value={manualForm.assessment}
                    onChange={(e) => setManualForm({ ...manualForm, assessment: e.target.value })}
                    placeholder="Quick quiz..."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddManual} className="gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Add Period
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowManualAdd(false)}>
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Period Plans Display */}
        {periodPlans.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {periodPlans.length} Periods across {days.length} Day{days.length !== 1 ? "s" : ""}
              </h3>
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" /> {periodDuration} min/period
              </Badge>
            </div>

            {days.map((day) => (
              <Card key={day} className="border border-border/60 overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      {day}
                    </div>
                    <span className="text-sm font-medium">Day {day}</span>
                    <Badge variant="secondary" className="text-xs">
                      {groupedByDay[day].length} period{groupedByDay[day].length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  {expandedDay === day ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {expandedDay === day && (
                  <div className="border-t border-border/50">
                    {groupedByDay[day].map((plan, localIdx) => {
                      const globalIdx = periodPlans.findIndex(
                        (p) => p.day === plan.day && p.period === plan.period && p.topic === plan.topic
                      );
                      const isEditing = editingIndex === globalIdx;

                      return (
                        <div key={localIdx} className="p-4 border-b border-border/30 last:border-0">
                          {isEditing && editForm ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground">Topic</label>
                                  <Input value={editForm.topic} onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })} />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Objective</label>
                                  <Input value={editForm.objective} onChange={(e) => setEditForm({ ...editForm, objective: e.target.value })} />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Activity</label>
                                <Textarea value={editForm.activity} onChange={(e) => setEditForm({ ...editForm, activity: e.target.value })} rows={2} />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground">Materials</label>
                                  <Input value={editForm.materials} onChange={(e) => setEditForm({ ...editForm, materials: e.target.value })} />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Assessment</label>
                                  <Input value={editForm.assessment} onChange={(e) => setEditForm({ ...editForm, assessment: e.target.value })} />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleSaveEdit(globalIdx)} className="gap-1.5">
                                  <Check className="h-3.5 w-3.5" /> Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingIndex(null); setEditForm(null); }}>
                                  <X className="h-3.5 w-3.5" /> Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                                    Period {plan.period}
                                  </Badge>
                                  <h4 className="font-medium text-sm text-foreground">{plan.topic}</h4>
                                </div>
                                {!isLocked && (
                                  <div className="flex gap-1.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => { setEditingIndex(globalIdx); setEditForm({ ...plan }); }}
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRegenerate(globalIdx)}
                                      disabled={isRegenerating === globalIdx}
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                    >
                                      {isRegenerating === globalIdx ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                <div className="flex gap-2">
                                  <Target className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="font-medium text-muted-foreground">Objective:</span>
                                    <p className="text-foreground/80">{plan.objective}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <BookOpen className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="font-medium text-muted-foreground">Activity:</span>
                                    <p className="text-foreground/80">{plan.activity}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Package className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="font-medium text-muted-foreground">Materials:</span>
                                    <p className="text-foreground/80">{plan.materials}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <ClipboardCheck className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="font-medium text-muted-foreground">Assessment:</span>
                                    <p className="text-foreground/80">{plan.assessment}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
        </>
        )}
      </CardContent>
    </Card>
  );
};

export default PeriodPlanGenerator;
