import Link from "next/link";
import { BRANDS } from "@/lib/brands";
import { getAdapter } from "@/lib/adapters/registry";
import { initial } from "@/lib/avatar-color";

export default function BrandPickerPage() {
  const statuses = BRANDS.map((brand) => ({
    brand,
    connected: getAdapter(brand.id).isConnected(),
  }));
  const connectedCount = statuses.filter((s) => s.connected).length;

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(99,102,241,0.16) 0%, rgba(99,102,241,0) 70%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-14">
        <div className="mb-12 flex items-start justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-950/50">
                U
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Unified Inbox
              </h1>
            </div>
            <p className="text-sm text-neutral-400">
              One place to monitor every brand&apos;s conversations.
            </p>
          </div>
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-neutral-400 transition hover:border-neutral-700 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
          <span>Brands</span>
          <span className="h-1 w-1 rounded-full bg-neutral-700" />
          <span>
            {connectedCount} of {BRANDS.length} connected
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statuses.map(({ brand, connected }) => {
            const card = (
              <div
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${
                  connected
                    ? "border-neutral-800 bg-neutral-900/80 hover:-translate-y-0.5 hover:border-neutral-700 hover:bg-neutral-900 hover:shadow-xl hover:shadow-black/30"
                    : "border-neutral-900 bg-neutral-950"
                }`}
              >
                {connected && (
                  <div
                    className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-200 group-hover:opacity-30"
                    style={{ backgroundColor: brand.color }}
                  />
                )}

                <div className="relative mb-4 flex items-center justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-base font-semibold text-white ${
                      !connected && "opacity-40 grayscale"
                    }`}
                    style={{ backgroundColor: brand.color }}
                  >
                    {initial(brand.name, brand.name)}
                  </span>

                  {connected ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      Connected
                    </span>
                  ) : (
                    <span className="rounded-full bg-neutral-800/80 px-2.5 py-1 text-[11px] font-medium text-neutral-500">
                      Coming soon
                    </span>
                  )}
                </div>

                <div className="relative flex-1">
                  <p
                    className={`text-base font-medium ${
                      connected ? "text-neutral-100" : "text-neutral-500"
                    }`}
                  >
                    {brand.name}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {connected ? brand.tagline : "No automation wired up yet"}
                  </p>
                </div>

                {connected && (
                  <div className="relative mt-4 flex items-center gap-1 text-sm font-medium text-indigo-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    Open inbox
                    <svg
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );

            return connected ? (
              <Link key={brand.id} href={`/inbox/${brand.id}`} className="block">
                {card}
              </Link>
            ) : (
              <div key={brand.id} className="cursor-default">
                {card}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
