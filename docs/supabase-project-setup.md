# Supabase Project Setup

The Student Bible app relies on Supabase for the PostgreSQL database and accompanying services. Task 1.2 tracks provisioning the shared Supabase project so the rest of the team can connect locally.

## 1. Create/Access the Supabase Account

1. Navigate to [https://supabase.com](https://supabase.com) and sign in with the shared company email (or create a new account if one does not exist yet).
2. Prefer GitHub SSO to simplify collaboration and access management.

## 2. Create the Project (Free Tier)

1. Click **New Project** in the Supabase dashboard.
2. Choose the free tier workspace (500 MB Postgres / 2 GB bandwidth is sufficient per PRD).
3. Set project name to `student-bible` (or similar) and note the automatically generated project reference (e.g., `abcd1234`).
4. Define a strong database password and store it in the team password manager.
5. Wait for Supabase to finish provisioning the project (≈1 minute).

## 3. Capture Environment Variables

Once the project is ready, open **Project Settings → API** and copy:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for backend scripts only)

Add the URL and anon key to the shared `.env.local` template (Task 1.4) and store the service role key in your secrets manager.

## 4. Prepare Local CLI Configuration (Optional at This Stage)

If the Supabase CLI is available locally, run:

```bash
supabase login            # paste the personal access token from supabase.com/account/tokens
supabase link --project-ref <project-ref>
supabase init
```

This generates `supabase/config.toml` pointing to the shared project and scaffolds the migrations folder. The repo already includes `supabase/migrations/` for upcoming tasks; keep migrations version-controlled.

## 5. Share Access with Teammates

Invite additional developers under **Project Settings → Access** so each junior dev can generate their own API keys or run the CLI without sharing credentials.

---

After these steps, mark Task 1.2 complete and proceed with installing Supabase client libraries (Task 1.3) and environment configuration (Task 1.4).
