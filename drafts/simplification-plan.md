# Dearly simplification — source review and migration plan

Scope: review and layout draft, not a production migration. Keep Dearly's colours, rounded cards and illustrations. Core: personal micro-journal and shared journal. Supporting: daily tasks and games. Remove wins, reflections, savings, bucket lists, and long-form entry creation.

## Findings and component cleanup
- components/journal-app.tsx owns navigation, multiple page layouts, date filters, composer state and data loading. Split into a small application shell and Today/Spaces/Play views.
- components/savings-goals.tsx: delete after removing imports from goals.tsx and bucket-list.tsx.
- components/bucket-list.tsx: delete; the newly narrowed scope excludes bucket lists as well as savings.
- components/goals.tsx: retain daily checklist only; remove SavingsGoals import, savings mode and savings_record writes. Later rename to daily-tasks.tsx.
- components/personal-journal.tsx and composer.tsx: replace writing UI with MicroCheckIn; retain media upload utilities and legacy entry display until existing records are migrated. composer.tsx also exports api(), so extract that helper before deleting anything.
- components/social.tsx and shared-conversation.tsx: retain member/invitation controls and conversation. Remove wins/reflections/bucket tabs; fold friends management into Spaces.
- components/daily-adventure.tsx: fold useful check-in/task shortcuts into Today; remove duplicate dashboard sections.
- components/arcade.tsx, marble-garden.tsx, sweet-match.tsx: keep. Lazy-load games on Play/opening a shared game.
- Keep auth, journal lock, media, realtime, reminders, notifications and install support.
- app/(journal)/[section]/page.tsx: retain my-day, spaces, play and settings. Redirect journal/memories/daily-tasks to Today sections, friends to Spaces, savings-goals to Today. Preserve invite query strings.
- lib/types.ts, lib/validation.ts, lib/demo.ts: remove achievement/reflection and savings variants from NEW writes only after tasks leave journal_entries.
- app/api/entries/route.ts: replace arbitrary metadata and 20,000-character input with validated micro-journal fields. Preserve old read-only bodies; never truncate users' history.
- app/api/reminders and migrations 005/006: scheduler currently depends on daily metadata in journal_entries; migrate it in the same release as tasks, not before.
- Audit references before deleting play-room.tsx/game-invitation.tsx or old game_sessions/game_answers: these are not automatically safe to drop simply because arcade_rooms exists.

## Proposed data model
profiles: retain id, display_name, username, timezone, avatar, notification preference. No finance fields required.
micro_entries: id, owner_id, entry_date, mood (small enum), activities (validated IDs), meal (nullable enum), meal_status (ate/skipped/nullable), note (0–240 chars), created_at, updated_at, client_request_id UNIQUE per owner.
entry_media: entry_id, owner_id, storage_path, kind(photo/voice), position. Retain private storage and signed URLs.
entry_shares: entry_id, space_id, shared_by, created_at; UNIQUE(entry_id,space_id). Private entry remains private unless explicitly shared. Avoid copying entire entries into multiple spaces.
daily_tasks: id, owner_id, title, task_date, due_at timestamptz, completed_at nullable, reminder_enabled, created_at. Preserve today's-only edit rule in database/API and use profile timezone.
game_perks: owner_id, task_id UNIQUE, perk_type, granted_at. Award once in a server transaction on first completion. Undo/redo cannot farm perks. Use a cosmetic reward or one extra hint; never block shared contact or essential journaling behind tasks.
arcade_rooms: keep current server-controlled membership and atomic moves/progress. Persist solo checkpoints separately if cross-device resume is needed.
Keep spaces, memberships, invitations, connections, comments/reactions, push subscriptions and delivery deduplication.

RLS: owner-only personal entries/tasks; shared entry reads require an explicit entry_shares row and current membership. Only an entry owner who is a member can create a share. Members cannot reshare someone else's private entry. Reactions/comments follow entry visibility. Perks are server-issued, never client-editable.

## Safe migration sequence
1. Add new tables/constraints/RLS in a NEW migration; do not rewrite deployed migration 001.
2. Backfill daily tasks from metadata.goal_kind=daily, preserving IDs, dates, completion, reminders and due times. Switch scheduler and clients together; keep delivery keys stable.
3. Backfill supported mood/meal/photo/voice entries. Preserve unsupported old text/wins/reflections/savings in a restricted legacy archive with owner access/export, excluded from the new product feed. No irreversible deletion in this review.
4. Deploy new writes with idempotency, optimistic pending/saved/failed states, targeted realtime updates and cancellation of stale reads.
5. Retire old routes/components and finance write paths after migration succeeds. Drop obsolete schemas only after backup and explicit data-retention decision.

## Interaction contract
Today: mood buttons → activity or meal selection → Save. Optional one-line note, photo or voice. Two selections describe the check-in; Save is explicit to avoid accidental entries. After saving, Share to [space] is one click when a space is already selected; otherwise choose a destination. Never auto-broadcast private content.
Today also shows a short checklist, recent micro-entry feed and a small Play card. Date/search controls live within the feed, not separate menus.
Spaces: journal list → single conversation, same micro-entry control, invite button, shared game access. Show author/time on every entry.
Play: compact game collection and progress. Perks celebrate completed tasks; games remain optional.
Settings: profile, privacy/PIN, reminders, install and account actions. No extra main navigation destination.

## Competitor patterns (primary sources)
Daylio: mood + activities with optional notes, https://daylio.net/
Waffle: shared journals and daily questions, https://www.wafflejournal.com/faq
Finch: self-care actions feeding playful progress, https://finchcare.com/
Day One: optional multimedia and privacy controls, https://dayoneapp.com/features/
Do not copy their branding or claim Dearly has Day One's end-to-end encryption. Dearly's local PIN is an interface lock, not content encryption.
