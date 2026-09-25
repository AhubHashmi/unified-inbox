"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ConversationDetail, ConversationMessage } from "@/lib/adapters/types";
import { avatarColor, initial } from "@/lib/avatar-color";
import { formatPhone, telHref, whatsappHref } from "@/lib/phone";

const POLL_INTERVAL_MS = 4000;
const MAX_REPLY_LENGTH = 4096;

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

/** Label for an outbound bubble. `undefined` sender = brand doesn't track senders (show nothing). */
function senderLabel(message: ConversationMessage): string | null {
  if (message.direction !== "outbound" || message.sender === undefined) return null;
  switch (message.sender) {
    case "human":
      return "Agent";
    case "template":
      return "Template";
    case "system":
      return "System";
    default:
      return "AI"; // "ai", or older rows written before senders were tracked
  }
}

function bubbleClasses(message: ConversationMessage): string {
  if (message.direction === "inbound") return "rounded-bl-md bg-neutral-800 text-neutral-100";
  switch (message.sender) {
    case "human":
      return "rounded-br-md bg-emerald-700 text-white";
    case "template":
      return "rounded-br-md border border-amber-500/50 bg-amber-950/70 text-amber-50";
    case "system":
      return "rounded-br-md bg-neutral-700 text-neutral-100";
    default:
      return "rounded-br-md bg-indigo-600 text-white";
  }
}

function IconButton({
  href,
  label,
  children,
  external,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      title={label}
      aria-label={label}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
    >
      {children}
    </a>
  );
}

