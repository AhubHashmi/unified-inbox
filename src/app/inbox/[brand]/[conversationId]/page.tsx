import { notFound } from "next/navigation";
import { getBrand } from "@/lib/brands";
import { getAdapter } from "@/lib/adapters/registry";
import { avatarColor, initial } from "@/lib/avatar-color";

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

  const label = conversation.customerName || conversation.phoneNumber;

  return (
    <div className="flex h-full flex-1 flex-col bg-neutral-900">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-5 py-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: avatarColor(conversation.phoneNumber) }}
          >
            {initial(conversation.customerName, conversation.phoneNumber)}
          </span>
          <div>
            <p className="font-medium text-neutral-100">{label}</p>
            {conversation.customerName && (
              <p className="text-xs text-neutral-500">
                {conversation.phoneNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-400">
            {conversation.status}
          </span>
          <a
            href={`tel:${conversation.phoneNumber}`}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            Call
          </a>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {conversation.messages.length === 0 && (
            <p className="text-center text-neutral-500">
              No messages in this conversation.
            </p>
          )}
          {conversation.messages.map((message) => {
            const isOutbound = message.direction === "outbound";
            return (
              <div
                key={message.id}
                className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                    isOutbound
                      ? "bg-indigo-600 text-white"
                      : "bg-neutral-800 text-neutral-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">
                    {message.body ?? "(no text)"}
                  </p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
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
      </div>
    </div>
  );
}
