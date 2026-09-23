"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationDetail } from "@/lib/adapters/types";
import { avatarColor, initial } from "@/lib/avatar-color";

const POLL_INTERVAL_MS = 4000;

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

  useEffect(() => {
    setConversation(initialConversation);
    lastMessageCount.current = initialConversation.messages.length;
  }, [initialConversation]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/inbox/${brandId}/${conversationId}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data.conversation) {
          setConversation(data.conversation);
        }
      } catch {
        // transient network/API error — keep showing the last good thread
      }
    };

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [brandId, conversationId]);

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
