import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { studentClass, section, subject, numQuestions = 10, questionType = "mcq", topic, difficulty = "medium" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const count = Math.min(Math.max(Number(numQuestions) || 10, 5), 30);

    const difficultyInstruction = {
      easy: "All questions should be simple and straightforward, testing basic recall and understanding.",
      medium: "Start with easy questions and gradually increase to moderate difficulty.",
      hard: "Questions should be challenging, testing deep understanding, application, and analysis.",
      mixed: "Mix easy, medium, and hard questions evenly across the set.",
    }[difficulty] || "Start from easy questions and gradually increase difficulty.";

    const topicInstruction = topic ? `Focus specifically on the topic: "${topic}".` : "Questions should cover different topics within the subject.";

    let formatInstruction = "";
    let formatSchema = "";

    if (questionType === "true_false") {
      formatInstruction = "Each question must be a True/False question with exactly 2 options: A (True) and B (False).";
      formatSchema = `[
  {
    "id": 1,
    "question": "The Earth revolves around the Sun.",
    "options": { "A": "True", "B": "False" },
    "correct": "A",
    "explanation": "The Earth orbits the Sun."
  }
]`;
    } else if (questionType === "fill_blank") {
      formatInstruction = "Each question must be a fill-in-the-blank style presented as MCQ with 4 options A, B, C, D. Use '______' in the question to indicate the blank.";
      formatSchema = `[
  {
    "id": 1,
    "question": "The capital of France is ______.",
    "options": { "A": "London", "B": "Paris", "C": "Berlin", "D": "Madrid" },
    "correct": "B",
    "explanation": "Paris is the capital of France."
  }
]`;
    } else {
      formatInstruction = "Each question must have exactly 4 options labeled A, B, C, D. Only one option should be correct.";
      formatSchema = `[
  {
    "id": 1,
    "question": "What is 2 + 3?",
    "options": { "A": "4", "B": "5", "C": "6", "D": "7" },
    "correct": "B",
    "explanation": "2 + 3 equals 5"
  }
]`;
    }

    const systemPrompt = `You are an expert academic question paper generator. Generate exactly ${count} questions for a student.

RULES:
- ${formatInstruction}
- Questions should be age-appropriate for the given class level
- ${topicInstruction}
- ${difficultyInstruction}
- Use simple, clear language appropriate for the student's class level
- Return ONLY valid JSON, no markdown, no extra text

Return a JSON array of objects with this exact structure:
${formatSchema}`;

    const userPrompt = `Generate ${count} questions for:
- Class: ${studentClass}
${section ? `- Section: ${section}` : ""}
- Subject: ${subject}
${topic ? `- Topic: ${topic}` : ""}
- Difficulty: ${difficulty}
- Question Type: ${questionType}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "API credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("API error:", response.status, t);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Strip markdown code blocks if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const questions = JSON.parse(content);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-mcqs error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
