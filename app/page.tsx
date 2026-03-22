import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              Real-time community food sharing
            </div>

            <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
              Free food from local businesses, shared in real time.
            </h1>

            <p className="mb-8 max-w-xl text-lg text-slate-300">
              GAWA Loop helps restaurants, hotels, bakeries, and stores share
              extra food with nearby communities before it goes to waste.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/browse"
                className="rounded-xl bg-blue-500 px-6 py-3 font-medium text-white transition hover:bg-blue-600"
              >
                Find Free Food
              </Link>

              <Link
                href="/business/signup"
                className="rounded-xl bg-green-500 px-6 py-3 font-medium text-white transition hover:bg-green-600"
              >
                Join as a Business
              </Link>

              <Link
                href="/business/login"
                className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-medium text-white transition hover:bg-white/10"
              >
                Business Login
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-bold">Fast</div>
                <p className="mt-2 text-sm text-slate-300">
                  Businesses can post food in seconds.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-bold">Local</div>
                <p className="mt-2 text-sm text-slate-300">
                  People find food near their neighborhood.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-bold">Impactful</div>
                <p className="mt-2 text-sm text-slate-300">
                  Less waste, more community access.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="rounded-[32px] border border-white/10 bg-white p-6 shadow-2xl">
              <Image
                src="/logo.png"
                alt="GAWA Loop logo"
                width={520}
                height={520}
                className="h-auto w-full max-w-md"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="mb-8 text-3xl font-bold">How it works</h2>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-3 text-sm font-semibold text-blue-300">
                01
              </div>
              <h3 className="mb-2 text-xl font-semibold">Business posts food</h3>
              <p className="text-slate-300">
                Restaurants or stores list available food, quantity, timing, and
                pickup details.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-3 text-sm font-semibold text-green-300">
                02
              </div>
              <h3 className="mb-2 text-xl font-semibold">People claim it</h3>
              <p className="text-slate-300">
                Nearby users browse live listings, reserve food, and get a pickup
                code.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-3 text-sm font-semibold text-orange-300">
                03
              </div>
              <h3 className="mb-2 text-xl font-semibold">Food gets saved</h3>
              <p className="text-slate-300">
                Extra food reaches people instead of being wasted.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}