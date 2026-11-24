# Working on Dearly

1. Start from the relevant milestone and ticket. Read its source scope and `docs/migration/STATUS.md`.
2. Use a branch for one feature or fix. Preserve the existing visual style and private journal access rules.
3. Update the ticket with actions, successes, failures, evidence and the next step. Do not claim deployment from a successful commit.
4. Link the PR and release. Record SQL/environment dependencies, validation performed (or explicitly not performed), and rollback steps.
5. Never commit `.env.local`, credentials, user exports, recordings or private journal entries. Public brand assets are part of the source distribution.

The baseline import does not automatically run migrations or deploy production. Existing users and data must remain in the existing Supabase project.
