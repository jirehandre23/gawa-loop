import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500">
              <span className="text-sm font-black text-white">G</span>
            </div>
            <span className="text-lg font-bold text-slate-900">GAWA Loop</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/browse" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block">
              Browse Food
            </Link>
            <Link href="/business/login" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block">
              Business Login
            </Link>
            <Link href="/business/signup" className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition">
              Join Free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block"></span>
                Live food available now in your area
              </div>
              <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-6xl">
                Free food,<br />
                <span className="text-green-500">zero waste.</span>
              </h1>
              <p className="mb-8 text-xl leading-relaxed text-slate-600">
                GAWA Loop connects local restaurants, hotels, and stores with people in the community — sharing surplus food before it goes to waste.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/browse"
                  className="rounded-xl bg-green-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-green-200 hover:bg-green-600 transition">
                  Find Free Food Near Me
                </Link>
                <Link href="/business/signup"
                  className="rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 hover:border-green-300 hover:text-green-700 transition">
                  I am a Business
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">100%</span> Free to use
                </div>
                <div className="h-4 w-px bg-slate-200"></div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Real-time</span> listings
                </div>
                <div className="h-4 w-px bg-slate-200"></div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">NYC</span> based
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-green-100 to-blue-100 blur-2xl opacity-60"></div>
                <div className="relative rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-slate-100">
                  <Image
                    src="/logo.png"
                    alt="GAWA Loop"
                    width={400}
                    height={400}
                    className="h-auto w-full max-w-xs"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-green-500">FREE</div>
              <div className="mt-1 text-sm text-slate-500">Always free for customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-blue-500">LIVE</div>
              <div className="mt-1 text-sm text-slate-500">Real-time food listings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-orange-500">FAST</div>
              <div className="mt-1 text-sm text-slate-500">Claim food in seconds</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-purple-500">LOCAL</div>
              <div className="mt-1 text-sm text-slate-500">From your neighborhood</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - CUSTOMERS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-green-500">For food seekers</div>
        <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">Get free food in 3 steps</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">
          No membership, no fees. Just browse, claim, and pick up.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="group relative rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-lg hover:border-green-200 transition-all">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-2xl font-black text-green-500">1</div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Browse live listings</h3>
            <p className="text-slate-500 leading-relaxed">See available food from restaurants and stores near you, updated in real time. Filter by location or food type.</p>
          </div>
          <div className="group relative rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-black text-blue-500">2</div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Claim your food</h3>
            <p className="text-slate-500 leading-relaxed">Reserve a listing in seconds with your name and email. You get an instant confirmation code sent to your inbox.</p>
          </div>
          <div className="group relative rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl font-black text-orange-500">3</div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Pick it up</h3>
            <p className="text-slate-500 leading-relaxed">Head to the business with your code. Use the map link in your email to get directions. Show the code and enjoy!</p>
          </div>
        </div>
        <div className="mt-10 text-center">
          <Link href="/browse" className="inline-block rounded-xl bg-green-500 px-8 py-4 font-bold text-white shadow-lg shadow-green-100 hover:bg-green-600 transition">
            Browse Available Food Now
          </Link>
        </div>
      </section>

      {/* FOR BUSINESSES */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-green-400">For restaurants and stores</div>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight">
                Turn surplus food into<br />
                <span className="text-green-400">community goodwill</span>
              </h2>
              <p className="mb-8 text-lg text-slate-300 leading-relaxed">
                Stop throwing away perfectly good food. Post your surplus on GAWA Loop in seconds, reach people in your neighborhood, and reduce waste — all for free.
              </p>
              <div className="mb-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
                    <span className="text-xs font-bold text-white">V</span>
                  </div>
                  <p className="text-slate-300">Post food listings in under 60 seconds</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
                    <span className="text-xs font-bold text-white">V</span>
                  </div>
                  <p className="text-slate-300">Get notified when someone claims your food</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
                    <span className="text-xs font-bold text-white">V</span>
                  </div>
                  <p className="text-slate-300">Track donations and estimated value on your dashboard</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
                    <span className="text-xs font-bold text-white">V</span>
                  </div>
                  <p className="text-slate-300">Build your reputation as a community-first business</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link href="/business/signup" className="rounded-xl bg-green-500 px-8 py-4 font-bold text-white hover:bg-green-600 transition">
                  Join as a Business — Free
                </Link>
                <Link href="/business/login" className="rounded-xl border border-white/20 px-8 py-4 font-bold text-white hover:bg-white/10 transition">
                  Business Login
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="mb-2 text-3xl font-black text-green-400">0</div>
                <div className="text-sm font-semibold text-white">Setup cost</div>
                <div className="mt-1 text-xs text-slate-400">Always free to post</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="mb-2 text-3xl font-black text-blue-400">60s</div>
                <div className="text-sm font-semibold text-white">To post food</div>
                <div className="mt-1 text-xs text-slate-400">Quick and simple</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="mb-2 text-3xl font-black text-orange-400">Live</div>
                <div className="text-sm font-semibold text-white">Customer alerts</div>
                <div className="mt-1 text-xs text-slate-400">Real-time notifications</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="mb-2 text-3xl font-black text-purple-400">Full</div>
                <div className="text-sm font-semibold text-white">Dashboard access</div>
                <div className="mt-1 text-xs text-slate-400">Track all donations</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">Why GAWA Loop?</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">
          We built GAWA Loop to make food sharing as simple and reliable as possible — for both businesses and their communities.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8">
            <div className="mb-4 text-4xl">🔒</div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Safe reservations</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Each claim gets a unique confirmation code. Only one person can claim each listing — no double bookings.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8">
            <div className="mb-4 text-4xl">📧</div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Email confirmation</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Get a confirmation email with your code, business details, map directions, and a cancel option if plans change.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8">
            <div className="mb-4 text-4xl">🗺️</div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Easy directions</h3>
            <p className="text-slate-500 text-sm leading-relaxed">One tap to open Google Maps, Apple Maps, or Waze. No hunting for the address — just tap and go.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8">
            <div className="mb-4 text-4xl">⚡</div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Real-time updates</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Listings update live. When food is claimed or expires, the page updates automatically — no refreshing needed.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8">
            <div className="mb-4 text-4xl">🆓</div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Completely free</h3>
            <p className="text-slate-500 text-sm leading-relaxed">No fees, no subscriptions, no ads. GAWA Loop is free for customers and businesses. Always.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8">
            <div className="mb-4 text-4xl">🌱</div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Reduce food waste</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Every claim prevents good food from ending up in a landfill. Together we make a real environmental impact.</p>
          </div>
        </div>
      </section>

      {/* CTA BOTTOM */}
      <section className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="mb-4 text-4xl font-extrabold">Ready to get started?</h2>
          <p className="mb-10 text-lg text-green-100">
            Join your community. Find free food or share yours — it takes less than a minute.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/browse" className="rounded-xl bg-white px-8 py-4 text-base font-bold text-green-600 shadow-lg hover:bg-green-50 transition">
              Find Free Food
            </Link>
            <Link href="/business/signup" className="rounded-xl border-2 border-white/40 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition">
              Register Your Business
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500">
                <span className="text-xs font-black text-white">G</span>
              </div>
              <span className="font-bold text-slate-900">GAWA Loop</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href="/browse" className="hover:text-slate-900 transition">Browse Food</Link>
              <Link href="/business/signup" className="hover:text-slate-900 transition">For Businesses</Link>
              <Link href="/business/login" className="hover:text-slate-900 transition">Business Login</Link>
              <Link href="/support" className="hover:text-slate-900 transition">Support</Link>
            </div>
            <div className="text-sm text-slate-400">
              Free food. Less waste. Real impact.
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}
