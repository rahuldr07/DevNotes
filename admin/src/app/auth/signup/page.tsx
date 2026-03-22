/**
 * Signup Page — Creates a new user account.
 *
 * Route: /auth/signup
 *
 * Flow:
 * 1. User fills in name, email, password, confirm password
 * 2. Client-side validation (all fields, password match, min length)
 * 3. Form submits → POST /api/auth/register (proxied to FastAPI)
 * 4. FastAPI creates the user in PostgreSQL → returns user data
 * 5. User is redirected to /auth/login to log in with new account
 *
 * Note: The backend does NOT return a token on signup, so we
 * redirect to login instead of auto-logging in.
 */
"use client";

import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface SignupResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string | null;
}

const labelStyle = {
  color: "var(--sub-color)",
  fontSize: "0.75rem",
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
};

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const clearField = (field: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[field];
      return n;
    });

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email))
      e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Must be at least 8 characters";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword)
      e.confirmPassword = "Passwords do not match";
    return e;
  }, [name, email, password, confirmPassword]);

  const handleSignUp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const errors = validate();
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      try {
        setLoading(true);
        setServerError("");
        await api.post<SignupResponse>("/auth/register", {
          name,
          email,
          password,
        });
        router.push("/auth/login");
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Signup failed. Please try again.";
        setServerError(message);
      } finally {
        setLoading(false);
      }
    },
    [name, email, password, router, validate],
  );

  const inputStyle = (field: string) => ({
    backgroundColor: "var(--input-bg)",
    border: `1px solid ${fieldErrors[field] ? "var(--error-color)" : "var(--border-color)"}`,
    color: "var(--text-color)",
  });

  return (
    <AuthLayout breadcrumb="auth / signup">
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          backgroundColor: "var(--sub-alt-color)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
          backdropFilter: "blur(12px)",
        }}
      >
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: "var(--text-color)" }}
        >
          Create account
        </h1>
        <p className="text-sm mb-7" style={{ color: "var(--sub-color)" }}>
          Join DevNotes and start writing
        </p>

        {serverError && (
          <Alert
            variant="destructive"
            className="mb-5"
            style={{
              borderColor: "var(--error-color)",
              backgroundColor: "transparent",
            }}
          >
            <AlertCircle size={14} />
            <AlertDescription style={{ color: "var(--error-color)" }}>
              {serverError}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSignUp} className="space-y-4" noValidate>
          {/* Row 1: Name + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" style={labelStyle}>
                Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearField("name");
                }}
                placeholder="John Doe"
                autoComplete="name"
                style={inputStyle("name")}
                className="h-11 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[var(--main-color)]"
              />
              {fieldErrors.name && (
                <p className="text-xs" style={{ color: "var(--error-color)" }}>
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" style={labelStyle}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearField("email");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                style={inputStyle("email")}
                className="h-11 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[var(--main-color)]"
              />
              {fieldErrors.email && (
                <p className="text-xs" style={{ color: "var(--error-color)" }}>
                  {fieldErrors.email}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Password + Confirm */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" style={labelStyle}>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearField("password");
                  }}
                  placeholder="min. 8 chars"
                  autoComplete="new-password"
                  style={inputStyle("password")}
                  className="h-11 pr-11 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[var(--main-color)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: "var(--sub-color)" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs" style={{ color: "var(--error-color)" }}>
                  {fieldErrors.password}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" style={labelStyle}>
                Confirm
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearField("confirmPassword");
                  }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={inputStyle("confirmPassword")}
                  className="h-11 pr-11 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[var(--main-color)]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: "var(--sub-color)" }}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs" style={{ color: "var(--error-color)" }}>
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
            style={{
              backgroundColor: "var(--main-color)",
              color: "var(--bg-color)",
              border: "none",
            }}
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p
          className="mt-5 text-center text-sm"
          style={{ color: "var(--sub-color)" }}
        >
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--main-color)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
