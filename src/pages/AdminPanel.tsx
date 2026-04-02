import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Plus, Trash2, Users, GraduationCap, BookOpen, Settings2, School, FileSpreadsheet } from "lucide-react";
import { ExcelImportModal } from "@/components/ExcelImportModal";

interface ClassRecord {
  id: string;
  name: string;
  section: string;
  created_at: string;
}

interface StudentRecord {
  id: string;
  profile_id: string;
  grade: string | null;
  age: number | null;
  profiles: { full_name: string | null } | null;
}

interface TeacherProfile {
  id: string;
  full_name: string | null;
}

interface ClassStudent {
  id: string;
  class_id: string;
  student_id: string;
  students: { id: string; profiles: { full_name: string | null } | null; grade: string | null } | null;
}

interface ClassTeacher {
  id: string;
  class_id: string;
  teacher_id: string;
  profiles: { full_name: string | null } | null;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [classTeachers, setClassTeachers] = useState<ClassTeacher[]>([]);

  // Form state
  const [newClassName, setNewClassName] = useState("");
  const [newClassSection, setNewClassSection] = useState("A");
  const [selectedClassForStudent, setSelectedClassForStudent] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedClassForTeacher, setSelectedClassForTeacher] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedTeacherForQuestions, setSelectedTeacherForQuestions] = useState("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("");
  const [questionAssignments, setQuestionAssignments] = useState<any[]>([]);
  const [createClassOpen, setCreateClassOpen] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [classesRes, studentsRes, teachersRes, csRes, ctRes, qaRes] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("students").select("id, profile_id, grade, age, profiles(full_name)"),
      supabase.from("profiles").select("id, full_name").eq("role", "teacher"),
      supabase.from("class_students").select("id, class_id, student_id, students(id, grade, profiles(full_name))"),
      supabase.from("class_teachers").select("id, class_id, teacher_id, profiles:teacher_id(full_name)"),
      supabase.from("teacher_question_assignments").select("*"),
    ]);
    if (classesRes.data) setClasses(classesRes.data);
    if (studentsRes.data) setStudents(studentsRes.data as any);
    if (teachersRes.data) setTeachers(teachersRes.data);
    if (csRes.data) setClassStudents(csRes.data as any);
    if (ctRes.data) setClassTeachers(ctRes.data as any);
    if (qaRes.data) setQuestionAssignments(qaRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    const { error } = await supabase.from("classes").insert({
      name: newClassName.trim(),
      section: newClassSection.trim() || "A",
      created_by: user?.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Class created" });
      setNewClassName("");
      setNewClassSection("A");
      setCreateClassOpen(false);
      fetchAll();
    }
  };

  const handleDeleteClass = async (id: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const handleAssignStudent = async () => {
    if (!selectedClassForStudent || !selectedStudent) return;
    const { error } = await supabase.from("class_students").insert({
      class_id: selectedClassForStudent,
      student_id: selectedStudent,
      assigned_by: user?.id,
    });
    if (error) {
      toast({ title: "Error", description: error.code === "23505" ? "Student already in this class" : error.message, variant: "destructive" });
    } else {
      toast({ title: "Student assigned" });
      setSelectedStudent("");
      fetchAll();
    }
  };

  const handleRemoveStudent = async (id: string) => {
    await supabase.from("class_students").delete().eq("id", id);
    fetchAll();
  };

  const handleAssignTeacher = async () => {
    if (!selectedClassForTeacher || !selectedTeacher) return;
    const { error } = await supabase.from("class_teachers").insert({
      class_id: selectedClassForTeacher,
      teacher_id: selectedTeacher,
      assigned_by: user?.id,
    });
    if (error) {
      toast({ title: "Error", description: error.code === "23505" ? "Teacher already in this class" : error.message, variant: "destructive" });
    } else {
      toast({ title: "Teacher assigned" });
      setSelectedTeacher("");
      fetchAll();
    }
  };

  const handleRemoveTeacher = async (id: string) => {
    await supabase.from("class_teachers").delete().eq("id", id);
    fetchAll();
  };

  const handleAssignQuestions = async () => {
    if (!selectedTeacherForQuestions || !selectedAgeGroup) return;
    const { error } = await supabase.from("teacher_question_assignments").insert({
      teacher_id: selectedTeacherForQuestions,
      age_group: parseInt(selectedAgeGroup),
      assigned_by: user?.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Questions assigned" });
      setSelectedTeacherForQuestions("");
      setSelectedAgeGroup("");
      fetchAll();
    }
  };

  const handleRemoveQuestionAssignment = async (id: string) => {
    await supabase.from("teacher_question_assignments").delete().eq("id", id);
    fetchAll();
  };

  const getClassName = (classId: string) => {
    const c = classes.find(cl => cl.id === classId);
    return c ? `${c.name} - ${c.section}` : "Unknown";
  };

  const getTeacherName = (teacherId: string) => {
    const t = teachers.find(te => te.id === teacherId);
    return t?.full_name || "Unknown";
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage classes, allotments, and diagnostic configuration</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2"><School className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold text-foreground">{classes.length}</p><p className="text-xs text-muted-foreground">Classes</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-accent/10 p-2"><GraduationCap className="h-5 w-5 text-accent" /></div>
              <div><p className="text-2xl font-bold text-foreground">{students.length}</p><p className="text-xs text-muted-foreground">Students</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-secondary/50 p-2"><Users className="h-5 w-5 text-secondary-foreground" /></div>
              <div><p className="text-2xl font-bold text-foreground">{teachers.length}</p><p className="text-xs text-muted-foreground">Teachers</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2"><BookOpen className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold text-foreground">{questionAssignments.length}</p><p className="text-xs text-muted-foreground">Q Assignments</p></div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="classes" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>

          {/* ===== CLASSES TAB ===== */}
          <TabsContent value="classes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Class Management</CardTitle>
                  <CardDescription>Create and manage classes with sections</CardDescription>
                </div>
                <Dialog open={createClassOpen} onOpenChange={setCreateClassOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Class</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create New Class</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Class Name</Label>
                        <Input placeholder="e.g. Class 5, Nursery, LKG" value={newClassName} onChange={e => setNewClassName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Section</Label>
                        <Input placeholder="e.g. A, B, C" value={newClassSection} onChange={e => setNewClassSection(e.target.value)} />
                      </div>
                      <Button onClick={handleCreateClass} className="w-full">Create Class</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No classes created yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Teachers</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classes.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell><Badge variant="secondary">{c.section}</Badge></TableCell>
                          <TableCell>{classStudents.filter(cs => cs.class_id === c.id).length}</TableCell>
                          <TableCell>{classTeachers.filter(ct => ct.class_id === c.id).length}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClass(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== STUDENT ALLOTMENT TAB ===== */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Student Allotment</CardTitle>
                <CardDescription>Assign students to classes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1.5 min-w-[180px]">
                    <Label>Class</Label>
                    <Select value={selectedClassForStudent} onValueChange={setSelectedClassForStudent}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 min-w-[200px]">
                    <Label>Student</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                      <SelectContent>
                        {students.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {(s.profiles as any)?.full_name || "Unnamed"} {s.grade ? `(${s.grade})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssignStudent} disabled={!selectedClassForStudent || !selectedStudent}>
                    <Plus className="h-4 w-4 mr-1" /> Assign
                  </Button>
                </div>

                {selectedClassForStudent && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      Students in {getClassName(selectedClassForStudent)}
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStudents.filter(cs => cs.class_id === selectedClassForStudent).map(cs => (
                          <TableRow key={cs.id}>
                            <TableCell>{(cs.students as any)?.profiles?.full_name || "Unnamed"}</TableCell>
                            <TableCell>{(cs.students as any)?.grade || "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(cs.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {classStudents.filter(cs => cs.class_id === selectedClassForStudent).length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No students assigned</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TEACHER ALLOTMENT TAB ===== */}
          <TabsContent value="teachers">
            <Card>
              <CardHeader>
                <CardTitle>Teacher Allotment</CardTitle>
                <CardDescription>Assign teachers to classes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1.5 min-w-[180px]">
                    <Label>Class</Label>
                    <Select value={selectedClassForTeacher} onValueChange={setSelectedClassForTeacher}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 min-w-[200px]">
                    <Label>Teacher</Label>
                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                      <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      <SelectContent>
                        {teachers.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.full_name || "Unnamed"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssignTeacher} disabled={!selectedClassForTeacher || !selectedTeacher}>
                    <Plus className="h-4 w-4 mr-1" /> Assign
                  </Button>
                </div>

                {selectedClassForTeacher && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      Teachers in {getClassName(selectedClassForTeacher)}
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Teacher Name</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classTeachers.filter(ct => ct.class_id === selectedClassForTeacher).map(ct => (
                          <TableRow key={ct.id}>
                            <TableCell>{(ct.profiles as any)?.full_name || "Unnamed"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveTeacher(ct.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {classTeachers.filter(ct => ct.class_id === selectedClassForTeacher).length === 0 && (
                          <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No teachers assigned</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== QUESTION ALLOTMENT TAB ===== */}
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle>Diagnostic Question Allotment</CardTitle>
                <CardDescription>Assign diagnostic question sets (by age group) to teachers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1.5 min-w-[200px]">
                    <Label>Teacher</Label>
                    <Select value={selectedTeacherForQuestions} onValueChange={setSelectedTeacherForQuestions}>
                      <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      <SelectContent>
                        {teachers.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.full_name || "Unnamed"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 min-w-[180px]">
                    <Label>Age Group</Label>
                    <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
                      <SelectTrigger><SelectValue placeholder="Select age group" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Group 1 (5-7 yrs)</SelectItem>
                        <SelectItem value="2">Group 2 (8-10 yrs)</SelectItem>
                        <SelectItem value="3">Group 3 (11-14 yrs)</SelectItem>
                        <SelectItem value="4">Group 4 (15-18 yrs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssignQuestions} disabled={!selectedTeacherForQuestions || !selectedAgeGroup}>
                    <Plus className="h-4 w-4 mr-1" /> Assign
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Age Group</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questionAssignments.map(qa => (
                      <TableRow key={qa.id}>
                        <TableCell>{getTeacherName(qa.teacher_id)}</TableCell>
                        <TableCell><Badge variant="outline">Group {qa.age_group}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(qa.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveQuestionAssignment(qa.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {questionAssignments.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No question assignments yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== CONFIG TAB ===== */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Diagnostic Configuration</CardTitle>
                <CardDescription>System-wide diagnostic settings and role hierarchy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Role Hierarchy</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-primary/5">
                      <Badge className="bg-primary text-primary-foreground">Admin</Badge>
                      <span className="text-sm text-foreground">Full system control — manage classes, teachers, students, questions, diagnostics</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <Badge variant="secondary">Teacher</Badge>
                      <span className="text-sm text-foreground">Conduct assessments, generate lessons, view analytics, manage assigned students</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <Badge variant="outline">Student</Badge>
                      <span className="text-sm text-foreground">Take assessments, view lessons, play gamification, take academic tests</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Permissions Matrix</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          <TableHead className="text-center">Admin</TableHead>
                          <TableHead className="text-center">Teacher</TableHead>
                          <TableHead className="text-center">Student</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { feature: "Class Management", admin: "Full", teacher: "View", student: "—" },
                          { feature: "Student Allotment", admin: "Full", teacher: "View", student: "View Own" },
                          { feature: "Teacher Allotment", admin: "Full", teacher: "View Own", student: "—" },
                          { feature: "Question Allotment", admin: "Full", teacher: "View Own", student: "—" },
                          { feature: "Diagnostic Assessments", admin: "Full", teacher: "Conduct", student: "Take" },
                          { feature: "Lesson Plans", admin: "Full", teacher: "Create/View", student: "View Assigned" },
                          { feature: "Analytics", admin: "Full", teacher: "View", student: "—" },
                          { feature: "Alerts", admin: "Full", teacher: "—", student: "—" },
                          { feature: "Gamification", admin: "View", teacher: "—", student: "Play" },
                          { feature: "Academic Tests", admin: "View", teacher: "View", student: "Take" },
                          { feature: "Settings", admin: "Full", teacher: "Own", student: "Own" },
                        ].map(row => (
                          <TableRow key={row.feature}>
                            <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                            <TableCell className="text-center"><Badge variant="default" className="text-[10px]">{row.admin}</Badge></TableCell>
                            <TableCell className="text-center"><Badge variant="secondary" className="text-[10px]">{row.teacher}</Badge></TableCell>
                            <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">{row.student}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AdminPanel;
