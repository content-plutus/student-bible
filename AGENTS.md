# Repository Guidelines

## Product Philosophy

Optimize for fast, pragmatic solutions tailored for our internal workflows. Favor straightforward implementations over enterprise-grade abstractions unless there is a clear operational need; simple, reliable code ships quicker and is easier for the team to maintain.

## Project Structure & Module Organization

The Next.js 16 App Router lives in `src/app`, with `layout.tsx`, route handlers under `api/`, and shared styles in `globals.css`. Reusable UI is grouped in `src/components`, while domain logic, validators, and Supabase helpers live in `src/lib`. Public assets ship from `public/`. Configuration for Tailwind, ESLint, Jest, and Supabase sits at the repository root; SQL migrations are under `supabase/migrations`. Use `docs/` and `tasks/` for product specs and operational checklists.

## Build, Test, and Development Commands

- `npm run dev` — start the local Next.js server with hot reload.
- `npm run build` / `npm run start` — compile for production, then serve the optimized build.
- `npm run lint` — run ESLint with the Next + Prettier profile; fix flagged issues before committing.
- `npm run format` / `npm run format:check` — apply or validate Prettier formatting across the repo.
- `npm run test` — execute Jest in the jsdom environment; append `--watch` while iterating.

## Coding Style & Naming Conventions

Follow TypeScript strictness and favor typed utilities in `src/lib`. Components and files use PascalCase (`StudentTable.tsx`), hooks and helpers use camelCase, and test files mirror their subjects with a `.test.ts` suffix. Keep Tailwind classes concise and layered with semantic wrappers when layouts grow complex. Prettier (2-space indent, double quotes) is the source of truth; run it before pushing.

## Testing Guidelines

Jest plus Testing Library back our unit and interaction tests. Place new specs beside the modules they cover inside `src/lib` or feature-specific folders. Name test cases for the behavior under evaluation, e.g., `"rejects emails without @ domain"`. Maintain coverage for new validators, data mappers, and page-level handlers; prefer fast, deterministic tests. Use `npm run test -- file.test.ts` to focus on a single suite.

## Commit & Pull Request Guidelines

Write imperative, present-tense commit subjects under 72 characters (e.g., `Add conditional landmark requirement`). Group related changes per commit and note follow-up work in the body if required. Pull requests need a concise summary, linked Linear/Jira issue when available, screenshots or Looms for UI updates, and verification notes for database-affecting work.

## Issue Resolution Playbook

Before applying fixes for recurring problems, review `docs/processes/issues-log.md` for previously successful approaches, and append any new lessons after resolving an issue.
