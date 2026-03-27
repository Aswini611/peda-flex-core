import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const roles = [
  { value: "student", label: "Student", desc: "Track your learning" },
  { value: "teacher", label: "Teacher", desc: "Manage courses" },
] as const;

// Password validation functions
const hasUpperCase = (str: string) => /[A-Z]/.test(str);
const hasSpecialChar = (str: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(str);
const hasDigit = (str: string) => /[0-9]/.test(str);
const isPasswordValid = (pwd: string) =>
  pwd.length >= 6 && hasUpperCase(pwd) && hasSpecialChar(pwd) && hasDigit(pwd);

const ValidationItem = ({ met, text }: { met: boolean; text: string }) => (
  <div className={cn("flex items-center gap-2 text-xs", met ? "text-emerald-600" : "text-muted-foreground")}>
    {met ? (
      <Check className="h-3.5 w-3.5" />
    ) : (
      <X className="h-3.5 w-3.5" />
    )}
    <span>{text}</span>
  </div>
);

const classes = [
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11", "Class 12",
];

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<string>("student");
  const [age, setAge] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isStudent = role === "student";
  const usesEmail = role === "teacher";
  const passwordIsValid = isPasswordValid(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const canSubmit = passwordIsValid && passwordsMatch && fullName.trim() && identifier.trim() && (!isStudent || (age && studentClass));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({ title: "Full name is required", variant: "destructive" });
      return;
    }

    if (isStudent && !identifier.trim()) {
      toast({ title: "Student ID is required", variant: "destructive" });
      return;
    }

    if (!isStudent && !identifier.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }

    if (!passwordIsValid) {
      toast({
        title: "Password doesn't meet requirements",
        description: "Must contain at least one uppercase letter, one special character, and one digit.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    setLoading(true);

    const email = isStudent ? `${identifier.trim().toLowerCase()}@student.apas.local` : identifier;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role, ...(isStudent ? { student_id: identifier.trim() } : {}) },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "You can now sign in." });
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-100 to-teal-100" />
      
      {/* Decorative circles - top right */}
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gradient-to-bl from-emerald-400/20 to-green-400/10 blur-3xl" />
      
      {/* Decorative circles - bottom left */}
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-tr from-teal-400/20 to-cyan-400/10 blur-3xl" />
      
      {/* Decorative circles - center */}
      <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-300/10 to-green-300/5 blur-3xl" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(16,185,129,0.04)_1px,transparent_1px)] bg-[length:40px_40px]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">APAS</h1>
          <p className="text-sm text-gray-600">Adaptive Pedagogy & Analytics System</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-md p-8 shadow-2xl border border-white/40">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Create account</h2>
          <p className="mb-6 text-sm text-gray-600">Join as a student or teacher</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-gray-700 font-medium">
                Full name
              </Label>
              <Input
                id="fullName"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regIdentifier" className="text-gray-700 font-medium">
                {isStudent ? "Student ID" : "Email"}
              </Label>
              <Input
                id="regIdentifier"
                type={usesEmail ? "email" : "text"}
                placeholder={isStudent ? "e.g. STU2024001" : "you@example.com"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regPassword" className="text-gray-700 font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="regPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 pr-10 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1.5 rounded-lg bg-emerald-50 border border-emerald-100 p-2.5">
                  <p className="text-xs font-medium text-gray-600">Password requirements:</p>
                  <ValidationItem met={password.length >= 6} text="At least 6 characters" />
                  <ValidationItem met={hasUpperCase(password)} text="One uppercase letter (A-Z)" />
                  <ValidationItem met={hasSpecialChar(password)} text="One special character (!@#$%...)" />
                  <ValidationItem met={hasDigit(password)} text="One digit (0-9)" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                Confirm password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 pr-10 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword && (
                <div className={cn("mt-1.5 text-xs font-medium", passwordsMatch ? "text-emerald-600" : "text-red-600")}>
                  {passwordsMatch ? "✓ Passwords match" : "✗ Passwords don't match"}
                </div>
              )}
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Role</Label>
            <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => { setRole(r.value); setIdentifier(""); }}
                    className={cn(
                      "flex flex-col items-center rounded-lg border-2 p-3 text-center transition-all duration-200",
                      role === r.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md"
                        : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/30"
                    )}
                  >
                    <span className="text-xs font-semibold">{r.label}</span>
                    <span className="mt-0.5 text-[10px] text-gray-500">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium py-2.5 hover:from-emerald-600 hover:to-teal-700 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create Account"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
