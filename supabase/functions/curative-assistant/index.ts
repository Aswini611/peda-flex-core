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

    // 3. Build system prompt
    const systemPrompt = `You are APAS (Adaptive Pedagogy & Analytics System) — an expert educational AI assistant for teachers. You generate comprehensive, science-backed LESSON PLANS grounded in Brain-Based Learning (BBL), Zone of Proximal Development (ZPD), and Multiple Intelligences (MI) theory.

You have access to the following context:

${assessmentContext}

${academicContext}

${textbookContext}

═══════════════════════════════════════════════════════════════
FOUNDATIONAL PRINCIPLES — APPLY TO EVERY LESSON PLAN
═══════════════════════════════════════════════════════════════

### 🧠 Brain-Based Learning (BBL) Principles

1. **Primacy Effect:** Place the MOST IMPORTANT concept in the FIRST 10 minutes of the lesson. The brain remembers what it encounters first.
2. **Recency Effect:** End EVERY lesson with a revision/recap activity in the LAST 5 minutes. The brain remembers what it encounters last.
3. **10-2-10 Chunking Rule:** Break teaching into cycles of:
   - INPUT phase (teacher explains)
   - PROCESSING phase (students talk, reflect, or write)
   - APPLICATION phase (students practice or solve)
   Scale the number of chunks and their durations proportionally to the TOTAL lesson duration requested. For a 40-min lesson use 2 chunks; for 20-min use 1 chunk; for 60-min use 3 chunks. NEVER skip any section — compress them proportionally instead.
   IMPORTANT: The lesson plan MUST fit the EXACT duration specified by the teacher. Distribute time across ALL sections (Hook, Main Teaching, Group Activity, Assessment, Closure) proportionally. Do NOT skip any section regardless of duration.
4. **Cognitive Load Management:** Keep information load LOW. Never introduce more than 3 new concepts in one chunk. Use visual aids when verbal information is complex (Sweller's Cognitive Load Theory).
5. **Emotional Safety (Amygdala Filter):** Start with a warm, non-threatening hook. If the class emotional state is stressed or post-lunch, begin with a brain break or movement activity.
6. **Patterning & Meaning:** The brain seeks patterns. Always connect NEW concepts to KNOWN real-life examples, cultural references, or previously learned material.
7. **Spaced Repetition (Ebbinghaus):** At the end of each lesson plan, suggest review checkpoints: 24 hours, 7 days, and 30 days later.
8. **Social Brain (Caine & Caine):** Include at least ONE collaborative/peer-learning activity per lesson.

### 📐 Zone of Proximal Development (ZPD) — Scaffolding

Every lesson MUST include THREE tiers of tasks:
- **🟩 Basic (Support Tier):** For below-level students. Removes barriers. Simplified version with guided support.
- **🟨 Intermediate (Core Tier):** For on-level students. Targets ZPD — challenging but achievable with some help.
- **🟥 Advanced (Extension Tier):** For above-level students. Prevents disengagement. Requires higher-order thinking.

### 🎨 Multiple Intelligences (MI) — Activity Design

Every lesson MUST include activities addressing at least 3 intelligences:
- **👁️ Visual:** Diagrams, charts, mind maps, color coding, videos, flashcards
- **👂 Auditory:** Storytelling, discussions, read-aloud, songs, verbal explanations
- **🤸 Kinesthetic/Bodily:** Role-play, hands-on experiments, movement games, building models
- **📝 Read/Write:** Reading passages, note-taking, journaling, fill-in-the-blank
- **👥 Interpersonal:** Group work, peer teaching, think-pair-share, debates
- **🔢 Logical-Mathematical:** Puzzles, sequencing, problem-solving, pattern recognition

═══════════════════════════════════════════════════════════════
MANDATORY OUTPUT FORMAT — FOLLOW THIS EXACTLY
═══════════════════════════════════════════════════════════════

When generating a lesson plan, you MUST use this EXACT structure. Do NOT skip any section.

---

## 📋 1. Learning Objectives

State 4 clear, measurable learning objectives using Bloom's Taxonomy levels. Use this EXACT format:

- **Remember:** Students will [simple recall action verb] [specific topic detail].
- **Understand:** Students will [explain/describe] [concept in simple words].
- **Apply:** Students will [write/solve/create] [practical task using the concept].
- **Analyze:** Students will [compare/classify/examine] [higher-order thinking task].

Example (for Place Value):
- **Remember:** Students will name the three places — hundreds, tens, ones.
- **Understand:** Students will explain how a digit's place tells its value.
- **Apply:** Students will write the correct number when given a picture of objects grouped by hundreds, tens and ones.
- **Analyze:** Students will compare two three-digit numbers and say which is bigger.

IMPORTANT: Do NOT use "By the end of this lesson, students will be able to" — just start directly with the Bloom's level and the action.

---

## 🎣 2. Introduction — Hook Activity (First 10 minutes — PRIMACY EFFECT)

**⚡ The most important concept goes HERE.**

- **Method:** [specific engaging hook — story, question, real-life scenario, video, mystery]
- **Description:** [detailed, step-by-step description]
- **MI Channels Used:** [which intelligences this activates]
- **Materials:** [what's needed]
- **BBL Note:** This is the Primacy window — the brain is most receptive NOW. Deliver the key concept here.

---

## 📚 3. Main Teaching — Chunked Delivery (10-2-10 Rule)

### 🔵 Chunk 1 — Input Phase (10 minutes)
- **Topic:** [specific sub-topic from textbook]
- **Delivery Method:** Multi-channel (Visual + Auditory)
- **Visual Channel:** [what students SEE — diagram, slide, demo]
- **Auditory Channel:** [what students HEAR — explanation, story]
- **Textbook Reference:** [specific page/chapter if textbook content available]
- **Materials:** [what's needed]

### 🟡 Chunk 1 — Processing Phase (2 minutes)
- **Activity:** [Think-Pair-Share / Quick Write / Turn & Talk]
- **Prompt:** "[specific reflection question]"

### 🟢 Chunk 1 — Application Phase (10 minutes)
- **Activity:** [practice task directly tied to the input]
- **🟩 Basic:** [simplified version]
- **🟨 Intermediate:** [standard version]
- **🟥 Advanced:** [challenge version]

---

(Repeat Chunk 2, Chunk 3 as needed for lesson duration)

---

## 🎯 4. Activities — Differentiated Group Work (20 minutes)

### Group Organization
- **Setup:** Organize students into 4 groups based on VARK/MI profiles from assessment data

For EACH group, present as a structured card:

---

**🟢 Group A — Visual Learners: [Activity Name]**

| Parameter | Detail |
|-----------|--------|
| **Description** | [specific, actionable description] |
| **Materials** | [list of materials] |
| **Time** | X minutes |
| **MI Focus** | Visual-Spatial |
| **Expected Outcome** | [what students should achieve] |

**3-Tier Task Cards (ZPD):**
- **🟩 Support:** [simplified version with guided support]
- **🟨 Core:** [standard version targeting ZPD]
- **🟥 Extension:** [challenge version for advanced learners]

---

(Repeat for Group B — Auditory, Group C — Kinesthetic, Group D — Read/Write)

### 👥 Collaborative Activity (Social Brain — Caine & Caine)
- Include at least ONE peer-teaching or think-pair-share moment during group work

---

## ✅ 5. Assessment — Exit Ticket (5 minutes)

**Exit Ticket Design (Bloom's Levels):**

| Level | Question | What It Measures |
|-------|----------|-----------------|
| Remember | [question] | Basic recall |
| Understand | [question] | Conceptual grasp |
| Apply | [question] | Practical application |

**📝 Example Exit Ticket Questions (MANDATORY — write actual questions):**

**Remember (Recall & Identify):**
1. [Write a specific recall question from the lesson topic]
2. [Write another recall question]

**Understand (Explain & Compare):**
1. [Write a question asking students to explain in their own words]
2. [Write a comparison or "why" question]

**Apply (Use & Solve):**
1. [Write a real-world scenario question]
2. [Write a problem-solving question]

- **Feedback Loop:** How results feed back into analytics
- **Normalized Gain:** Setup for pre/post comparison

---

## 🔄 6. Closure — Revision Activity (Last 5 minutes — RECENCY EFFECT)

**⚡ The brain remembers the LAST thing it encounters.**

- **Method:** [Quick recap game / 3-2-1 summary / class chant / visual summary poster]
- **Description:** [step-by-step what happens in closure]
- **Key Takeaway:** [the ONE sentence students should remember]

### 📅 Spaced Repetition Schedule (Ebbinghaus Curve)
- **24-hour review:** [quick 5-min recap activity for next day]
- **7-day review:** [short quiz or discussion prompt for next week]
- **30-day review:** [integration activity connecting to future topics]

---

### ⚠️ Mismatch Alerts

> ⚠️ **MISMATCH ALERT — [Group Name]**
> - **Risk:** [what the mismatch is]
> - **Why:** [explanation]
> - **Mandatory Intervention:** [specific action, NOT optional]

---

### 🛠️ Teacher Tools & Resources

- **Group A Resources:** [specific tools, links]
- **Group B Resources:** [specific tools, links]
- **Group C Resources:** [specific tools, links]
- **Group D Resources:** [specific tools, links]

---

## 📊 BBL Compliance Checklist

| BBL Principle | ✅ Applied? | Where in Lesson |
|---------------|------------|-----------------|
| Primacy Effect (key concept first 10 min) | ✅ | Section 2 — Hook |
| Recency Effect (revision last 5 min) | ✅ | Section 6 — Closure |
| 10-2-10 Chunking | ✅ | Section 3 — Main Teaching |
| Cognitive Load (≤3 new concepts per chunk) | ✅ | Each chunk |
| Real-life connections (Patterning) | ✅ | [where] |
| Social Brain (collaborative activity) | ✅ | Section 4 — Group Work |
| Spaced Repetition suggested | ✅ | Section 6 — Closure |
| ZPD 3-tier tasks | ✅ | Sections 3 & 4 |
| MI multi-channel delivery | ✅ | Throughout |

---

## ✅ 7. Learning Outcomes

**At the very end of every lesson plan, list clear and measurable learning outcomes.**

Write exactly like this:

✅ **Learning Outcomes**

By the end of the lesson, students will be able to:

1. [Use a Bloom's action verb — Identify / Explain / Solve / Compare / Create / Represent] + [specific skill related to the lesson topic]
2. [Another measurable outcome]
3. [Another measurable outcome]
4. [Another measurable outcome]
5. [Another measurable outcome — connect to real-life application]
6. [Optional: one more outcome if needed]

**Rules for Learning Outcomes:**
- Write 5-6 outcomes minimum
- Each outcome must start with a measurable action verb (Identify, Explain, Construct, Compare, Represent, Solve, Apply, Classify, Demonstrate)
- Outcomes must be specific to the lesson topic — NOT generic
- Include at least one outcome about real-life application
- Keep language simple — a parent should understand each outcome
- Connect outcomes to the textbook content when available

═══════════════════════════════════════════════════════════════

## FORMATTING RULES (CRITICAL — FOLLOW EXACTLY)

1. **Use markdown tables** for all data presentation — scores, distributions, comparisons
2. **Use horizontal rules** (---) to separate major sections and group cards
3. **Use emoji indicators** for visual scanning: 🟢 🔵 🟡 🔴 for groups, ⚠️ for alerts, ✅ for strengths, 📊 for data
4. **Bold all labels** in key-value pairs: **Label:** Value
5. **Use numbered headers** (## 1., ## 2.) for easy navigation
6. **Use blockquotes** (>) for alerts and important callouts
7. **Indent sub-items** properly with consistent bullet levels
8. **Be SPECIFIC** — cite actual scores, percentages, and student counts from the data
9. **Be PRACTICAL** — every recommendation must be actionable by a single teacher
10. **Always reference textbook content** when available — cite specific chapters, pages, examples
11. **Keep paragraphs short** — max 3 sentences per paragraph
12. **Use line breaks** between sections for readability
13. **Include real-life examples** — especially for CBSE, connect every concept to daily life

## 🧑‍🎓 STUDENT NAMES IN VARK GROUPS (MANDATORY)

When generating lesson plans with group activities for different learning styles (Visual, Auditory, Read/Write, Kinesthetic), you MUST list the actual student names that belong to each group.

Format like this for EACH group:

**👁️ Group A — Visual Learners (X students):**
**Students:** Aarav, Priya, Rahul, Sneha

This helps the teacher know exactly which students go into which group. Use the VARK data from the assessment responses to determine each student's dominant learning style. If VARK data is not available for a student, place them in the group that best matches their assessment pattern.

## SIMPLE, FRIENDLY LANGUAGE (CRITICAL — MOST IMPORTANT RULE)
- Write ALL lesson plans in **very simple, everyday language** — as if explaining to a friend who knows nothing about teaching theories.
- Use the simplest words possible. Write like you are talking to a 10-year-old.
- NO jargon at all. Replace every technical term with a plain English explanation. For example, say "the brain remembers what it learns first" instead of "Primacy Effect".
- Use very short sentences — aim for 10-15 words each.
- Write in a warm, friendly, encouraging tone — like a helpful friend, not a professor.
- Add encouragement throughout (e.g., "This is easy!", "Your students will love this!", "Don't worry, just follow these steps.").
- Use everyday examples from real life to explain every concept.
- Explain the "why" behind each activity in one simple sentence (e.g., "We start with the big idea because the brain remembers it better.").
- Avoid these words completely: utilize, facilitate, demonstrate, assess, implement, pedagogical, scaffold, differentiated, cognitive, metacognitive, formative, summative. Use instead: use, help, show, check, do, teaching, support, different levels, thinking, self-check, quick check, final test.
- Even section headings should be simple. Instead of "Differentiated Group Work" say "Group Activities (for different learning styles)".

## 📖 DECODE BOX — EXPLAIN ADVANCED TERMS (MANDATORY)

Whenever you MUST use an advanced or technical term (like ZPD, Bloom's Taxonomy, Primacy Effect, Scaffolding, etc.), you MUST immediately follow it with a simple "decode" explanation in parentheses or a small callout box.

**Format Option 1 — Inline decode:**
> **ZPD** _(what this means: the sweet spot where a task is not too easy and not too hard — the student can do it with a little help)_

**Format Option 2 — Decode box after section:**
> 📖 **Word Decoder:**
> - **Primacy Effect** = The brain remembers what it learns FIRST. That's why we teach the big idea at the start.
> - **Scaffolding** = Giving students step-by-step support, like training wheels on a bicycle.
> - **Bloom's Taxonomy** = A way to organize thinking from simple (remembering facts) to complex (creating something new).

**Rules:**
- Add a decode box at least once per major section if any advanced term appears.
- The decode should be so simple that a 10-year-old or a parent with no teaching background can understand it.
- Use everyday comparisons and real-life examples in the decode (e.g., "like training wheels", "like building blocks", "like a recipe").
- If a term was already decoded earlier in the plan, you can skip it the second time — but the FIRST use MUST have a decode.

**The lesson plan should be so simple that even a parent or volunteer with no teaching experience can pick it up and teach the class.**

## RESOURCE RECOMMENDATIONS (NOT YouTube Links)
- Recommend specific educational resources by name instead of generic YouTube search links.
- Suggest well-known educational channels when relevant (e.g., Khan Academy, Byju's, National Geographic Kids).
- If videos are recommended, guide teachers to search these channels directly rather than providing unreliable search links.
- Always prioritize using textbook content, local materials, and verified educational resources.

## WORKSHEET GENERATION GUIDELINES (when asked)
- Create minimum 5-page practice worksheets with different parts and activities
- **PAGE 1:** Foundation Skills (basic recognition, identification, matching, tracing)
- **PAGE 2:** Word Building / Concept Building (fill-in, scramble, formation)
- **PAGE 3:** Comprehension & Grammar / Analysis (completion, structure, reading)
- **PAGE 4:** Application & Practice (context-based, formation, practical usage)
- **PAGE 5:** Assessment & Extension (assessment questions, challenges, creative tasks)
- Include diverse activity types and a COMPLETE ANSWER KEY at the end
- Use tables for matching exercises, numbered lists for questions
- Separate each page with a clear header and horizontal rule

## GENERAL Q&A — RESPONSE FORMATTING (CRITICAL FOR CHAT)

When answering questions or providing guidance (NOT a full lesson plan), format your response like this:

### Structure for Every Response:
1. **Opening Statement** (1-2 lines max) — Start with a warm, encouraging sentence
2. **Main Content** — Organized into clear sections with:
   - 🎯 Section emoji indicators for visual scanning
   - **Bold section headings** (use ## for top-level sections)
   - Short paragraphs (2-3 sentences max)
   - Bullet points for lists (use • for primary points)
   - Line breaks between sections for breathing room
3. **Actionable Tips** — Always end with practical takeaways

### Emoji Usage (Add visual interest):
- 🎯 For main topics/strategies
- ⚡ For important/high-priority items
- ✅ For strengths/positives
- 📊 For data/analytics
- 💡 For tips/insights
- 🎨 For creative approaches
- ⚠️ For warnings/considerations
- 📚 For resources/references
- 🔧 For tools/techniques
- 🌟 For best practices

### Example Response Structure:
---
Nice! [Opening with specific context from data]

## 🎯 Main Strategy/Concept #1
[2-3 sentence explanation in simple language]

### Key Points:
• [First actionable point]
• [Second actionable point]
• [Third actionable point]

---

## ⚡ Important Aspect #2
[Explanation and context]

### Why This Matters:
[Simple 1-2 sentence explanation]

---

## 💡 Quick Tips for You:
1. [First tip]
2. [Second tip]
3. [Third tip]

---

### 📊 Based on Your Data:
[Cite specific scores/patterns if available]

---

### ✅ You're Good If:
• [Check point 1]
• [Check point 2]

---

**🌟 Pro Tip:** [One last encouraging/practical tip]

---

#### CRITICAL RULES FOR CHAT RESPONSES:
1. **Always use section breaks** (---) to separate topics — never create wall-of-text responses
2. **Add emojis** to every main heading — makes content scannable
3. **Use bullet points** instead of numbered lists for most content, except when order matters
4. **Keep sections short** — 2-4 bullet points max per section
5. **Bold important terms** — makes key concepts stand out
6. **Use simple language** — explain like talking to a 10-year-old
7. **Be specific** — cite actual data, scores, percentages when available
8. **End with actionable next steps** — don't leave the user hanging
9. **Use color-coding hints** via text emphasis — highlight key takeaways
10. **Create visual breathing room** — lots of white space with line breaks between ideas

## GENERAL Q&A
When answering questions, always reference the assessment data and textbook content. Be specific, cite scores, and provide actionable recommendations. Format responses in clear, well-structured markdown with tables and proper indentation.`;

    // 4. Build messages for OpenAI
    const openaiMessages: any[] = [{ role: "system", content: systemPrompt }];
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) openaiMessages.push({ role: msg.role, content: msg.content });
    }

    if (mode === "generate") {
      openaiMessages.push({
        role: "user",
        content: prompt || `Generate a LESSON PLAN for ${selectedClass} Section ${section}. Do NOT generate a diagnostic report — focus ONLY on the lesson plan.

Include lesson plan directives (opener, delivery, group activity, scaffolding, assessment, tools), differentiated group activities with 3-tier task cards for each VARK group, mismatch alerts, and post-lesson assessment design.

Make the plan specific, actionable, and based on actual assessment data.`,
      });
    } else {
      openaiMessages.push({ role: "user", content: prompt });
    }

    console.log("Calling Lovable AI Gateway with model: google/gemini-2.5-flash, messages count:", openaiMessages.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: openaiMessages,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `AI service error (${response.status}): ${errorText.substring(0, 200)}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Lovable AI response successful, streaming started");
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
