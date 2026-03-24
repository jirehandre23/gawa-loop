import Link from "next/link";

function GawaLoopIcon({ size = 40, color = "#16a34a" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hand base - palm */}
      <path
        d="M40 170 C30 158 25 140 35 122 L60 88 C64 82 72 80 78 84 C78 84 78 84 79 85"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Thumb curl */}
      <path
        d="M60 150 C48 142 38 130 42 114"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      {/* Palm flat bottom */}
      <path
        d="M40 170 C50 185 70 192 90 190 L140 190 C160 190 176 178 180 160 L190 128 C192 118 186 108 176 108 C174 108 172 108 170 110"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Index finger */}
      <path
        d="M79 85 L82 48 C82 42 88 38 94 40 C100 42 102 48 101 54 L98 110"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Middle finger */}
      <path
        d="M98 110 L101 54 C101 48 107 44 113 46 C119 48 121 54 120 60 L118 110"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Ring finger */}
      <path
        d="M118 110 L120 60 C120 54 126 50 132 52 C138 54 140 62 140 68 L138 110"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Pinky */}
      <path
        d="M138 110 L140 68 C140 62 146 58 152 60 C158 62 160 70 158 76 L152 110"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Bowl bottom */}
      <rect
        x="70"
        y="110"
        width="90"
        height="18"
        rx="9"
        stroke={color}
        strokeWidth="9"
        fill="none"
      />
      {/* Bowl rim (lid tray) */}
      <rect
        x="62"
        y="96"
        width="106"
        height="16"
        rx="8"
        stroke={color}
        strokeWidth="8"
        fill="none"
      />
      {/* Tall container center */}
      <rect
        x="97"
        y="28"
        width="36"
        height="70"
        rx="6"
        stroke={color}
        strokeWidth="8"
        fill="none"
      />
      {/* Container handle/lid */}
      <rect
        x="108"
        y="16"
        width="14"
        height="14"
        rx="4"
        stroke={color}
        strokeWidth="7"
        fill="none"
      />
      {/* Leaning bag/packet left */}
      <path
        d="M90 95 L78 40 C77 34 82 28 88 29 L100 30"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Bag lines */}
      <line x1="80" y1="52" x2="97" y2="48" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <line x1="78" y1="64" x2="96" y2="60" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function GawaLoopIconHero({ color = "#16a34a" }: { color?: string }) {
  return (
    <svg
      width="220"
      height="240"
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M40 170 C30 158 25 140 35 122 L60 88 C64 82 72 80 78 84 C78 84 78 84 79 85"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M60 150 C48 142 38 130 42 114"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M40 170 C50 185 70 192 90 190 L140 190 C160 190 176 178 180 160 L190 128 C192 118 186 108 176 108 C174 108 172 108 170 110"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M79 85 L82 48 C82 42 88 38 94 40 C100 42 102 48 101 54 L98 110"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M98 110 L101 54 C101 48 107 44 113 46 C119 48 121 54 120 60 L118 110"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M118 110 L120 60 C120 54 126 50 132 52 C138 54 140 62 140 68 L138 110"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M138 110 L140 68 C140 62 146 58 152 60 C158 62 160 70 158 76 L152 110"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="70" y="110" width="90" height="18" rx="9" stroke={color} strokeWidth="9" fill="none" />
      <rect x="62" y="96" width="106" height="16" rx="8" stroke={color} strokeWidth="8" fill="none" />
      <rect x="97" y="28" width="36" height="70" rx="6" stroke={color} strokeWidth="8" fill="none" />
      <rect x="108" y="16" width="14" height="14" rx="4" stroke={color} strokeWidth="7" fill="none" />
      <path
        d="M90 95 L78 40 C77 34 82 28 88 29 L100 30"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="80" y1="52" x2="97" y2="48" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <line x1="78" y1="64" x2="96" y2="60" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 ring-2 ring-green-100">
              <GawaLoopIcon size={28} color="#16a34a" />
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
                <Link href="/browse"
                  className="rounded-xl bg-green-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-green-200 hover:bg-green-600 transition">
                  Find Free Food Near Me
                </Link>
                <Link href="/business/signup"
                  className="rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 hover:border-green-300 hover:text-green-700 transition">
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

            {/* HERO ICON */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-green-200 via-emerald-100 to-teal-100 blur-3xl opacity-60"></div>
                <div className="relative flex flex-col items-center justify-center rounded-3xl bg-white px-14 py-12 shadow-2xl ring-1 ring-green-100">
                  <GawaLoopIconHero color="#16a34a" />
                  <div className="mt-4 flex items-center gap-2 rounded-full bg-green-50 px-4 py-2">
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
          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-lg hover:border-green-200 transition-all">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
              <GawaLoopIcon size={34} color="#16a34a" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Browse live listings</h3>
            <p className="text-slate-500 leading-relaxed">See available food from restaurants and stores near you, updated in real time. Tap any address to open your maps app.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
              <GawaLoopIcon size={34} color="#3b82f6" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Claim your food</h3>
            <p className="text-slate-500 leading-relaxed">Reserve a listing in seconds with your name and email. Get an instant confirmation code with directions sent to your inbox.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
              <GawaLoopIcon size={34} color="#f97316" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Pick it up</h3>
            <p className="text-slate-500 leading-relaxed">Head to the business and show your code. Plans changed? Cancel instantly from your email — no hassle.</p>
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
                Stop throwing away good food. Post your surplus on GAWA Loop in seconds, reach people nearby, and reduce waste — all for free.
              </p>
              <div className="mb-8 space-y-4">
                {["Post food listings in under 60 seconds", "Customers get email confirmations automatically", "Track donations and value on your dashboard", "Build reputation as a community-first business"].map((text) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500">
                      <span className="text-xs font-black text-white">V</span>
                    </div>
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
            <div className="grid grid-cols-2 gap-4">
              {[
                { color: "#4ade80", label: "$0", sub: "Setup cost", desc: "Always free to post" },
                { color: "#60a5fa", label: "60s", sub: "To post food", desc: "Quick and simple" },
                { color: "#fb923c", label: "Live", sub: "Customer alerts", desc: "Real-time notifications" },
                { color: "#c084fc", label: "Full", sub: "Dashboard access", desc: "Track all donations" },
              ].map((item) => (
                <div key={item.sub} className="rounded-2xl bg-white/5 border border-white/10 p-6">
                  <div className="mb-3"><GawaLoopIcon size={28} color={item.color} /></div>
                  <div className="text-2xl font-black" style={{ color: item.color }}>{item.label}</div>
                  <div className="text-sm font-semibold text-white mt-1">{item.sub}</div>
                  <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY SECTION */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">Why GAWA Loop?</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">
          Built to make food sharing simple, safe, and reliable — for businesses and communities alike.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { color: "#16a34a", bg: "bg-green-50", title: "Safe reservations", desc: "Each claim gets a unique confirmation code. Only one person can claim each listing — no double bookings, ever." },
            { color: "#3b82f6", bg: "bg-blue-50", title: "Email confirmation", desc: "Instant email with your code, business details, map directions, and a one-click cancel option if plans change." },
            { color: "#f97316", bg: "bg-orange-50", title: "Easy directions", desc: "Tap the address to open Google Maps, Apple Maps, or Waze. Get there fast with turn-by-turn directions." },
            { color: "#8b5cf6", bg: "bg-purple-50", title: "Real-time updates", desc: "Listings refresh automatically. When food is claimed or expires, everyone sees the update instantly." },
            { color: "#eab308", bg: "bg-yellow-50", title: "Completely free", desc: "No fees, no subscriptions, no hidden costs. GAWA Loop is free for customers and businesses. Always." },
            { color: "#14b8a6", bg: "bg-teal-50", title: "Reduce food waste", desc: "Every claim prevents good food from being thrown away. Together we make a real environmental impact." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-8 hover:shadow-md transition">
              <div className={"mb-4 flex h-12 w-12 items-center justify-center rounded-xl " + item.bg}>
                <GawaLoopIcon size={28} color={item.color} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BOTTOM */}
      <section className="bg-gradient-to-br from-green-500 to-emerald-600">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="mb-8 flex justify-center">
            <div className="rounded-3xl bg-white/20 p-8 backdrop-blur-sm">
              <GawaLoopIconHero color="white" />
            </div>
          </div>
          <h2 className="mb-4 text-4xl font-extrabold text-white">Ready to get started?</h2>
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
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 ring-1 ring-green-200">
                <GawaLoopIcon size={20} color="#16a34a" />
              </div>
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

