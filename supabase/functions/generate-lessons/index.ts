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
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert educational content designer specialising in personalised pedagogy. You design curative lesson plans tailored to individual student profiles based on their diagnostic assessment data.",
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
        tools: [
          {
            type: "function",
            function: {
              name: "return_lesson_plan",
              description: "Return a structured curative lesson plan",
              parameters: {
                type: "object",
                properties: {
                  lesson_objectives: {
                    type: "array",
                    items: { type: "string" },
                  },
                  activity_plan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        duration_minutes: { type: "integer" },
                        materials: { type: "string" },
                      },
                      required: ["title", "description", "duration_minutes", "materials"],
                      additionalProperties: false,
                    },
                  },
                  practice_exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        type: { type: "string" },
                      },
                      required: ["title", "description", "type"],
                      additionalProperties: false,
                    },
                  },
                  assessment_checkpoints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        checkpoint: { type: "string" },
                        criteria: { type: "string" },
                        method: { type: "string" },
                      },
                      required: ["checkpoint", "criteria", "method"],
                      additionalProperties: false,
                    },
                  },
                  framework_summary: { type: "string" },
                  estimated_duration_minutes: { type: "integer" },
                },
                required: ["lesson_objectives", "activity_plan", "practice_exercises", "assessment_checkpoints", "framework_summary", "estimated_duration_minutes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_lesson_plan" } },
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let lessonPlan;
    if (toolCall?.function?.arguments) {
      lessonPlan = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      lessonPlan = JSON.parse(content);
    }

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
