import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { selectedClass, section, subject, prompt, mode, chatHistory } = await req.json();

    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    if (!GROK_API_KEY) throw new Error("GROK_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch class + section assessment reports
    let assessmentContext = "";
    let normalizedClass = selectedClass;
    if (selectedClass.startsWith("Class ")) {
      normalizedClass = selectedClass.replace("Class ", "");
    }

    let query = supabase
      .from("student_assessments")
      .select("student_name, student_age, age_group, responses, student_class, section")
      .or(`student_class.eq.${normalizedClass},student_class.eq.${selectedClass}`);

    if (section) {
      query = query.eq("section", section);
    }

    const { data: assessments } = await query;

    // 1b. Fetch academic test results for matching class & subject
    let academicContext = "";
    {
      let academicQuery = supabase
        .from("academic_tests")
        .select("student_id, subject, score, total_questions, completed_at, student_class")
        .or(`student_class.eq.${normalizedClass},student_class.eq.${selectedClass}`)
        .order("completed_at", { ascending: false })
        .limit(100);

      const { data: academicTests } = await academicQuery;

      if (academicTests && academicTests.length > 0) {
        // Filter by subject if provided
        const subjectLower = (subject || "").toLowerCase().replace(/\.pdf$/i, "").trim();
        const relevantTests = subjectLower
          ? academicTests.filter((t: any) => t.subject.toLowerCase().includes(subjectLower) || subjectLower.includes(t.subject.toLowerCase()))
          : academicTests;

        if (relevantTests.length > 0) {
          const avgScore = (relevantTests.reduce((sum: number, t: any) => sum + (t.total_questions > 0 ? (t.score / t.total_questions) * 100 : 0), 0) / relevantTests.length).toFixed(1);
          const subjectBreakdown: Record<string, { total: number; count: number }> = {};
          for (const t of relevantTests) {
            const s = t.subject;
            if (!subjectBreakdown[s]) subjectBreakdown[s] = { total: 0, count: 0 };
            subjectBreakdown[s].total += t.total_questions > 0 ? (t.score / t.total_questions) * 100 : 0;
            subjectBreakdown[s].count++;
          }

          academicContext = `\n\nACADEMIC TEST RESULTS for ${selectedClass} (${relevantTests.length} tests):
- Average Score: ${avgScore}%
- Subject Performance:
${Object.entries(subjectBreakdown).map(([subj, data]) => `  ${subj}: ${(data.total / data.count).toFixed(1)}% avg (${data.count} tests)`).join("\n")}
- Recent Tests: ${relevantTests.slice(0, 5).map((t: any) => `${t.subject}: ${t.score}/${t.total_questions} (${((t.score / t.total_questions) * 100).toFixed(0)}%)`).join(", ")}

IMPORTANT: Use these academic test results to identify specific topics where students are struggling. Focus the lesson plan on reinforcing weak areas revealed by test scores. If a subject average is below 60%, prioritize foundational concepts. If above 80%, introduce extension activities.`;
        }
      }
    }

    if (assessments && assessments.length > 0) {
      const studentSummaries = assessments.map((a: any) => {
        const responses = a.responses as Record<string, number>;
        const entries = Object.entries(responses);
        const scores = entries.map(([k, v]) => `${k}: ${v}`).join(", ");
        const values = entries.map(([, v]) => v as number);
        const avg = values.length > 0 ? (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1) : "N/A";
        return {
          name: a.student_name, age: a.student_age, section: a.section || "N/A",
          scores: responses, avgScore: avg,
          summary: `Student: ${a.student_name}, Age: ${a.student_age}, Section: ${a.section || "N/A"}, Avg Score: ${avg}, Scores: {${scores}}`,
        };
      });

      const allDimensions: Record<string, number[]> = {};
      for (const s of studentSummaries) {
        for (const [dim, val] of Object.entries(s.scores)) {
          if (!allDimensions[dim]) allDimensions[dim] = [];
          allDimensions[dim].push(val as number);
        }
      }

      const dimensionAverages = Object.entries(allDimensions).map(([dim, vals]) => {
        const avg = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
        return { dimension: dim, average: parseFloat(avg), count: vals.length };
      }).sort((a, b) => a.average - b.average);

      const weakAreas = dimensionAverages.filter((d) => d.average < 3).map((d) => d.dimension);
      const strongAreas = dimensionAverages.filter((d) => d.average >= 4).map((d) => d.dimension);
      const moderateAreas = dimensionAverages.filter((d) => d.average >= 3 && d.average < 4).map((d) => d.dimension);

      assessmentContext = `CLASS ASSESSMENT REPORT for ${selectedClass} Section ${section || "All"} (${assessments.length} students):

CLASS-LEVEL ANALYSIS:
- Total Students: ${assessments.length}
- Weak Areas (avg < 3): ${weakAreas.length > 0 ? weakAreas.join(", ") : "None identified"}
- Moderate Areas (avg 3-4): ${moderateAreas.length > 0 ? moderateAreas.join(", ") : "None"}
- Strong Areas (avg >= 4): ${strongAreas.length > 0 ? strongAreas.join(", ") : "None"}

DIMENSION AVERAGES (sorted weakest to strongest):
${dimensionAverages.map((d) => `  ${d.dimension}: ${d.average}/5`).join("\n")}

INDIVIDUAL STUDENT DATA:
${studentSummaries.map((s) => s.summary).join("\n")}`;
    } else {
      assessmentContext = `No assessment reports found for ${selectedClass} Section ${section || "any"}.`;
    }

    // 2. Get textbook list and extract PDF content for matched subject
    let textbookContext = "";
    const classFolder = (() => {
      const folderMap: Record<string, string> = { Nursery: "nursery", LKG: "lkg", UKG: "ukg" };
      for (let i = 1; i <= 10; i++) folderMap[`Class ${i}`] = `class${i}`;
      for (let i = 1; i <= 10; i++) folderMap[`${i}`] = `class${i}`;
      return folderMap[selectedClass] || selectedClass.toLowerCase().replace(/\s+/g, "");
    })();

    const { data: files } = await supabase.storage.from("textbooks").list(classFolder);

    if (files && files.length > 0) {
      const pdfFiles = files.filter((f: any) => f.name.endsWith(".pdf"));
      if (pdfFiles.length > 0) {
        textbookContext = `Available textbooks for ${selectedClass}: ${pdfFiles.map((f: any) => f.name).join(", ")}`;
        
        // Identify the selected/detected subject textbook
        let matchedName: string | null = null;
        if (subject) {
          const match = pdfFiles.find((f: any) => f.name === subject);
          if (match) matchedName = match.name;
        }
        if (!matchedName) {
          const promptLower = (prompt || "").toLowerCase();
          const subjectKeywords = ["english", "maths", "math", "hindi", "urdu", "science", "social", "arts", "sanskrit", "economics", "computer"];
          const detected = subjectKeywords.find((s) => promptLower.includes(s));
          if (detected) {
            const subjectMatch = detected === "math" ? "maths" : detected;
            const match = pdfFiles.find((f: any) => f.name.toLowerCase().includes(subjectMatch));
            if (match) matchedName = match.name;
          }
        }

        // Download and extract actual PDF text content
        if (matchedName) {
          textbookContext += `\nSelected textbook: ${matchedName}. Use your internal knowledge of NCERT/CBSE/Cambridge curriculum content for this subject and class level to inform lesson plans. Align activities with standard textbook chapters and topics.`;
        }
      }
    }

    // 3. Build compact prompts to stay within Groq TPM limits
    const requestedTopic =
      prompt?.match(/Topic:\s*"([^"]+)"/i)?.[1]?.trim() ||
      prompt?.match(/Topic:\s*([^\n]+)/i)?.[1]?.trim() ||
      "";
    const requestedPeriods = prompt?.match(/TOTAL PERIODS:\s*(\d+)/i)?.[1] || "1";
    const requestedDuration = prompt?.match(/PERIOD DURATION:\s*(\d+)/i)?.[1] || "40";
    const requestedFramework =
      prompt?.match(/using\s+(.+?)\s+pedagogical framework/i)?.[1]?.trim() ||
      prompt?.match(/framework[:\s-]+([^\n]+)/i)?.[1]?.trim() ||
      "teacher-selected";

    const compactAssessmentContext = assessmentContext.split("\n").slice(0, 18).join("\n").trim();
    const compactAcademicContext = academicContext.split("\n").slice(0, 8).join("\n").trim();
    const compactTextbookContext = textbookContext.split("\n").slice(0, 3).join("\n").trim();

    const generateSystemPrompt = `You are APAS, an educational AI that creates practical lesson plans for teachers.

Use this context when relevant:
${compactAssessmentContext}

${compactAcademicContext}

${compactTextbookContext}

Generate ONLY the lesson plan.

Rules:
- Follow the teacher's requested class, section, subject, topic, framework, number of periods, and period duration.
- Keep the language simple, teacher-friendly, and actionable.
- Include differentiated group work with Visual, Auditory, Read/Write, and Kinesthetic groups.
- When possible, assign actual student names to the VARK groups based on the assessment context.
- Include support/core/extension tasks.
- Include exactly ONE exit ticket section per period. Never duplicate the exit ticket.
- End with Learning Outcomes, then a Word Decoder section that explains technical terms in simple language.
- Use textbook alignment when textbook context is available.
- If some data is missing, make a sensible classroom-ready plan without mentioning missing data.`;

    const chatSystemPrompt = `You are APAS, a helpful teaching assistant. Use the available class, assessment, academic, and textbook context to answer clearly and briefly with actionable guidance.`;

    const systemPrompt = mode === "generate" ? generateSystemPrompt : chatSystemPrompt;

    // 4. Build messages — for generate mode, use a compact normalized prompt to avoid Groq TPM limits
    const openaiMessages: any[] = [{ role: "system", content: systemPrompt }];
    if (mode !== "generate" && chatHistory && Array.isArray(chatHistory)) {
      const recent = chatHistory.slice(-4);
      for (const msg of recent) openaiMessages.push({ role: msg.role, content: msg.content });
    }

    if (mode === "generate") {
      const generateUserPrompt = `Create a complete lesson plan for Class ${selectedClass}${section ? ` Section ${section}` : ""}.
Subject: ${subject || "General"}
Topic: ${requestedTopic || "Teacher-selected topic"}
Framework: ${requestedFramework}
Total periods: ${requestedPeriods}
Period duration: ${requestedDuration} minutes

Requirements:
- Use the requested teaching framework.
- Cover the topic completely within the requested periods.
- Include learning objectives, hook, main teaching, group activities, quick check, closure, one exit ticket, BBL checklist, learning outcomes, and a word decoder.
- Keep activities specific and classroom-ready.
- Include actual student names in VARK groups when supported by the context.`;

      openaiMessages.push({
        role: "user",
        content: generateUserPrompt,
      });
    } else {
      openaiMessages.push({ role: "user", content: prompt });
    }

    console.log("Calling Grok API with model: llama-3.3-70b-versatile, messages count:", openaiMessages.length);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 2200,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Grok API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "API credits exhausted. Please check your Grok API account." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `Grok API error (${response.status}): ${errorText.substring(0, 200)}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Grok API response successful, streaming started");
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown error";
    console.error("curative-assistant error:", errorMsg, e);
    return new Response(JSON.stringify({ error: `Error: ${errorMsg}. Please try again.` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
