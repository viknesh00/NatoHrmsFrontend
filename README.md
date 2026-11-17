# Nato HRMS frontend

React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Zustand. Employee records, attendance, leave, payroll, onboarding, timesheets, projects, hiring, work status, documents, and the existing local HR assistant.

## Development

Use Node from `.nvmrc` and npm 11:

```sh
npm ci
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the API root, including its trailing slash. Existing deployments using `REACT_APP_API_BASE_URL` remain supported as a build-time fallback. Frontend environment variables are public; never put credentials in them.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
node scripts/check-bundle.mjs
npm run audit:production
npx playwright install chromium
npm run test:e2e
```

The build is emitted to `build/`. `npm run preview` serves it locally. Production hosting must serve `index.html` for client routes; Vercel configuration is included. E2E tests mock API calls and run Chromium at desktop and mobile viewport sizes.

## Interface and design system

Global semantic tokens live in `src/styles/tokens.css` and are mapped into Tailwind in `src/index.css`. The light palette uses canvas `#FCFCFD`, surface `#FFFFFF`, foreground `#252A30`, border `#E3E5EA`, muted `#AEB2B9`, secondary text `#676C73`, neutral `#838589`, accessible primary green `#2F7659`, and accent green `#51BC8F`. Shared spacing, square corner radius, control dimensions, and self-hosted Inter typography are defined alongside the palette.

Shared shadcn/ui primitives are in `src/components/ui`; reusable table behavior is in `src/components/ProTable.tsx`. The onboarding table uses explicit accessors and formatters for source record fields so display formatting does not interfere with sort/filter behavior. Dashboard analytics use Chart.js for attendance totals and D3 for department counts. The local browser chatbot is available as a lazy widget throughout the authenticated workspace and at its existing `/chat` route; it uses Message/Bubble components and Streamdown for assistant markdown.

`docs/ARCHITECTURE.md` describes the current application structure. `docs/UI-MODERNIZATION.md` records the modernization scope and design decisions.

See [architecture](docs/ARCHITECTURE.md), [commit-based releases](docs/RELEASING.md), and [security](SECURITY.md). No backend contracts, time calculations, approval rules, or role/department access rules are intentionally changed.
