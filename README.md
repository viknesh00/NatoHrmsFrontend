# Nato HRMS Frontend

The web frontend for Nato HRMS, an employee and human-resources management system. It includes areas for employee records, attendance, leave, payslips, onboarding, projects, hiring, announcements, timesheets, work status, and company documents.

## Requirements

- Node.js and npm
- Access to the Nato HRMS API

## Setup

1. Install the dependencies:

   ```sh
   npm install
   ```

2. Create a `.env` file in the project root and set the API base URL:

   ```env
   REACT_APP_API_BASE_URL=https://your-api-host/
   ```

   Use the API root URL and include the trailing slash. The frontend appends endpoint paths such as `Auth/Login` to this value. `.env` is ignored by Git, so keep local configuration there.

3. Start the development server:

   ```sh
   npm start
   ```

   The app opens at [http://localhost:3000](http://localhost:3000). Restart the server after changing environment variables.

## Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the development server. |
| `npm run build` | Create an optimized production build in `build/`. |
| `npm test` | Run the configured test runner. |

## Tech stack

- React 18
- React Router
- CRACO with Create React App tooling
- Material UI and shared UI components
- Axios for API requests

## Project structure

- `src/pages/` — HRMS pages and feature areas
- `src/components/` — reusable application components
- `src/services/` — API requests, authentication, permissions, and shared services
- `src/routes.js` — application routes

The API base URL is read from `REACT_APP_API_BASE_URL` in `src/services/Apiservice.js`. Authenticated API requests use the saved bearer token; the API service redirects to sign-in when the API returns `401`.

## Production routing

Deploy `build/` as the static output. `vercel.json` rewrites application URLs to `index.html` so opening or refreshing a nested route works. Other static hosts need the equivalent SPA fallback (for example, `try_files $uri $uri/ /index.html` in Nginx).

Private routes require both the login flag and a token. Visitors are sent to `/login`, then returned to the requested page after signing in. Signed-in users opening an auth page go to their role and department home. `/employee-details` remains public.

## Licence

Copyright (c) 2026 Natobotics Technologies Private Limited. All rights reserved.

Nato HRMS is proprietary software for authorised internal company use. External use, disclosure, or redistribution requires separate written authorisation. See [LICENSE](LICENSE) for the full terms. Third-party dependencies and assets retain their respective licences.
