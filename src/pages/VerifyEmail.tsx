import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AuthBackground from "@/components/AuthBackground";

const VerifyEmail = () => {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // Sign out so they login fresh
          supabase.auth.signOut().then(() => setStatus("success"));
        } else {
          setStatus("success");
        }
      });
    } else {
      // No token in URL — might already be handled by onAuthStateChange
      const timeout = setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            supabase.auth.signOut().then(() => setStatus("success"));
          } else {
            setStatus("success");
          }
        });
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <AuthBackground />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-indigo-500/25">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">APAS</h1>
        </div>

        <div className="rounded-2xl bg-white/60 backdrop-blur-xl p-8 shadow-2xl shadow-indigo-500/10 border border-white/50 ring-1 ring-black/[0.03] text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">Verifying your email…</h2>
              <p className="text-sm text-muted-foreground">Please wait a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Email Verified!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your account has been verified successfully. You can now sign in.
              </p>
              <Link to="/login">
                <Button className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 text-white font-medium py-2.5 shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all duration-300">
                  Go to Sign In
                </Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <h2 className="text-lg font-semibold text-destructive mb-2">Verification Failed</h2>
              <p className="text-sm text-muted-foreground mb-6">
                The link may have expired. Please try registering again.
              </p>
              <Link to="/register">
                <Button variant="outline" className="w-full rounded-xl">
                  Back to Register
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
