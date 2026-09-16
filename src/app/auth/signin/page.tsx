"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, User } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function doSignIn(e: string, p: string) {
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email: e,
      password: p,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(
        "Invalid email or password. If this is a fresh deploy, seed the production database first (see README)."
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doSignIn(email, password);
  }

  function fillDemo(role: "user" | "admin") {
    if (role === "admin") {
      setEmail("admin@bchlocal.mz");
      setPassword("demo1234");
    } else {
      setEmail("joao@demo.mz");
      setPassword("demo1234");
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="mt-2 text-slate-600">Welcome back to BCH Local</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-white p-6 rounded-2xl border border-border shadow-sm"
        >
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm leading-relaxed">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full h-12 px-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full h-12 px-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-white font-semibold hover:bg-green-700 transition disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Demo quick-fill */}
        <div className="mt-6 p-4 rounded-2xl border border-dashed border-border bg-slate-50/80">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Demo accounts (after seed)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo("user")}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-10 rounded-xl bg-white border border-border text-sm font-medium text-slate-700 hover:border-primary/40 hover:bg-green-50 transition"
            >
              <User className="w-4 h-4 text-primary" />
              Demo user
            </button>
            <button
              type="button"
              onClick={() => fillDemo("admin")}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-10 rounded-xl bg-white border border-border text-sm font-medium text-slate-700 hover:border-primary/40 hover:bg-green-50 transition"
            >
              <Shield className="w-4 h-4 text-primary" />
              Admin
            </button>
          </div>
          <p className="mt-2.5 text-[11px] text-slate-400 text-center">
            Fills email + password. Click Sign in. Password:{" "}
            <code className="bg-slate-100 px-1 rounded">demo1234</code>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="text-primary font-medium hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
