import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AuthBackground from "@/components/AuthBackground";

const loginRoles = [
  { value: "student", label: "Student" },
  { value: "staff", label: "Teacher / Admin" },
] as const;

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginRole, setLoginRole] = useState<string>("student");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isStudent = loginRole === "student";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const email = isStudent ? `${identifier.trim().toLowerCase()}@student.apas.local` : identifier;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <AuthBackground />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-indigo-500/25">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">APAS</h1>
          <p className="text-sm text-muted-foreground">Adaptive Pedagogy & Analytics System</p>
        </div>

        {/* Card – glassmorphism */}
        <div className="rounded-2xl bg-white/60 backdrop-blur-xl p-8 shadow-2xl shadow-indigo-500/10 border border-white/50 ring-1 ring-black/[0.03]">
          <h2 className="mb-1 text-lg font-semibold text-foreground">Sign in</h2>
          <p className="mb-6 text-sm text-muted-foreground">Enter your credentials to continue</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Role selector */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">I am a</Label>
              <div className="grid grid-cols-2 gap-2">
                {loginRoles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => { setLoginRole(r.value); setIdentifier(""); }}
                    className={cn(
                      "rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      loginRole === r.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/10"
                        : "border-border bg-white/70 text-muted-foreground hover:border-indigo-300 hover:bg-indigo-50/30"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-foreground font-medium">
                {isStudent ? "Student ID" : "Email"}
              </Label>
              <Input
                id="identifier"
                type={isStudent ? "text" : "email"}
                placeholder={isStudent ? "e.g. STU2024001" : "you@example.com"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="rounded-xl border-2 border-border bg-white/80 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border-2 border-border bg-white/80 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 text-white font-medium py-2.5 hover:from-blue-600 hover:via-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
