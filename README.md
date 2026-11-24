> Migration baseline: start with [current status](docs/migration/STATUS.md) and [feature tracker](docs/migration/FEATURES.md). The original documentation below contains historical descriptions; live setup is not certified.

# Dearly — Your days, held close

A Next.js App Router social journal with a responsive lavender interface, private journal entries, Supabase authentication, private media uploads, shared spaces, connections, and games.

## Start

Node.js 22+ and pnpm are recommended.

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

With no Supabase configuration, `/my-day` opens a clearly labeled, in-memory sample journal. Demo edits are lost on navigation or refresh; they are never presented as cloud saves. Only the theme preference uses localStorage. The demo does not simulate accounts, invitations, friends, shared spaces, or multiplayer saves.

## Connect Supabase

1. Create a new Supabase project and run `supabase/migrations/001_dearly.sql` in its SQL editor (or apply it through the Supabase CLI migration workflow).
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` and the Vercel project environment. Use the project URL and publishable key, never the service role key in public variables.
3. Enable email/password authentication. Set the Auth Site URL to the deployed origin and allow `<origin>/auth/callback` and `<origin>/auth/callback?next=/login?reset=1` redirect URLs, plus local development equivalents.
4. For automated account deletion only, set the **server-only** `SUPABASE_SERVICE_ROLE_KEY`. It is never used for ordinary reads/writes. Deletion requires the user's current password and explicit DELETE confirmation.
5. Redeploy, create two test accounts, and complete each profile. Test the checklist below before production use.

The SQL creates the private `journal-media` bucket with a 20 MB limit and an image/audio MIME allowlist. Images and recordings are accessed with one-hour signed URLs, generated through the user's RLS-scoped client. Upload progress is based on XHR upload events. Deleted entries stop granting new media access; previously issued URLs remain valid until expiry. Orphaned uploaded files remain in the owner's private folder until account deletion; schedule an orphan cleanup before operating at scale.

## Routes

- `/about`: public marketing page
- `/login`: sign-in, sign-up, password reset and update
- `/auth/callback`: code exchange for email verification/recovery
- `/my-day`: date navigation, mood check-in, meals, voice recording, reflection, entry feed
- `/journal`: search, type filters, activity calendar and edit/delete
- `/memories`: archive, photo/audio display, saved-entry counts and historical memories
- `/spaces`: creation, invitations, member management, shared timeline, comments and reactions
- `/friends`: exact username search, request/accept/decline/remove/block
- `/play`: Memory Match, shared daily-question rounds and Know Me rounds
- `/notifications`: persistent unread list and mark-all-read
- `/settings`: profile, timezone, notification preferences, theme, sign-out and account deletion

## Data and authorization

Tables: `profiles`, `connections`, `shared_spaces`, `shared_space_members`, `space_invitations`, `journal_entries`, `entry_comments`, `entry_reactions`, `notifications`, `game_sessions`, `game_answers`.

Meals, achievements, moods and media references use the unified `journal_entries` table rather than duplicate ownership/sharing records. JSON metadata holds meal slot/time/skipped status and recording duration.

Every application table has RLS. Entries are owner writable; reads allow the owner or members of an explicitly selected space. Membership writes use narrowly scoped SECURITY DEFINER functions. Invitation tokens contain 32 random bytes and are stored only as SHA-256 hashes. Codes expire after seven days and can be revoked. Only owners can issue invitations or remove other members. Account profile search returns only id, display name and username for an exact match. Connection writes enforce requester/recipient roles in an RPC. Blocking prevents search and new requests and removes membership in spaces owned by either party; it does not hide historical content in a third-party-owned space where both remain members. Game answers are immutable and other answers are hidden until the current user submits.

Database-backed features use authenticated Supabase clients with RLS. API routes validate sessions using `getUser()`, validate entry/profile input with Zod, and reject cross-origin mutations. Cookie refresh runs in the Next.js proxy. No private journal content is sent to AI services.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Validation tests cover forged ownership input, private defaults, dates, input bounds, MIME/size limits, profile rules, and timezone boundaries.

### Required connected acceptance test

Use two accounts A/B and a third nonmember C:

- A creates a private entry; B and C cannot fetch it directly through the REST API.
- A creates a space, invites B, and explicitly shares an entry. B can read it; C cannot.
- B cannot change ownership, add memberships directly, issue invitations, or edit A's entries.
- Expired/revoked codes fail; removing B removes access to shared entries and new media URLs.
- Upload an image and recording, refresh, and verify playback. Other users cannot access private object paths.
- Request/accept a connection, then block; check both search and new requests.
- Submit one game answer; confirm another member cannot see it before answering. Scores compare the host's answer with each guest's case-insensitive trimmed guess.
- Confirm account deletion removes storage objects, account data, and owned spaces.

## Deployment

A separate Vercel project named `dearly` is used. No existing project or domain should be overwritten. Deploy the checked source as a preview; configure Supabase variables and run connected tests before promoting a production deployment. Vercel's existing deployment protection is preserved.

## Known limitations

- Supabase credentials were not available during implementation. Migration execution, real authentication, RLS behavior, email delivery, uploads and multiplayer round trips must be verified against a configured project.
- Refresh controls are used rather than realtime subscriptions.
- Plain-text composition; no rich text formatting or persistent draft recovery.
- One attachment per entry; multiple meal photos, avatar/cover uploads, stickers and custom color themes are not implemented.
- Google OAuth is not enabled.
- Notifications currently cover connection requests and new shared entries, not every reaction/comment/game event.
- Know Me uses one comfort-food question per round and computes scores from immutable database answers; there is no separate persisted score table.
- Daily Question supports new shared rounds rather than enforcing exactly one prompt per calendar day.
- The archive fetches the latest 500 accessible entries; older-page pagination is not implemented.
- No dedicated rate limiter or media malware scan is configured. Use Supabase Auth rate limits, verify email delivery configuration, and add production abuse controls before opening registration broadly.
- Supabase PostgreSQL RLS integration tests require a live/local Supabase instance; unit tests alone do not establish production security.

The decorative journal, planets, flowers and stars are lightweight CSS and typographic illustrations. The clearly labeled sample breakfast photo uses an Unsplash image; user accounts start empty.
