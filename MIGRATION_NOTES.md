# MyPhone Manager — Lovable source import

The unfinished Lovable project was copied here on 2026-10-19. Its original remains untouched.

**This is NOT a verified working app yet.** Dashboard, Inventory, Sales, Restock, and underlying Supabase schema were started. Build/type errors remain; Reports and Settings pages are missing; multi-branch support was requested but not implemented. End-to-end testing has not been completed.

The Supabase DATABASE itself was not exported, only source and migrations. The schema is at `drizzle/migrations/0000_migration.sql` and must be reviewed before applying to a new database, especially if making this into a multi-branch or multi-tenant service. The source still has Lovable Cloud specific auth/preview dependencies and may require adaptation to self-host.

## Local setup after resolving a compatible backend

1. Install Node/Bun compatible with project.
2. Copy `.env.example` to `.env`, filling in the appropriate **public** Supabase URL/publishable key and any needed server-side variables.
3. Run `bun install` and `bun run dev`.
4. Fix existing build errors and run `bun run build` and `bun run test` before using real store inventory.

The original binary `public/favicon.ico` was not available safely through the text source connector; recreate it later. Never commit credentials or actual store data to GitHub.
