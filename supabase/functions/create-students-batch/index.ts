import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { students, mode } = await req.json();

    // Mode: "import" — bulk create profiles + students without auth accounts
    if (mode === "import") {
      const results: any[] = [];

      for (const s of students) {
        // Create profile with service role (bypasses RLS)
        const profileId = crypto.randomUUID();
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert({
            id: profileId,
            full_name: s.student_name,
            role: "student",
          });

        if (profileError) {
          results.push({
            rowNum: s.rowNum,
            success: false,
            error: profileError.message,
          });
          continue;
        }

        // Create student record
        const { data: studentData, error: studentError } = await supabaseAdmin
          .from("students")
          .insert({
            profile_id: profileId,
            grade: s.class || null,
            roll_number: s.roll_number || null,
            parent_phone: s.parent_phone || null,
            parent_email: s.parent_email || null,
          })
          .select("id")
          .single();

        if (studentError) {
          results.push({
            rowNum: s.rowNum,
            success: false,
            error: studentError.message,
          });
          continue;
        }

        results.push({
          rowNum: s.rowNum,
          success: true,
          studentId: studentData.id,
          profileId,
        });
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Legacy mode: create auth users
    const results: any[] = [];
    for (const s of students) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: s.email,
        password: s.password,
        email_confirm: true,
        user_metadata: { full_name: s.name, role: "student" },
      });
      results.push({
        id: s.id,
        name: s.name,
        success: !error,
        error: error?.message || null,
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
