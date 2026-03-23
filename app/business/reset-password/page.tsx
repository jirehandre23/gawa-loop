// app/business/reset-password/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  // Set the Supabase session from the URL tokens on page load
  useEffect(() => {
    async function init() {
      const code = params.get("code");
      const access = params.get("access_token");
      const refresh = params.get("refresh_token");

      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (access && refresh) {
          await supabase.auth.setSession({
            access_token: access,
            refresh_token: refresh,
          });
        }
        setReady(true);
      } catch {
        setError(
          "This reset link is invalid or expired. Please request a new reset email."
        );
      }
    }
    init();
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    if (updateError) {
      setError(updateError.message);
      return;
    }
    alert("Password updated successfully.");
    router.push("/business/login");
  }

  if (!ready) return <p>Loading…</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <form onSubmit={handleSubmit}>
      <label>
        New password
        <input
          type="password"
          className="w-full border rounded p-2 mt-1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <label className="block mt-4">
        Confirm new password
        <input
          type="password"
          className="w-full border rounded p-2 mt-1"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </label>
      <button
        type="submit"
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Reset Password
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md w-full bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold mb-4">Reset Password</h1>
        <Suspense fallback={<p>Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
