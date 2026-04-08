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
    const {
      lessonContent,
      classLevel,
      section,
      subject,
      periodsPerWeek,
      periodDuration,
      totalTeachingDays,
      regeneratePeriod,
    } = await req.json();

    if (!lessonContent) {
      return new Response(
        JSON.stringify({ error: "Lesson content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    if (!GROK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalPeriods = Math.ceil(
      (periodsPerWeek || 5) * ((totalTeachingDays || 20) / 5)
    );

    let systemPrompt: string;
    let userPrompt: string;

    if (regeneratePeriod !== undefined && regeneratePeriod !== null) {
      systemPrompt = `You are an expert curriculum planner. Regenerate ONLY the plan for Period ${regeneratePeriod + 1}. Return valid JSON only — an object with: day, period, topic, objective, activity, materials, assessment, duration_minutes.`;
      userPrompt = `Regenerate Period ${regeneratePeriod + 1} for this lesson plan:

Subject: ${subject || "General"}
Class: ${classLevel}
Section: ${section}
Period Duration: ${periodDuration || 40} minutes

LESSON PLAN:
${lessonContent.substring(0, 6000)}

Return ONLY a single JSON object (not wrapped in array):
{"day": number, "period": number, "topic": "...", "objective": "...", "activity": "...", "materials": "...", "assessment": "...", "duration_minutes": ${periodDuration || 40}}`;
    } else {
      systemPrompt = `You are an expert curriculum planner and instructional designer. Your task is to intelligently break down a complete lesson plan into daily, period-wise teaching plans.

Rules:
- Divide content logically across periods maintaining pedagogical flow
- Balance workload evenly across periods
- Ensure learning objectives align with activities
- Each period must have a clear topic, objective, activity, materials, and assessment
- Return ONLY a valid JSON array, no markdown, no explanation`;

      userPrompt = `Break down this lesson plan into ${totalPeriods} period-wise daily plans.

Subject: ${subject || "General"}
Class: ${classLevel}
Section: ${section}
Periods per week: ${periodsPerWeek || 5}
Period duration: ${periodDuration || 40} minutes
Total teaching days: ${totalTeachingDays || 20}

LESSON PLAN:
${lessonContent.substring(0, 8000)}

Return a JSON array of objects. Each object represents one period:
[
  {
    "day": 1,
    "period": 1,
    "topic": "Introduction to ...",
    "objective": "Students will be able to ...",
    "activity": "Teacher-led discussion on ...",
    "materials": "Textbook, whiteboard, ...",
    "assessment": "Quick quiz on ...",
    "duration_minutes": ${periodDuration || 40}
  },
  ...
]

Generate exactly ${totalPeriods} period entries covering all ${totalTeachingDays} teaching days. Return ONLY the JSON array.`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    // Extract JSON from the response
    let parsed: any;
    try {
      // Try to find JSON array or object in the response
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/) || rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(rawContent);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", rawContent.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: rawContent.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ plan: parsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-period-plans error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
