import Image from "next/image";
import Link from "next/link";

function GawaLogo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/gawa-logo-green.png"
      alt="GAWA Loop logo"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-green-600">
      {children}
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 transition hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  colorClass,
}: {
  step: string;
  title: string;
  description: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white ${colorClass}`}
      >
        {step}
      </div>
      <h3 className="mb-3 text-xl font-bold text-slate-900">{title}</h3>
      <p className="leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

function BusinessBenefit({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-black text-white">
        ✓
      </div>
      <p className="text-slate-300">{children}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 ring-1 ring-green-100">
              <GawaLogo size={28} />
            </div>
            <span className="text-lg font-bold text-slate-900">GAWA Loop</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/browse"
              className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:block"
            >
              Browse Food
            </Link>
            <Link
              href="/business/login"
              className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:block"
            >
              Business Login
            </Link>
            <Link
              href="/business/signup"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
            >
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
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                Live food available now in your area
              </div>

              <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-6xl">
                Free food,
                <br />
                <span className="text-green-600">zero waste.</span>
              </h1>

              <p className="mb-8 text-xl leading-relaxed text-slate-600">
                GAWA Loop connects local restaurants, hotels, and stores with
                people in the community — sharing surplus food before it goes to
                waste.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/browse"
                  className="rounded-xl bg-green-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-green-200 transition hover:bg-green-700"
                >
                  Find Free Food Near Me
                </Link>
                <Link
                  href="/business/signup"
                  className="rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 transition hover:border-green-300 hover:text-green-700"
                >
                  I am a Business
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div>
                  <span className="font-bold text-slate-900">100%</span> Free to
                  use
                </div>
                <div className="hidden h-4 w-px bg-slate-200 sm:block" />
                <div>
                  <span className="font-bold text-slate-900">Real-time</span>{" "}
                  listings
                </div>
                <div className="hidden h-4 w-px bg-slate-200 sm:block" />
                <div>
                  <span className="font-bold text-slate-900">NYC</span> based
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-green-200 via-emerald-100 to-teal-100 opacity-60 blur-3xl" />
                <div className="relative flex flex-col items-center justify-center rounded-3xl bg-white px-14 py-12 shadow-2xl ring-1 ring-green-100">
                  <GawaLogo size={200} />
                  <div className="mt-6 flex items-center gap-2 rounded-full bg-green-50 px-4 py-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-semibold text-green-700">
                      Food available now
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-green-600">FREE</div>
              <div className="mt-1 text-sm text-slate-500">
                Always free for customers
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-emerald-600">LIVE</div>
              <div className="mt-1 text-sm text-slate-500">
                Real-time food listings
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-lime-600">FAST</div>
              <div className="mt-1 text-sm text-slate-500">
                Claim food in seconds
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-teal-600">LOCAL</div>
              <div className="mt-1 text-sm text-slate-500">
                From your neighborhood
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionBadge>For food seekers</SectionBadge>
        <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">
          Get free food in 3 steps
        </h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">
          No membership, no fees. Just browse, claim, and pick up.
        </p>

        <div className="grid gap-8 md:grid-cols-3">
          <StepCard
            step="1"
            title="Browse live listings"
            description="See available food from restaurants and stores near you, updated in real time."
            colorClass="bg-green-600"
          />
          <StepCard
            step="2"
            title="Claim your food"
            description="Reserve in seconds with your name and email. Get an instant confirmation code sent to your inbox."
            colorClass="bg-emerald-600"
          />
          <StepCard
            step="3"
            title="Pick it up"
            description="Head to the business and show your code. Plans changed? Cancel instantly from your email."
            colorClass="bg-teal-600"
          />
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/browse"
            className="inline-block rounded-xl bg-green-600 px-8 py-4 font-bold text-white shadow-lg shadow-green-100 transition hover:bg-green-700"
          >
            Browse Available Food Now
          </Link>
        </div>
      </section>

      {/* FOR BUSINESSES */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-green-400">
                For restaurants and stores
              </div>

              <h2 className="mb-6 text-4xl font-extrabold leading-tight">
                Turn surplus food into
                <br />
                <span className="text-green-400">community goodwill</span>
              </h2>

              <p className="mb-8 text-lg leading-relaxed text-slate-300">
                Stop throwing away good food. Post on GAWA Loop in seconds,
                reach people nearby, and reduce waste — all for free.
              </p>

              <div className="mb-8 space-y-4">
                <BusinessBenefit>
                  Post food listings in under 60 seconds
                </BusinessBenefit>
                <BusinessBenefit>
                  Customers get email confirmations automatically
                </BusinessBenefit>
                <BusinessBenefit>
                  Track donations and value on your dashboard
                </BusinessBenefit>
                <BusinessBenefit>
                  Build reputation as a community-first business
                </BusinessBenefit>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/business/signup"
                  className="rounded-xl bg-green-600 px-8 py-4 font-bold text-white transition hover:bg-green-700"
                >
                  Join as a Business — Free
                </Link>
                <Link
                  href="/business/login"
                  className="rounded-xl border border-white/20 px-8 py-4 font-bold text-white transition hover:bg-white/10"
                >
                  Business Login
                </Link>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="rounded-3xl bg-white p-10 shadow-2xl ring-1 ring-white/20">
                <GawaLogo size={180} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-4xl font-extrabold text-slate-900">
          Why GAWA Loop?
        </h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">
          Built to make food sharing simple, safe, and reliable.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            title="Safe reservations"
            description="Each claim gets a unique confirmation code. Only one person can claim each listing — no double bookings."
          />
          <FeatureCard
            title="Email confirmation"
            description="Instant email with your code, business details, map directions, and a one-click cancel option."
          />
          <FeatureCard
            title="Easy directions"
            description="Tap the address to open Google Maps, Apple Maps, or Waze for fast turn-by-turn directions."
          />
          <FeatureCard
            title="Real-time updates"
            description="Listings refresh automatically. When food is claimed or expires, everyone sees the update instantly."
          />
          <FeatureCard
            title="Completely free"
            description="No fees, no subscriptions, no hidden costs. GAWA Loop is free for customers and businesses."
          />
          <FeatureCard
            title="Reduce food waste"
            description="Every claim prevents good food from being thrown away. Together we create real community impact."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-green-600 to-emerald-700">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="mb-8 flex justify-center">
            <div className="rounded-3xl bg-white p-8 shadow-xl">
              <GawaLogo size={150} />
            </div>
          </div>

          <h2 className="mb-4 text-4xl font-extrabold text-white">
            Ready to get started?
          </h2>
          <p className="mb-10 text-lg text-green-100">
            Join your community. Find free food or share yours — it takes less
            than a minute.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/browse"
              className="rounded-xl bg-white px-8 py-4 text-base font-bold text-green-700 shadow-lg transition hover:bg-green-50"
            >
              Find Free Food
            </Link>
            <Link
              href="/business/signup"
              className="rounded-xl border-2 border-white/40 px-8 py-4 text-base font-bold text-white transition hover:bg-white/10"
            >
              Register Your Business
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <GawaLogo size={32} />
              <span className="font-bold text-slate-900">GAWA Loop</span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              <Link href="/browse" className="transition hover:text-slate-900">
                Browse Food
              </Link>
              <Link
                href="/business/signup"
                className="transition hover:text-slate-900"
              >
                For Businesses
              </Link>
              <Link
                href="/business/login"
                className="transition hover:text-slate-900"
              >
                Business Login
              </Link>
              <Link href="/support" className="transition hover:text-slate-900">
                Support
              </Link>
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