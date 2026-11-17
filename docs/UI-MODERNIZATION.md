# HRMS UI modernization audit and implementation record

## Architecture audit (before implementation)

Inspected the working tree, not just HEAD. It contains an existing uncommitted JavaScript-to-TypeScript/Vite migration; those changes must be retained.

- React/React DOM 19.3.1, TypeScript 6.0.3, Vite 8.3.8, npm lockfile.
- React Router 7.18.5 with lazy feature routes, cookie-based guards, role and department navigation in `src/auth`. Axios services own HTTP requests. Zustand 5.1.0 holds transient sidebar/mobile/chat state only.
- Controlled local React forms with hand-written validation and existing native change-event payloads; no form schema library installed.
- Tailwind CSS 4.3.5 via its Vite plugin and CSS-first `@theme inline`. Local shadcn Radix Nova primitives, radix-ui 1.8.1, Lucide 1.72.0, react-day-picker 10.0.2. TanStack Table installed; the shared ProTable implements its own search, filtering, sorting, selection, paging and exports.
- Self-hosted Inter Variable already installed. No theme provider, dark theme tokens or user-selectable dark mode exists; shadcn components contain dormant dark variants.
- Style cascade: index.css → tokens.css → theme.css → minimal.css, plus injected form/table styles and screen-specific styles. No additional dependencies are needed.
- Vitest/Testing Library unit/component tests, ESLint, tsc, production build and Playwright desktop/mobile projects exist.

## Screen inventory and migration order

All actual routes are in `src/app/routes.tsx`. Shared create/edit components must cover both modes.

| Module | Screens / modes | Overlays / shared UI |
| --- | --- | --- |
| Authentication | `/`, `/login`, `/sign-in`, `/forgot-password` | Show/hide password, password change (forced/manual), logout |
| Public onboarding | `/employee-details` | Grouped personal/employment/document fields, uploads, submission states |
| Dashboard | `/dashboard` | Role-dependent metrics, project progress, attendance/leave/announcement/calendar panels |
| Employees | `/employees`, `/employees/add-employee`, `/employees/edit-employee/:email`, `/view-employee` | Account status dialog, profile, project multiselect |
| Department timings | `/employees/working-hours`, `/employees/add-working-hours`, `/employees/edit-working-hours` | Shared timing/weekend form |
| Projects | `/employees/projects`, `/employees/projects/create` | Department/people selectors |
| Attendance | `/attendance` | Daily/monthly filters, table, exports; header clock/location workflow |
| Leave | `/leave`, `/leave/apply-leave` (create/edit) | Approval/rejection dialog, validation, date limits |
| Timesheet | `/timesheet` (overview or own calendar), `/timesheet/timesheet-view` | Month/week/agenda, log hours dialog, nested clear confirmation, time selectors |
| Calendar | `/calendar`, `/calendar/create-event`, `/calendar/edit-event` | Month/week/agenda, event delete confirmation |
| Documents | `/company-documents`, `/company-documents/upload`, `/company-documents/edit` | Single/bulk delete, file preview/download/upload |
| Announcements | `/announcement`, `/announcement/announcement-form` | Date/department form, table |
| Payroll | `/payslip`, `/payslip/payslip-preview` | PDF export, email action, generated/draft views |
| Recruitment | `/job-management`, `/job-management/add-profile`, `/job-management/create-job`, `/job-management/update-job` | Posted/applied tabs, candidate status/assignee, job deletion |
| Onboarding | `/onboarding`, `/onboarding/edit/:id` | Column visibility, certificates, delete confirmation |
| Work status | `/work-status`, `/work-status-report` | Add/edit status dialog, delete confirmation, report filters |
| HR assistant | `/chat`, floating assistant sheet | Suggestions, messages, loading/error, composer |
| Access control | Existing AccessControl component, not registered in the router | Permission checkboxes/table; no route added |
| Shell | Header, sidebar, breadcrumbs, page frame | Mobile navigation sheet, profile menu, notifications, loading/error boundaries |

## Component inventory

Shared Button, Input, Textarea, Select/NativeSelect, Checkbox, Card, Badge, Dialog, AlertDialog, Sheet, Popover, Tabs, Calendar, Avatar, input groups, messages/bubbles, custom toast notifications and loader. Shared FormInput, FormTextarea, FormSelect, FormDropdown, FormCombo, FormDate, FormMonth, FormTime, FormCheckbox, FormSection, FormRow, FormCard, PasswordStrength; PhoneField, PasswordField, single/multiple uploads, GroupCard; ProTable toolbar, filters, selection, sorting, pagination, export, empty state. Custom month/people selectors and tooltips exist. No unused shadcn modules will be installed merely to fill a checklist.

