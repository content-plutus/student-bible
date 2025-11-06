# Issues & Resolutions Log

> Working agreement: Before attempting to fix a recurring problem, review this log for prior resolutions. Update the log after closing any noteworthy issue so the playbook stays current.

## 2025-11-06

### Lint: `_rawData` unused in API handlers

- **Symptom**: `npm run lint` failed with `@typescript-eslint/no-unused-vars` warnings in `src/app/api/export/route.ts` and `src/app/api/schema/extend/route.ts`.
- **Fix**: Removed the unused `_rawData` arguments from handler signatures.
- **Result**: Lint passed locally and in CI.

### Lint: `no-explicit-any` in tests and registry

- **Symptom**: ESLint flagged `any` usage in `schemaRegistry.ts` and `duplicateDetector.test.ts`.
- **Fix**: Added specific Zod typings and introduced typed helper interfaces/mocks.
- **Result**: Lint succeeded.

### Missing export `detectDuplicateStudents`

- **Symptom**: Jest tests failed (`TypeError: detectDuplicateStudents is not a function`).
- **Fix**: Re-exported the convenience wrapper from `duplicateDetector.ts`.
- **Result**: Duplicate detector tests ran.

### Dependency unavailable in sandbox (`fastest-levenshtein`)

- **Symptom**: Tests crashed because `fastest-levenshtein` wasn’t installed and network install was blocked.
- **Fix**: Implemented an internal Levenshtein helper in `fuzzyMatch.ts` and removed the dependency.
- **Result**: Tests passed without external install.

### Formatting drift after edits

- **Symptom**: `npm run format:check` failed on touched files.
- **Fix**: Ran `npm run format` / `prettier --write`.
- **Result**: Format check succeeded.

### Git push rejected (remote ahead)

- **Symptom**: `git push` returned “fetch first”.
- **Fix**: Performed `git pull --rebase origin <branch>` before re-pushing.
- **Result**: Push succeeded.

### Git index lock / permission errors on macOS

- **Symptom**: Git commands failed with `Unable to create .git/index.lock: Operation not permitted`.
- **Fix**: Recommended granting Terminal full disk access, removing stale lock (`rm -f .git/index.lock`), then re-running the command. User confirmed resolution after adjusting permissions.
- **Result**: Subsequent git operations worked.

### npm install blocked by network sandbox

- **Symptom**: `npm install` failed with `ENOTFOUND registry.npmjs.org`.
- **Fix**: Avoided installing packages; replaced dependency (see Levenshtein fix above).
- **Result**: Build pipeline continued without network install.
