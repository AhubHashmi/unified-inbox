"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ConversationSummary } from "@/lib/adapters/types";
import { avatarColor, initial } from "@/lib/avatar-color";
import { formatPhone } from "@/lib/phone";

const POLL_INTERVAL_MS = 4000;

type FilterKey = "all" | "human" | "ai";

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function previewPrefix(conv: ConversationSummary): string {
  if (conv.lastMessageDirection !== "outbound") return "";
  switch (conv.lastMessageSender) {
    case "human":
      return "Agent: ";
    case "template":
      return "Template: ";
    case "system":
      return "System: ";
    case "ai":
    case null:
      return "AI: ";
    default:
      return "You: "; // brands that don't track senders
  }
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
  const [filter, setFilter] = useState<FilterKey>("all");
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

  const supportsTakeover = conversations.some((c) => c.aiEnabled !== undefined);
  const humanCount = conversations.filter((c) => c.aiEnabled === false).length;

  const filters: Array<{ key: FilterKey; label: string; count: number }> = supportsTakeover
    ? [
        { key: "all", label: "All", count: conversations.length },
        { key: "human", label: "Needs agent", count: humanCount },
        { key: "ai", label: "AI active", count: conversations.length - humanCount },
      ]
    : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return conversations.filter((c) => {
      if (filter === "human" && c.aiEnabled !== false) return false;
      if (filter === "ai" && c.aiEnabled === false) return false;
      if (!q) return true;
      return (
        (c.customerName ?? "").toLowerCase().includes(q) ||
        (digits.length > 0 && c.phoneNumber.includes(digits))
      );
    });
  }, [conversations, query, filter]);

  return (
    <aside className="safe-top flex h-full w-full flex-col border-r border-neutral-800/80 bg-neutral-950">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
            title="All brands"
            aria-label="All brands"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {brandName.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight text-neutral-100">{brandName}</p>
            <p className="text-xs text-neutral-500">
              {conversations.length} chat{conversations.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="rounded-lg px-2.5 py-1.5 text-xs text-neutral-500 transition hover:bg-neutral-900 hover:text-neutral-200"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="px-3">
        <label className="flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2.5 ring-1 ring-transparent transition focus-within:ring-neutral-700">
          <svg className="h-4 w-4 shrink-0 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or number"
            className="w-full bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-neutral-500 hover:text-neutral-300"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </label>
      </div>

      {filters.length > 0 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto px-3 pb-1 text-sm">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                filter === f.key
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 text-[11px] ${
                  filter === f.key ? "bg-white/20" : "bg-neutral-800 text-neutral-500"
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-neutral-500">
            {query
              ? "No chats match your search."
              : filter === "human"
                ? "No chats need an agent right now."
                : "No conversations yet."}
          </p>
        )}

        {filtered.map((conv) => {
          const isActive = conv.id === activeId;
          const label = conv.customerName || formatPhone(conv.phoneNumber);
          return (
            <Link
              key={conv.id}
              href={`/inbox/${brandId}/${conv.id}`}
              className={`mx-2 flex items-center gap-3 rounded-xl px-2.5 py-3 transition ${
                isActive ? "bg-neutral-800/90" : "hover:bg-neutral-900"
              }`}
            >
              <span
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
                style={{ backgroundColor: avatarColor(conv.phoneNumber) }}
              >
                {initial(conv.customerName, conv.phoneNumber)}
                {conv.aiEnabled === false && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-neutral-950 bg-emerald-500"
                    title="A human agent is handling this chat"
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[15px] font-medium text-neutral-100">{label}</p>
                  <span className="shrink-0 text-[11px] text-neutral-500">
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm text-neutral-500">
                    <span className="text-neutral-400">{previewPrefix(conv)}</span>
                    {conv.lastMessagePreview ?? "No messages yet"}
                  </p>
                  {conv.aiEnabled === false && (
                    <span className="shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      Human
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
