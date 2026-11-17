import React from "react";
import {
  LayoutDashboard, Users, LogOut, ChevronLeft, ChevronRight, MessageCircleMore,
  Megaphone, File, CalendarCheck2, UserMinus, ClipboardList, Calendar, Receipt,
  AlertTriangle, Briefcase, UserCheck, FileBarChart2,
} from "lucide-react";
export interface NavigationItem { to: string; label: string; icon: React.ReactNode; roles: string[]; departments?: string[]; hiddenDepartments?: string[] }

export const menuItems: NavigationItem[] = [
  { to:"/dashboard",         label:"Dashboard",      icon:<LayoutDashboard size={18}/>, roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["onboarding"] },
  { to:"/chat",              label:"HR Assistant",   icon:<MessageCircleMore size={18}/>, roles:["Admin","Manager","TeamLead","Employee"] },
  { to:"/employees",         label:"Employees",      icon:<Users size={18}/>,           roles:["Admin","Manager","TeamLead"] },
  { to:"/onboarding",       label:"Onboarding",     icon:<UserCheck size={18}/>,       roles:["Admin","Manager","TeamLead","Employee"], departments:["onboarding"] },
  { to:"/work-status",        label:"Work Status",    icon:<Briefcase size={18}/>,       roles:["Manager","TeamLead","Employee"], departments:["onboarding"] },
  { to:"/work-status-report", label:"Work Status Report", icon:<FileBarChart2 size={18}/>, roles:["Manager","TeamLead"], departments:["onboarding"] },
  { to:"/timesheet",         label:"Timesheet",      icon:<ClipboardList size={18}/>,   roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["onboarding"] },
  //{ to:"/job-management",    label:"Job Management", icon:<Briefcase size={18}/>,       roles:["Admin","Manager","Employee"], departments:["hr-offshore"] },
  { to:"/attendance", label:"Attendance", icon:<CalendarCheck2 size={18}/>, roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["deizeisau", "onboarding"] },
  //{ to:"/payslip",           label:"Payslip",        icon:<Receipt size={18}/>,         roles:["Admin"] },
  { to:"/company-documents", label:"Documents",      icon:<File size={18}/>,            roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["onboarding"] },
  { to:"/announcement",      label:"Announcements",  icon:<Megaphone size={18}/>,       roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["onboarding"] },
  { to:"/leave",             label:"Leave",          icon:<UserMinus size={18}/>,       roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["deizeisau", "onboarding"] },
  { to:"/Calendar",          label:"Calendar",       icon:<Calendar size={18}/>,        roles:["Admin","Manager","TeamLead","Employee"] },
];

export function getVisibleMenuItems(userRole = "Employee", department = "") {
  const userDepartment = department.trim().toLowerCase();
  return menuItems.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    // Admin sees every navigation item regardless of department.
    if (userRole === "Admin") return true;
    if (item.hiddenDepartments?.includes(userDepartment)) return false;
    if (item.departments?.length) return item.departments.includes(userDepartment);
    return true;
  });
}

