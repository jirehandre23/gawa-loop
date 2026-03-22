'use client'
import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function BusinessSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("Restaurant");

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("USA");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const fullAddress = [
      street.trim(),
      city.trim(),
      stateRegion.trim(),
      postalCode.trim(),
      country.trim(),
    ]
      .filter(Boolean)
      .join(", ");

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://gawaloop.com/business/login",
      },
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
      address: fullAddress,
    });

    if (
      businessError &&
      !businessError.message.toLowerCase().includes("duplicate")
    ) {
      alert("Something went wrong saving your business profile.");
      console.error("Business insert error:", businessError);
      setLoading(false);
      return;
    }

    alert("Business account created. Please check your email and confirm your account before logging in.");

    setName("");
    setEmail("");
    setPhone("");
    setType("Restaurant");
    setStreet("");
    setCity("");
    setStateRegion("");
    setPostalCode("");
    setCountry("USA");
    setPassword("");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2 text-slate-900">Business Sign Up</h1>
        <p className="text-slate-600 mb-6">
          Create your business account to start posting available food.
        </p>

        <form
          onSubmit={handleSignup}
          className="bg-white rounded-2xl shadow p-6 space-y-5 text-slate-900 border border-slate-200"
        >
          <div>
            <label className="block font-medium mb-2 text-slate-800">Business name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
              placeholder="Example: January Kitchen"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">Business type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
              required
            >
              <option>Restaurant</option>
              <option>Hotel</option>
              <option>Store</option>
              <option>Bakery</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">Business email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
              placeholder="name@business.com"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">Phone number *</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
              placeholder="Example: +1 805 940 5489"
              required
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Pickup address</h2>

            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-2 text-slate-800">Street address *</label>
                <input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                  placeholder="123 Main St"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block font-medium mb-2 text-slate-800">City *</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                    placeholder="New York"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-slate-800">State / Region *</label>
                  <input
                    value={stateRegion}
                    onChange={(e) => setStateRegion(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                    placeholder="NY"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block font-medium mb-2 text-slate-800">ZIP / Postal code *</label>
                  <input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                    placeholder="10010"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-slate-800">Country *</label>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                    placeholder="USA"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2 text-slate-800">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
              placeholder="Create a password"
              required
              minLength={8}
            />
            <p className="text-sm text-slate-500 mt-1">Use at least 8 characters.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-green-600 px-5 py-3 text-white font-medium hover:bg-green-700 disabled:bg-slate-400"
          >
            {loading ? "Creating..." : "Create Business Account"}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-4 text-center">
          Need help? Contact us at{" "}
          <a
            href="mailto:admin@gawaloop.com"
            className="text-green-700 hover:underline"
          >
            admin@gawaloop.com
          </a>
        </p>
      </div>
    </main>
  );
}
