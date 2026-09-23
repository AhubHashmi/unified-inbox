"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ConversationSummary } from "@/lib/adapters/types";
import { avatarColor, initial } from "@/lib/avatar-color";

const POLL_INTERVAL_MS = 4000;

const TABS = [
  { key: "all", label: "All Chats" },
  { key: "unread", label: "Unread" },
  { key: "mine", label: "Mine" },
  { key: "calls", label: "Calls" },
  { key: "webchat", label: "Web Chat" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ConversationSidebar({
  brandId,
  brandName,
  brandColor,
  conversations: initialConversations,
}: {
  brandId: string;
  brandName: string;
  brandColor: string;
  conversations: ConversationSummary[];
}) {
  const params = useParams<{ conversationId?: string }>();
  const activeId = params.conversationId;
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [conversations, setConversations] = useState(initialConversations);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/inbox/${brandId}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
        }
      } catch {
        // transient network/API error — keep showing the last good list
      }
    };

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [brandId]);

  const filtered = useMemo(() => {
    if (tab !== "all") return [];
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        (c.customerName ?? "").toLowerCase().includes(q) ||
        c.phoneNumber.toLowerCase().includes(q),
    );
  }, [conversations, query, tab]);

  return (
    <aside className="flex h-full w-full max-w-xs flex-col border-r border-neutral-800 bg-neutral-950">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
          title="All brands"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: brandColor }}
          />
          <span className="font-medium text-neutral-200">{brandName}</span>
        </Link>
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2">
          <svg
            className="h-4 w-4 shrink-0 text-neutral-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone…"
            className="w-full bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
          />
        </div>
      </div>

      <div className="mt-3 flex gap-1 overflow-x-auto px-3 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 transition ${
              tab === t.key
                ? "bg-indigo-600 text-white"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex-1 overflow-y-auto">
        {tab !== "all" && (
          <p className="px-4 py-6 text-center text-sm text-neutral-500">
            {TABS.find((t) => t.key === tab)?.label} isn&apos;t available yet.
          </p>
        )}

        {tab === "all" && filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-neutral-500">
            {query ? "No matches." : "No conversations yet."}
          </p>
        )}

        {tab === "all" &&
          filtered.map((conv) => {
            const isActive = conv.id === activeId;
            const label = conv.customerName || conv.phoneNumber;
            return (
              <Link
                key={conv.id}
                href={`/inbox/${brandId}/${conv.id}`}
                className={`flex items-center gap-3 border-b border-neutral-900 px-3 py-3 transition ${
                  isActive ? "bg-neutral-800" : "hover:bg-neutral-900"
                }`}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{
                    backgroundColor: avatarColor(conv.phoneNumber),
                  }}
                >
                  {initial(conv.customerName, conv.phoneNumber)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-neutral-100">
                      {label}
                    </p>
                    <span className="shrink-0 text-[11px] text-neutral-500">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-neutral-500">
                    {conv.lastMessageDirection === "outbound" ? "You: " : ""}
                    {conv.lastMessagePreview ?? "No messages yet"}
                  </p>
                </div>
              </Link>
            );
          })}
      </div>
    </aside>
  );
}
