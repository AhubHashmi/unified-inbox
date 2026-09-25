"use client";

import { useParams } from "next/navigation";

/**
 * Mobile: one pane at a time (list, or the open chat) like the WhatsApp app.
 * Tablet/desktop (md+): list and chat side by side.
 */
export function InboxShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const params = useParams<{ conversationId?: string }>();
  const hasOpenChat = Boolean(params.conversationId);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-neutral-950">
      <div
        className={`${
          hasOpenChat ? "hidden md:flex" : "flex"
        } h-full w-full shrink-0 md:w-80 lg:w-96`}
      >
        {sidebar}
      </div>
      <div
        className={`${
          hasOpenChat ? "flex" : "hidden md:flex"
        } h-full min-w-0 flex-1 flex-col`}
      >
        {children}
      </div>
    </div>
  );
}
