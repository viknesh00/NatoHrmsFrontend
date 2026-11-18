import React, { lazy } from "react";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";
import GuestRoute from "../auth/GuestRoute";
const Dashboard = lazy(() => import("../features/Dashboard/Dashboard"));
const OrganizationChartPage = lazy(() => import("../features/Dashboard/OrganizationChartPage"));
const HelpCenter = lazy(() => import("../features/HelpCenter/HelpCenter"));
const PolicyPage = lazy(() => import("../features/Policies/PolicyPage"));
const Notifications = lazy(() => import("../features/Notifications/Notifications"));
const SettingsPage = lazy(() => import("../features/Settings/SettingsPage"));
const LandingPage = lazy(() => import("../features/Landing/LandingPage"));
const Layout = lazy(() => import("./layout/Layout"));
const Login = lazy(() => import("../features/Login/Login"));
const Employees = lazy(() => import("../features/Employee/Employee"));
const AddEmployee = lazy(() => import("../features/Employee/AddEmployee"));
const ViewEmployee = lazy(() => import("../features/Employee/ViewEmployee"));
const VCard = lazy(() => import("../features/Employee/VCard"));
const Attendance = lazy(() => import("../features/Attendance/Attendance"));
const Announcement = lazy(() => import("../features/Announcement/Announcement"));
const AnnouncementForm = lazy(() => import("../features/Announcement/AnnouncementForm"));
const Payslip = lazy(() => import("../features/Payslip/Payslip"));
const PayslipPreview = lazy(() => import("../features/Payslip/PayslipPreview"));
const LeaveForm = lazy(() => import("../features/Leave/LeaveForm"));
const Leave = lazy(() => import("../features/Leave/Leave"));
const WorkingHours = lazy(() => import("../features/Attendance/WorkingHours"));
const WorkingHoursForm = lazy(() => import("../features/Attendance/WorkingHoursForm"));
const TimeSheetLayout = lazy(() => import("../features/TimeSheet/TimeSheetLayout"));
const TimesheetCalendar = lazy(() => import("../features/TimeSheet/TimesheetCalendar"));
import { DashboardGuard } from "../auth/HomePath";
import { NotFoundPage, UnderConstructionPage } from "../features/Status/AppStatusPages";
const Holiday = lazy(() => import("../features/Holiday/Holiday"));
const CreateHoliday = lazy(() => import("../features/Holiday/CreateHoliday"));
const CompanyDocument = lazy(() => import("../features/CompanyDocument/CompanyDocument"));
const DocumentUploadForm = lazy(() => import("../features/CompanyDocument/DocumentUploadForm"));
const ForgotPassword = lazy(() => import("../features/Login/ForgotPassword"));
const JobManagement = lazy(() => import("../features/JobManagement/JobManagement"));
const AddProfile = lazy(() => import("../features/JobManagement/AddProfile"));
const CreateJob = lazy(() => import("../features/JobManagement/CreateJob"));
const Projects = lazy(() => import("../features/Projects/Projects"));
const CreateProject = lazy(() => import("../features/Projects/CreateProject"));
const Onboarding = lazy(() => import("../features/Onboarding/Onboarding"));
const EditOnboarding = lazy(() => import("../features/Onboarding/EditOnboarding"));
const WorkStatus = lazy(() => import("../features/WorkStatus/WorkStatus"));
const WorkStatusReport = lazy(() => import("../features/WorkStatus/WorkStatusReport"));
const EmployeeDetailsForm = lazy(() => import("../features/PublicForms/EmployeeDetailsForm"));
const Chat = lazy(() => import("../features/Chat/Chat"));

const routes = [
  { path: "/", element: <GuestRoute><LandingPage /></GuestRoute> },
  { path: "/login", element: <GuestRoute><Login /></GuestRoute> },
  { path: "/sign-in", element: <GuestRoute><Login /></GuestRoute> },
  { path: "/forgot-password", element: <GuestRoute><ForgotPassword /></GuestRoute> },
  { path: "/under-construction", element: <UnderConstructionPage /> },
  // Public (no login) - shareable link for employees to submit their details
  { path: "/employee-details", element: <EmployeeDetailsForm /> },
  {
    element: (<ProtectedRoute><Layout /></ProtectedRoute>),
    children: [
      { path: "dashboard", element: <DashboardGuard><Dashboard /></DashboardGuard> },
      { path: "organization-chart", element: <OrganizationChartPage /> },
      { path: "help-center", element: <HelpCenter /> },
      { path: "privacy-policy", element: <PolicyPage document="privacy" /> },
      { path: "terms", element: <PolicyPage document="terms" /> },
      { path: "standards", element: <PolicyPage document="standards" /> },
      { path: "notifications", element: <Notifications /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "chat", element: <Chat /> },
      { path: "employees", element: <Employees /> },
      { path: "job-management", element: <JobManagement /> },
      { path: "job-management/add-profile", element: <AddProfile /> },
      { path: "job-management/create-job", element: <CreateJob /> },
      { path: "job-management/update-job", element: <CreateJob /> },
      { path: "attendance", element: <Attendance /> },
      { path: "employees/working-hours", element: <WorkingHours /> },
      { path: "employees/add-working-hours", element: <WorkingHoursForm /> },
      { path: "employees/edit-working-hours", element: <WorkingHoursForm /> },
      { path: "employees/projects", element: <Projects /> },
      { path: "employees/projects/create", element: <CreateProject /> },
      { path: "leave", element: <Leave /> },
      { path: "leave/apply-leave", element: <LeaveForm /> },
      { path: "employees/add-employee", element: <AddEmployee /> },
      { path: "employees/edit-employee/:email", element: <AddEmployee /> },
      { path: "profile", element: <ViewEmployee /> },
      { path: "view-employee", element: <Navigate to="/profile" replace /> },
      { path: "vcard", element: <VCard /> },
      { path: "announcement", element: <Announcement /> },
      { path: "announcement/announcement-form", element: <AnnouncementForm /> },
      { path: "payslip", element: <Payslip /> },
      { path: "payslip/payslip-preview", element: <PayslipPreview /> },
      { path: "timesheet", element: <TimeSheetLayout /> },
      { path: "timesheet/timesheet-view", element: <TimesheetCalendar /> },
      { path: "calendar", element: <Holiday /> },
      { path: "calendar/create-event", element: <CreateHoliday /> },
      { path: "calendar/edit-event", element: <CreateHoliday /> },
      { path: "onboarding", element: <Onboarding /> },
      { path: "onboarding/edit/:id", element: <EditOnboarding /> },
      { path: "work-status", element: <WorkStatus /> },
      { path: "work-status-report", element: <WorkStatusReport /> },
      { path: "company-documents", element: <CompanyDocument /> },
      { path: "company-documents/upload", element: <DocumentUploadForm /> },
      { path: "company-documents/edit", element: <DocumentUploadForm /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];

export default routes;
