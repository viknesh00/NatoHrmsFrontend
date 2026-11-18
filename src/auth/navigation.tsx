import React from "react";
import {
  LayoutDashboard, Users, Megaphone, File, CalendarCheck2, UserMinus,
  ClipboardList, Calendar, Briefcase, UserCheck, FileBarChart2, Network, ContactRound,
  ShieldCheck, FileText, Scale, Settings, CircleHelp, UserRound,
} from "lucide-react";
export interface NavigationItem { to: string; label: string; icon: React.ReactNode; roles: string[]; departments?: string[]; hiddenDepartments?: string[] }

export const menuItems: NavigationItem[] = [
  { to:"/dashboard",         label:"Dashboard",      icon:<LayoutDashboard size={20}/>, roles:["Admin","Manager","TeamLead","Employee","Onboarding"] },
  { to:"/employees",         label:"Employees",      icon:<Users size={20}/>,           roles:["Admin","Manager","TeamLead"] },
  { to:"/vcard",             label:"Digital Business Card", icon:<ContactRound size={20}/>, roles:["Admin","Manager","TeamLead","Employee","Onboarding"] },
  { to:"/organization-chart",label:"Organization",   icon:<Network size={20}/>,         roles:["Admin","Manager","TeamLead"] },
  { to:"/onboarding",       label:"Onboarding",     icon:<UserCheck size={20}/>,       roles:["Admin","Manager","TeamLead","Employee","Onboarding"], departments:["onboarding"] },
  { to:"/work-status",        label:"Work Status",    icon:<Briefcase size={20}/>,       roles:["Manager","TeamLead","Employee","Onboarding"], departments:["onboarding"] },
  { to:"/work-status-report", label:"Work Status Report", icon:<FileBarChart2 size={20}/>, roles:["Manager","TeamLead"], departments:["onboarding"] },
  { to:"/timesheet",         label:"Timesheet",      icon:<ClipboardList size={20}/>,   roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["onboarding"] },
  //{ to:"/job-management",    label:"Job Management", icon:<Briefcase size={18}/>,       roles:["Admin","Manager","Employee"], departments:["hr-offshore"] },
  { to:"/attendance", label:"Attendance", icon:<CalendarCheck2 size={20}/>, roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["deizeisau", "onboarding"] },
  //{ to:"/payslip",           label:"Payslip",        icon:<Receipt size={18}/>,         roles:["Admin"] },
  { to:"/company-documents", label:"Documents",      icon:<File size={20}/>,            roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["onboarding"] },
  { to:"/announcement",      label:"Announcements",  icon:<Megaphone size={20}/>,       roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["onboarding"] },
  { to:"/leave",             label:"Leave",          icon:<UserMinus size={20}/>,       roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["deizeisau", "onboarding"] },
  { to:"/Calendar",          label:"Calendar",       icon:<Calendar size={20}/>,        roles:["Admin","Manager","TeamLead","Employee"] },
  { to:"/privacy-policy", label:"Privacy Policy", icon:<ShieldCheck size={20}/>, roles:["Admin","Manager","TeamLead","Employee","Onboarding"] },
  { to:"/terms", label:"Terms of Use", icon:<Scale size={20}/>, roles:["Admin","Manager","TeamLead","Employee","Onboarding"] },
  { to:"/standards", label:"Standards & Integrations", icon:<FileText size={20}/>, roles:["Admin","Manager","TeamLead","Employee","Onboarding"] },
  { to:"/profile", label:"My Profile", icon:<UserRound size={20}/>, roles:["Admin","Manager","TeamLead","Employee","Onboarding"] },
  { to:"/settings", label:"Settings", icon:<Settings size={20}/>, roles:["Admin","Manager","TeamLead","Employee","Onboarding"] },
  { to:"/help-center", label:"Help Center", icon:<CircleHelp size={20}/>, roles:["Admin","Manager","TeamLead","Employee","Onboarding"] },
];

export function getVisibleMenuItems(userRole = "Employee", department = "") {
  const userDepartment = userRole.toLowerCase() === "onboarding" ? "onboarding" : department.trim().toLowerCase();
  return menuItems.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    // Admin sees every navigation item regardless of department.
    if (userRole === "Admin") return true;
    if (item.hiddenDepartments?.includes(userDepartment)) return false;
    if (item.departments?.length) return item.departments.includes(userDepartment);
    return true;
  });
}

