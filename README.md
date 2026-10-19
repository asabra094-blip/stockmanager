# StockManager / MyPhone Manager

Inventory, sales, and restocking manager for a phone shop. This is **a work-in-progress pilot**, not yet production-ready. The first trial is for one main branch.

## Start locally (Windows / VS Code)

Requirements: Git, Node.js LTS, and VS Code.

Open **VS Code → Terminal → New Terminal**, then run:

```powershell
git clone https://github.com/asabra094-blip/stockmanager.git
cd stockmanager
npm install
npm run dev
```

Open the local URL printed by the terminal (normally `http://localhost:3000`, but use whatever the terminal prints). The UI will require a configured Supabase connection to sign in and actually save inventory.

To check the build:

```powershell
npm run build
npm test
```

## Important: set up your own database before using the app

This code was exported from an **unfinished Lovable project**. Its database was provisioned in Lovable Cloud, and the database itself was **not** transferred to GitHub. You need a separate, properly configured Supabase project for independent hosting. Follow the migration/schema carefully; the original draft SQL is in `drizzle/migrations/0000_migration.sql` and must be reviewed for security and compatibility before applying it.

Copy `.env.example` to `.env` and enter the corresponding public Supabase URL and publishable key. **Never commit your real `.env` file, service-role key, credentials, or inventory data.** Server-side admin access should only be configured when needed and handled securely.

Some authentication helpers remain Lovable-specific and may need adaptation to standalone hosting. Email sign-in and Google OAuth depend on your backend's authentication configuration. Do not enable public signups for external shops until tenant isolation and access control are implemented and audited.

## Status

- Initial Dashboard, Inventory, Sales, and Restock code imported
- Basic Reports and Settings screens added after import
- Optional demo inventory is distinguishable from real stock
- The original code was not fully built or end-to-end tested
- **Multiple branches, employee permissions, separate SaaS tenants and billing are not implemented**
- Actual behavior depends on secure, compatible Supabase setup
- Do not enter real store inventory until builds, login, stock transactions, reports, and permissions have been tested

The goal is a clean, practical single-branch MVP first, followed by multi-branch stock transfers and eventually optional commercial multi-tenant support.