export function ConversationThread({
  brandId,
  conversationId,
  initialConversation,
}: {
  brandId: string;
  conversationId: string;
  initialConversation: ConversationDetail;
}) {
  const [conversation, setConversation] = useState(initialConversation);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(initialConversation.messages.length);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const supportsTakeover = conversation.aiEnabled !== undefined;
  const canReply = Boolean(conversation.canReply);
  const label = conversation.customerName || formatPhone(conversation.phoneNumber);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/inbox/${brandId}/${conversationId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.conversation) setConversation(data.conversation);
    } catch {
      // transient network/API error — keep showing the last good thread
    }
  }, [brandId, conversationId]);

  useEffect(() => {
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Open the chat at the latest message.
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, []);

  // Follow new messages as they arrive.
  useEffect(() => {
    if (conversation.messages.length !== lastMessageCount.current) {
      lastMessageCount.current = conversation.messages.length;
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [conversation.messages.length]);

  // Grow the reply box with its content (up to ~6 lines).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/inbox/${brandId}/${conversationId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      // Full navigation so the sidebar's server-rendered list is fetched fresh.
      window.location.href = `/inbox/${brandId}`;
    } catch (err) {
      setIsDeleting(false);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete conversation.");
    }
  };

  const setAi = async (enabled: boolean) => {
    setIsToggling(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/inbox/${brandId}/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiEnabled: enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setConversation((c) => ({
        ...c,
        aiEnabled: data.aiEnabled,
        aiDisabledReason: data.aiEnabled ? null : "manual",
      }));
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update AI auto-replies.");
    } finally {
      setIsToggling(false);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/inbox/${brandId}/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setDraft("");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to send message.");
      await refresh(); // the AI may have been switched off even if sending failed
    } finally {
      setIsSending(false);
    }
  };

  const isTouch =
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-neutral-900">
      {/* Header */}
      <header className="safe-top border-b border-neutral-800 bg-neutral-950">
        <div className="flex items-center gap-2 px-2 py-2 sm:px-4">
          <Link
            href={`/inbox/${brandId}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-neutral-800 md:hidden"
            aria-label="Back to chats"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: avatarColor(conversation.phoneNumber) }}
          >
            {initial(conversation.customerName, conversation.phoneNumber)}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium leading-tight text-neutral-100">{label}</p>
            <p className="truncate text-xs text-neutral-500">
              {conversation.customerName ? formatPhone(conversation.phoneNumber) : "WhatsApp"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {supportsTakeover && (
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(conversation.aiEnabled)}
                onClick={() => void setAi(!conversation.aiEnabled)}
                disabled={isToggling || !canReply}
                title={canReply ? "AI auto-replies for this chat" : "Replying is not configured for this brand"}
                className="flex h-9 items-center gap-2 rounded-lg px-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
              >
                <span
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                    conversation.aiEnabled ? "bg-indigo-500" : "bg-neutral-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                      conversation.aiEnabled ? "translate-x-4.5" : "translate-x-0.5"
                    }`}
                  />
                </span>
                <span className="hidden sm:inline">{conversation.aiEnabled ? "AI on" : "AI off"}</span>
              </button>
            )}

            <IconButton href={telHref(conversation.phoneNumber)} label="Call">
              <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <span className="hidden lg:inline">Call</span>
            </IconButton>

            <IconButton href={whatsappHref(conversation.phoneNumber)} label="Open in WhatsApp" external>
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 004.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.02c-.24.68-1.42 1.3-1.95 1.35-.5.05-1.13.07-1.83-.12-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.17-.3.37-.43.5-.14.14-.29.3-.13.59.17.29.74 1.22 1.59 1.97 1.09.97 2.01 1.27 2.3 1.41.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.38-.24.65-.14.27.1 1.7.8 1.99.95.29.14.48.22.55.34.07.12.07.7-.17 1.38z" />
              </svg>
              <span className="hidden lg:inline">WhatsApp</span>
            </IconButton>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                aria-label="More actions"
                aria-expanded={isMenuOpen}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsConfirmOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-400 hover:bg-neutral-800"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete chat
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {conversation.ebooks && conversation.ebooks.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 pb-2 sm:px-4">
            {conversation.ebooks.map((ebook) => (
              <a
                key={ebook.link}
                href={ebook.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300 ring-1 ring-sky-500/20 transition hover:bg-sky-500/20"
                title="Open ebook preview"
              >
                <span aria-hidden>📘</span>
                <span className="max-w-[14rem] truncate">{ebook.title}</span>
              </a>
            ))}
          </div>
        )}
      </header>

      {supportsTakeover && !conversation.aiEnabled && (
        <div className="flex items-center justify-between gap-3 border-b border-emerald-900/60 bg-emerald-950/50 px-4 py-2 text-sm">
          <p className="text-emerald-200">
            {conversation.aiDisabledReason === "human_reply"
              ? "An agent took over. AI replies are paused for this chat."
              : "AI replies are paused for this chat."}
          </p>
          {canReply && (
            <button
              type="button"
              onClick={() => void setAi(true)}
              disabled={isToggling}
              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              Resume AI
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
          {conversation.messages.length === 0 && (
            <p className="py-10 text-center text-neutral-500">No messages in this conversation.</p>
          )}
          {conversation.messages.map((message, index, all) => {
            const isOutbound = message.direction === "outbound";
            const tag = senderLabel(message);
            const day = dayLabel(message.createdAt);
            const showDay = index === 0 || dayLabel(all[index - 1].createdAt) !== day;
            return (
              <Fragment key={message.id}>
                {showDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-neutral-800/80 px-3 py-1 text-[11px] font-medium text-neutral-400">
                      {day}
                    </span>
                  </div>
                )}
                <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed shadow-sm sm:max-w-[70%] ${bubbleClasses(message)}`}
                  >
                    {tag && (
                      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-75">{tag}</p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{message.body ?? "(no text)"}</p>
                    <p className={`mt-1 text-right text-[10px] ${isOutbound ? "opacity-70" : "text-neutral-500"}`}>
                      {formatClock(message.createdAt)}
                    </p>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Composer */}
      {canReply ? (
        <div className="safe-bottom border-t border-neutral-800 bg-neutral-950 px-3 pt-3 sm:px-4">
          <div className="mx-auto max-w-3xl">
            {actionError && <p className="mb-2 text-sm text-red-400">{actionError}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isTouch) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                maxLength={MAX_REPLY_LENGTH}
                rows={1}
                placeholder={conversation.aiEnabled ? "Reply as agent (pauses AI)…" : "Type a reply…"}
                className="max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-[15px] text-neutral-100 outline-none transition placeholder:text-neutral-500 focus:border-neutral-600"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending || !draft.trim()}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-40"
              >
                {isSending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1.5 hidden text-[11px] text-neutral-600 sm:block">
              Enter to send · Shift+Enter for a new line
            </p>
          </div>
        </div>
      ) : (
        actionError && <p className="border-t border-neutral-800 px-5 py-2 text-sm text-red-400">{actionError}</p>
      )}

      {/* Delete confirmation */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-white">Delete this chat?</h2>
            <p className="mb-4 text-sm text-neutral-400">
              This permanently deletes the conversation with{" "}
              <span className="text-neutral-200">{label}</span> and its entire message history from the
              database. This cannot be undone.
            </p>

            {deleteError && <p className="mb-4 text-sm text-red-400">{deleteError}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsConfirmOpen(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
