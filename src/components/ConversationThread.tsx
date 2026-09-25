"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationDetail, ConversationMessage } from "@/lib/adapters/types";
import { avatarColor, initial } from "@/lib/avatar-color";

const POLL_INTERVAL_MS = 4000;
const MAX_REPLY_LENGTH = 4096;

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
  if (message.direction === "inbound") return "bg-neutral-800 text-neutral-100";
  switch (message.sender) {
    case "human":
      return "bg-emerald-700 text-white";
    case "template":
      return "border border-amber-500/60 bg-amber-950/60 text-amber-50";
    case "system":
      return "bg-neutral-700 text-neutral-100";
    default:
      return "bg-indigo-600 text-white";
  }
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const supportsTakeover = conversation.aiEnabled !== undefined;
  const canReply = Boolean(conversation.canReply);

  useEffect(() => {
    setConversation(initialConversation);
    lastMessageCount.current = initialConversation.messages.length;
  }, [initialConversation]);

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

  useEffect(() => {
    if (conversation.messages.length !== lastMessageCount.current) {
      lastMessageCount.current = conversation.messages.length;
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [conversation.messages.length]);

  const label = conversation.customerName || conversation.phoneNumber;

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/inbox/${brandId}/${conversationId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      // Full navigation so the sidebar's server-rendered list is fetched
      // fresh, instead of waiting up to 4s for its next poll.
      window.location.href = `/inbox/${brandId}`;
    } catch (err) {
      setIsDeleting(false);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete conversation.",
      );
    }
  };

  const handleToggleAi = async () => {
    const next = !conversation.aiEnabled;
    setIsToggling(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/inbox/${brandId}/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiEnabled: next }),
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

  const aiStatusText = conversation.aiEnabled
    ? "AI auto-reply on"
    : conversation.aiDisabledReason === "human_reply"
      ? "AI off (human took over)"
      : "AI off";

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
          {supportsTakeover && (
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(conversation.aiEnabled)}
              onClick={handleToggleAi}
              disabled={isToggling || !canReply}
              title={
                canReply
                  ? "Switch AI auto-replies for this chat"
                  : "Replying is not configured for this brand"
              }
              className="flex items-center gap-2 rounded-md border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
            >
              <span
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition ${
                  conversation.aiEnabled ? "bg-indigo-500" : "bg-neutral-600"
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-white transition ${
                    conversation.aiEnabled ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </span>
              {aiStatusText}
            </button>
          )}
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
          <button
            onClick={() => setIsConfirmOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-900 px-3 py-1.5 text-sm font-medium text-red-400 transition hover:bg-red-950 hover:text-red-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete Chat
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {conversation.messages.length === 0 && (
            <p className="text-center text-neutral-500">
              No messages in this conversation.
            </p>
          )}
          {conversation.messages.map((message) => {
            const isOutbound = message.direction === "outbound";
            const tag = senderLabel(message);
            return (
              <div
                key={message.id}
                className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${bubbleClasses(message)}`}
                >
                  {tag && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                      {tag}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">
                    {message.body ?? "(no text)"}
                  </p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      isOutbound ? "opacity-70" : "text-neutral-500"
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

      {canReply && (
        <div className="border-t border-neutral-800 bg-neutral-950 px-5 py-3">
          <div className="mx-auto max-w-3xl">
            {actionError && (
              <p className="mb-2 text-sm text-red-400">{actionError}</p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                maxLength={MAX_REPLY_LENGTH}
                rows={2}
                placeholder={
                  conversation.aiEnabled
                    ? "Reply as an agent (this switches AI auto-replies off for this chat)…"
                    : "Reply as an agent…"
                }
                className="flex-1 resize-none rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-neutral-600"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending || !draft.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!canReply && actionError && (
        <p className="border-t border-neutral-800 px-5 py-2 text-sm text-red-400">{actionError}</p>
      )}

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-white">
              Delete this chat?
            </h2>
            <p className="mb-4 text-sm text-neutral-400">
              This permanently deletes the conversation with{" "}
              <span className="text-neutral-200">{label}</span> and its
              entire message history from the database. This cannot be
              undone.
            </p>

            {deleteError && (
              <p className="mb-4 text-sm text-red-400">{deleteError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsConfirmOpen(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
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
