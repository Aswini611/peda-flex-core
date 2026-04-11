import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AuthBackground from "@/components/AuthBackground";

const roles = [
  { value: "student", label: "Student", desc: "Track your learning" },
  { value: "teacher", label: "Teacher", desc: "Manage courses" },
  { value: "school_admin", label: "Admin", desc: "School management" },
] as const;

const hasUpperCase = (str: string) => /[A-Z]/.test(str);
const hasSpecialChar = (str: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(str);
const hasDigit = (str: string) => /[0-9]/.test(str);
const isPasswordValid = (pwd: string) =>
  pwd.length >= 6 && hasUpperCase(pwd) && hasSpecialChar(pwd) && hasDigit(pwd);

const ValidationItem = ({ met, text }: { met: boolean; text: string }) => (
  <div className={cn("flex items-center gap-2 text-xs", met ? "text-emerald-600" : "text-muted-foreground")}>
    {met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
    <span>{text}</span>
  </div>
);

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<string>("student");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isStudent = role === "student";
  const usesEmail = role === "teacher" || role === "school_admin";
  const passwordIsValid = isPasswordValid(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const canSubmit = passwordIsValid && passwordsMatch && fullName.trim() && identifier.trim();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);

    const email = isStudent ? `${identifier.trim().toLowerCase()}@student.apas.local` : identifier;

    if (isStudent) {
      // Students use generated emails — register via edge function (auto-confirmed)
      const { data, error } = await supabase.functions.invoke("register-student", {
        body: { email, password, full_name: fullName.trim(), role },
      });

      if (error || data?.error) {
        toast({ title: "Registration failed", description: data?.error || error?.message, variant: "destructive" });
      } else {
        toast({ title: "Account created!", description: "You can now sign in." });
        navigate("/login");
      }
    } else {
      // Teachers & Admins — normal signup, requires email verification
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim(), role } },
      });

      if (error) {
        toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Verification email sent!",
          description: "Please check your inbox and verify your email before signing in.",
        });
        navigate("/login");
      }
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
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
          <h2 className="mb-1 text-lg font-semibold text-foreground">Create account</h2>
          <p className="mb-6 text-sm text-muted-foreground">Join as a student or teacher</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground font-medium">Full name</Label>
              <Input
                id="fullName"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-xl border-2 border-border bg-white/80 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regIdentifier" className="text-foreground font-medium">
                {isStudent ? "Student ID" : "Email"}
              </Label>
              <Input
                id="regIdentifier"
                type={usesEmail ? "email" : "text"}
                placeholder={isStudent ? "e.g. STU2024001" : "you@example.com"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="rounded-xl border-2 border-border bg-white/80 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regPassword" className="text-foreground font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="regPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border-2 border-border bg-white/80 px-4 py-2.5 pr-10 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1.5 rounded-xl bg-indigo-50/80 border border-indigo-100 p-2.5">
                  <p className="text-xs font-medium text-muted-foreground">Password requirements:</p>
                  <ValidationItem met={password.length >= 6} text="At least 6 characters" />
                  <ValidationItem met={hasUpperCase(password)} text="One uppercase letter (A-Z)" />
                  <ValidationItem met={hasSpecialChar(password)} text="One special character (!@#$%...)" />
                  <ValidationItem met={hasDigit(password)} text="One digit (0-9)" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-xl border-2 border-border bg-white/80 px-4 py-2.5 pr-10 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && (
                <div className={cn("mt-1.5 text-xs font-medium", passwordsMatch ? "text-emerald-600" : "text-destructive")}>
                  {passwordsMatch ? "✓ Passwords match" : "✗ Passwords don't match"}
                </div>
              )}
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Role</Label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => { setRole(r.value); setIdentifier(""); }}
                    className={cn(
                      "flex flex-col items-center rounded-xl border-2 p-3 text-center transition-all duration-200",
                      role === r.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/10"
                        : "border-border bg-white/70 text-muted-foreground hover:border-indigo-300 hover:bg-indigo-50/30"
                    )}
                  >
                    <span className="text-xs font-semibold">{r.label}</span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 text-white font-medium py-2.5 hover:from-blue-600 hover:via-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create Account"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
