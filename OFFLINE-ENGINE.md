# Dearly offline engine

## Files
- `lib/offline/db.ts`: IndexedDB database `dearly_offline_db`, outbox `pending_entries`, account-scoped local entries and active account marker. Commits are awaited before showing “Saved”. Blobs are stored directly, not base64.
- `lib/offline/sync-engine.ts`: durable personal-entry creation, automatic foreground reconnect sync, retry backoff, account validation, stable upload paths, and acknowledgment cleanup.
- `components/offline-engine.tsx`: online/visibility/auth listeners, sync status, manual retry, preparation status and optional persistent-storage request.
- `components/personal-journal.tsx`, `components/chat-media.tsx`: existing text/photo/MediaRecorder flows now save locally first.
- `app/offline-app/page.tsx`, `components/offline-app.tsx`: publicly cacheable shell containing the existing personal journal and solo arcade. Reads private content from local IndexedDB only; respects the device PIN.
- `public/sw.js`: versioned, cache-first offline shell and game/static assets. Authenticated HTML, API responses and storage requests are excluded.
- `public/service-worker.js`: compatibility import preserving the existing registration and push subscriptions.
- `scripts/build-offline-assets.mjs`: runs after `next build`; enumerates hashed JS/CSS/fonts and local game art into `public/offline-assets.json`. Game sounds are synthesized with Web Audio; marble/cookie graphics are SVG/CSS, bundled with the game code.
- `app/api/entries/route.ts`: idempotent insertion using the client UUID as the existing journal primary key. Retries return the original row without inserting it again. The authenticated user must match the queued owner.

## Sync sequence
1. Save the complete entry and optional Blob into IndexedDB; keep the draft if storage fails.
2. Sync on creation, reconnection, foregrounding, session refresh and periodic retries while open.
3. Validate the current authenticated account against the queued owner.
4. Upload media to the existing **private** `journal-media` bucket at `owner/entryUUID.extension`.
5. Insert through the authenticated API into `journal_entries` with `client_id`, owner assertion and original timestamp. Existing RLS and validation remain active.
6. On server acknowledgment, atomically remove the pending row and retain a local reading copy. Media remains in the local reading copy for offline playback. Local browser data is not an encrypted backup.

The suggested public `photos`/`voice-notes` buckets and `entries` table were intentionally not introduced: those are not Dearly’s schema, and public URLs would expose private journals. Existing signed URLs remain used online. No database migration or public storage policy is required.

## Offline preparation and behaviour
Sign in online once, then wait for Settings → Your offline Dearly to say ready. Assets are installed as a versioned set before the new service worker activates. Reloading a normal app URL offline redirects to the cached offline shell. A first-ever visit without internet cannot download the application.

Personal text, photo and voice creation works offline. New media captured through this engine remains playable offline even after sync. Previously online entries cache text/metadata as loaded; older cloud-only attachments are not automatically downloaded. The solo arcade and same-device X & O work offline; shared multiplayer, account changes, transcription services and server notifications need network. The current edit/delete flows require network; queued entries are read-only until acknowledged.

Sync runs while Dearly is open/resumed. iOS cannot guarantee background JavaScript execution after the app is closed. Expired authentication pauses sync until the same account logs in again; it does not delete drafts. Signing out removes the active offline identity, retaining pending data under its original owner so it cannot sync to a different account.

The OS/browser can evict storage; keep free space and do not clear website data while entries are pending. Settings offers a persistent-storage request where supported. A successful save is shown only after IndexedDB commits. Clear outbox items only after server acknowledgment.

## Validation
No test suite or device simulation was run, per the user's standing request. Vercel's production compiler is the build gate. Offline, multi-device and browser-specific behaviour still require device verification before claiming universal compatibility.

## Regular UI and daily tasks update
The offline shell now mounts the same JournalApp used online, including Today, Task, yellow plus, Spaces and More navigation. Personal entries and daily tasks use IndexedDB. Today-only task changes queue with revisions; acknowledgment cannot discard a newer local edit. When an offline task syncs after midnight, its recorded change date is checked against its task date. The foreground task chime runs offline and respects reminder lead time and the sound preference. Closed-app offline alarms and shared-server features remain unavailable without network. The prominent offline banner is removed; successful draining of the queue shows “Journal synced”.
