# Security

Run `npm run audit:production` for shipped dependencies and `npm audit` for all tooling. CI blocks high and critical production advisories. Dependabot checks npm packages and GitHub Actions weekly. Verify export files and role navigation after dependency upgrades.

Client-side route and menu restrictions are UX controls. The backend must enforce authorization on every endpoint. Existing bearer authentication is retained. Cookies now use SameSite=Lax and Secure on HTTPS, but JavaScript-accessible tokens cannot be made HttpOnly in this repository; a backend-issued HttpOnly session cookie is a separate coordinated change.

Vite variables are compiled into public assets. Never put credentials in VITE_* variables. Use environment secrets in CI, do not commit `.env` files, and rotate any credentials exposed in repository history. Frontend cookie hardening does not replace server authorization or protect against all XSS.

The local assistant downloads its existing model when requested and has no access to HR records. Do not paste sensitive employee data into prompts. HTTP response hardening is configured for Vercel; reproduce it at other hosting providers. Validate a Content Security Policy against API/model origins before enforcing one.

Report vulnerabilities privately to the repository maintainers; exclude employee data and credentials from reports.
