import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download, Users } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ParsedRow {
  rowNum: number;
  student_name: string;
  class: string;
  section: string;
  roll_number: string;
  parent_phone: string;
  parent_email: string;
  teacher_name: string;
  teacher_role: string;
  teacher_subject: string;
}

interface ValidationResult {
  row: ParsedRow;
  errors: string[];
  warnings: string[];
}

interface ImportReport {
  classesCreated: string[];
  studentsAssigned: number;
  duplicatesSkipped: number;
  teachersAssigned: number;
  errors: { row: number; message: string }[];
}

interface UnassignedClass {
  classKey: string;
  classId: string;
  selectedTeacherId: string;
  selectedRole: string;
  selectedSubject: string;
}

type Step = "upload" | "preview" | "importing" | "report" | "teacher-assign";

export function ExcelImportModal({ open, onOpenChange, onImportComplete }: ExcelImportModalProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [availableTeachers, setAvailableTeachers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [unassignedClasses, setUnassignedClasses] = useState<UnassignedClass[]>([]);
  const [assigningTeachers, setAssigningTeachers] = useState(false);
  // Store classMap so it persists between steps
  const classMapRef = useRef<Map<string, string>>(new Map());

  const reset = () => {
    setStep("upload");
    setParsed([]);
    setValidations([]);
    setReport(null);
    setUnassignedClasses([]);
    classMapRef.current = new Map();
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  useEffect(() => {
    if (open) {
      supabase.from("profiles").select("id, full_name").eq("role", "teacher").then(({ data }) => {
        if (data) setAvailableTeachers(data);
      });
    }
  }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

      const rows: ParsedRow[] = json.map((r, i) => ({
        rowNum: i + 2,
        student_name: String(r["student_name"] || r["Student Name"] || r["name"] || "").trim(),
        class: String(r["Class"] || r["class"] || r["grade"] || "").trim(),
        section: String(r["section"] || r["Section"] || "A").trim(),
        roll_number: String(r["roll_number"] || r["Roll Number"] || r["roll"] || "").trim(),
        parent_phone: String(r["parent_phone"] || r["Parent Phone"] || r["phone"] || "").trim(),
        parent_email: String(r["parent_email"] || r["Parent Email"] || r["email"] || "").trim(),
        teacher_name: String(r["teacher_name"] || r["Teacher Name"] || r["Teacher"] || "").trim(),
        teacher_role: String(r["teacher_role"] || r["Teacher Role"] || "").trim().toLowerCase() || "primary",
        teacher_subject: String(r["teacher_subject"] || r["Teacher Subject"] || r["Subject"] || "").trim(),
      }));

      const results: ValidationResult[] = rows.map((row) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        if (!row.student_name) errors.push("Student name is required");
        if (!row.class) errors.push("Class is required");
        if (!row.section) errors.push("Section is required");
        if (!row.roll_number) warnings.push("Roll number missing");
        if (!row.teacher_name) warnings.push("Teacher not specified");
        if (row.parent_phone && !/^\+?[\d\s-]{7,15}$/.test(row.parent_phone))
          errors.push("Invalid phone format");
        if (row.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.parent_email))
          errors.push("Invalid email format");
        return { row, errors, warnings };
      });

      // Check duplicate roll numbers within file
      const rollMap = new Map<string, number[]>();
      rows.forEach((r) => {
        if (r.roll_number) {
          const key = `${r.class}-${r.section}-${r.roll_number}`;
          rollMap.set(key, [...(rollMap.get(key) || []), r.rowNum]);
        }
      });
      rollMap.forEach((rowNums, _key) => {
        if (rowNums.length > 1) {
          rowNums.forEach((rn) => {
            const v = results.find((vr) => vr.row.rowNum === rn);
            if (v) v.errors.push(`Duplicate roll number in file`);
          });
        }
      });

      setParsed(rows);
      setValidations(results);
      setStep("preview");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    setStep("importing");
    const importReport: ImportReport = {
      classesCreated: [],
      studentsAssigned: 0,
      duplicatesSkipped: 0,
      teachersAssigned: 0,
      errors: [],
    };

    try {
      // 1. Get existing classes
      const { data: existingClasses } = await supabase.from("classes").select("id, name, section");
      const classMap = new Map<string, string>();
      existingClasses?.forEach((c) => classMap.set(`${c.name} - ${c.section}`, c.id));

      const validRows = validations.filter((v) => v.errors.length === 0);
      const neededClasses = new Set<string>();
      validRows.forEach((v) => neededClasses.add(`${v.row.class} - ${v.row.section}`));

      // 2. Create missing classes
      for (const cn of neededClasses) {
        if (!classMap.has(cn)) {
          const [name, section] = cn.split(" - ");
          const { data, error } = await supabase
            .from("classes")
            .insert({ name: name.trim(), section: section.trim(), created_by: user?.id })
            .select("id")
            .single();
          if (error) {
            importReport.errors.push({ row: 0, message: `Failed to create class "${cn}": ${error.message}` });
          } else if (data) {
            classMap.set(cn, data.id);
            importReport.classesCreated.push(cn);
          }
        }
      }

      // 3. Get existing students
      const { data: existingStudents } = await supabase
        .from("students")
        .select("id, roll_number, grade, profiles(full_name)");
      const { data: existingClassStudents } = await supabase
        .from("class_students")
        .select("student_id, class_id");

      // 4. Process students
      for (const v of validRows) {
        const className = `${v.row.class} - ${v.row.section}`;
        const classId = classMap.get(className);
        if (!classId) {
          importReport.errors.push({ row: v.row.rowNum, message: `Class "${className}" not found` });
          continue;
        }

        const existingStudent = existingStudents?.find(
          (s) =>
            (s as any).profiles?.full_name?.toLowerCase() === v.row.student_name.toLowerCase() &&
            s.roll_number === v.row.roll_number &&
            s.grade === v.row.class
        );

        if (existingStudent) {
          const alreadyAssigned = existingClassStudents?.some(
            (cs) => cs.student_id === existingStudent.id && cs.class_id === classId
          );
          if (alreadyAssigned) {
            importReport.duplicatesSkipped++;
            continue;
          }
          const { error } = await supabase.from("class_students").insert({
            class_id: classId, student_id: existingStudent.id, assigned_by: user?.id,
          });
          if (error) {
            if (error.code === "23505") importReport.duplicatesSkipped++;
            else importReport.errors.push({ row: v.row.rowNum, message: error.message });
          } else {
            importReport.studentsAssigned++;
          }
        } else {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .insert({ id: crypto.randomUUID(), full_name: v.row.student_name, role: "student" })
            .select("id").single();
          if (profileError) {
            importReport.errors.push({ row: v.row.rowNum, message: `Profile: ${profileError.message}` });
            continue;
          }
          const { data: studentData, error: studentError } = await supabase
            .from("students")
            .insert({
              profile_id: profileData.id, grade: v.row.class,
              roll_number: v.row.roll_number || null,
              parent_phone: v.row.parent_phone || null,
              parent_email: v.row.parent_email || null,
            })
            .select("id").single();
          if (studentError) {
            importReport.errors.push({ row: v.row.rowNum, message: `Student: ${studentError.message}` });
            continue;
          }
          const { error: assignError } = await supabase.from("class_students").insert({
            class_id: classId, student_id: studentData.id, assigned_by: user?.id,
          });
          if (assignError) {
            importReport.errors.push({ row: v.row.rowNum, message: `Assignment: ${assignError.message}` });
          } else {
            importReport.studentsAssigned++;
          }
        }
      }

      // 5. Auto-assign teachers from Excel
      const teachersByClass = new Map<string, { name: string; role: string; subject: string }>();
      validRows.forEach((v) => {
        if (v.row.teacher_name) {
          const classKey = `${v.row.class} - ${v.row.section}`;
          if (!teachersByClass.has(classKey)) {
            teachersByClass.set(classKey, {
              name: v.row.teacher_name,
              role: v.row.teacher_role || "primary",
              subject: v.row.teacher_subject,
            });
          }
        }
      });

      const { data: existingClassTeachers } = await supabase
        .from("class_teachers")
        .select("class_id, teacher_id, teacher_role");

      for (const [classKey, teacher] of teachersByClass) {
        const classId = classMap.get(classKey);
        if (!classId) continue;

        // Find teacher by name
        const matchedTeacher = availableTeachers.find(
          (t) => t.full_name?.toLowerCase() === teacher.name.toLowerCase()
        );
        if (!matchedTeacher) {
          importReport.errors.push({ row: 0, message: `Teacher "${teacher.name}" not found in system for ${classKey}` });
          continue;
        }

        const alreadyAssigned = existingClassTeachers?.some(
          (ct) => ct.class_id === classId && ct.teacher_id === matchedTeacher.id && ct.teacher_role === teacher.role
        );
        if (alreadyAssigned) continue;

        const { error } = await supabase.from("class_teachers").insert({
          class_id: classId,
          teacher_id: matchedTeacher.id,
          teacher_role: teacher.role,
          subject: teacher.role === "subject" ? teacher.subject : null,
          assigned_by: user?.id,
        });
        if (error) {
          importReport.errors.push({ row: 0, message: `Teacher assign "${classKey}": ${error.message}` });
        } else {
          importReport.teachersAssigned++;
        }
      }

      // 6. Find classes without teacher assignments (from this import)
      const classesWithoutTeacher: UnassignedClass[] = [];
      // Re-fetch class_teachers to get updated state
      const { data: updatedCT } = await supabase.from("class_teachers").select("class_id");
      const assignedClassIds = new Set(updatedCT?.map((ct) => ct.class_id) || []);

      for (const cn of neededClasses) {
        const classId = classMap.get(cn);
        if (classId && !assignedClassIds.has(classId)) {
          classesWithoutTeacher.push({
            classKey: cn,
            classId,
            selectedTeacherId: "",
            selectedRole: "primary",
            selectedSubject: "",
          });
        }
      }

      classMapRef.current = classMap;
      setUnassignedClasses(classesWithoutTeacher);

      // Add skipped error rows
      validations
        .filter((v) => v.errors.length > 0)
        .forEach((v) => {
          importReport.errors.push({ row: v.row.rowNum, message: v.errors.join("; ") });
        });
    } catch (err: any) {
      importReport.errors.push({ row: 0, message: err.message || "Unknown error" });
    }

    setReport(importReport);
    setStep("report");
    onImportComplete();
  };

  const handleManualTeacherAssign = async () => {
    setAssigningTeachers(true);
    let assigned = 0;
    for (const uc of unassignedClasses) {
      if (!uc.selectedTeacherId) continue;
      const { error } = await supabase.from("class_teachers").insert({
        class_id: uc.classId,
        teacher_id: uc.selectedTeacherId,
        teacher_role: uc.selectedRole,
        subject: uc.selectedRole === "subject" ? uc.selectedSubject : null,
        assigned_by: user?.id,
      });
      if (!error) assigned++;
    }
    setAssigningTeachers(false);
    if (report) {
      setReport({ ...report, teachersAssigned: report.teachersAssigned + assigned });
    }
    setUnassignedClasses([]);
    onImportComplete();
  };

  const updateUnassignedClass = (idx: number, field: keyof UnassignedClass, value: string) => {
    setUnassignedClasses((prev) => prev.map((uc, i) => i === idx ? { ...uc, [field]: value } : uc));
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["student_name", "Class", "section", "roll_number", "parent_phone", "parent_email", "teacher_name", "teacher_role", "teacher_subject"],
      ["John Doe", "Class 3", "A", "101", "+919876543210", "parent@email.com", "Mrs. Sharma", "primary", ""],
      ["Jane Smith", "Class 4", "B", "102", "+919876543211", "", "Mr. Verma", "subject", "Mathematics"],
      ["Bob Wilson", "Class 3", "A", "103", "+919876543212", "", "", "", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_import_template.xlsx");
  };

  const hasTeacherData = parsed.some((r) => r.teacher_name);
  const errorCount = validations.filter((v) => v.errors.length > 0).length;
  const validCount = validations.filter((v) => v.errors.length === 0).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Students from Excel
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed border-border rounded-xl p-10 text-center space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-foreground font-medium">Upload Excel File (.xlsx, .xls)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Required: student_name, Class, section &nbsp;|&nbsp; Optional: roll_number, parent_phone, parent_email
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Teacher columns (optional): teacher_name, teacher_role, teacher_subject
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Choose File
                </Button>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" /> Download Template
                </Button>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground">How It Works</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Auto-creates classes as <strong>"Class - Section"</strong></li>
                <li>Assigns students to their respective classes</li>
                <li>If <strong>teacher_name</strong> is provided, auto-assigns teacher to the class</li>
                <li>If teacher details are missing, you can assign them manually after import</li>
                <li>Validates duplicates and skips them</li>
              </ul>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 flex flex-col space-y-4 min-h-0">
            <div className="flex gap-3 flex-wrap">
              <Badge variant="secondary" className="gap-1">Total: {parsed.length} rows</Badge>
              <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Valid: {validCount}
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> Errors: {errorCount}
                </Badge>
              )}
              {hasTeacherData && (
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" /> Teacher data detected
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validations.map((v) => (
                    <TableRow key={v.row.rowNum} className={v.errors.length > 0 ? "bg-destructive/5" : ""}>
                      <TableCell className="text-muted-foreground">{v.row.rowNum}</TableCell>
                      <TableCell className="font-medium">{v.row.student_name || "—"}</TableCell>
                      <TableCell>{v.row.class || "—"}</TableCell>
                      <TableCell>{v.row.section || "—"}</TableCell>
                      <TableCell>{v.row.roll_number || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {v.row.teacher_name ? (
                          <span>{v.row.teacher_name} <span className="text-muted-foreground">({v.row.teacher_role})</span></span>
                        ) : (
                          <span className="text-muted-foreground italic">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {v.errors.length > 0 ? (
                          <span className="text-xs text-destructive">{v.errors[0]}</span>
                        ) : v.warnings.length > 0 ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                Import {validCount} Students
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-12 text-center space-y-4">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-foreground font-medium">Importing students...</p>
            <p className="text-sm text-muted-foreground">Creating classes, assigning students & teachers</p>
          </div>
        )}

        {step === "report" && report && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{report.classesCreated.length}</p>
                <p className="text-xs text-muted-foreground">Classes Created</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{report.studentsAssigned}</p>
                <p className="text-xs text-muted-foreground">Students Assigned</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold text-primary">{report.teachersAssigned}</p>
                <p className="text-xs text-muted-foreground">Teachers Assigned</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold text-amber-500">{report.duplicatesSkipped}</p>
                <p className="text-xs text-muted-foreground">Duplicates Skipped</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{report.errors.length}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {report.classesCreated.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Classes Created</h4>
                <div className="flex flex-wrap gap-2">
                  {report.classesCreated.map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </div>
            )}

            {report.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-destructive mb-2">Errors</h4>
                <ScrollArea className="max-h-[120px] border rounded-lg">
                  <div className="p-3 space-y-1">
                    {report.errors.map((e, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {e.row > 0 && <span className="text-destructive font-medium">Row {e.row}: </span>}
                        {e.message}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end gap-3">
              {unassignedClasses.length > 0 && (
                <Button variant="outline" onClick={() => setStep("teacher-assign")}>
                  <Users className="h-4 w-4 mr-2" /> Assign Teachers ({unassignedClasses.length} classes)
                </Button>
              )}
              <Button onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}

        {step === "teacher-assign" && (
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-foreground font-medium">
                {unassignedClasses.length} class(es) have no teacher assigned. Select teachers below:
              </p>
            </div>

            <ScrollArea className="max-h-[350px]">
              <div className="space-y-4">
                {unassignedClasses.map((uc, idx) => (
                  <div key={uc.classId} className="border border-border rounded-lg p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">{uc.classKey}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Teacher</Label>
                        <Select value={uc.selectedTeacherId} onValueChange={(v) => updateUnassignedClass(idx, "selectedTeacherId", v)}>
                          <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                          <SelectContent>
                            {availableTeachers.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.full_name || "Unnamed"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Role</Label>
                        <Select value={uc.selectedRole} onValueChange={(v) => updateUnassignedClass(idx, "selectedRole", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary</SelectItem>
                            <SelectItem value="subject">Subject</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {uc.selectedRole === "subject" && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Subject</Label>
                          <Select value={uc.selectedSubject} onValueChange={(v) => updateUnassignedClass(idx, "selectedSubject", v)}>
                            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                            <SelectContent>
                              {["Mathematics", "Science", "English", "Hindi", "Social Studies", "Computer Science"].map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep("report")}>Back</Button>
              <Button
                onClick={handleManualTeacherAssign}
                disabled={assigningTeachers || unassignedClasses.every((uc) => !uc.selectedTeacherId)}
              >
                {assigningTeachers ? "Assigning..." : "Assign Teachers"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