## Problems and accessibility / responsive audit

- Orange tokens conflict with older green page styles and several neutral/status palettes. Screen-level hex colors bypass global tokens. White on the supplied accent green is unsuitable for small action text.
- Global `border-radius: 0 !important` ignores component tokens. Elsewhere cards/dialogs use 8–24px radii and pill controls.
- A 14px root makes Tailwind rem-based controls smaller than their nominal dimensions. Button variants vary from 24–36px; forms mix heights and uppercase 11px labels. Weights reach 900, spacing uses many fractional/arbitrary values.
- Older injected CSS competes with shared styles, includes decorative shadows, hover movement and multiple border widths.
- Several overlays are divs with no focus trap, restoration, Escape support or accessible dialog name. Icon-only actions and file drop zones need keyboard labels/behavior.
- Mobile action rows, fixed form grids and popups can overflow. Large tables/calendars must retain horizontal scrolling within their containers.
- State labels must remain distinct (success/warning/error/information) and retain text/icons; decorative muted/neutral colors must not become body text.
- Legacy `.js` copies of FormComponents/ProTable coexist with `.tsx`; baseline tests resolve JSX `.js` and fail parsing. Prefer TypeScript during module resolution while retaining originals.

## Migration plan and regression risks

1. Save a pre-redesign source snapshot; run baseline checks.
2. Centralize complete semantic palette plus legacy aliases, typography, dimensions, radius and spacing; map them using Tailwind v4 CSS.
3. Standardize existing primitives/shared forms/tables, then shell, then every feature's presentation styles (including print/PDF preview).
4. Replace custom dialog scaffolding with existing Radix dialogs, retain handlers, conditions and pending-operation close timing. Style mobile sheets and selectors consistently.
5. Verify neutral/action/status contrast and responsive layouts, then run tsc, lint, tests, build and desktop/mobile E2E. Review the focused diff against the saved working-tree snapshot.

High-risk logic stays unchanged: cookies/auth/permissions, endpoints, payloads, validation, payroll and timesheet calculations/date restrictions, attendance events/location capture, department visibility, sorting/pagination, PDF/export content. Dialog changes need special attention to focus and asynchronous saves. API-mocked browser checks cannot prove production-backend workflows. No live HR records should be changed for validation.

## Design system

Foundation: canvas #FCFCFD, border #E3E5EA, decorative muted #AEB2B9, accent #51BC8F, decorative neutral #838589, secondary text #676C73; surface #FFFFFF, foreground #252A30, accessible primary #2F7659, subtle surface #F3F4F6. Light theme only, preserving the existing mode. Status tokens retain meaningful green/amber/red/blue states.

Inter: page 24/32 600, section 18/28 600, card 16/24 600, body 14/20 400, supporting text 13/20, label 13/20 500, metadata 12/16. Tabular numerals for metrics/tables/payroll. 4px spacing grid, desktop 24–32px/mobile 16px page padding, 16–24px cards, 24px dialog sections. 40px standard / 36px compact controls, 8px action gaps, 4px centralized radius. Flat borders and subtle overlay shadows.

Reference: https://ui.shadcn.com/docs/theming and https://ui.shadcn.com/docs/components/radix/button (semantic CSS variables and existing variant-based primitives).

## Implementation summary

- Replaced the orange brand with a complete light semantic token set, accessible primary/foreground pairs, sidebar/chart/status tokens and compatibility aliases. Decorative muted/neutral tokens remain separate from readable secondary text. No dark theme existed and none was added.
- Kept Tailwind v4 CSS-first mapping; restored a 16px root so rem-based shadcn sizing is correct, with a 14px body. Moved the universal reset into the base layer. Removed the universal zero-radius override in favor of 4px tokens; intentional avatar/radio/status circles remain circular.
- Standardized existing shadcn action/input/select/textarea/card/badge/dialog/popover/calendar/tab primitives, and legacy component classes. Standard actions/inputs are 40px; compact actions are 36px; coarse-pointer form targets use 44px where appropriate. Action gaps are 8px. Inter headings and tabular numeric text use the centralized scale.
- Extracted injected shared form/table CSS into static stylesheets. Updated all active feature color literals to semantic variables/utilities, including recruitment, public onboarding, payroll document styles and conditional statuses. Updated existing toast and loading presentation through the global skin. No dependencies were added or upgraded by this redesign.
- Updated shell navigation, breadcrumbs, profile/notification presentation, mobile sheets, cards, tables and filters. Fixed mobile drawer label hiding and dashboard KPI clipping discovered during visual review. Dashboard grids use explicit responsive classes, rather than fragile inline-style selectors.
- Migrated 13 custom workflow overlays onto a shared frame built from the existing shadcn/Radix Dialog. Focus trapping/restoration, keyboard dismissal, bounded viewport scrolling and pending-operation dismissal guards are centralized; forced password changes remain non-dismissible. Existing header/logout dialogs, mobile navigation and assistant sheets inherit the same tokens.
- Converted duration selectors to the existing Radix Select so they remain reachable within the timesheet dialog focus boundary. Converted the month picker to the existing Popover while retaining limits, month/year switching and its ISO-shaped change event.
- Associated shared textarea/select/time/phone/password/reset labels and help with controls. Added keyboard file uploads, native shadcn table selection, keyboard sorting, pagination names and breadcrumb links. Removed unused imports in the touched UI files without changing handlers.
- Preferred TypeScript during Vite/Vitest resolution so legacy JSX `.js` duplicates cannot shadow the active components. Originals are retained.

