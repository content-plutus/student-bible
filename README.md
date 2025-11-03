# Student Bible

Centralized data management system for tracking every student touchpoint across enrollment, mentorship, exams, and certification outcomes. The goal is to provide internal teams with one reliable place to search for a student, inspect their progress, and export data for reporting.

## Repository Contents

- `tasks/0001-prd-student-bible.md` – Product Requirements Document describing scope, constraints, and success measures.
- `tasks/tasks-0001-prd-student-bible.md` – Detailed task breakdown derived from the PRD.
- `create-prd.md` / `generate-tasks.md` – Prompt templates used to create and refine the PRD/task list.
- Next.js application scaffold (created with `create-next-app@latest --typescript --app`).
- Tailwind CSS configured via `@tailwindcss/postcss` and `tailwind.config.ts`.
- ESLint + Prettier flat config (`eslint.config.mjs`, `.prettierrc.json`) with `npm run lint` and `npm run format` scripts.
- Jest + React Testing Library setup (`jest.config.js`, `jest.setup.ts`).
- `src/` structured with App Router directories plus scaffolding for components, lib modules, and future API routes.
- `/docs` folder with initial structure (`docs/README.md`, `supabase-project-setup.md`, and stub directories for architecture, schema, processes, playbooks).
- GitHub Actions CI workflow (`.github/workflows/ci.yml`) running lint, format check, and tests on pushes and PRs to `main`.

## Getting Started

```bash
npm install
npm run dev
# lint and format helpers
npm run lint
npm run format
npm run test
```

The development server runs on [http://localhost:3000](http://localhost:3000). Update `src/app/page.tsx` to modify the landing page.

## Next Steps

1. Provision the shared Supabase project (see `docs/supabase-project-setup.md`).
2. Copy `.env.example` to `.env.local`, then fill in the Supabase values from the project dashboard.
3. Install Supabase client libraries and configure any additional environment variables as features are added.
4. Work through the task list incrementally, validating output against the PRD.

## Contributing

Open issues or pull requests to propose changes. Please ensure updates stay aligned with the requirements captured in the PRD.

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/content-plutus/student-bible?utm_source=oss&utm_medium=github&utm_campaign=content-plutus%2Fstudent-bible&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
