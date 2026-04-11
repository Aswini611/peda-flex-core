import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import PeriodPlanGenerator from "@/components/PeriodPlanGenerator";
import { useSearchParams } from "react-router-dom";
import { useGamification } from "@/hooks/useGamification";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Send, GraduationCap, MessageSquare, Bot, User, Trash2, Users, BookOpen, Lock, Download, Globe, Check, Clock, BookMarked, Wand2, CalendarDays } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import teacherAiAvatar from "@/assets/teacher-ai-avatar.png";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import html2pdf from "html2pdf.js";

const CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `Class ${i + 1}` })),
];

// ─── Custom Markdown Components ───────────────────────────────────────
const MarkdownComponents = {
  h1: ({ node, ...props }: any) => (
    <h1 className="text-xl font-bold mt-6 mb-4 text-foreground border-b-2 border-primary/30 pb-2 flex items-center gap-2" {...props}>
      <span className="inline-block w-1 h-6 bg-gradient-to-b from-primary to-primary/60 rounded-sm"></span>
      {props.children}
    </h1>
  ),
  h2: ({ node, ...props }: any) => (
    <h2 className="text-lg font-bold mt-5 mb-3 text-foreground flex items-center gap-2" {...props}>
      <span className="inline-block w-1 h-5 bg-primary/70 rounded-sm"></span>
      {props.children}
    </h2>
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-base font-semibold mt-4 mb-2 text-foreground/95" {...props}>
      • {props.children}
    </h3>
  ),
  h4: ({ node, ...props }: any) => (
    <h4 className="text-sm font-semibold mt-3 mb-2 text-foreground/90" {...props}>
      {props.children}
    </h4>
  ),
  p: ({ node, ...props }: any) => (
    <p className="text-sm leading-relaxed mb-3 text-foreground/85" {...props}>
      {props.children}
    </p>
  ),
  ul: ({ node, ...props }: any) => (
    <ul className="space-y-2 mb-3 ml-4 list-none" {...props}>
      {props.children}
    </ul>
  ),
  ol: ({ node, ...props }: any) => (
    <ol className="space-y-2 mb-3 ml-4 list-decimal list-inside" {...props}>
      {props.children}
    </ol>
  ),
  li: ({ node, ...props }: any) => (
    <li className="text-sm text-foreground/85 flex gap-2 items-start">
      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
      <span>{props.children}</span>
    </li>
  ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-4 bg-primary/5 italic text-foreground/80 text-sm" {...props}>
      {props.children}
    </blockquote>
  ),
  code: ({ node, inline, ...props }: any) => 
    inline ? (
      <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
    ) : (
      <code className="block bg-foreground/5 border border-border rounded p-3 text-xs overflow-x-auto my-3 text-foreground/80 font-mono" {...props} />
    ),
  pre: ({ node, ...props }: any) => (
    <pre className="block bg-foreground/5 border border-border rounded p-4 overflow-x-auto my-3 text-xs" {...props}>
      {props.children}
    </pre>
  ),
  table: ({ node, ...props }: any) => (
    <table className="w-full border-collapse text-sm my-4" {...props}>
      {props.children}
    </table>
  ),
  thead: ({ node, ...props }: any) => (
    <thead className="bg-primary/10 border-b-2 border-primary/30" {...props}>
      {props.children}
    </thead>
  ),
  th: ({ node, ...props }: any) => (
    <th className="text-left px-3 py-2 font-semibold text-foreground/90" {...props}>
      {props.children}
    </th>
  ),
  td: ({ node, ...props }: any) => (
    <td className="px-3 py-2 border-b border-border text-foreground/85" {...props}>
      {props.children}
    </td>
  ),
  strong: ({ node, ...props }: any) => (
    <strong className="font-bold text-foreground" {...props}>
      {props.children}
    </strong>
  ),
  em: ({ node, ...props }: any) => (
    <em className="italic text-foreground/80" {...props}>
      {props.children}
    </em>
  ),
  a: ({ node, ...props }: any) => (
    <a className="text-primary hover:text-primary/80 underline" {...props}>
      {props.children}
    </a>
  ),
  hr: ({ node, ...props }: any) => (
    <hr className="my-4 border-border" {...props} />
  ),
};

const DEFAULT_SECTIONS = ["A", "B", "C", "D", "E", "F"];

