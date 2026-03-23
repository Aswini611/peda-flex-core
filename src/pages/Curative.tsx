import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Send, GraduationCap, MessageSquare, Bot, User, Trash2, Users, BookOpen, Lock, Download, Globe } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import html2pdf from "html2pdf.js";

const CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `Class ${i + 1}` })),
];

const DEFAULT_SECTIONS = ["A", "B", "C", "D", "E", "F"];

const getClassFolder = (classValue: string): string => {
  const folderMap: Record<string, string> = { nursery: "nursery", lkg: "lkg", ukg: "ukg" };
  for (let i = 1; i <= 10; i++) folderMap[`${i}`] = `class${i}`;
  return folderMap[classValue] || classValue;
};

const extractSubjectName = (filename: string): string => {
  const name = filename.replace(/\.pdf$/i, "").toLowerCase();
  const cleaned = name.replace(/^class\s*\d+\s*/i, "").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TextbookFile {
  fileName: string;
  subject: string;
  chapter: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/curative-assistant`;

async function streamChat({
  selectedClass, section, subject, prompt, mode, chatHistory, onDelta, onDone, onError,
}: {
  selectedClass: string; section: string; subject: string; prompt: string;
  mode: "generate" | "chat"; chatHistory: ChatMessage[];
  onDelta: (text: string) => void; onDone: () => void; onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ selectedClass, section, subject, prompt, mode, chatHistory }),
  });

  if (!resp.ok) {
    let errMsg = "Failed to get AI response";
    try { 
      const errData = await resp.json();
      errMsg = errData.error || errMsg;
    } catch {}
    onError(errMsg);
    return;
  }
  
  if (!resp.body) {
    onError("No response body");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      
      const lines = textBuffer.split("\n");
      textBuffer = lines[lines.length - 1];
      
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line || !line.startsWith("data: ")) continue;
        
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }

    // Process any remaining buffer
    if (textBuffer.trim() && textBuffer.trim().startsWith("data: ")) {
      const jsonStr = textBuffer.slice(6).trim();
      if (jsonStr !== "[DONE]") {
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch (e) {
          // Skip any remaining invalid JSON
        }
      }
    }
  } catch (e: any) {
    onError("Error reading stream: " + e.message);
    return;
  }

  onDone();
}

const Curative = () => {
  const { profile, user } = useAuth();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Authorization check - only teachers can access Curative page
  if (profile?.role !== "teacher") {
    return (
      <AppLayout>
        <PageHeader
          title="Pillar 4: The Curative Phase"
          subtitle="Generate personalized curative lessons"
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Lock className="h-12 w-12 text-danger mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground max-w-md">
              Only teachers can generate and manage curative lessons. Contact your teacher for personalized learning plans.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const getClassLabel = (value: string) => CLASS_OPTIONS.find(c => c.value === value)?.label || value;

  const { data: sections = [] } = useQuery({
    queryKey: ["curative-sections", selectedClass, user?.id],
    queryFn: async () => {
      if (!selectedClass || !user?.id) return DEFAULT_SECTIONS;
      const { data } = await supabase
        .from("student_assessments")
        .select("section")
        .eq("student_class", selectedClass)
        .eq("teacher_id", user.id);
      if (!data || data.length === 0) return DEFAULT_SECTIONS;
      const unique = [...new Set(data.map((d) => d.section).filter(Boolean))] as string[];
      return [...new Set([...unique, ...DEFAULT_SECTIONS])].sort();
    },
    enabled: !!selectedClass && !!user?.id,
  });

  const { data: textbookFiles = [] } = useQuery<TextbookFile[]>({
    queryKey: ["curative-textbooks", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const folder = getClassFolder(selectedClass);
      const { data: files, error } = await supabase.storage.from("textbooks").list(folder);
      if (error || !files) return [];
      return files
        .filter((f) => f.name.endsWith(".pdf"))
        .map<TextbookFile>((f) => {
          const nameWithoutExt = f.name.replace(/\.pdf$/i, "");
          const parts = nameWithoutExt.split(/[-_]/).map((p) => p.trim()).filter(Boolean);
          const subject = parts[0] || extractSubjectName(f.name);
          const chapter = parts.slice(1).join(" - ") || "Full Textbook";
          return {
            fileName: f.name,
            subject: subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase(),
            chapter,
          };
        })
        .sort((a, b) => a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter));
    },
    enabled: !!selectedClass,
  });

  const subjects = useMemo(
    () =>
      Array.from(
        new Map(
          textbookFiles.map((f) => [
            f.subject.toLowerCase(),
            { value: f.subject, label: f.subject },
          ]),
        ).values(),
      ).sort((a, b) => a.label.localeCompare(b.label)),
    [textbookFiles],
  );

  const chapters = useMemo(
    () =>
      selectedSubject
        ? textbookFiles
            .filter((f) => f.subject.toLowerCase() === selectedSubject.toLowerCase())
            .map((f) => ({
              value: f.fileName,
              label: f.chapter,
            }))
        : [],
    [selectedSubject, textbookFiles],
  );

  const { data: studentCount = 0 } = useQuery({
    queryKey: ["curative-student-count", selectedClass, selectedSection, user?.id],
    queryFn: async () => {
      if (!selectedClass || !selectedSection || !user?.id) return 0;
      const { count } = await supabase
        .from("student_assessments")
        .select("id", { count: "exact", head: true })
        .eq("student_class", selectedClass)
        .eq("section", selectedSection)
        .eq("teacher_id", user.id);
      return count || 0;
    },
    enabled: !!selectedClass && !!selectedSection && !!user?.id,
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  useEffect(() => {
    setSelectedSection("");
    setSelectedSubject("");
    setSelectedChapter("");
    setChatMessages([]);
  }, [selectedClass]);

  const sendMessage = useCallback(async (prompt: string, mode: "generate" | "chat") => {
    if (!selectedClass) { toast.error("Please select a class first"); return; }
    if (!selectedSection) { toast.error("Please select a section first"); return; }
    if (isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: prompt };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsStreaming(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setChatMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        selectedClass,
        section: selectedSection,
        subject: selectedChapter || selectedSubject,
        prompt, mode, chatHistory: chatMessages,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => {
          setIsStreaming(false);
          if (mode === "generate") setHasGeneratedContent(true);
        },
        onError: (msg) => { toast.error(msg); setIsStreaming(false); },
      });
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to connect to AI assistant");
      setIsStreaming(false);
    }
  }, [selectedClass, selectedSection, selectedSubject, chatMessages, isStreaming]);

  const handleGeneratePlan = () => {
    const subjectLabel = selectedSubject ? selectedSubject : "";
    const chapterLabel = selectedChapter
      ? chapters.find((c) => c.value === selectedChapter)?.label
      : "";
    const subjectText = subjectLabel ? ` for subject: ${subjectLabel}` : "";
    const chapterText = chapterLabel ? `, Chapter/Unit: "${chapterLabel}"` : "";
    sendMessage(
      `Generate a LESSON PLAN for ${getClassLabel(selectedClass)} Section ${selectedSection}${subjectText}${chapterText} with ${studentCount} students.

Generate ONLY the lesson plan (do NOT generate a diagnostic report — the diagnostic is handled separately). Include:
- 6 Lesson Plan Directives: Opener, Core Delivery, Group Activity, Scaffolding Level, Assessment Check, Teacher Tools
- Differentiated activities for each of the 4 VARK groups with 3-tier task cards (Support/Core/Extension)
- Mismatch alerts for at-risk groups
- Exit ticket design across Bloom's levels
- Read the textbook content for this chapter/unit and align all activities to the curriculum

Do NOT mention individual student names. Focus on class-wide patterns and actionable teaching strategies.`,
      "generate",
    );
  };

  const handleDownloadPDF = (messageContent: string, messageIndex: number) => {
    const timestamp = new Date().toLocaleString('en-US', { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    }).replace(/[/:]/g, '-');
    
    const filename = `APAS-LessonPlan-${getClassLabel(selectedClass)}-Section${selectedSection}-${timestamp}.pdf`;
    
    // Convert markdown to structured HTML
    let html = messageContent;
    
    // Tables
    html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (match, header, sep, body) => {
      const headerCells = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map((row: string) => {
        const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
    });
    
    // Headings
    html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Blockquotes
    html = html.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
    
    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    
    // Lists
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.*?)$/gm, '<li>$1. $2</li>');
    
    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul>$1</ul>');
    
    // Paragraphs
    html = html.split('\n\n').map(para => {
      const trimmed = para.trim();
      if (!trimmed || trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<table') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr')) return trimmed;
      return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
      <div class="report">
        <div class="header">
          <div class="header-left">
            <div class="brand">APAS <span>Lesson Plan</span></div>
            <div class="report-label">Differentiated Lesson Plan</div>
          </div>
          <div class="header-right">
            <div class="report-date">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div class="status-badge">AI Generated</div>
          </div>
        </div>

        <div class="learner-card">
          <div class="lc-field">
            <label>Class</label>
            <value>${getClassLabel(selectedClass)}</value>
            <small>Section ${selectedSection}</small>
          </div>
          <div class="lc-field">
            <label>Subject</label>
            <value>${selectedSubject || 'General'}</value>
            <small>${studentCount} students</small>
          </div>
          <div class="lc-field">
            <label>Report Type</label>
            <value>Lesson Plan</value>
            <small>Differentiated</small>
          </div>
        </div>

        <div class="content">
          ${html}
        </div>

        <div class="footer">
          <div class="footer-note">This report is auto-generated by the APAS AI engine. For academic use only.</div>
          <div class="footer-apas">APAS · ${new Date().getFullYear()}</div>
        </div>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .report { max-width: 780px; margin: 0 auto; padding: 28px 24px; font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif; color: #1a1a2e; line-height: 1.6; font-size: 12px; }
      
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid #1a1a2e; }
      .brand { font-family: 'DM Serif Display', Georgia, serif; font-size: 24px; color: #1a1a2e; letter-spacing: -0.5px; }
      .brand span { color: #0e9a7b; font-style: italic; }
      .report-label { font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #6b6b8a; margin-top: 4px; }
      .header-right { text-align: right; }
      .report-date { font-size: 12px; font-weight: 500; color: #3a3a5c; }
      .status-badge { display: inline-block; background: #0e9a7b; color: white; font-size: 9px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; margin-top: 4px; }
      
      .learner-card { background: #1a1a2e; color: white; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
      .lc-field label { font-size: 9px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.45); display: block; margin-bottom: 3px; }
      .lc-field value { font-family: 'DM Serif Display', Georgia, serif; font-size: 16px; color: white; display: block; }
      .lc-field small { font-size: 11px; color: rgba(255,255,255,0.55); }
      
      .content { }
      .content h1 { font-family: 'DM Serif Display', Georgia, serif; font-size: 18px; color: #1a1a2e; margin: 24px 0 10px 0; padding-bottom: 6px; border-bottom: 2px solid #0e9a7b; }
      .content h2 { font-family: 'DM Serif Display', Georgia, serif; font-size: 15px; color: #1a1a2e; margin: 20px 0 8px 0; padding-left: 12px; border-left: 4px solid #0e9a7b; }
      .content h3 { font-size: 13px; font-weight: 600; color: #3a3a5c; margin: 16px 0 6px 0; }
      .content h4 { font-size: 12px; font-weight: 600; color: #6b6b8a; margin: 12px 0 4px 0; }
      .content p { margin: 6px 0; text-align: justify; color: #3a3a5c; }
      .content strong { color: #1a1a2e; font-weight: 600; }
      .content em { font-style: italic; color: #6b6b8a; }
      
      .content ul { list-style: none; margin: 6px 0 6px 0; padding: 0; }
      .content ul li { position: relative; padding: 3px 0 3px 18px; color: #3a3a5c; }
      .content ul li::before { content: '→'; position: absolute; left: 0; color: #0e9a7b; font-weight: 600; }
      
      .content table { width: 100%; border-collapse: collapse; margin: 10px 0 14px 0; font-size: 11px; }
      .content table th { text-align: left; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #6b6b8a; padding: 8px 10px; border-bottom: 2px solid #e2e0d8; background: #f7f5f0; }
      .content table td { padding: 7px 10px; border-bottom: 1px solid #e2e0d8; color: #3a3a5c; vertical-align: top; }
      .content table tr:last-child td { border-bottom: none; }
      
      .content blockquote { background: linear-gradient(135deg, #fff1ee 0%, #fffbeb 100%); border-left: 4px solid #e55a3c; border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 12px 0; font-size: 12px; color: #3a3a5c; }
      
      .content hr { border: none; border-top: 1px solid #e2e0d8; margin: 16px 0; }
      
      .footer { border-top: 1px solid #e2e0d8; padding-top: 12px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
      .footer-note { font-size: 10px; color: #6b6b8a; }
      .footer-apas { font-family: 'DM Serif Display', Georgia, serif; font-size: 13px; color: #3a3a5c; font-style: italic; }
    `;
    tempDiv.appendChild(style);
    
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#f7f5f0' },
      jsPDF: { orientation: 'portrait' as const, unit: 'mm' as const, format: 'a4' as const, compress: true },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };
    
    html2pdf().set(opt).from(tempDiv).save();
    toast.success('PDF downloaded successfully!');
  };

  const handleSendChat = () => { if (!inputValue.trim()) return; sendMessage(inputValue.trim(), "chat"); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); }
  };

  const isReady = !!selectedClass && !!selectedSection;

  return (
    <AppLayout>
      <PageHeader title="Lesson Plan Generator" subtitle="AI-powered teaching assistant — generates differentiated lesson plans using class reports & textbooks" />

      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Select Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Choose a class..." /></SelectTrigger>
                <SelectContent>
                  {CLASS_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" />{c.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Select Section</label>
              <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                <SelectTrigger><SelectValue placeholder={!selectedClass ? "Select a class first..." : "Choose a section..."} /></SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />Section {s}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Select Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedClass
                        ? "Select a class first..."
                        : subjects.length === 0
                          ? "No textbooks found"
                          : "Choose a subject..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5" />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            <Button onClick={handleGeneratePlan} disabled={!isReady || isStreaming} className="shrink-0">
              {isStreaming ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>) : (<><Sparkles className="h-4 w-4 mr-2" /> Generate Lesson Plan</>)}
            </Button>
          </div>

          {isReady && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs gap-1"><GraduationCap className="h-3 w-3" /> {getClassLabel(selectedClass)}</Badge>
              <Badge variant="outline" className="text-xs gap-1"><Users className="h-3 w-3" /> Section {selectedSection}</Badge>
              {selectedSubject && (
                <Badge variant="outline" className="text-xs gap-1">
                  <BookOpen className="h-3 w-3" /> {selectedSubject}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-2">
                {studentCount} student{studentCount !== 1 ? "s" : ""} found • AI will use assessment reports & textbook
                content
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> AI Teaching Assistant</CardTitle>
          {chatMessages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setChatMessages([]); setHasGeneratedContent(false); }} className="text-xs gap-1"><Trash2 className="h-3 w-3" /> Clear</Button>
          )}
        </CardHeader>
        <CardContent>
          <div ref={contentRef} className="min-h-[300px] max-h-[500px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-4 mb-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[260px] text-center">
                <Bot className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-sm font-semibold mb-1">AI Teaching Assistant</h3>
                <p className="text-xs text-muted-foreground max-w-sm">Select a class, section, and subject above, then click "Generate Lesson Plan" or ask any question.</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {isReady && (
                    <>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(`What are the class-wide weak areas for ${getClassLabel(selectedClass)} Section ${selectedSection} based on the assessment report? Focus on dimensions where the class is struggling overall and avoid mentioning individual student names. Provide a summary of weak dimensions and average performance levels.`, "chat")} disabled={isStreaming}>Show weak areas</Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                        const subjectLabel = selectedSubject ? extractSubjectName(selectedSubject) : "English";
                        sendMessage(`Generate a lesson plan for ${getClassLabel(selectedClass)} Section ${selectedSection} ${subjectLabel} – Chapter 1 based on the class assessment report. Focus on class-wide performance patterns with ${studentCount} students. Do NOT mention individual student names - provide recommendations based on class-level weak areas and average performance metrics. Generate ONLY the lesson plan, not a diagnostic report.`, "generate");
                      }} disabled={isStreaming}>Lesson plan for Ch. 1</Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                        const subjectLabel = selectedSubject ? extractSubjectName(selectedSubject) : "English";
                        sendMessage(`Create a comprehensive practice worksheet package for ${getClassLabel(selectedClass)} Section ${selectedSection} ${subjectLabel} with MINIMUM 5 PAGES structured as follows:

PAGE 1 - Foundation Skills: 2-3 activities targeting basic skills (visual recognition, sound identification, letter matching, tracing)

PAGE 2 - Word Building: 2-3 activities (fill-in-vowels, word scramble, word formation, CVC words)

PAGE 3 - Comprehension & Grammar: 2-3 activities (sentence completion, structure recognition, reading comprehension)

PAGE 4 - Application & Practice: 2-3 activities (context-based exercises, sentence formation, practical usage)

PAGE 5 - Assessment & Extension: 2-3 activities (assessment questions, challenge activities, creative tasks)

REQUIREMENTS:
- Each page must have different activity types
- Include diverse formats: fill-in-the-blank, matching, multiple choice, tracing, word scramble, sentence completion, picture labeling, sorting, true/false, short answer
- Each activity needs clear title, step-by-step instructions, and examples
- Focus on weak dimensions identified in the assessment report
- Appropriate for ${studentCount} students in the class
- Do NOT mention individual student names
- Include a COMPLETE ANSWER KEY at the end covering all pages
- Professional formatting with clear section breaks between pages`, "generate");
                      }} disabled={isStreaming}>Generate Worksheets</Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(`What teaching strategies would you recommend for ${getClassLabel(selectedClass)} Section ${selectedSection} with ${studentCount} students based on class-wide performance? Focus on class-level interventions and do NOT mention individual student names. Provide actionable teaching strategies for the entire section.`, "chat")} disabled={isStreaming}>Teaching strategies</Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i}>
                <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5"><Bot className="h-4 w-4 text-primary" /></div>
                  )}
                  <div className={`rounded-lg px-4 py-3 max-w-[85%] text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    ) : (<p>{msg.content}</p>)}
                  </div>
                  {msg.role === "user" && (
                    <div className="shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center mt-0.5"><User className="h-4 w-4 text-primary-foreground" /></div>
                  )}
                </div>
                {msg.role === "assistant" && (
                  <div className="flex justify-start mt-2 ml-10">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDownloadPDF(msg.content, i)}
                      className="text-xs gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <Download className="h-3 w-3" /> Download as PDF
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {isStreaming && chatMessages[chatMessages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
                <div className="bg-card border border-border rounded-lg px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex gap-2">
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={isReady ? `Ask about ${getClassLabel(selectedClass)} Section ${selectedSection} curriculum, textbooks...` : "Select a class and section first..."}
              disabled={!isReady || isStreaming} className="flex-1" />
            <Button onClick={handleSendChat} disabled={!isReady || !inputValue.trim() || isStreaming} size="icon"><Send className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Curative;