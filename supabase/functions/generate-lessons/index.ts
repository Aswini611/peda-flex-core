import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { studentName, ageGroup, strengths, weaknesses, recommendedFramework, learningGoals, cognitivePattern, diagnosticScore } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are an expert educational content designer specialising in personalised pedagogy. You design curative lesson plans tailored to individual student profiles based on their diagnostic assessment data.

You MUST respond with ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "lesson_objectives": ["objective 1", "objective 2", ...],
  "activity_plan": [
    {"title": "...", "description": "...", "duration_minutes": 10, "materials": "..."}
  ],
  "practice_exercises": [
    {"title": "...", "description": "...", "type": "..."}
  ],
  "assessment_checkpoints": [
    {"checkpoint": "...", "criteria": "...", "method": "..."}
  ],
  "framework_summary": "...",
  "estimated_duration_minutes": 40
}`,
          },
          {
            role: "user",
            content: `Generate a personalised curative lesson plan for the following student:

Student Name: ${studentName}
Age Group: ${ageGroup}+
Learning Strengths: ${strengths}
Weakness Areas: ${weaknesses}
Cognitive Pattern: ${cognitivePattern}
Diagnostic Score Summary: ${diagnosticScore}
Recommended Framework: ${recommendedFramework}
Learning Goals: ${learningGoals}

Create a comprehensive lesson plan that includes:
1. 3-4 specific lesson objectives targeting the weakness areas
2. A detailed activity plan with 3-4 activities (each with title, description, duration, and materials needed)
3. 2-3 practice exercises that reinforce the learning
4. 2-3 assessment checkpoints to measure progress

The plan should follow the ${recommendedFramework} framework and be appropriate for the ${ageGroup}+ age group.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "API credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("DeepSeek API error:", response.status, text);
      return new Response(JSON.stringify({ error: `DeepSeek API error: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Strip markdown code blocks if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const lessonPlan = JSON.parse(content);

    return new Response(JSON.stringify({ lessonPlan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lessons error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
