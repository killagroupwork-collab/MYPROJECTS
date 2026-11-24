# Dearly source migration baseline

Feature: source migration and release tracking.

Includes the current application, public assets, SQL migration sources, feature inventory and issue/PR templates. Credentials, local data and generated builds are excluded.

This is a prerelease of source code, not a declaration that the app was deployed or tested. Google OAuth/SMTP configuration remains pending verification. Supabase migration 008 remains unapplied. See STATUS.md and the feature milestone tickets for known limitations.

Rollback: importing source does not mutate production or Supabase. For subsequent deployments, retain the previous Vercel deployment and review database changes independently.
