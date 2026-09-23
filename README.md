# Unified Inbox

A read-only monitoring dashboard across every brand: pick a brand on the
landing page, see its conversation list, and open a conversation to read its
message history and the customer's name/contact.

## Brands

| Brand | Status | Adapter |
|---|---|---|
| Appnality | Connected | Reads the `ai-website-builder` repo's WhatsApp tables (`Contact`/`Conversation`/`Message`) directly via `APPNALITY_DATABASE_URL` |
| Booknality | Connected | Reads Booknality's live Neon Postgres database via `BOOKNALITY_DATABASE_URL` (same table shape) |
| Taxnality, Explainedit, Buildbee, Blitzlabs, Ranknality | Not connected | No automation exists yet for these brands — shown as placeholders |

Adding a brand later means writing one new file in `src/lib/adapters/`
implementing the `InboxAdapter` interface (`src/lib/adapters/types.ts`) and
registering it in `src/lib/adapters/registry.ts` — nothing else changes.

## Setup

```bash
cp .env.example .env.local
# fill in SHARED_LOGIN_PASSWORD, SESSION_SECRET, and the DB URLs you have
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Auth is a single shared password for the whole team (everyone sees every
connected brand for now). Per-brand access restriction can be layered on top
of the existing session cookie later without a rework.

## Stack

Next.js (App Router) + TypeScript + Tailwind, `pg` for direct read-only
Postgres access per brand, `jose` for signed session cookies. No ORM/ dependency
on either source app — this app only ever reads.
