# Supabase Directory

This folder stores Supabase CLI configuration and database migrations.

- Run `supabase init` **after** creating and linking the shared project described in `docs/supabase-project-setup.md`. The command generates `config.toml` pointing to the project reference and API keys.
- Keep SQL migration files under `supabase/migrations/` so they stay version-controlled with the application code.
- Never commit raw credentials. Only the CLI-generated configuration and SQL artifacts should live here.

> Until the Supabase CLI is executed locally, this directory only contains this README and the empty `migrations/` folder as placeholders for upcoming tasks.
