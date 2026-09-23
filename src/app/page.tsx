import Link from "next/link";
import { BRANDS } from "@/lib/brands";
import { getAdapter } from "@/lib/adapters/registry";

export default function BrandPickerPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Unified Inbox</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Pick a brand to see its conversations.
          </p>
        </div>
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-400 hover:text-white"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {BRANDS.map((brand) => {
          const connected = getAdapter(brand.id).isConnected();

          const card = (
            <div
              className={`group rounded-xl border p-5 transition ${
                connected
                  ? "border-neutral-800 bg-neutral-900 hover:border-neutral-600"
                  : "border-neutral-900 bg-neutral-950 opacity-60"
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: brand.color }}
                />
                <span className="text-lg font-medium">{brand.name}</span>
              </div>
              <p className="text-sm text-neutral-400">{brand.tagline}</p>
              {!connected && (
                <span className="mt-3 inline-block rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-500">
                  Not connected yet
                </span>
              )}
            </div>
          );

          return connected ? (
            <Link key={brand.id} href={`/inbox/${brand.id}`}>
              {card}
            </Link>
          ) : (
            <div key={brand.id} className="cursor-not-allowed">
              {card}
            </div>
          );
        })}
      </div>
    </main>
  );
}
