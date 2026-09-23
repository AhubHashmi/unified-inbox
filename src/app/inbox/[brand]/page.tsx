import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrand } from "@/lib/brands";
import { getAdapter } from "@/lib/adapters/registry";

type InboxPageProps = {
  params: Promise<{ brand: string }>;
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function InboxPage({ params }: InboxPageProps) {
  const { brand: brandId } = await params;
  const brand = getBrand(brandId);
  if (!brand) notFound();

  const adapter = getAdapter(brand.id);
  const connected = adapter.isConnected();
  const conversations = connected ? await adapter.listConversations() : [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: brand.color }}
          />
          <h1 className="text-xl font-semibold">{brand.name}</h1>
        </div>
        <Link
          href="/"
          className="text-sm text-neutral-400 hover:text-white"
        >
          ← All brands
        </Link>
      </div>

      {!connected && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-neutral-400">
          {brand.name} isn&apos;t connected yet. No automation runs for this
          brand, so there&apos;s nothing to show here.
        </div>
      )}

      {connected && conversations.length === 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-neutral-400">
          No conversations yet.
        </div>
      )}

      {connected && conversations.length > 0 && (
        <ul className="divide-y divide-neutral-800 overflow-hidden rounded-lg border border-neutral-800">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <Link
                href={`/inbox/${brand.id}/${conv.id}`}
                className="flex items-center justify-between gap-4 bg-neutral-900 px-4 py-3 hover:bg-neutral-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {conv.customerName || conv.phoneNumber}
                  </p>
                  <p className="truncate text-sm text-neutral-500">
                    {conv.lastMessageDirection === "outbound" ? "You: " : ""}
                    {conv.lastMessagePreview ?? "No messages yet"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-neutral-500">
                  {formatTime(conv.lastMessageAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
