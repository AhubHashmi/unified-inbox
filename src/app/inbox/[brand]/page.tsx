export default function InboxEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-neutral-900 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800/80 text-neutral-400">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM2.25 12c0 4.556 4.03 8.25 9 8.25a9.764 9.764 0 002.555-.337A5.972 5.972 0 0018.75 21c.32 0 .633-.025.939-.074a.75.75 0 00.372-1.304 5.99 5.99 0 01-1.31-2.126C20.867 16.04 21.75 14.103 21.75 12c0-4.556-4.03-8.25-9-8.25s-9 3.694-9 8.25z"
          />
        </svg>
      </span>
      <p className="font-medium text-neutral-200">Select a conversation</p>
      <p className="max-w-xs text-sm text-neutral-500">
        Pick a chat from the list to read the history, reply as an agent, or switch the AI on or off.
      </p>
    </div>
  );
}
