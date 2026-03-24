import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 ring-2 ring-green-100">
              <Image src="/gawa-logo-green.png" width={28} height={28} alt="GAWA Loop logo" style={{ objectFit: "contain" }} />
            </div>
            <span className="text-lg font-bold text-slate-900">GAWA Loop</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/browse" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block transition">
              Browse Food
            </Link>
            <Link href="/business/login" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block transition">
              Business Login
            </Link>
            <Link href="/business/signup" className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition">
              Join Free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block"></span>
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
                <Link href="/browse" className="rounded-xl bg-green-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-green-200 hover:bg-green-600 transition">
                  Find Free Food Near Me
                </Link>
                <Link href="/business/signup" className="rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 hover:border-green-300 hover:text-green-700 transition">
                  I am a Business
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div><span className="font-bold text-slate-900">100%</span> Free to use</div>
                <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                <div><span className="font-bold text-slate-900">Real-time</span> listings</div>
                <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                <div><span className="font-bold text-slate-900">NYC</span> based</div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-green-200 via-emerald-100 to-teal-100 blur-3xl opacity-60"></div>
                <div className="relative flex flex-col items-center justify-center rounded-3xl bg-white px-14 py-12 shadow-2xl ring-1 ring-green-100">
                  <Image src="/gawa-logo-green.png" width={200} height={200} alt="GAWA Loop logo" style={{ objectFit: "contain" }} />
                  <div className="mt-6 flex items-center gap-2 rounded-full bg-green-50 px-4 py-2">
                    <span className="h-2 w-2 rounded-full bg-green-400 inline-block"></span>
                    <span className="text-sm font-semibold text-green-700">Food available now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
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

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-green-500">For food seekers</div>
        <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">Get free food in 3 steps</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">No membership, no fees. Just browse, claim, and pick up.</p>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { num: "1", title: "Browse live listings", desc: "See available food from restaurants and stores near you, updated in real time.", color: "green" },
            { num: "2", title: "Claim your food", desc: "Reserve in seconds with your name and email. Get an instant confirmation code sent to your inbox.", color: "blue" },
            { num: "3", title: "Pick it up", desc: "Head to the business and show your code. Plans changed? Cancel instantly from your email.", color: "orange" },
          ].map((s) => (
            <div key={s.num} className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-lg transition-all">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white bg-${s.color}-500`}>
                {s.num}
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">{s.title}</h3>
              <p className="text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
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
                Stop throwing away good food. Post on GAWA Loop in seconds, reach people nearby, and reduce waste — all for free.
              </p>
              <div className="mb-8 space-y-4">
                {[
                  "Post food listings in under 60 seconds",
                  "Customers get email confirmations automatically",
                  "Track donations and value on your dashboard",
                  "Build reputation as a community-first business",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white text-xs font-black">✓</div>
                    <p className="text-slate-300">{text}</p>
                  </div>
                ))}
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
            <div className="flex justify-center">
              <div className="rounded-3xl bg-white/10 p-12 ring-1 ring-white/20">
                <Image src="/gawa-logo-green.png" width={180} height={180} alt="GAWA Loop logo" style={{ objectFit: "contain" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY SECTION */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">Why GAWA Loop?</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">Built to make food sharing simple, safe, and reliable.</p>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: "Safe reservations", desc: "Each claim gets a unique confirmation code. Only one person can claim each listing — no double bookings, ever." },
            { title: "Email confirmation", desc: "Instant email with your code, business details, map directions, and a one-click cancel option if plans change." },
            { title: "Easy directions", desc: "Tap the address to open Google Maps, Apple Maps, or Waze. Get there fast with turn-by-turn directions." },
            { title: "Real-time updates", desc: "Listings refresh automatically. When food is claimed or expires, everyone sees the update instantly." },
            { title: "Completely free", desc: "No fees, no subscriptions, no hidden costs. GAWA Loop is free for customers and businesses. Always." },
            { title: "Reduce food waste", desc: "Every claim prevents good food from being thrown away. Together we make a real environmental impact." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-8 hover:shadow-md transition">
              <h3 className="mb-2 text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-green-500 to-emerald-600">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="mb-8 flex justify-center">
            <div className="rounded-3xl bg-white/20 p-10 backdrop-blur-sm">
              <Image src="/gawa-logo-green.png" width={160} height={160} alt="GAWA Loop logo" style={{ objectFit: "contain" }} />
            </div>
          </div>
          <h2 className="mb-4 text-4xl font-extrabold text-white">Ready to get started?</h2>
          <p className="mb-10 text-lg text-green-100">Join your community. Find free food or share yours — it takes less than a minute.</p>
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
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <Image src="/gawa-logo-green.png" width={32} height={32} alt="GAWA Loop logo" style={{ objectFit: "contain" }} />
              <span className="font-bold text-slate-900">GAWA Loop</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              <Link href="/browse" className="hover:text-slate-900 transition">Browse Food</Link>
              <Link href="/business/signup" className="hover:text-slate-900 transition">For Businesses</Link>
              <Link href="/business/login" className="hover:text-slate-900 transition">Business Login</Link>
              <Link href="/support" className="hover:text-slate-900 transition">Support</Link>
            </div>
            <div className="text-sm text-slate-400">Free food. Less waste. Real impact.</div>
          </div>
        </div>
      </footer>

    </main>
  );
}