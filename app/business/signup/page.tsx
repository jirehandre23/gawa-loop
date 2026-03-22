'use client'

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function BusinessSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("Restaurant");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    const { error: businessError } = await supabase.from("businesses").insert({
      name,
      email,
      phone,
      type,
      address
    });

    if (businessError) {
      alert("Account created, but business record failed to save.");
      setLoading(false);
      return;
    }

    alert("Business account created. You can now log in.");
    setName("");
    setEmail("");
    setPhone("");
    setType("Restaurant");
    setAddress("");
    setPassword("");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">Business Sign Up</h1>

        <form onSubmit={handleSignup} className="bg-white rounded-2xl shadow p-6 space-y-4">
          <div>
            <label className="block font-medium mb-2">Business name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Business type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            >
              <option>Restaurant</option>
              <option>Hotel</option>
              <option>Store</option>
              <option>Bakery</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Business pickup address"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-green-600 px-5 py-3 text-white font-medium hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Creating..." : "Create Business Account"}
          </button>
        </form>
      </div>
    </main>
  );
}