## Screen and overlay coverage

Every screen/mode in the inventory above receives the shared semantic theme, type, spacing and radius. Feature-specific colors were migrated wherever they existed. Screens with no direct edits (for example Projects list, WorkingHours list, AnnouncementForm and full-page Chat) receive the redesign through shared components and global styles. AccessControl is styled but remains unrouted.

Migrated workflow overlays: employee status; leave approval/rejection; company-document single/bulk deletion; event deletion; onboarding column visibility, certificates, and deletion; work-status add/edit and deletion; job deletion; candidate application status/assignment; timesheet log-hours and its existing inline clear confirmation; manual/forced password change. The clear confirmation remains part of the log-hours workflow rather than becoming a new interaction. Header logout controls, sidebar logout alert, profile/notifications, mobile navigation, date/month/select popovers and assistant sheet also use the same theme.

## Functional preservation

A source comparison against the saved pre-redesign working tree found **109 API call expressions byte-for-byte unchanged**, including endpoints and arguments/payload expressions. `src/auth/Auth.ts`, `src/auth/Permissions.ts`, `src/auth/navigation.tsx`, `src/app/routes.tsx`, `src/store/useAppStore.ts` and `src/shared/services/Apiservice.ts` are unchanged. No package, lockfile, credential or environment changes were made by this redesign; the pre-existing migration remains in the working tree.

Form state, validation rules, calculations, API transformations, sorting/paging algorithms, role/department visibility and navigation destinations were retained. Dialogs still close from their owning save handlers after responses; pending requests block cancel/outside/Escape dismissal. Payroll PDF content/values and capture workflow are retained; the capture background now reads the resolved DOM color. The document scrolls within a mobile container.

## Validation results

| Check | Actual result |
| --- | --- |
| Baseline `npm run typecheck` | Passed before UI changes |
| Baseline `npm test` | Failed: stale FormComponents.js JSX parsing; 6 files passed, 2 failed |
| Baseline `npm run lint` | Failed: 56 errors, 50 warnings, predominantly retained legacy JS copies |
| Final `npm run typecheck` | Passed |
| Final `npm test` | 8 files, 35 tests passed |
| Final `npm run build` | Passed; optional PDF/model chunks retain a >500kB warning |
| Final `npm run lint` | 56 pre-existing errors, warnings reduced to 22 |
| Active TypeScript/config/E2E ESLint | Exit 0: 0 errors, 21 warnings (existing hooks/unused locals and unchanged auth imports) |
| `npm run test:e2e` | **90 passed** (45 desktop Chromium + 45 mobile Chromium), 1.1 minutes |
| `npm run test:e2e -- --grep 'duration selection\|uses approved\|pending status'` | **6 passed** after the final narrow HH/MM spacing fix; selected unit labels also checked for clipping |
| `git diff --check` | Passed |
| Source palette scan | No hardcoded hex colors remain in active feature/component/shell styles outside the centralized tokens; shadcn's CSS mask internals and encoded SVG arrows are intentional exceptions |
| API expression comparison | 109 unchanged; no differing API request expressions |

Browser checks use mocked APIs and disposable cookies, never live HR data. They cover all 34 non-auth route cases plus payroll preview, authentication aliases/reset, deep-link protection, role/department navigation, assistant sheets, table search/paging/keyboard selection/sorting, employee status request payload and pending dismissal, timesheet duration controls and focus restoration, month picker, page overflow and dashboard label clipping. Create/edit routes without supplied navigation state exercise their existing fallback mode; not every backend-backed edit fixture is represented. Screenshots were reviewed for desktop/mobile login, dashboard, employee form, calendars, payroll preview, employee status and timesheet workflow dialogs; the latest selective run retains login/status/timesheet screenshots in the Playwright output; rerunning the full suite regenerates the other sample captures.

