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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    // 2. Get textbook content - use explicitly selected subject or detect from prompt
    let textbookContext = "";
    const classFolder = (() => {
      const folderMap: Record<string, string> = { Nursery: "nursery", LKG: "lkg", UKG: "ukg" };
      for (let i = 1; i <= 10; i++) folderMap[`Class ${i}`] = `class${i}`;
      // Also map raw values like "1", "2" etc.
      for (let i = 1; i <= 10; i++) folderMap[`${i}`] = `class${i}`;
      return folderMap[selectedClass] || selectedClass.toLowerCase().replace(/\s+/g, "");
    })();

    const { data: files } = await supabase.storage.from("textbooks").list(classFolder);

    if (files && files.length > 0) {
      const pdfFiles = files.filter((f: any) => f.name.endsWith(".pdf"));

      // Determine which file to use: explicit subject selection or auto-detect from prompt
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
    const systemPrompt = `You are an expert educational AI assistant for teachers. You help generate curative lesson plans and answer questions about class curricula.

You have access to the following context:

${assessmentContext}

${textbookContext}

INSTRUCTIONS:
- When generating lesson plans, carefully analyze the class assessment data to identify weak areas and strengths.
- Use the CLASS-LEVEL ANALYSIS to understand which dimensions need curative attention.
- Base your lesson plans on the textbook content when available.
- Curative strategies should specifically target the weak areas found in the class assessment reports.
- Always structure lesson plans with: Learning Objectives, Teaching Activities, Curative Strategies (based on weak areas), Practice Questions, and Assessment Methods.

WORKSHEET GENERATION GUIDELINES:
- Create minimum 5-page practice worksheets with different parts and activities on each page.
- PAGE 1: Foundation Skills (basic recognition, identification, letter matching, tracing)
- PAGE 2: Word Building (fill-in-vowels, word scramble, word formation, CVC words)
- PAGE 3: Comprehension & Grammar (sentence completion, structure recognition, reading comprehension)
- PAGE 4: Application & Practice (context-based exercises, sentence formation, practical usage)
- PAGE 5: Assessment & Extension (assessment questions, challenge activities, creative tasks)
- Use diverse activity types across pages: fill-in-blank, matching, multiple choice, tracing, scramble, completion, labeling, sorting, true/false, short answer.
- Each activity must have: clear title, step-by-step instructions, examples.
- Include complete answer key at the end covering all pages.
- Structure with clear page breaks and section dividers.

GENERAL GUIDANCE:
- When answering questions, reference the specific student data and textbook content.
- Be specific and practical in your recommendations, citing actual score data.
- Format responses in clear markdown with headers and bullet points.
- If assessment data is available, NEVER say "no assessment reports found". Always analyze and reference the data provided.
- Never mention individual student names - use class-level analysis.`;

    // 4. Build messages
    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) messages.push({ role: msg.role, content: msg.content });
    }

    if (mode === "generate") {
      messages.push({
        role: "user",
        content: prompt || `Generate a comprehensive curative lesson plan for ${selectedClass} Section ${section}. Analyze the class assessment report to identify weak areas and create targeted activities. Include: 1. Learning Objectives 2. Teaching Activities 3. Curative Strategies 4. Practice Questions 5. Assessment Methods`,
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    // 5. Call Grok AI (streaming)
    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    if (!GROK_API_KEY) {
      console.error("GROK_API_KEY environment variable is not set");
      return new Response(JSON.stringify({ error: "GROK_API_KEY is not configured in Supabase. Please set it in Project Settings → Edge Functions → Environment variables" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Calling Grok API with model: grok-2, messages count:", messages.length);
    
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${GROK_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ 
        model: "grok-2", 
        messages, 
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Grok API error:", response.status, errorText);
      
      let userFriendlyError = "";
      if (response.status === 401) {
        userFriendlyError = "Authentication failed. Please check if GROK_API_KEY is correctly set in Supabase Edge Functions environment variables.";
      } else if (response.status === 429) {
        userFriendlyError = "Rate limit exceeded. Grok API has received too many requests. Please try again in a moment.";
      } else if (response.status === 500 || response.status === 503) {
        userFriendlyError = "Grok AI service is temporarily unavailable. Please try again shortly.";
      } else {
        userFriendlyError = `Grok API Error (${response.status}): ${errorText.substring(0, 200)}`;
      }
      
      return new Response(JSON.stringify({ error: userFriendlyError }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Grok API response successful, streaming started");
    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown error";
    console.error("curative-assistant error:", errorMsg, e);
    return new Response(JSON.stringify({ error: `Error: ${errorMsg}. Please try again or contact support if the issue persists.` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});