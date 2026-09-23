import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrand } from "@/lib/brands";
import { getAdapter } from "@/lib/adapters/registry";

type ConversationPageProps = {
  params: Promise<{ brand: string; conversationId: string }>;
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

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { brand: brandId, conversationId } = await params;
  const brand = getBrand(brandId);
  if (!brand) notFound();

  const adapter = getAdapter(brand.id);
  const conversation = adapter.isConnected()
    ? await adapter.getConversation(conversationId)
    : null;

  if (!conversation) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/inbox/${brand.id}`}
            className="text-sm text-neutral-400 hover:text-white"
          >
            ← {brand.name} inbox
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {conversation.customerName || conversation.phoneNumber}
          </h1>
          {conversation.customerName && (
            <p className="text-sm text-neutral-500">
              {conversation.phoneNumber}
            </p>
          )}
        </div>
        <span className="h-fit rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-400">
          {conversation.status}
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        {conversation.messages.length === 0 && (
          <p className="text-neutral-500">No messages in this conversation.</p>
        )}
        {conversation.messages.map((message) => {
          const isOutbound = message.direction === "outbound";
          return (
            <div
              key={message.id}
              className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  isOutbound
                    ? "bg-indigo-600 text-white"
                    : "bg-neutral-800 text-neutral-100"
                }`}
              >
                <p className="whitespace-pre-wrap">
                  {message.body ?? "(no text)"}
                </p>
                <p
                  className={`mt-1 text-[10px] ${
                    isOutbound ? "text-indigo-200" : "text-neutral-500"
                  }`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
