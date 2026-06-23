/**
 * Login Page — Authenticates users with email and password.
 *
 * Route: /auth/login
 *
 * Flow:
 * 1. User enters email + password
 * 2. Form submits → POST /api/auth/login (proxied to FastAPI)
 * 3. FastAPI validates credentials → returns JWT token
 * 4. Token is saved in a browser cookie (auth_token)
 * 5. User is redirected to /dashboard
 *
 * If the user is already logged in, proxy.ts redirects
 * them to /dashboard before this page even loads.
 *
 * 'use client' — Required because this page uses React hooks
 * (useState, useCallback, useRouter) and handles user interactions.
 */
"use client";

import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { saveRefreshToken, saveToken } from "@/lib/auth";
import { getCurrentUserAfterAuth } from "@/lib/session";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  decryptData,
  type EncryptedData,
  encryptData,
} from "../../../utils/crypto";

interface LoginResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
}

const labelStyle = {
  color: "var(--text-secondary)",
  fontSize: "0.75rem",
  letterSpacing: "0.02em",
  textTransform: "lowercase" as const,
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  // Load saved credentials on mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const stored = localStorage.getItem("secure_credentials");
        if (stored) {
          const {
            email,
            encrypted,
          }: { email: string; encrypted: EncryptedData } = JSON.parse(stored);

          if (email && encrypted) {
            setEmail(email);
            const decryptedPassword = await decryptData(email, encrypted);
            setPassword(decryptedPassword);
            setRememberMe(true);
          }
        }
      } catch (err) {
        console.error("Failed to load saved credentials:", err);
        // If decryption fails (e.g. data corruption), clear storage
        localStorage.removeItem("secure_credentials");
      }
    };

    loadCredentials();
  }, []);

  const validate = useCallback(() => {
    const e: { email?: string; password?: string } = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email))
      e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    return e;
  }, [email, password]);

  const handleLogin = useCallback(
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
        const response = await api.post<LoginResponse>("/auth/login", {
          email,
          password,
        });

        // Handle "Remember Me" - Encrypt and store credentials if checked
        if (rememberMe) {
          try {
            const encrypted = await encryptData(email, password);
            localStorage.setItem(
              "secure_credentials",
              JSON.stringify({ email, encrypted }),
            );
          } catch (cryptoError) {
            console.error("Encryption failed:", cryptoError);
            // Non-blocking error - login succeeds even if remember me fails
          }
        } else {
          localStorage.removeItem("secure_credentials");
        }

        // Save token (session cookie only, as requested)
        saveToken(response.access_token, { remember: false });
        saveRefreshToken(response.refresh_token);
        const user = await getCurrentUserAfterAuth(email);
        setUser(user);
        router.push("/dashboard");
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Invalid credentials. Please try again.";
        setServerError(message);
      } finally {
        setLoading(false);
      }
    },
    [email, password, rememberMe, router, setUser, validate],
  );

  return (
    <AuthLayout breadcrumb="auth / login">
      <div className="w-full max-w-sm" style={{ color: "var(--text-primary)" }}>
        <h1
          className="mb-2 text-2xl font-medium lowercase"
          style={{ color: "var(--text-primary)" }}
        >
          welcome back
        </h1>
        <p className="mb-10 text-sm" style={{ color: "var(--text-secondary)" }}>
          sign in to continue to your notes
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

        <form onSubmit={handleLogin} className="space-y-5" noValidate>
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
                if (fieldErrors.email)
                  setFieldErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                backgroundColor: "transparent",
                borderColor: fieldErrors.email
                  ? "var(--error)"
                  : "var(--border)",
                color: "var(--text-primary)",
              }}
              className="h-11 focus-visible:border-[var(--accent)]"
            />
            {fieldErrors.email && (
              <p className="text-xs" style={{ color: "var(--error-color)" }}>
                {fieldErrors.email}
              </p>
            )}
          </div>

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
                  if (fieldErrors.password)
                    setFieldErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder="password"
                autoComplete="current-password"
                style={{
                  backgroundColor: "transparent",
                  borderColor: fieldErrors.password
                    ? "var(--error)"
                    : "var(--border)",
                  color: "var(--text-primary)",
                }}
                className="h-11 pr-11 focus-visible:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm transition-opacity hover:opacity-70 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                style={{ color: "var(--sub-color)" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
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

          <label
            htmlFor="remember-me"
            className="flex items-center gap-2.5 text-sm cursor-pointer select-none"
            style={{ color: "var(--sub-color)" }}
          >
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded-sm"
              style={{
                accentColor: "var(--accent)",
              }}
            />
            Remember me
          </label>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
              border: "none",
            }}
          >
            {loading ? "signing in..." : "sign in"}
          </Button>
        </form>

        <p
          className="mt-6 text-center text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-normal transition-opacity hover:opacity-70"
            style={{ color: "var(--accent)" }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