const CURRICULUM_OPTIONS = [
  { value: "ib", label: "Inquiry-Based (IB)" },
  { value: "cbse", label: "5E Instructional Model (CBSE)" },
  { value: "cambridge", label: "Project-Based Learning (Cambridge)" },
  { value: "ai", label: "AI (Auto-detect)" },
];

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
  const { awardXp } = useGamification();
  const [searchParams] = useSearchParams();
  const [selectedClass, setSelectedClass] = useState(searchParams.get("class") || "");
  const [selectedSection, setSelectedSection] = useState(searchParams.get("section") || "");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [topicValue, setTopicValue] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("40");
  
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
      const unique = [...new Set(data.map((d) => (d.section || "").toUpperCase()).filter(Boolean))] as string[];
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

  const userScrolledUp = useRef(false);

  const handleChatScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUp.current = distanceFromBottom > 80;
  }, []);

  useEffect(() => {
    if (!userScrolledUp.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

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
        onDone: async () => {
          setIsStreaming(false);
          if (mode === "generate") {
            setHasGeneratedContent(true);
            awardXp("generate_lesson", "Generated a lesson plan");
            // Save lesson plan to database
            try {
              const classLabel = getClassLabel(selectedClass);
              const subjectLabel = selectedSubject || "General";
              const topicLabel = topicValue.trim() || null;
              const curriculumLabel = CURRICULUM_OPTIONS.find(c => c.value === selectedCurriculum)?.label || selectedCurriculum || "";
              const title = `${classLabel}-${selectedSection} ${subjectLabel}${topicLabel ? ` ${topicLabel}` : ""}`;
              
              // Always create a new lesson plan (no override)
              await supabase.from("lessons").insert({
                title,
                subject: subjectLabel,
                curriculum: selectedCurriculum || "",
                class_level: selectedClass,
                section: selectedSection,
                lesson_content: assistantSoFar,
                ai_generated: true,
                topic: topicLabel,
              } as any);
            } catch (err) {
              console.error("Failed to save lesson plan:", err);
            }
          }
        },
        onError: (msg) => { toast.error(msg); setIsStreaming(false); },
      });
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to connect to AI assistant");
      setIsStreaming(false);
    }
  }, [selectedClass, selectedSection, selectedSubject, chatMessages, isStreaming]);

  const getDurationBreakdown = (mins: number) => {
    const hook = Math.max(3, Math.round(mins * 0.125));
    const assessment = Math.max(3, Math.round(mins * 0.125));
    const closure = Math.max(3, Math.round(mins * 0.15));
    const main = mins - hook - assessment - closure;
    return { hook, main, assessment, closure };
  };

  const handleGeneratePlan = () => {
    const subjectLabel = selectedSubject ? selectedSubject : "";
    const chapterLabel = selectedChapter
      ? chapters.find((c) => c.value === selectedChapter)?.label
      : "";
    const subjectText = subjectLabel ? ` for subject: ${subjectLabel}` : "";
    const chapterText = chapterLabel ? `, Chapter/Unit: "${chapterLabel}"` : "";
    const topicText = topicValue.trim() ? `, Topic: "${topicValue.trim()}"` : "";
    const curriculumLabel = CURRICULUM_OPTIONS.find(c => c.value === selectedCurriculum)?.label || "";
    const curriculumText = curriculumLabel ? ` using ${curriculumLabel} pedagogical framework` : "";
    const duration = parseInt(selectedDuration) || 40;
    const { hook, main, assessment, closure } = getDurationBreakdown(duration);
    sendMessage(
      `Generate a ${duration}-MINUTE LESSON PLAN for ${getClassLabel(selectedClass)} Section ${selectedSection}${subjectText}${chapterText}${topicText}${curriculumText} with ${studentCount} students.

IMPORTANT: The lesson MUST be exactly ${duration} minutes. Structure the timing as:
- Hook/Introduction: ${hook} minutes (Primacy Effect — deliver key concept here)
- Main Teaching: ${main} minutes (use chunked delivery with processing breaks)
- Assessment/Exit Ticket: ${assessment} minutes
- Closure/Revision: ${closure} minutes (Recency Effect — recap here)

Auto-generate 3-5 clear, measurable learning objectives using simple Bloom's taxonomy action verbs aligned with the topic and curriculum.

Generate ONLY the lesson plan (do NOT generate a diagnostic report). Include:
- 6 Lesson Plan Directives: Opener, Core Delivery, Group Activity, Scaffolding Level, Assessment Check, Teacher Tools
- Differentiated activities for each of the 4 VARK groups with 3-tier task cards (Support/Core/Extension)
- Mismatch alerts for at-risk groups
- Exit ticket design across Bloom's levels
- Read the textbook content for this chapter/unit and align all activities to the curriculum
${selectedCurriculum === "ib" ? "- Use Inquiry-Based methodology: K-W-L structure, Socratic questioning, transdisciplinary themes" : ""}${selectedCurriculum === "cbse" ? "- Use 5E Instructional Model: Engage, Explore, Explain, Elaborate, Evaluate with NCERT alignment" : ""}${selectedCurriculum === "cambridge" ? "- Use Project-Based Learning: real-world tasks, success criteria, practical experiments" : ""}${selectedCurriculum === "ai" ? "- Auto-detect the best pedagogical approach based on the subject, class level, and assessment data" : ""}

IMPORTANT: For each VARK learning style group (Visual, Auditory, Read/Write, Kinesthetic), LIST the actual student names that belong to that group based on their assessment data. This helps the teacher quickly assign students to the right group.

Also, whenever you use any advanced or technical word (like ZPD, Bloom's Taxonomy, Primacy Effect, Scaffolding, etc.), ALWAYS add a simple "decode" explanation right after it so that anyone — students, parents, or volunteers — can understand it easily.`,
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
      {/* Hero Header */}
      <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-8 shadow-xl animate-fade-in">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00aDJ2MmgtMnYtMnptLTQgOGgydjJoLTJ2LTJ6bTIgMGgydjJoLTJ2LTJ6bTItNGgydjJoLTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl animate-bounce-slow">
              <Wand2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Lesson Plan Generator</h1>
              <p className="text-white/75 text-sm mt-0.5">AI-powered teaching assistant — generates differentiated lesson plans using class reports & textbooks</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="lesson-plan" className="mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="lesson-plan" className="gap-2">
            <Wand2 className="h-4 w-4" /> Lesson Plan
          </TabsTrigger>
          <TabsTrigger value="period-plan" className="gap-2">
            <CalendarDays className="h-4 w-4" /> Period-wise Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lesson-plan" className="space-y-6 mt-0">
          {/* Configuration Card */}
          <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all duration-500">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <BookMarked className="h-5 w-5" />
                Configure Your Lesson
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="group">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block group-hover:text-primary transition-colors">Select Class</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="transition-all duration-300 hover:border-primary/50 focus:ring-primary/30"><SelectValue placeholder="Choose a class..." /></SelectTrigger>
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
                    <SelectTrigger className="transition-all duration-300 hover:border-primary/50"><SelectValue placeholder={!selectedClass ? "Select a class first..." : "Choose a section..."} /></SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />Section {s}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="group">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block group-hover:text-primary transition-colors">Select Subject</label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass}>
                    <SelectTrigger className="transition-all duration-300 hover:border-primary/50">
                      <SelectValue placeholder={!selectedClass ? "Select a class first..." : subjects.length === 0 ? "No textbooks found" : "Choose a subject..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" />{s.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="group">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block group-hover:text-primary transition-colors">Curriculum</label>
                  <Select value={selectedCurriculum} onValueChange={setSelectedCurriculum}>
                    <SelectTrigger className="transition-all duration-300 hover:border-primary/50"><SelectValue placeholder="Choose curriculum..." /></SelectTrigger>
                    <SelectContent>
                      {CURRICULUM_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />{c.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Topic & Duration row */}
              <div className="mt-5 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] group">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block group-hover:text-primary transition-colors flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" /> Topic (Optional)
                  </label>
                  <Input
                    value={topicValue}
                    onChange={(e) => setTopicValue(e.target.value)}
                    placeholder="e.g. Photosynthesis, Fractions, The Water Cycle..."
                    className="w-full transition-all duration-300 hover:border-primary/50 focus:ring-primary/30"
                  />
                </div>
                <div className="w-[170px] group">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block group-hover:text-primary transition-colors flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Duration
                  </label>
                  <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                    <SelectTrigger className="transition-all duration-300 hover:border-primary/50"><SelectValue placeholder="Duration" /></SelectTrigger>
                    <SelectContent>
                      {[20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90].map((d) => (
                        <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Generate Button */}
              <div className="mt-6 flex items-center gap-3">
                <Button
                  onClick={handleGeneratePlan}
                  disabled={!isReady || isStreaming}
                  size="lg"
                  className="shrink-0 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-base px-8 py-3 rounded-xl"
                >
                  {isStreaming ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="h-5 w-5 mr-2" /> Generate Lesson Plan</>
                  )}
                </Button>
              </div>

              {/* Status Badges */}
              {isReady && (
                <div className="mt-4 flex items-center gap-2 flex-wrap animate-fade-in">
                  <Badge variant="secondary" className="text-xs gap-1 shadow-sm"><GraduationCap className="h-3 w-3" /> {getClassLabel(selectedClass)}</Badge>
                  <Badge variant="outline" className="text-xs gap-1"><Users className="h-3 w-3" /> Section {selectedSection}</Badge>
                  {selectedSubject && (
                    <Badge variant="outline" className="text-xs gap-1"><BookOpen className="h-3 w-3" /> {selectedSubject}</Badge>
                  )}
                  {selectedCurriculum && (
                    <Badge variant="outline" className="text-xs gap-1"><Globe className="h-3 w-3" /> {CURRICULUM_OPTIONS.find(c => c.value === selectedCurriculum)?.label}</Badge>
                  )}
                  {topicValue.trim() && (
                    <Badge className="text-xs gap-1 bg-primary/10 text-primary border-primary/20"><BookMarked className="h-3 w-3" /> {topicValue.trim()}</Badge>
                  )}
                  <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" /> {selectedDuration} min</Badge>
                  <span className="text-xs text-muted-foreground ml-2">
                    {studentCount} student{studentCount !== 1 ? "s" : ""} found • AI will use assessment reports & textbook content
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

      {/* AI Teaching Assistant */}
      <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        {/* Assistant Header */}
        <div className="relative rounded-t-2xl overflow-hidden bg-gradient-to-r from-accent via-accent/90 to-primary p-5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxLjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-60" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl overflow-hidden shadow-lg animate-bounce-slow border-2 border-white/30">
                  <img src={teacherAiAvatar} alt="AI Teacher" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white/30 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  AI Teaching Assistant
                  <span className="text-[10px] font-medium bg-white/20 backdrop-blur-sm text-white/90 px-2 py-0.5 rounded-full uppercase tracking-wider">Online</span>
                </h2>
                <p className="text-white/70 text-xs mt-0.5">Your intelligent co-teacher — ask anything about your class</p>
              </div>
            </div>
            {chatMessages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setChatMessages([]); setHasGeneratedContent(false); }} className="text-white/70 hover:text-white hover:bg-white/10 text-xs gap-1.5 rounded-lg transition-all duration-300">
                <Trash2 className="h-3.5 w-3.5" /> Clear Chat
              </Button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="border-x-2 border-b-2 border-accent/10 rounded-b-2xl bg-card shadow-xl overflow-hidden">
          <div ref={contentRef} onScroll={handleChatScroll} className="min-h-[340px] max-h-[600px] overflow-y-auto p-5 space-y-5" style={{ background: 'linear-gradient(180deg, hsl(var(--muted)/0.15) 0%, hsl(var(--background)) 100%)', overflowAnchor: 'none' }}>
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[300px] text-center animate-fade-in">
                {/* Animated Bot Avatar */}
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-2 border-accent/20">
                    <img src={teacherAiAvatar} alt="AI Teacher" className="w-full h-full object-cover animate-bounce-slow" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-card flex items-center justify-center">
                    <Sparkles className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1.5">Hello, Teacher! 👋</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-1">I'm your AI Teaching Assistant powered by advanced intelligence.</p>
                <p className="text-xs text-muted-foreground/70 max-w-sm mb-6">Select a class & section above, then generate a lesson plan or ask me anything about your students.</p>
                
                {/* Quick Action Cards */}
                {isReady && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-2xl">
                    <button
                      onClick={() => sendMessage(`What are the class-wide weak areas for ${getClassLabel(selectedClass)} Section ${selectedSection} based on the assessment report? Focus on dimensions where the class is struggling overall and avoid mentioning individual student names. Provide a summary of weak dimensions and average performance levels.`, "chat")}
                      disabled={isStreaming}
                      className="group flex flex-col items-center gap-2 p-3.5 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-accent/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-center disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <MessageSquare className="h-4.5 w-4.5 text-red-500" />
                      </div>
                      <span className="text-xs font-medium text-foreground/80">Weak Areas</span>
                    </button>
                    <button
                      onClick={() => {
                        const subjectLabel = selectedSubject ? extractSubjectName(selectedSubject) : "English";
                        sendMessage(`Generate a lesson plan for ${getClassLabel(selectedClass)} Section ${selectedSection} ${subjectLabel} – Chapter 1 based on the class assessment report. Focus on class-wide performance patterns with ${studentCount} students. Do NOT mention individual student names - provide recommendations based on class-level weak areas and average performance metrics. Generate ONLY the lesson plan, not a diagnostic report.`, "generate");
                      }}
                      disabled={isStreaming}
                      className="group flex flex-col items-center gap-2 p-3.5 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-accent/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-center disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="h-4.5 w-4.5 text-blue-500" />
                      </div>
                      <span className="text-xs font-medium text-foreground/80">Ch. 1 Plan</span>
                    </button>
                    <button
                      onClick={() => {
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
                      }}
                      disabled={isStreaming}
                      className="group flex flex-col items-center gap-2 p-3.5 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-accent/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-center disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Wand2 className="h-4.5 w-4.5 text-green-500" />
                      </div>
                      <span className="text-xs font-medium text-foreground/80">Worksheets</span>
                    </button>
                    <button
                      onClick={() => sendMessage(`What teaching strategies would you recommend for ${getClassLabel(selectedClass)} Section ${selectedSection} with ${studentCount} students based on class-wide performance? Focus on class-level interventions and do NOT mention individual student names. Provide actionable teaching strategies for the entire section.`, "chat")}
                      disabled={isStreaming}
                      className="group flex flex-col items-center gap-2 p-3.5 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-accent/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-center disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <GraduationCap className="h-4.5 w-4.5 text-purple-500" />
                      </div>
                      <span className="text-xs font-medium text-foreground/80">Strategies</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className="animate-fade-in">
                <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="shrink-0 w-8 h-8 rounded-xl overflow-hidden shadow-sm border border-accent/10">
                      <img src={teacherAiAvatar} alt="AI Teacher" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className={`rounded-2xl px-5 py-4 max-w-[85%] shadow-sm ${
                    msg.role === "user" 
                      ? "bg-gradient-to-br from-accent to-accent/85 text-white text-sm rounded-br-md" 
                      : "bg-card border border-border/60 rounded-bl-md"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown components={MarkdownComponents}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (<p className="text-sm leading-relaxed">{msg.content}</p>)}
                  </div>
                  {msg.role === "user" && (
                    <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mt-1 shadow-sm">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                {msg.role === "assistant" && (
                  <div className="flex justify-start mt-2.5 ml-11">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDownloadPDF(msg.content, i)}
                      className="text-xs gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 border-green-200 rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/30"
                    >
                      <Download className="h-3.5 w-3.5" /> Download PDF
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {isStreaming && chatMessages[chatMessages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3 animate-fade-in">
                <div className="shrink-0 w-8 h-8 rounded-xl overflow-hidden shadow-sm border border-accent/10">
                  <img src={teacherAiAvatar} alt="AI Teacher" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="bg-card border border-border/60 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border/50 p-4 bg-muted/20">
            <div className="flex gap-2.5 items-center">
              <div className="relative flex-1">
                <Input 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  placeholder={isReady ? `Ask about ${getClassLabel(selectedClass)} Section ${selectedSection}...` : "Select a class and section first..."}
                  disabled={!isReady || isStreaming} 
                  className="pr-4 rounded-xl border-border/60 bg-card focus:ring-accent/30 focus:border-accent/50 transition-all duration-300 h-11" 
                />
              </div>
              <Button 
                onClick={handleSendChat} 
                disabled={!isReady || !inputValue.trim() || isStreaming} 
                size="icon"
                className="h-11 w-11 rounded-xl bg-gradient-to-br from-accent to-accent/85 hover:from-accent/90 hover:to-accent shadow-md hover:shadow-lg hover:scale-[1.05] active:scale-[0.95] transition-all duration-300"
              >
                <Send className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="period-plan" className="mt-0">
          <PeriodPlanGenerator />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Curative;