Measured contrast: foreground/canvas **14.10:1**, secondary text/canvas **5.16:1**, primary/white **5.45:1**, dark foreground/accent **6.15:1**. Success/warning/error/information text on their subtle surfaces all exceed **6:1**, except error at **5.86:1**. White/accent is only **2.35:1** and is not used as the action text pair.

## Remaining issues and recommendations

1. Repository-wide lint still includes inactive legacy JS copies and reports the same 56 baseline errors. Reconcile/remove those copies as a separately reviewed migration cleanup. Active TypeScript lint has no errors; hook dependency warnings were deliberately not changed because they can affect fetching/state behavior.
2. Backend-integrated submissions, every role/data combination, geolocation/attendance device permissions, email/PDF delivery and screen-reader behavior need staging acceptance with representative records. The API mocks and source comparison provide regression evidence, not proof of all production workflows or a full WCAG certification.
3. The existing optional model/PDF bundle size warning remains. Optimize those entry points in a separate performance change if actual load measurements warrant it.
4. Continue using semantic tokens and existing primitives for new screens. Collapse older compatibility CSS incrementally after visual coverage is available; avoid reintroducing page-specific palettes or another global override layer.

## Files modified by this redesign

The list below is relative to the saved working tree at task start. It excludes the user's existing migration changes.


### Theme and application styles

- `src/index.css`
- `src/main.tsx`
- `src/minimal.css`
- `src/styles/forms.css`
- `src/styles/tables.css`
- `src/styles/tokens.css`
- `src/theme.css`

### Shell and shared services

- `src/app/layout/Header.tsx`
- `src/app/layout/Sidebar.tsx`
- `src/shared/services/Breadcrumb.tsx`
- `src/shared/services/PasswordChange.tsx`

### Shared controls and primitives

- `src/components/FileUploadBox.tsx`
- `src/components/FormComponents.tsx`
- `src/components/GroupCard.tsx`
- `src/components/MultiFileUploadBox.tsx`
- `src/components/PhoneField.tsx`
- `src/components/ProTable.tsx`
- `src/components/WorkflowDialog.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/bubble.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/calendar.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/input-group.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/native-select.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/textarea.tsx`

### Feature presentation

- `src/features/AccessControl/AccessControl.tsx`
- `src/features/Announcement/Announcement.tsx`
- `src/features/Attendance/Attendance.tsx`
- `src/features/Attendance/WorkingHoursForm.tsx`
- `src/features/CompanyDocument/CompanyDocument.tsx`
- `src/features/CompanyDocument/DocumentUploadForm.tsx`
- `src/features/Dashboard/Dashboard.tsx`
- `src/features/Employee/AddEmployee.tsx`
- `src/features/Employee/Employee.tsx`
- `src/features/Employee/ViewEmployee.tsx`
- `src/features/Holiday/CreateHoliday.tsx`
- `src/features/Holiday/Holiday.tsx`
- `src/features/JobManagement/AddProfile.tsx`
- `src/features/JobManagement/CreateJob.tsx`
- `src/features/JobManagement/JobApplied.tsx`
- `src/features/JobManagement/JobManagement.tsx`
- `src/features/JobManagement/JobPosted.tsx`
- `src/features/Leave/Leave.tsx`
- `src/features/Leave/LeaveForm.tsx`
- `src/features/Login/ForgotPassword.tsx`
- `src/features/Login/Login.tsx`
- `src/features/Onboarding/EditOnboarding.tsx`
- `src/features/Onboarding/Onboarding.tsx`
- `src/features/Payslip/Payslip.tsx`
- `src/features/Payslip/PayslipPreview.tsx`
- `src/features/Projects/CreateProject.tsx`
- `src/features/PublicForms/EmployeeDetailsForm.tsx`
- `src/features/TimeSheet/TimeSheetLayout.tsx`
- `src/features/TimeSheet/TimeSheetOverview.tsx`
- `src/features/TimeSheet/TimesheetCalendar.tsx`
- `src/features/WorkStatus/WorkStatus.tsx`

### Validation, resolution and audit

- `docs/UI-MODERNIZATION.md`
- `e2e/design-system.spec.ts`
- `e2e/workspace.spec.ts`
- `vite.config.ts`
- `vitest.config.ts`
