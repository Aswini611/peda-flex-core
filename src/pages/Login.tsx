import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100" />
      
      {/* Decorative circles - top left */}
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/10 blur-3xl" />
      
      {/* Decorative circles - bottom right */}
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-tl from-purple-400/20 to-pink-400/10 blur-3xl" />
      
      {/* Decorative circles - center */}
      <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-300/10 to-blue-300/5 blur-3xl" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[length:40px_40px]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">APAS</h1>
          <p className="text-sm text-gray-600">Adaptive Pedagogy & Analytics System</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-md p-8 shadow-2xl border border-white/40">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Sign in</h2>
          <p className="mb-6 text-sm text-gray-600">Enter your credentials to continue</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Role selector */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">I am a</Label>
              <div className="grid grid-cols-2 gap-2">
                {loginRoles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => { setLoginRole(r.value); setIdentifier(""); }}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      loginRole === r.value
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50/30"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-gray-700 font-medium">
                {isStudent ? "Student ID" : "Email"}
              </Label>
              <Input
                id="identifier"
                type={isStudent ? "text" : "email"}
                placeholder={isStudent ? "e.g. STU2024001" : "you@example.com"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium py-2.5 hover:from-blue-600 hover:to-indigo-700 shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
