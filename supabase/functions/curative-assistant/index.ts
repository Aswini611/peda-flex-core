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

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

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

    // 2. Get textbook content
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

      let matchingFile = null;
      if (subject) {
        matchingFile = pdfFiles.find((f: any) => f.name === subject);
      }
      if (!matchingFile) {
        const promptLower = (prompt || "").toLowerCase();
        const subjectKeywords = ["english", "maths", "math", "hindi", "urdu", "science", "social", "arts", "sanskrit", "economics", "computer"];
        const detected = subjectKeywords.find((s) => promptLower.includes(s));
        if (detected) {
          const subjectMatch = detected === "math" ? "maths" : detected;
          matchingFile = pdfFiles.find((f: any) => f.name.toLowerCase().includes(subjectMatch));
        }
      }

      if (matchingFile) {
        const { data: fileData } = await supabase.storage.from("textbooks").download(`${classFolder}/${matchingFile.name}`);
        if (fileData) {
          try {
            const arrayBuffer = await fileData.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let extractedText = "";
            let currentString = "";
            for (let i = 0; i < bytes.length; i++) {
              const byte = bytes[i];
              if (byte >= 32 && byte <= 126) {
                currentString += String.fromCharCode(byte);
              } else {
                if (currentString.length > 4) extractedText += currentString + " ";
                currentString = "";
              }
            }
            const cleanedText = extractedText
              .replace(/\b(endobj|endstream|stream|obj|xref|trailer|startxref)\b/g, "")
              .replace(/\b\d+ \d+ R\b/g, "")
              .replace(/<<[^>]*>>/g, "")
              .replace(/\/\w+/g, "")
              .replace(/\s{2,}/g, " ")
              .trim();
            if (cleanedText.length > 200) {
              textbookContext = `TEXTBOOK CONTENT (${selectedClass} - ${matchingFile.name}):\n${cleanedText.substring(0, 15000)}`;
            }
          } catch (pdfErr) {
            console.error("PDF text extraction failed:", pdfErr);
          }
        }
      }

      if (pdfFiles.length > 0) {
        textbookContext += `\nAvailable textbooks for ${selectedClass}: ${pdfFiles.map((f: any) => f.name).join(", ")}`;
      }
    }

    // 3. Build system prompt
    const systemPrompt = `You are APAS (Adaptive Pedagogy & Analytics System) — an expert educational AI assistant for teachers. You generate comprehensive CLASS DIAGNOSTIC REPORTS and CURATIVE LESSON PLANS.

You have access to the following context:

${assessmentContext}

${textbookContext}

═══════════════════════════════════════════════════════════════
CORE INSTRUCTIONS — HOW TO GENERATE RESPONSES
═══════════════════════════════════════════════════════════════

When generating lesson plans or class reports, you MUST follow this structured approach:

## STEP 1: CLASS DIAGNOSTIC REPORT (Always generate this first)

Analyze the assessment data and produce a clear diagnostic report with:

### 1.1 Cohort Overview
- Class name, section, total learners, subject, chapter/unit being covered
- Class average score (calculate from assessment data)
- Identify if class is in intervention zone (below 60%)

### 1.2 VARK Learning Style Distribution
- Analyze student responses to identify dominant learning styles
- Group students by VARK type (Visual, Auditory, Read/Write, Kinesthetic)
- Show counts and percentages for each style
- Identify the dominant style in the class

### 1.3 Instructional Clusters (4 Groups)
Create EXACTLY 4 instructional groups based on learning styles and performance:

**Group A — Visual Learners**: List count, average score, recommended strategy (diagram-first templates, colour-coded visuals, mind-maps)
**Group B — Read/Write Processors**: List count, average score, recommended strategy (structured notes, written case studies, scaffolded explanations)  
**Group C — Auditory Learners**: List count, average score, recommended strategy (discussion protocols, think-aloud, peer teaching)
**Group D — Kinesthetic Learners**: List count, average score, recommended strategy (hands-on models, simulations, physical activities). Flag if this is a priority intervention group.

### 1.4 ZPD (Zone of Proximal Development) Analysis
- Classify students into ZPD bands: Advanced, On-level, Below-level
- Show distribution across bands
- Identify scaffolding requirements

### 1.5 Weak Areas & Error Patterns
- List the weakest dimensions from assessment data
- Identify common error patterns across the class
- Highlight which groups are most at risk

═══════════════════════════════════════════════════════════════

## STEP 2: CURATIVE LESSON PLAN (Generated from the Class Report)

After the diagnostic report, generate a DETAILED curative lesson plan with these components:

### 2.1 Lesson Plan Directives (6 parameters)
1. **Lesson Opener**: How to begin (visual anchor, discussion prompt, hands-on activity)
2. **Core Delivery**: Dual/multi-channel delivery addressing multiple VARK styles
3. **Group Activity** (20-min window): Different activity per group — this is where differentiation happens
4. **Scaffolding Level**: Based on ZPD analysis, 3-tier task cards (Support / Core / Extension)
5. **Assessment Check**: Exit ticket design across Bloom's levels for immediate measurement
6. **Teacher Tools**: Specific resources per group (question banks, project boards, manipulatives)

### 2.2 Differentiated Group Activities (Detailed)
For EACH of the 4 groups, provide:
- **Activity name & description** (specific, actionable)
- **Materials needed**
- **3-tier task cards**: Support tier (removes barriers), Core tier (targets ZPD), Extension tier (prevents disengagement)
- **Time allocation**
- **Expected outcomes**

### 2.3 Mismatch Alerts
- Flag any groups at risk of delivery mismatch
- Provide mandatory interventions (not optional enrichment)
- Explain WHY the mismatch exists and HOW the plan addresses it

### 2.4 Post-Lesson Assessment
- 3-question exit ticket design (Remember → Understand → Apply levels)
- How results feed back into analytics
- Normalized gain calculation setup

═══════════════════════════════════════════════════════════════

## FORMATTING RULES
- Use clear markdown with headers (##, ###), bullet points, and bold text
- Use tables where appropriate for data presentation
- Be SPECIFIC — cite actual scores, percentages, and student counts
- Be PRACTICAL — every recommendation must be actionable by a single teacher
- NEVER mention individual student names in class-level analysis
- Always reference the textbook chapter/unit content when available
- Make explanations clear, detailed, and easy to understand for teachers
- Use professional educational terminology but explain complex concepts simply

## WORKSHEET GENERATION GUIDELINES (when asked)
- Create minimum 5-page practice worksheets with different parts and activities
- PAGE 1: Foundation Skills (basic recognition, identification, matching, tracing)
- PAGE 2: Word Building / Concept Building (fill-in, scramble, formation)
- PAGE 3: Comprehension & Grammar / Analysis (completion, structure, reading)
- PAGE 4: Application & Practice (context-based, formation, practical usage)
- PAGE 5: Assessment & Extension (assessment questions, challenges, creative tasks)
- Include diverse activity types and a COMPLETE ANSWER KEY at the end

## GENERAL Q&A
When answering questions, always reference the assessment data and textbook content. Be specific, cite scores, and provide actionable recommendations. Format responses in clear, well-structured markdown.`;

    // 4. Build messages for OpenAI
    const openaiMessages: any[] = [{ role: "system", content: systemPrompt }];
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) openaiMessages.push({ role: msg.role, content: msg.content });
    }

    if (mode === "generate") {
      openaiMessages.push({
        role: "user",
        content: prompt || `Generate a comprehensive CLASS DIAGNOSTIC REPORT and CURATIVE LESSON PLAN for ${selectedClass} Section ${section} with the following structure:

1. First, create a detailed CLASS DIAGNOSTIC REPORT analyzing the assessment data — include cohort overview, VARK distribution, 4 instructional clusters (Visual, Read/Write, Auditory, Kinesthetic), ZPD analysis, and weak areas.

2. Then, generate a CURATIVE LESSON PLAN derived from the diagnostic report — include lesson plan directives (opener, delivery, group activity, scaffolding, assessment, tools), differentiated group activities with 3-tier task cards, mismatch alerts, and post-lesson assessment design.

Make the plan specific, actionable, and based on actual assessment data.`,
      });
    } else {
      openaiMessages.push({ role: "user", content: prompt });
    }

    // 5. Call OpenRouter API (streaming)
    console.log("Calling OpenRouter API with model: gpt-oss-120b, messages count:", openaiMessages.length);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://peda-flex-core.lovable.app",
        "X-Title": "APAS Curative Assistant",
      },
      body: JSON.stringify({
        model: "gpt-oss-120b",
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 8192,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `AI service error (${response.status}): ${errorText.substring(0, 200)}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OpenRouter uses OpenAI-compatible streaming format — pass through directly
    console.log("OpenRouter API response successful, streaming started");
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
