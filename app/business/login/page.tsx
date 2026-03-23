"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BusinessLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/business/dashboard");
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      alert("Please enter your business email first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "https://gawaloop.com/business/reset-password",
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password reset email sent. Check your inbox.");
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold">Business Login</h1>
        <p className="mb-8 text-slate-600">
          Log in to manage your food listings and dashboard.
        </p>

        <form
          onSubmit={handleLogin}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow"
        >
          <div className="mb-5">
            <label className="mb-2 block font-medium">Business email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
              required
            />
          </div>

          <div className="mb-5">
            <label className="mb-2 block font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
              required
            />
          </div>

          <div className="mb-6 text-right">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-blue-700 hover:underline"
            >
              Forgot your password?
            </button>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-slate-400"
          >
            {saving ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-600">
          Need help? Contact us at{" "}
          <a href="mailto:admin@gawaloop.com" className="text-blue-700 underline">
            admin@gawaloop.com
          </a>
        </p>
      </div>
    </main>
  );
}
