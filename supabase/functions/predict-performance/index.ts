import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { student_ids } = await req.json();

    // Fetch all students if none specified
    let studentsQuery = supabase.from("students").select("id, profile_id, grade, age, vark_type, zpd_score, curriculum");
    if (student_ids?.length) studentsQuery = studentsQuery.in("id", student_ids);
    const { data: students, error: studentsErr } = await studentsQuery;
    if (studentsErr) throw studentsErr;
    if (!students?.length) {
      return new Response(JSON.stringify({ predictions: [], summary: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const predictions = [];

    for (const student of students) {
      // Get performance records
      const { data: perf } = await supabase
        .from("performance_records")
        .select("pretest_score, posttest_score, normalized_gain, mastery_score, effort_score, recorded_at")
        .eq("student_id", student.id)
        .order("recorded_at", { ascending: false })
        .limit(10);

      // Get homework submissions
      const { data: homework } = await supabase
        .from("homework_submissions")
        .select("score, submitted_at")
        .eq("student_id", student.profile_id)
        .order("submitted_at", { ascending: false })
        .limit(10);

      // Get academic test scores
      const { data: tests } = await supabase
        .from("academic_tests")
        .select("score, total_questions, subject, completed_at")
        .eq("student_id", student.profile_id)
        .order("completed_at", { ascending: false })
        .limit(10);

      // Get profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", student.profile_id)
        .single();

      // Build context for AI
      const perfSummary = (perf || []).map(p => ({
        pre: p.pretest_score, post: p.posttest_score,
        gain: p.normalized_gain, mastery: p.mastery_score, effort: p.effort_score,
      }));
      const hwScores = (homework || []).map(h => h.score).filter(Boolean);
      const testScores = (tests || []).map(t => ({
        subject: t.subject,
        pct: Math.round((t.score / t.total_questions) * 100),
      }));

      const prompt = `Analyze this student's data and predict performance. Return ONLY valid JSON.

Student: ${profile?.full_name || "Unknown"}, Grade: ${student.grade || "N/A"}, Age: ${student.age || "N/A"}
VARK Type: ${student.vark_type || "Unknown"}, ZPD Score: ${student.zpd_score || "N/A"}

Recent Performance (newest first): ${JSON.stringify(perfSummary)}
Homework Scores: ${JSON.stringify(hwScores)}
Test Scores: ${JSON.stringify(testScores)}

Attendance: ~85% (estimated)

Return JSON with this exact structure:
{
  "subjects": [
    {
      "subject": "subject_name",
      "predicted_score": 0-100,
      "risk_level": "low|medium|high",
      "dropout_risk_pct": 0-100,
      "confidence": 0-1,
      "factors": ["factor1", "factor2"]
    }
  ],
  "overall_risk": "low|medium|high",
  "recommendations": ["rec1", "rec2"]
}

Rules:
- If performance is declining, risk_level should be "high"
- If homework completion is low (<50%), increase dropout risk
- If normalized gain is consistently <0.3, flag as medium risk
- Consider VARK type alignment with teaching methods`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are an educational data analyst. Analyze student data and predict performance. Return ONLY valid JSON, no markdown." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResp.ok) {
        const status = aiResp.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI error:", status, await aiResp.text());
        continue;
      }

      const aiData = await aiResp.json();
      let content = aiData.choices?.[0]?.message?.content || "";
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      try {
        const prediction = JSON.parse(content);

        // Store predictions per subject
        for (const subj of (prediction.subjects || [])) {
          const { error: insertErr } = await supabase.from("student_predictions").upsert({
            student_id: student.id,
            subject: subj.subject,
            predicted_score_next_test: subj.predicted_score,
            risk_level: subj.risk_level,
            dropout_risk_percentage: subj.dropout_risk_pct,
            confidence_score: subj.confidence,
            contributing_factors: subj.factors,
            updated_at: new Date().toISOString(),
          }, { onConflict: "student_id,subject", ignoreDuplicates: false });

          if (insertErr) console.error("Insert prediction error:", insertErr);
        }

        predictions.push({
          student_id: student.id,
          student_name: profile?.full_name,
          grade: student.grade,
          ...prediction,
        });
      } catch (parseErr) {
        console.error("Parse error for student:", student.id, parseErr);
      }

      // Small delay between students
      await new Promise(r => setTimeout(r, 300));
    }

    // Summary
    const highRisk = predictions.filter(p => p.overall_risk === "high").length;
    const medRisk = predictions.filter(p => p.overall_risk === "medium").length;

    return new Response(JSON.stringify({
      predictions,
      summary: {
        total_analyzed: predictions.length,
        high_risk: highRisk,
        medium_risk: medRisk,
        low_risk: predictions.length - highRisk - medRisk,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("predict-performance error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
