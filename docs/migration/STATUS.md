# Migration status and handoff

Source: local Dearly Next.js application. Target: killagroupwork-collab/MYPROJECTS.
Production domain: https://dearly.com.ng. Existing Supabase project: kjdhavrlkosbcruccimg.
Existing Vercel project: prj_DlZJta94jUxOCIWvGB2bEdBDxaeD (francisfahvie).

No historical commits exist in the source repository. This import is a baseline snapshot, not reconstructed history. Do not claim old changes were deployed based on this import.

## Known pending work
- Google OAuth provider/client and SMTP delivery configuration are unverified.
- Migration 008_arcade_next_round.sql has not been applied; live status of earlier migrations must be checked.
- Recent notification/order/UI/shared-round changes are local, deployment unconfirmed.
- Previous Vercel deployment attempts failed with network errors. No new deployment is implied by a source release.
- No application tests run during this migration, following the user's earlier preference.

## Working efficiently
Read docs/migration/STATUS.md and the relevant issue rather than replaying chat history. Read only the paths listed in that issue. Keep one coherent feature/fix per PR; link its issue and milestone. Comment with action, success, failure, evidence and next step. Close only after acceptance is evidenced. Never fabricate old progress comments.

## Release policy
The first release is a source-migration prerelease, not a production deployment. Later feature releases should name the feature, link delivered issues, list schema/env changes, note rollback steps and identify actual deployment status. Preserve current Supabase data; do not blindly reapply migrations. Keep credentials in Vercel/Supabase, never GitHub source or issue comments.

## Suggested next steps
Connect the existing Vercel project to this repository only after checking production environment variables and the selected branch. Retain manual deployment control until auth and migration dependencies are ready. Add CI deliberately once the current baseline passes; do not mark it green without executing checks. Review the legacy README because some original feature descriptions are historical.
