import React from "react";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "./services/ProtectedRoute";
import Dashboard from "./pages/Dashboard/Dashboard";
import Layout from "./pages/Layout/Layout";
import Login from "./pages/Login/Login";
import Employees from "./pages/Employee/Employee";
import AddEmployee from "./pages/Employee/AddEmployee";
import ViewEmployee from "./pages/Employee/ViewEmployee";
import Attendance from "./pages/Attendance/Attendance";
import Announcement from "./pages/Announcement/Announcement";
import AnnouncementForm from "./pages/Announcement/AnnouncementForm";
import Payslip from "./pages/Payslip/Payslip";
import PayslipPreview from "./pages/Payslip/PayslipPreview";
import LeaveForm from "./pages/Leave/LeaveForm";
import Leave from "./pages/Leave/Leave";
import WorkingHours from "./pages/Attendance/WorkingHours";
import WorkingHoursForm from "./pages/Attendance/WorkingHoursForm";
import TimeSheetLayout from "./pages/TimeSheet/TimeSheetLayout";
import TimesheetCalendar from "./pages/TimeSheet/TimesheetCalendar";
import RoleBasedRedirect from "./services/RoleBasedRedirect";
import Holiday from "./pages/Holiday/Holiday";
import CreateHoliday from "./pages/Holiday/CreateHoliday";
import CompanyDocument from "./pages/CompanyDocument.js/CompanyDocument";
import DocumentUploadForm from "./pages/CompanyDocument.js/DocumentUploadForm";
import ForgotPassword from "./pages/Login/ForgotPassword";

const routes = [
    // Public Route
    { path: "/", element: <Login /> },
    { path: "/login", element: <Login /> },
    { path: "/sign-in", element: <Login /> },
    { path: "/forgot-password", element: <ForgotPassword/>},

    // Protected Routes
    {
        path: "/*", // Wildcard path for nested layout routes
        element: (
            <ProtectedRoute>
                <Layout />
            </ProtectedRoute>
        ),
        children: [
            { path: "dashboard", element: <Dashboard /> },
            { path: "employees", element: <Employees /> },
            { path: "attendance", element: <Attendance /> },
            { path: "employees/working-hours", element: <WorkingHours /> },
            { path: "employees/add-working-hours", element: <WorkingHoursForm /> },
            { path: "employees/edit-working-hours", element: <WorkingHoursForm /> },
            { path: "leave", element: <Leave /> },
            { path: "leave/apply-leave", element: <LeaveForm /> },
            { path: "employees/add-employee", element: <AddEmployee /> },
            { path: "employees/edit-employee/:email", element: <AddEmployee />},
            { path: "view-employee", element: <ViewEmployee /> },
            { path: "announcement", element: <Announcement /> },
            { path: "announcement/announcement-form", element: <AnnouncementForm /> },
            { path: "payslip", element: <Payslip /> },
            { path: "payslip/payslip-preview", element: <PayslipPreview /> },
            { path: "timesheet", element: <TimeSheetLayout /> },
            { path: "timesheet/timesheet-view", element: <TimesheetCalendar/>},
            { path: "calendar", element: <Holiday/>},
            { path: "calendar/create-event", element: <CreateHoliday/>},
            { path: "calendar/edit-event", element: <CreateHoliday/>},
            { path: "company-documents", element: <CompanyDocument/>},
            { path: "company-documents/upload", element: <DocumentUploadForm/>},
            { path: "company-documents/edit", element: <DocumentUploadForm/>},
            { path: "*", element: <RoleBasedRedirect /> },
        ],
    },

    { path: "*", element: <Navigate to="/" /> },
];

export default routes;