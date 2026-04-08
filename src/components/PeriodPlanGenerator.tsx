import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, Loader2, Calendar, Clock, Edit3, Save, Lock, Unlock,
  RefreshCw, Plus, ChevronDown, ChevronUp, CalendarDays, Target,
  BookOpen, ClipboardCheck, Package, Pencil, X, Check
} from "lucide-react";

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

interface PeriodPlanGeneratorProps {
  selectedClass: string;
  selectedSection: string;
  selectedSubject: string;
  getClassLabel: (val: string) => string;
}

const PeriodPlanGenerator = ({
  selectedClass,
  selectedSection,
  selectedSubject,
  getClassLabel,
}: PeriodPlanGeneratorProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
  const [manualForm, setManualForm] = useState<PeriodPlan>({
    day: 1, period: 1, topic: "", objective: "", activity: "",
    materials: "", assessment: "", duration_minutes: 40,
  });

  // Fetch existing lesson for this class/section/subject
  const { data: lesson } = useQuery({
    queryKey: ["period-plan-lesson", selectedClass, selectedSection, selectedSubject],
    queryFn: async () => {
      if (!selectedClass || !selectedSection) return null;
      const query = supabase
        .from("lessons")
        .select("id, title, lesson_content, subject")
        .eq("class_level", selectedClass)
        .eq("section", selectedSection);
      if (selectedSubject) query.eq("subject", selectedSubject);
      const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!selectedClass && !!selectedSection,
  });

  // Fetch saved period plan
  const { data: savedPlan } = useQuery({
    queryKey: ["saved-period-plan", lesson?.id],
    queryFn: async () => {
      if (!lesson?.id) return null;
      const { data } = await supabase
        .from("period_plans")
        .select("*")
        .eq("lesson_id", lesson.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!lesson?.id,
  });

  useEffect(() => {
    if (savedPlan) {
      const planData = savedPlan.plan_data as unknown;
      setPeriodPlans(Array.isArray(planData) ? planData as PeriodPlan[] : []);
      setIsLocked(savedPlan.is_locked);
      setSavedPlanId(savedPlan.id);
      setPeriodsPerWeek(String(savedPlan.periods_per_week));
      setPeriodDuration(String(savedPlan.period_duration));
      setTotalTeachingDays(String(savedPlan.total_teaching_days));
    }
  }, [savedPlan]);

  useEffect(() => {
    if (lesson?.id) setCurrentLessonId(lesson.id);
  }, [lesson]);

  const handleGenerate = async () => {
    if (!lesson?.lesson_content) {
      toast.error("No lesson plan found. Please generate a lesson plan first.");
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
            lessonContent: lesson.lesson_content,
            classLevel: selectedClass,
            section: selectedSection,
            subject: selectedSubject,
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
    if (!lesson?.lesson_content) return;
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
            lessonContent: lesson.lesson_content,
            classLevel: selectedClass,
            section: selectedSection,
            subject: selectedSubject,
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
      subject: selectedSubject || null,
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

  if (!selectedClass || !selectedSection) return null;

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
            disabled={isGenerating || isLocked || !lesson?.lesson_content}
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

        {!lesson?.lesson_content && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 border border-dashed border-border">
            ⚠️ No lesson plan found for this class/section/subject. Generate a lesson plan above first, then come back to create period-wise plans.
          </div>
        )}

        {/* Manual Add Form */}
        {showManualAdd && !isLocked && (
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
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{day}</span>
                    </div>
                    <span className="text-sm font-medium">Day {day}</span>
                    <Badge variant="secondary" className="text-xs">
                      {groupedByDay[day].length} period{groupedByDay[day].length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  {expandedDay === day ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {expandedDay === day && (
                  <div className="border-t border-border/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-[60px]">Period</TableHead>
                          <TableHead>Topic</TableHead>
                          <TableHead className="hidden md:table-cell">Objective</TableHead>
                          <TableHead className="hidden lg:table-cell">Activity</TableHead>
                          <TableHead className="hidden lg:table-cell">Assessment</TableHead>
                          <TableHead className="w-[90px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedByDay[day].map((plan) => {
                          const globalIndex = periodPlans.indexOf(plan);
                          const isEditing = editingIndex === globalIndex;

                          if (isEditing && editForm) {
                            return (
                              <TableRow key={globalIndex} className="bg-primary/5">
                                <TableCell className="font-medium">P{plan.period}</TableCell>
                                <TableCell>
                                  <Input
                                    value={editForm.topic}
                                    onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Input
                                    value={editForm.objective}
                                    onChange={(e) => setEditForm({ ...editForm, objective: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  <Input
                                    value={editForm.activity}
                                    onChange={(e) => setEditForm({ ...editForm, activity: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  <Input
                                    value={editForm.assessment}
                                    onChange={(e) => setEditForm({ ...editForm, assessment: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(globalIndex)}>
                                      <Save className="h-3.5 w-3.5 text-green-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingIndex(null); setEditForm(null); }}>
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          return (
                            <TableRow key={globalIndex} className="hover:bg-muted/20">
                              <TableCell>
                                <Badge variant="outline" className="text-xs font-medium">
                                  P{plan.period}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">{plan.topic}</p>
                                  <p className="text-xs text-muted-foreground md:hidden mt-1">{plan.objective}</p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <p className="text-xs text-muted-foreground line-clamp-2">{plan.objective}</p>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <p className="text-xs text-muted-foreground line-clamp-2">{plan.activity}</p>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <p className="text-xs text-muted-foreground line-clamp-2">{plan.assessment}</p>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  {!isLocked && (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => { setEditingIndex(globalIndex); setEditForm({ ...plan }); }}
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        disabled={isRegenerating === globalIndex}
                                        onClick={() => handleRegenerate(globalIndex)}
                                      >
                                        {isRegenerating === globalIndex ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <RefreshCw className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PeriodPlanGenerator;
