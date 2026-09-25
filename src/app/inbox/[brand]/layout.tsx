import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrand } from "@/lib/brands";
import { getAdapter } from "@/lib/adapters/registry";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { InboxShell } from "@/components/InboxShell";

type InboxLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ brand: string }>;
};

export default async function InboxLayout({
  children,
  params,
}: InboxLayoutProps) {
  const { brand: brandId } = await params;
  const brand = getBrand(brandId);
  if (!brand) notFound();

  const adapter = getAdapter(brand.id);
  const connected = adapter.isConnected();
  const conversations = connected ? await adapter.listConversations() : [];

  if (!connected) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 text-center">
        <span
          className="mb-4 inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: brand.color }}
        />
        <h1 className="mb-2 text-lg font-medium">{brand.name}</h1>
        <p className="text-neutral-500">
          Not connected yet. No automation runs for this brand, so
          there&apos;s nothing to show here.
        </p>
        <Link href="/" className="mt-6 text-sm text-indigo-400 hover:text-indigo-300">
          ← All brands
        </Link>
      </main>
    );
  }

  return (
    <InboxShell
      sidebar={
        <ConversationSidebar
          brandId={brand.id}
          brandName={brand.name}
          brandColor={brand.color}
          conversations={conversations}
        />
      }
    >
      {children}
    </InboxShell>
  );
}
