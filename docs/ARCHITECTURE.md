# Frontend architecture

- `src/app`: application entry, routes, layout. Feature routes use React.lazy and a shared Suspense boundary.
- `src/auth`: existing session checks, redirects, permissions, and role/department navigation policy. Keep policy here rather than duplicating screens per role. API authorization remains authoritative.
- `src/features`: employee, attendance, timesheet, onboarding, payroll, company calendar, and assistant workflows. Business calculations and endpoints are retained.
- `src/components`: shared form/table abstractions and local shadcn primitives in `ui`.
- `src/shared/services`: HTTP and cross-feature presentation services. `VITE_API_BASE_URL` is public configuration. The old `REACT_APP_API_BASE_URL` remains a build-time fallback for existing deployments.
- `src/store`: Zustand for transient application UI state. Do not persist tokens, HR records, or conversations in localStorage. Keep form drafts local to their owning feature.
- `src/styles/tokens.css`: brand, semantic colors, typography, radii and compatibility aliases. Tailwind/shadcn consume these tokens. Status colors use Tailwind's green, sky, red, and amber palettes. Inter is self-hosted.

## Loading and exports

Feature routes, the assistant widget, spreadsheet exports, and PDF generation load on demand. The assistant answers common navigation questions immediately and loads its local Hugging Face model when preparing to answer other questions. The browser can reuse the model files, and the worker stays warm across widget openings during the current page session. Closing the widget clears the conversation. The `/chat` route opens the same assistant directly.

## TypeScript migration

All application source and React components are TypeScript. Shared native control props and application state have explicit contracts. Legacy API payloads and configurable form/table props retain flexible record types to avoid silently changing undocumented backend behavior. Tighten these at the API boundary as backend schemas become available; no `@ts-nocheck` is used.

## Local checks

Use Node from `.nvmrc`, `npm ci`, and `npm run dev`. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e`. Install Chromium once with `npx playwright install chromium`. Build before running E2E; the suite serves the production output. E2E tests mock APIs and use disposable local session cookies; they never write live employee data.

The entry bundle has a gzip budget checked by `node scripts/check-bundle.mjs`. Large optional model/export chunks are kept separate from initial navigation.
