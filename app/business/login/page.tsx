'use client'
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function BusinessLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.push("/business/dashboard");
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }

    setResetting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://gawaloop.com/business/reset-password",
    });

    if (error) {
      alert(error.message);
      setResetting(false);
      return;
    }

    alert("Password reset email sent. Please check your inbox.");
    setResetting(false);
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Business Login</h1>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow p-6 space-y-4 text-gray-900">
          <div>
            <label className="block font-medium mb-2 text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetting}
            className="block text-sm text-blue-600 hover:underline"
          >
            {resetting ? "Sending reset email..." : "Forgot password?"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          Need help? Contact us at{" "}
          <a
            href="mailto:admin@gawaloop.com"
            className="text-blue-600 hover:underline"
          >
            admin@gawaloop.com
          </a>
        </p>
      </div>
    </main>
  );
}
