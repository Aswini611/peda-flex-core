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

    // Mode: "import" — bulk create auth users (triggers profile + student auto-creation), then update student details
    if (mode === "import") {
      const results: any[] = [];

      // Helper: convert YYYY-MM-DD -> DDMMYYYY for password
      const dobToPassword = (dob: string | null | undefined): string | null => {
        if (!dob) return null;
        const m = String(dob).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return null;
        return `${m[3]}${m[2]}${m[1]}`;
      };

      for (const s of students) {
        // Login: Student ID becomes the username; DOB (DDMMYYYY) becomes the password.
        // Email format must match Login.tsx: <studentid>@student.apas.local
        const studentIdRaw = String(s.roll_number || "").trim().toLowerCase();
        if (!studentIdRaw) {
          results.push({
            rowNum: s.rowNum,
            success: false,
            error: "Student ID is required to create a login",
          });
          continue;
        }
        const loginEmail = `${studentIdRaw}@student.apas.local`;

        const dobPassword = dobToPassword(s.date_of_birth);
        if (!dobPassword) {
          results.push({
            rowNum: s.rowNum,
            success: false,
            error: "Valid Date of Birth is required to generate a password",
          });
          continue;
        }

        // Create auth user — the handle_new_user trigger will auto-create profile + student
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: loginEmail,
          password: dobPassword,
          email_confirm: true,
          user_metadata: {
            full_name: s.student_name,
            role: "student",
            class: s.class || null,
          },
        });

        if (authError) {
          results.push({
            rowNum: s.rowNum,
            success: false,
            error: authError.message,
          });
          continue;
        }

        const userId = authData.user.id;

        // Update the auto-created student record with additional fields
        const { data: studentData, error: studentError } = await supabaseAdmin
          .from("students")
          .update({
            roll_number: s.roll_number || null,
            parent_phone: s.parent_phone || null,
            parent_email: s.parent_email || null,
            grade: s.class || null,
            date_of_birth: s.date_of_birth || null,
          })
          .eq("profile_id", userId)
          .select("id")
          .single();

        if (studentError) {
          // Student record may not exist yet if trigger didn't fire — create it
          const { data: insertedStudent, error: insertError } = await supabaseAdmin
            .from("students")
            .insert({
              profile_id: userId,
              grade: s.class || null,
              roll_number: s.roll_number || null,
              parent_phone: s.parent_phone || null,
              parent_email: s.parent_email || null,
              date_of_birth: s.date_of_birth || null,
            })
            .select("id")
            .single();

          if (insertError) {
            results.push({
              rowNum: s.rowNum,
              success: false,
              error: insertError.message,
            });
            continue;
          }

          results.push({
            rowNum: s.rowNum,
            success: true,
            studentId: insertedStudent.id,
            profileId: userId,
            loginId: studentIdRaw,
            password: dobPassword,
          });
        } else {
          results.push({
            rowNum: s.rowNum,
            success: true,
            studentId: studentData.id,
            profileId: userId,
            loginId: studentIdRaw,
            password: dobPassword,
          });
        }
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
