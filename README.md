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

Brand tokens live in `src/styles/tokens.css`: primary `#EA580C`, accent `#FACC15`, warm neutral `#FFF7ED`, square corners, self-hosted Inter, and Tailwind status palettes. The chatbot is available as a lazy widget throughout the authenticated workspace and at its existing `/chat` route.

See [architecture](docs/ARCHITECTURE.md), [commit-based releases](docs/RELEASING.md), and [security](SECURITY.md). No backend contracts, time calculations, approval rules, or role/department access rules are intentionally changed.
