import { cn } from "cn";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Users, CalendarCheck2, UserMinus, Megaphone, Clock, ChevronRight, ArrowUpRight, Briefcase, ClipboardList, Sparkles, CalendarDays, UserCheck, FileText } from "lucide-react";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import { getCookie } from "../../auth/Cookies";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { getEventColors } from "../Holiday/eventColors";
import { AttendanceChart, DepartmentChart, KpiSnapshotChart, PersonalAttendanceChart } from "./DashboardCharts";
import OrganizationDendrogram from "./OrganizationDendrogram";
import { getVisibleMenuItems } from "../../auth/navigation";
import { getDayPeriod } from "../../theme/dayPeriod";
import { useTheme } from "../../theme/ThemeProvider";

dayjs.extend(isoWeek);

const ROLE_KPI_PALETTES = {
  Admin: [
    { bg: "var(--primary)", ghost: "var(--primary-ghost)", text: "var(--primary)" },
    { bg: "var(--success)", ghost: "var(--success-subtle)", text: "var(--success)" },
    { bg: "var(--information)", ghost: "var(--information-subtle)", text: "var(--information)" },
    { bg: "var(--warning)", ghost: "var(--warning-subtle)", text: "var(--warning)" },
  ],
  Manager: [
    { bg: "var(--information)", ghost: "var(--information-subtle)", text: "var(--information)" },
    { bg: "var(--primary)", ghost: "var(--primary-ghost)", text: "var(--primary)" },
    { bg: "var(--warning)", ghost: "var(--warning-subtle)", text: "var(--warning)" },
    { bg: "var(--success)", ghost: "var(--success-subtle)", text: "var(--success)" },
  ],
  TeamLead: [
    { bg: "var(--success)", ghost: "var(--success-subtle)", text: "var(--success)" },
    { bg: "var(--information)", ghost: "var(--information-subtle)", text: "var(--information)" },
    { bg: "var(--primary)", ghost: "var(--primary-ghost)", text: "var(--primary)" },
    { bg: "var(--warning)", ghost: "var(--warning-subtle)", text: "var(--warning)" },
  ],
  Employee: [
    { bg: "var(--primary)", ghost: "var(--primary-ghost)", text: "var(--primary)" },
    { bg: "var(--success)", ghost: "var(--success-subtle)", text: "var(--success)" },
    { bg: "var(--information)", ghost: "var(--information-subtle)", text: "var(--information)" },
    { bg: "var(--warning)", ghost: "var(--warning-subtle)", text: "var(--warning)" },
  ],
  Onboarding: [
    { bg: "var(--information)", ghost: "var(--information-subtle)", text: "var(--information)" },
    { bg: "var(--primary)", ghost: "var(--primary-ghost)", text: "var(--primary)" },
    { bg: "var(--success)", ghost: "var(--success-subtle)", text: "var(--success)" },
    { bg: "var(--warning)", ghost: "var(--warning-subtle)", text: "var(--warning)" },
  ],
};

const PROJECT_COLORS = [
  { bg: "var(--primary-ghost)", text: "var(--primary)" },
  { bg: "var(--success-subtle)", text: "var(--success)" },
  { bg: "var(--information-subtle)", text: "var(--information)" },
  { bg: "var(--warning-subtle)", text: "var(--warning)" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "N/A");
const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

function responseRows(result: PromiseSettledResult<{ data: unknown }>) {
  return result.status === "fulfilled" && Array.isArray(result.value?.data) ? result.value.data : null;
}

function deptMatch(projDept, userDept) {
  if (!projDept || !userDept) return false;
  const pDepts = projDept.toLowerCase().split(",").map(d => d.trim());
  const uDepts = userDept.toLowerCase().split(",").map(d => d.trim());
  return pDepts.some(d => uDepts.includes(d));
}

function projectStatusBadge(status) {
  if (!status) return { cls: "badge-gray", label: "N/A" };
  const s = status.toLowerCase();
  if (s === "active" || s === "in progress") return { cls: "badge-green", label: status };
  if (s === "completed") return { cls: "badge-blue", label: status };
  if (s === "on hold") return { cls: "badge-yellow", label: status };
  if (s === "cancelled") return { cls: "badge-red", label: status };
  return { cls: "badge-gray", label: status };
}

// ── ProjectProgress ───────────────────────────────────────────────────────────
function ProjectProgress({ project, userDept }: Record<string, any>) {
  if (!project) return (
    <div className="text-center p-[28px_0] text-[var(--text-muted)] text-[13px]" >
      <div className="flex justify-center mb-[8px] text-primary" ><ClipboardList size={28} aria-hidden="true" /></div>
      <div className="font-semibold text-[var(--text-secondary)] mb-[4px]" >No project assigned</div>
      <div className="text-[12px]" >Contact your manager to get assigned to a project</div>
    </div>
  );

  const start = project._rawStart ? dayjs(project._rawStart) : null;
  const end = project._rawEnd ? dayjs(project._rawEnd) : null;
  const now = dayjs();
  let pct = 0;
  if (start && end && start.isValid() && end.isValid() && end.isAfter(start)) {
    pct = Math.min(100, Math.max(0,
      Math.round((now.diff(start, "day") / end.diff(start, "day")) * 100)
    ));
  }
  const st = projectStatusBadge(project.status);

  return (
    <div className="bg-[var(--bg)] p-[16px_16px]" style={{ borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
      <div className="flex justify-between items-start mb-[8px]" >
        <div>
          <div className="text-[16px] font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--ui-font-heading)" }}>
            {project.projectName}
          </div>
          {project.clientName && (
            <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >
              Client: {project.clientName}
            </div>
          )}
        </div>
        <span className={`badge ${st.cls}`}>{st.label}</span>
      </div>

      <div className="mt-[12px] mb-[4px]" >
        <div className="flex justify-between text-[12px] text-[var(--text-muted)] mb-[4px]" >
          <span>Timeline progress</span>
          <span className="font-semibold text-[var(--text-primary)]" >{pct}%</span>
        </div>
        <div className="h-[6px] bg-border overflow-hidden" style={{ borderRadius: "var(--radius)" }}>
          <div className="h-[100%] bg-primary" style={{ width: `${pct}%`, borderRadius: "var(--radius)", transition: "width 1s ease" }} />
        </div>
      </div>

      <div className="grid gap-[12px_16px] mt-[16px]" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {[
          { label: "Start Date", value: project.startDate || "N/A" },
          { label: "End Date", value: project.endDate || "N/A" },
          {
            label: "Department", value: (() => {
              if (!project.department) return "N/A";
              if (!userDept) return project.department;
              const projDepts = project.department.split(",").map(d => d.trim());
              const userDepts = userDept.split(",").map(d => d.trim());
              const matched = projDepts.filter(d => userDepts.map(u => u.toLowerCase()).includes(d.toLowerCase()));
              return matched.length ? matched.join(", ") : project.department;
            })()
          },
          {
            label: "Description", value: project.description
              ? project.description.slice(0, 40) + (project.description.length > 40 ? "…" : "")
              : "N/A"
          },
        ].map((f, i) => (
          <div key={i}>
            <div className="text-[12px] text-[var(--text-muted)] font-semibold uppercase tracking-[0.05em]" >
              {f.label}
            </div>
            <div className="text-[12px] font-semibold text-[var(--text-primary)] mt-[4px]" >
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AttRow ────────────────────────────────────────────────────────────────────
function AttRow({ label, count, total, color, compact = false }: Record<string, any>) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className={compact ? "mb-[8px]" : "mb-[16px]"} >
      <div className="flex justify-between mb-[4px]" >
        <span className="text-[13px] text-[var(--text-secondary)] font-medium" >{label}</span>
        <span className="text-[13px] font-semibold text-[var(--text-primary)]" >
          {count} <span className="text-[12px] text-[var(--text-muted)] font-normal" >({pct}%)</span>
        </span>
      </div>
      {!compact && <div className="h-[8px] bg-[var(--bg)] overflow-hidden" style={{ borderRadius: "var(--radius)" }}>
        <div className="h-[100%]" style={{ width: `${pct}%`, background: color, borderRadius: "var(--radius)", transition: "width 0.8s ease" }} />
      </div>}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ h = 18, w = "100%", mb = 8 }: Record<string, any>) {
  return <div className="skeleton" style={{ height: h, width: w, marginBottom: mb, borderRadius: "var(--radius)" }} />;
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────
function MiniCalendar({ holidays }: Record<string, any>) {
  const [current, setCurrent] = useState(dayjs());
  const startDate = current.startOf("month").startOf("isoWeek");
  const days = Array.from({ length: 42 }, (_, i) => startDate.add(i, "day"));

  return (
    <div>
      <div className="calendar-header">
        <Button variant="ghost" type="button" className="calendar-nav-btn" onClick={() => setCurrent(c => c.subtract(1, "month"))}>
          <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
        </Button>
        <span className="calendar-month">{current.format("MMMM YYYY")}</span>
        <Button variant="ghost" type="button" className="calendar-nav-btn" onClick={() => setCurrent(c => c.add(1, "month"))}>
          <ChevronRight size={14} />
        </Button>
      </div>
      <table className={cn("calendar-grid", "w-[100%]")} style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
              <th key={d} className="w-[14.28%]" >{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, wi) => (
            <tr key={wi}>
              {days.slice(wi * 7, wi * 7 + 7).map(day => {
                const iso = day.format("YYYY-MM-DD");
                const inMonth = day.month() === current.month();
                const isToday = iso === dayjs().format("YYYY-MM-DD");
                const isWknd = day.day() === 0 || day.day() === 6;
                const holiday = holidays.find(h => h.eventDate === iso);
                const eventColor = holiday ? getEventColors(holiday) : null;
                let cls = "cal-day";
                if (!inMonth) cls += " dim";
                else if (isToday) cls += " today";
                else if (holiday) cls += holiday.eventType === "Holiday" ? " has-holiday" : " has-event";
                else if (isWknd) cls += " weekend";
                return (
                  <td key={iso}>
                    <div
                      className={cls}
                      title={holiday ? `${holiday.eventName} · ${holiday.eventType}` : ""}
                      style={eventColor && inMonth ? { background: eventColor.bg, color: eventColor.text, boxShadow: `inset 0 0 0 1px ${eventColor.dot}` } : undefined}
                    >{day.format("D")}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employeeRows, setEmployees] = useState(null);
  const [dailyAttendanceRows, setTodayAtt] = useState(null);
  const [monthlyAtt, setMonthlyAtt] = useState([]);
  const [leaveRows, setLeaves] = useState(null);
  const [announcementRows, setAnn] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [projects, setProjects] = useState([]);
  const [submissionRows, setOnboardingRows] = useState(null);
  const [workStatusRows, setOnboardingWorkRows] = useState(null);
  const [myUserData, setMyUserData] = useState(null);
  const [selectedCategory, setDashboardCategory] = useState("overview");
  const { now: localTime } = useTheme();
  const now = dayjs(localTime);
  const fetchVersionRef = useRef(0);

  const firstName = getCookie("firstName") || "User";
  const userRole = getCookie("role");
  const userEmail = getCookie("email");
  const myDepartment = myUserData?.department || getCookie("department");
  const visiblePaths = new Set(getVisibleMenuItems(userRole, myDepartment).map((item) => item.to));

  /* ── Role flags ──
     Admin        → sees everything, unscoped
     Manager      → department-scoped
     TeamLead     → same admin/manager-style dashboard layout, but data is
                    already scoped to "self + direct reports" by the backend
                    procs (Get_All_Users, GetAttendanceRecords[Range],
                    GetEmployeeLeave, GetAnnouncements). Projects have no
                    per-employee scope, so TeamLead is department-filtered
                    there, same as Manager. */
  const isAdmin = userRole === "Admin";
  const isManager = userRole === "Manager";
  const isTeamLead = userRole === "TeamLead";
  const isAdminOrMgr = isAdmin || isManager || isTeamLead;
  const isEmployee = !isAdminOrMgr;
  const isOnboardingDashboard = normalize(userRole) === "onboarding" || normalize(myDepartment) === "onboarding";
  const canViewEmployees = !isOnboardingDashboard && visiblePaths.has("/employees");
  const canShowAttendance = !isOnboardingDashboard && visiblePaths.has("/attendance");
  const canViewLeaves = !isOnboardingDashboard && visiblePaths.has("/leave");
  const canViewAnnouncements = !isOnboardingDashboard && visiblePaths.has("/announcement");
  const canViewOnboarding = isOnboardingDashboard && visiblePaths.has("/onboarding");
  const canViewWorkStatus = isOnboardingDashboard && visiblePaths.has("/work-status");
  const kpiPalette = isOnboardingDashboard ? ROLE_KPI_PALETTES.Onboarding : (ROLE_KPI_PALETTES[userRole] || ROLE_KPI_PALETTES.Employee);
  const todayStr = now.format("YYYY-MM-DD");
  const dayPeriod = getDayPeriod(now.hour());
  const greetings = { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", night: "Good evening" };
  const greetingIcons = { morning: "🌞", afternoon: "☀️", evening: "✨", night: "🌙" };
  const greeting = greetings[dayPeriod];
  const today = now.format("dddd, DD MMM YYYY");

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return dayjs(dateStr).format("DD-MM-YYYY");
  };

  // ── Fetch all ───────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (isInitial = false) => {
    const version = ++fetchVersionRef.current;
    if (isInitial) setLoading(true);
    try {
      const [empR, attDailyR, attMonthlyR, lvR, annR, holR, projR, myUserR, onboardingR, onboardingWorkR] = await Promise.allSettled([
        canViewEmployees ? getRequest("User/All") : null,
        canShowAttendance ? postRequest("Attendance/GetDailyAttendance", { date: todayStr }) : null,
        canShowAttendance && isEmployee ? postRequest("Attendance/GetMonthlyAttendance", {
          fromDate: dayjs(todayStr).startOf("month").format("YYYY-MM-DD"),
          toDate: todayStr,
        }) : null,
        canViewLeaves ? getRequest("User/GetEmployeeLeave") : null,
        canViewAnnouncements ? getRequest("Announcement/GetAnnouncement") : null,
        getRequest("Holiday/GetHolidays"),
        !isOnboardingDashboard ? getRequest("Project/All") : null,
        userEmail ? getRequest(`User/GetUser/${userEmail}`) : null,
        canViewOnboarding ? getRequest("EmployeeOnboarding/GetAll") : null,
        canViewWorkStatus ? getRequest("WorkStatus/GetAll") : null,
      ]);
      if (version !== fetchVersionRef.current) return;

      setEmployees(responseRows(empR));
      setTodayAtt(responseRows(attDailyR));
      setMonthlyAtt(responseRows(attMonthlyR) ?? []);
      const leaveData = lvR.status === "fulfilled" ? lvR.value?.data?.leaves : null;
      setLeaves(Array.isArray(leaveData) ? leaveData : null);
      setAnn(responseRows(annR)?.filter(a => a.isActive !== false) ?? null);
      setHolidays((responseRows(holR) ?? []).map(h => ({
        ...h,
        eventDate: dayjs(h.eventDate).format("YYYY-MM-DD"),
      })));
      setProjects(responseRows(projR) ?? []);
      if (myUserR.status === "fulfilled" && myUserR.value?.data) {
        const profile = myUserR.value.data;
        setMyUserData(Array.isArray(profile) ? profile[0] : profile);
      }
      setOnboardingRows(responseRows(onboardingR));
      setOnboardingWorkRows(responseRows(onboardingWorkR));
    } finally {
      if (version === fetchVersionRef.current) setLoading(false);
    }
  }, [canViewEmployees, canShowAttendance, isEmployee, canViewLeaves, canViewAnnouncements,
    isOnboardingDashboard, canViewOnboarding, canViewWorkStatus, todayStr, userEmail]);

  useEffect(() => {
    void fetchAll(true);
    const handler = () => fetchAll(false);
    window.addEventListener("attendance:updated", handler);
    return () => {
      fetchVersionRef.current += 1;
      window.removeEventListener("attendance:updated", handler);
    };
  }, [fetchAll, userRole, myDepartment]);

  // ── Attendance derived ──────────────────────────────────────────────────────
  const employees = employeeRows ?? [];
  const onboardingRows = submissionRows ?? [];
  const onboardingWorkRows = workStatusRows ?? [];
  const announcements = announcementRows ?? [];
  const myEmail = normalize(userEmail);
  const myName = normalize([myUserData?.firstName || getCookie("firstName"), myUserData?.lastName || getCookie("lastName")].filter(Boolean).join(" "));
  const leaves = (leaveRows ?? []).filter(l => {
    const email = normalize(l.userName || l.userEmail);
    return !isEmployee || !email || email === myEmail;
  });
  const totalEmp = employees.length;
  const activeEmp = employees.filter(e => e.isActive).length;

  const clockIns = (dailyAttendanceRows ?? []).filter(row => normalize(row.type).replace(/[\s_-]+/g, "") === "clockin");
  const presentToday = new Set(clockIns.map(row => normalize(row.userEmail || row.employeeId || row.userName)).filter(Boolean)).size;
  const clockedInToday = clockIns.some(row => {
    const email = normalize(row.userEmail);
    const name = normalize(row.userName);
    if (email) return email === myEmail;
    if (name.includes("@")) return name === myEmail;
    return !name || !myName || name === myName;
  });

  const todayLeaves = leaves.filter(l => {
    const from = dayjs(l.fromDate, ["DD-MM-YYYY", "YYYY-MM-DD", "DD/MM/YYYY"]);
    const to = dayjs(l.toDate, ["DD-MM-YYYY", "YYYY-MM-DD", "DD/MM/YYYY"]);
    const now = dayjs();
    return now.isSame(from, "day") || now.isSame(to, "day") ||
      (now.isAfter(from, "day") && now.isBefore(to, "day"));
  });

  const approvedTodayLeaves = todayLeaves.filter(l => l.isApproved && l.approvedBy).length;
  const pendingTodayLeaves = todayLeaves.filter(l => !l.approvedBy).length;
  const allPendingLeaves = leaves.filter(l => !l.approvedBy).length;
  const absentToday = Math.max(0, activeEmp - presentToday - approvedTodayLeaves);
  const recentLeaves = [...leaves].slice(0, 6);

  // ── Project derived ─────────────────────────────────────────────────────────
  const projectsFormatted = projects.map(p => ({
    ...p,
    _rawStart: p.startDate,
    _rawEnd: p.endDate,
    startDate: fmt(p.startDate),
    endDate: fmt(p.endDate),
  }));

  // Use fresh API data for current user (projectAssigned, department)
  const myProjectAssigned = myUserData?.projectAssigned || null;
  const dashboardCategories = isOnboardingDashboard ? [
    { value: "overview", label: "Overview" },
    ...(canViewOnboarding ? [{ value: "onboarding", label: "Onboarding" }] : []),
    ...(canViewWorkStatus ? [{ value: "work-status", label: "Work Status" }] : []),
    { value: "updates", label: "Updates" },
  ] : [
    { value: "overview", label: "Overview" },
    ...(canShowAttendance ? [{ value: "attendance", label: "Attendance" }] : []),
    ...(isAdminOrMgr ? [{ value: "people", label: "People" }] : []),
    ...(isAdminOrMgr ? [{ value: "organization", label: "Organization" }] : []),
    { value: "projects", label: isAdminOrMgr ? "Projects" : "My Project" },
    { value: "updates", label: "Updates" },
  ];
  const dashboardCategory = dashboardCategories.some(category => category.value === selectedCategory) ? selectedCategory : "overview";
  const showOverview = dashboardCategory === "overview";
  const showAttendance = canShowAttendance && (showOverview || dashboardCategory === "attendance");
  const showPeople = !isOnboardingDashboard && (showOverview || dashboardCategory === "people");
  const showProjects = !isOnboardingDashboard && (showOverview || dashboardCategory === "projects");
  const showUpdates = showOverview || dashboardCategory === "updates";
  const showOrganization = dashboardCategory === "organization" && isAdminOrMgr;
  const showLeftColumn = showAttendance || showProjects;
  const showMiddleColumn = showPeople || showUpdates;
  const showRightColumn = showUpdates;
  const layoutColumns = showOverview
    ? "repeat(3, minmax(0, 1fr))"
    : dashboardCategory === "attendance" || dashboardCategory === "projects" ? "minmax(0, 1fr)"
      : dashboardCategory === "people" ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))";

  // Admin              → all projects, unscoped
  // Manager / TeamLead → department's projects only (Project entity has no
  //                      per-employee scope, so department is as granular as it gets)
  const myDeptProjects = isAdmin
    ? projectsFormatted
    : projectsFormatted.filter(p => deptMatch(p.department, myDepartment));

  const activeProjects = myDeptProjects.filter(p =>
    ["active", "in progress"].includes((p.status || "").toLowerCase())
  );
  const pendingProjects = myDeptProjects.filter(p =>
    ["planning", "on hold"].includes((p.status || "").toLowerCase())
  );
  const recentProjects = myDeptProjects.slice(0, 4);

  // Employee → only show if projectAssigned is explicitly set (not null/empty)
  const myProject = isEmployee
    ? (myProjectAssigned
      ? projectsFormatted.find(p =>
        p.projectName?.toLowerCase().trim() === myProjectAssigned.toLowerCase().trim()
      ) ?? null
      : null)
    : null;

  // ── Stat cards ──────────────────────────────────────────────────────────────
  const activeOnboardingCount = onboardingRows.filter(row => normalize(row.employeeStatus || "Active") === "active").length;
  const assignedOnboardingWorkCount = onboardingRows.filter(row => {
    const status = normalize(row.workStatus);
    return status && status !== "not assigned" && status !== "unassigned";
  }).length;
  const onboardingRowsThisMonth = onboardingRows.filter(row => row.submittedAt && dayjs(row.submittedAt).isSame(now, "month")).length;
  const onboardingUnavailable = "Onboarding data unavailable";
  const approvedPersonalLeaves = leaves.filter(leave => leave.isApproved && leave.approvedBy).length;
  const statCards = isOnboardingDashboard && canViewOnboarding ? [
    { label: "Onboarding records", value: submissionRows?.length, sub: submissionRows ? "Employee submissions" : onboardingUnavailable, icon: <UserCheck size={22} />, accent: kpiPalette[0], link: "/onboarding" },
    { label: "Active employees", value: submissionRows ? activeOnboardingCount : null, sub: submissionRows ? "Current onboarding roster" : onboardingUnavailable, icon: <Users size={22} />, accent: kpiPalette[1], link: "/onboarding" },
    { label: "Assigned work", value: submissionRows ? assignedOnboardingWorkCount : null, sub: submissionRows ? "Employees with a work assignment" : onboardingUnavailable, icon: <Briefcase size={22} />, accent: kpiPalette[2], link: canViewWorkStatus ? "/work-status" : undefined },
    { label: "Submitted this month", value: submissionRows ? onboardingRowsThisMonth : null, sub: submissionRows ? now.format("MMMM YYYY") : onboardingUnavailable, icon: <FileText size={22} />, accent: kpiPalette[3], link: "/onboarding" },
  ] : [
    ...(canViewEmployees ? [{
      label: isAdmin ? "Total Employees" : isManager ? "Department Staff" : "Team Members",
      value: employeeRows ? totalEmp : null, sub: employeeRows ? `${activeEmp} active` : "Employee data unavailable",
      icon: <Users size={22} />, accent: kpiPalette[0], link: "/employees",
    }] : []),
    ...(isEmployee && canViewLeaves ? [{
      label: "My Leaves", value: leaveRows ? leaves.length : null,
      sub: leaveRows ? `${approvedPersonalLeaves} approved` : "Leave data unavailable",
      icon: <UserMinus size={22} />, accent: kpiPalette[0], link: "/leave",
    }] : []),
    ...(canShowAttendance ? [{
      label: "Present Today", value: dailyAttendanceRows ? (isEmployee ? (clockedInToday ? "Yes" : "No") : presentToday) : null,
      sub: !dailyAttendanceRows ? "Attendance unavailable" : isEmployee
        ? (clockedInToday ? "Clock-in recorded" : "No clock-in recorded")
        : employeeRows ? `of ${activeEmp} active` : "Employees who clocked in",
      icon: <CalendarCheck2 size={22} />, accent: kpiPalette[1], link: "/attendance",
    }] : []),
    ...(isAdminOrMgr && canViewLeaves ? [{
      label: "Pending Leaves", value: leaveRows ? allPendingLeaves : null,
      sub: leaveRows ? "Awaiting a decision" : "Leave data unavailable",
      icon: <UserMinus size={22} />, accent: kpiPalette[2], link: "/leave",
    }] : []),
    ...(canViewAnnouncements ? [{
      label: "Announcements", value: announcementRows?.length, sub: announcementRows ? "Active notices" : "Announcements unavailable",
      icon: <Megaphone size={22} />, accent: kpiPalette[isEmployee ? 2 : 3], link: "/announcement",
    }] : []),
  ];
  const featuredStat = statCards[0];

  const leaveStatus = (row) => {
    if (!row.approvedBy) return { cls: "badge-yellow", label: "Pending" };
    if (row.isApproved) return { cls: "badge-green", label: "Approved" };
    return { cls: "badge-red", label: "Declined" };
  };

  const deptGroups: Record<string, any> = {};
  employees.forEach(e => {
    const k = e.department || "Unknown";
    deptGroups[k] = (deptGroups[k] || 0) + 1;
  });

  const upcomingHolidays = holidays
    .filter(h => dayjs(h.eventDate).isAfter(dayjs().subtract(1, "day")))
    .slice(0, 4);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-page p-[0_0_24px]" >

      {/* Greeting Banner */}
      <div className={cn("greeting-banner", "mb-[18px]")}>
        <div className="greeting-banner-copy">
          <div className="greeting-title">{greeting}, {firstName}! <span className="greeting-emoji" aria-hidden="true">{greetingIcons[dayPeriod]}</span> <Sparkles size={18} aria-hidden="true" /></div>
        </div>
        <div className="greeting-banner-date">
          <Clock size={15} aria-hidden="true" />
          <div><span>Today</span><strong>{today}</strong></div>
        </div>
      </div>

      {/* Stat Cards */}
      {featuredStat && <div className="dashboard-stats-grid" aria-busy={loading} style={{ "--stat-columns": statCards.length } as React.CSSProperties}>
        {statCards.map(card => {
          const value = card.value ?? "N/A";
          const cardProps = {
            className: "stat-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
            style: { "--accent-color": card.accent.ghost, cursor: card.link ? "pointer" : "default" } as React.CSSProperties,
          };
          const content = <>
            <div className="stat-icon" aria-hidden="true" style={{ background: card.accent.ghost }}>
              {React.cloneElement(card.icon, { color: card.accent.text })}
            </div>
            {loading ? <><Skel h={28} w="55%" mb={5} /><Skel h={13} w="40%" /></> : <>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-sub">{card.sub}</div>
            </>}
          </>;
          return card.link ? (
            <Link key={card.label} to={card.link} aria-label={loading ? card.label : `${card.label}: ${value}`} {...cardProps}>{content}</Link>
          ) : <div key={card.label} {...cardProps}>{content}</div>;
        })}
      </div>}

      <div className="dashboard-category-tabs">
        <Tabs value={dashboardCategory} onValueChange={setDashboardCategory}>
          <TabsList aria-label="Dashboard categories">
            {dashboardCategories.map((category) => <TabsTrigger key={category.value} value={category.value}>{category.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      {featuredStat && <div className="card dashboard-kpi-overview dashboard-visual-card">
        <div className="card-header">
          <span className={cn("card-title", "flex items-center gap-[8px]")}>
            <Sparkles size={17} aria-hidden="true" className="text-primary" />
            {isOnboardingDashboard ? "Onboarding overview" : isAdmin ? "Organization overview" : isManager ? "Department overview" : isTeamLead ? "Team overview" : "My overview"}
          </span>
        </div>
        <div className="dashboard-kpi-overview-body">
          <div className="dashboard-kpi-feature">
            <span className="dashboard-kpi-feature-icon" aria-hidden="true" style={{ color: featuredStat.accent.text, background: featuredStat.accent.ghost }}>{featuredStat.icon}</span>
            <div className="dashboard-kpi-feature-copy">
              <div className="dashboard-kpi-feature-heading"><span>{featuredStat.label}</span><strong>{loading ? "—" : featuredStat.value ?? "N/A"}</strong></div>
              {!loading && <p>{featuredStat.sub}</p>}
            </div>
          </div>
          <div className="dashboard-kpi-chart-wrap">
            {loading ? <Skel h={148} mb={0} /> : <KpiSnapshotChart data={statCards.map(card => ({ label: card.label, value: card.value ?? "N/A", color: card.accent.bg }))} />}
          </div>
        </div>
      </div>}

      {showOrganization && <section className="card dashboard-organization-card" aria-labelledby="organization-chart-heading">
        <div className="card-header">
          <div>
            <h2 id="organization-chart-heading" className="card-title">Organization hierarchy</h2>
            <p className="text-sm text-muted-foreground">Reporting relationships from employee profiles</p>
          </div>
        </div>
        <OrganizationDendrogram employees={employees} loading={loading} />
      </section>}

      {isOnboardingDashboard && dashboardCategory !== "organization" && <div className="dashboard-main-grid onboarding-dashboard-bento" data-category={dashboardCategory}>
        {canViewOnboarding && (showOverview || dashboardCategory === "onboarding") && <section className="card onboarding-dashboard-card">
          <div className="card-header">
            <div className="onboarding-card-heading"><span className="onboarding-card-icon"><UserCheck size={18} /></span><div><h2 className="card-title">Employee onboarding</h2><p>Submission and employee status overview</p></div></div>
            <Button variant="outline" size="sm" type="button" onClick={() => navigate("/onboarding")}>Open onboarding <ArrowUpRight size={14} /></Button>
          </div>
          <div className="onboarding-dashboard-card-body">
            <div className="onboarding-summary-metrics">
              {statCards.map(card => <div key={card.label}><strong>{loading ? "—" : card.value ?? "N/A"}</strong><span>{card.label}</span></div>)}
            </div>
            {!loading && onboardingRows.length > 0 && <>
              <div className="onboarding-summary-progress"><span style={{ width: `${Math.round(activeOnboardingCount / onboardingRows.length * 100)}%` }} /></div>
              <div className="onboarding-summary-note">{Math.round(activeOnboardingCount / onboardingRows.length * 100)}% of records are active</div>
            </>}
            <div className="onboarding-recent-list">
              <div className="onboarding-list-heading">Recent submissions</div>
              {loading ? <Skel h={44} mb={8} /> : onboardingRows.slice(0, 5).map((row, index) => (
                <div className="onboarding-record-row" key={row.submissionId || row.employeeId || index}>
                  <span className="onboarding-record-avatar">{`${row.firstName?.[0] || "?"}${row.lastName?.[0] || ""}`.toUpperCase()}</span>
                  <span className="onboarding-record-name">{[row.firstName, row.lastName].filter(Boolean).join(" ") || "Employee record"}<small>{row.department || row.employeeId || "Onboarding"}</small></span>
                  <span className={`onboarding-record-status ${String(row.employeeStatus || "Active").toLowerCase() === "active" ? "is-active" : "is-other"}`}>{row.employeeStatus || "Active"}</span>
                </div>
              ))}
              {!loading && onboardingRows.length === 0 && <div className="onboarding-empty-state">{submissionRows ? "No onboarding submissions yet." : onboardingUnavailable}</div>}
            </div>
          </div>
        </section>}

        {canViewWorkStatus && (showOverview || dashboardCategory === "work-status") && <section className="card onboarding-dashboard-card">
          <div className="card-header">
            <div className="onboarding-card-heading"><span className="onboarding-card-icon is-work"><Briefcase size={18} /></span><div><h2 className="card-title">Work status</h2><p>Current assignments and activity</p></div></div>
            <Button variant="outline" size="sm" type="button" onClick={() => navigate("/work-status")}>Open work status <ArrowUpRight size={14} /></Button>
          </div>
          <div className="onboarding-dashboard-card-body">
            <div className="onboarding-work-summary">
              <span><strong>{loading ? "—" : workStatusRows?.length ?? "N/A"}</strong> work records</span>
              <span><strong>{loading ? "—" : workStatusRows?.filter(row => normalize(row.workStatus) === "active").length ?? "N/A"}</strong> active</span>
            </div>
            <div className="onboarding-recent-list">
              <div className="onboarding-list-heading">Latest work records</div>
              {loading ? <Skel h={44} mb={8} /> : onboardingWorkRows.slice(0, 6).map((row, index) => (
                <div className="onboarding-record-row" key={row.workStatusId || row.submissionId || index}>
                  <span className="onboarding-record-avatar is-work"><Briefcase size={15} /></span>
                  <span className="onboarding-record-name">{row.salCode || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Work assignment"}<small>{row.activity || row.pmName || "Activity not specified"}</small></span>
                  <span className={`onboarding-record-status ${String(row.workStatus || "").toLowerCase() === "active" ? "is-active" : "is-other"}`}>{row.workStatus || "Unassigned"}</span>
                </div>
              ))}
              {!loading && onboardingWorkRows.length === 0 && <div className="onboarding-empty-state">{workStatusRows ? "No work status records yet." : "Work status data unavailable"}</div>}
            </div>
          </div>
        </section>}

        {dashboardCategory === "updates" && <>
          <section className="card onboarding-dashboard-card">
            <div className="card-header"><div className="onboarding-card-heading"><span className="onboarding-card-icon is-events"><CalendarDays size={18} /></span><div><h2 className="card-title">Upcoming events</h2><p>Company holidays and dates</p></div></div></div>
            <div className="onboarding-dashboard-card-body onboarding-update-list">
              {upcomingHolidays.map((event, index) => <div key={event.holidayId || index}><strong>{event.eventName}</strong><span>{dayjs(event.eventDate).format("ddd, DD MMM")} · {event.eventType}</span></div>)}
              {!upcomingHolidays.length && <div className="onboarding-empty-state">No upcoming events.</div>}
            </div>
          </section>
        </>}
      </div>}

      {/* Main grid */}
      {!isOnboardingDashboard && dashboardCategory !== "organization" && <div className="dashboard-main-grid dashboard-bento-grid" data-category={dashboardCategory} style={{ "--dashboard-columns": layoutColumns } as React.CSSProperties}>

        {/* ── LEFT column ────────────────────────────────────────────────── */}
        {showLeftColumn && <div className="dashboard-bento-column" >

          {showAttendance && isEmployee && (
            <div className="card dashboard-visual-card">
              <div className="card-header">
                <span className={cn("card-title", "flex items-center gap-[8px]")}>
                  <CalendarCheck2 size={17} className="text-primary" aria-hidden="true" /> My Attendance This Month
                </span>
                <span className="text-xs text-muted-foreground">{dayjs().format("MMMM YYYY")}</span>
              </div>
              <div className="card-body">
                {loading ? <Skel h={176} mb={0} /> : <PersonalAttendanceChart rows={monthlyAtt} />}
              </div>
            </div>
          )}

          {/* Today's Attendance — admin/mgr/teamlead only */}
          {showAttendance && isAdminOrMgr && (
            <div className="card dashboard-visual-card">
              <div className="card-header">
                <span className={cn("card-title", "flex items-center gap-[8px]")} >
                  <CalendarCheck2 size={17} color="var(--primary)" /> Today's Attendance
                </span>
                <Button variant="outline" type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("/attendance")}>
                  View All <ArrowUpRight size={13} />
                </Button>
              </div>
              <div className="card-body">
                {loading ? [1, 2, 3, 4].map(i => <Skel key={i} h={22} mb={14} />) : !dailyAttendanceRows || !employeeRows ? (
                  <div className="text-center text-sm text-muted-foreground">Attendance data unavailable</div>
                ) : (
                  <>
                    <AttendanceChart values={{ present: presentToday, onLeave: approvedTodayLeaves, pending: pendingTodayLeaves, absent: absentToday }} />
                    <div className="dashboard-attendance-summary">
                      <AttRow compact label="Present" count={presentToday} total={activeEmp} color="var(--emerald)" />
                      <AttRow compact label="On Leave" count={approvedTodayLeaves} total={activeEmp} color="var(--sky)" />
                      <AttRow compact label="Pending Leave" count={pendingTodayLeaves} total={activeEmp} color="var(--amber)" />
                      <AttRow compact label="Absent" count={absentToday} total={activeEmp} color="var(--coral)" />
                    </div>
                    <div className="flex justify-between pt-[12px] mt-[4px]" style={{ borderTop: "1px solid var(--border)" }}>
                      <span className="text-[12px] text-[var(--text-muted)]" >Total Workforce</span>
                      <span className="text-[14px] font-semibold text-primary" >{activeEmp}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Projects Card ──────────────────────────────────────────────── */}
          {showProjects && <div className="card">
            <div className="card-header">
              <span className={cn("card-title", "flex items-center gap-[8px]")} >
                <Briefcase size={17} color="var(--primary)" />
                {isAdminOrMgr ? "Projects" : "My Project"}
              </span>
              {isAdminOrMgr && (
                <Button variant="outline" type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("/employees/projects")}>
                  View All <ArrowUpRight size={13} />
                </Button>
              )}
            </div>

            {isAdminOrMgr ? (
              /* Admin / Manager / TeamLead view */
              <div>
                {/* Mini stat strip */}
                <div className="grid gap-[4px]" style={{ gridTemplateColumns: "repeat(3,1fr)", borderBottom: "1px solid var(--border)" }}>
                  {[
                    { label: isAdmin ? "Total" : "Dept Total", value: myDeptProjects.length, color: "var(--text-primary)" },
                    { label: "Active", value: activeProjects.length, color: "var(--emerald)" },
                    { label: "Planning", value: pendingProjects.length, color: "var(--amber)" },
                  ].map((s, i) => (
                    <div key={i} className="p-[12px_0] text-center" style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
                      <div className="text-[20px] font-semibold" style={{ color: s.color, fontFamily: "var(--ui-font-heading)" }}>
                        {loading ? "N/A" : s.value}
                      </div>
                      <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Project rows */}
                <div className="p-[4px_20px_8px]" >
                  {loading
                    ? [1, 2, 3].map(i => <Skel key={i} h={44} mb={8} />)
                    : recentProjects.length === 0
                      ? (
                        <div className="text-center p-[20px_0] text-[var(--text-muted)] text-[13px]" >
                          {isAdmin ? "No projects found" : "No projects in your department"}
                        </div>
                      )
                      : recentProjects.map((proj, i) => {
                        const c = PROJECT_COLORS[i % PROJECT_COLORS.length];
                        const st = projectStatusBadge(proj.status);
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-[12px] p-[12px_0]" style={{ borderBottom: i < recentProjects.length - 1 ? "1px solid var(--border)" : "none" }}
                          >
                            <div className="w-[32px] h-[32px] flex items-center justify-center text-[13px] font-semibold shrink-[0]" style={{ borderRadius: "var(--radius)", background: c.bg, fontFamily: "var(--ui-font-heading)", color: c.text }}>
                              {(proj.projectName || "P")[0].toUpperCase()}
                            </div>
                            <div className="min-w-[0px]" style={{ flex: 1 }}>
                              <div className="text-[13px] font-semibold text-[var(--text-primary)] overflow-hidden whitespace-nowrap" style={{ textOverflow: "ellipsis" }}>
                                {proj.projectName}
                              </div>
                              <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >
                                {[proj.clientName, proj.department].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                            <span className={`badge ${st.cls}`}>{st.label}</span>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            ) : (
              /* Employee view — only if projectAssigned is set */
              <div className="card-body">
                {loading
                  ? <><Skel h={20} w="60%" mb={8} /><Skel h={14} mb={12} /><Skel h={6} mb={14} /><Skel h={60} /></>
                  : <ProjectProgress project={myProject} userDept={myDepartment} />
                }
              </div>
            )}
          </div>}
          {/* ── End Projects Card ─────────────────────────────────────────── */}

        </div>}{/* end LEFT col */}

        {/* ── MIDDLE column ──────────────────────────────────────────────── */}
        {showMiddleColumn && <div className="dashboard-bento-column" >

          {/* Announcements */}
          {showUpdates && canViewAnnouncements && <div className="card">
            <div className="card-header">
              <span className={cn("card-title", "flex items-center gap-[8px]")} >
                <Megaphone size={17} color="var(--primary)" /> Announcements
              </span>
              <Button variant="outline" type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("/announcement")}>
                View All <ArrowUpRight size={13} />
              </Button>
            </div>
            <div className={cn("card-body", "pt-[8px] pb-[8px]")} >
              {loading
                ? [1, 2, 3].map(i => <Skel key={i} h={48} mb={10} />)
                : announcements.length === 0
                  ? <div className="text-center p-[24px_0] text-[var(--text-muted)] text-[13px]" >{announcementRows ? "No announcements" : "Announcements unavailable"}</div>
                  : announcements.slice(0, 6).map((ann, i) => {
                    const colors = ["var(--primary)", "var(--primary)", "var(--primary)"];
                    const c = colors[i % colors.length];
                    const isNew = dayjs().diff(dayjs(ann.announcementDate || ann.createdDate, "DD-MM-YYYY"), "day") <= 7;
                    return (
                      <div key={i} className="flex gap-[12px] p-[12px_0]" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="w-[36px] h-[36px] flex items-center justify-center shrink-[0]" style={{ borderRadius: "var(--radius)", background: `${c}18` }}>
                          <Megaphone size={15} color={c} />
                        </div>
                        <div className="min-w-[0px]" style={{ flex: 1 }}>
                          <div className="flex items-center gap-[8px] flex-wrap" >
                            <span className="text-[14px] font-semibold text-[var(--text-primary)] overflow-hidden whitespace-nowrap" style={{ textOverflow: "ellipsis" }}>
                              {ann.description}
                            </span>
                            {isNew && <span className={cn("badge badge-purple", "text-[12px] p-[4px_8px]")} >NEW</span>}
                          </div>
                          <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >
                            {ann.department} · {formatDate(ann.announcementDate)}
                          </div>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>}

          {/* Department distribution — admin/mgr/teamlead only */}
          {showPeople && isAdminOrMgr && (
            <div className="card dashboard-visual-card">
              <div className="card-header">
                <span className={cn("card-title", "flex items-center gap-[8px]")} >
                  <Users size={17} color="var(--primary)" /> By Department
                </span>
              </div>
              <div className="card-body">
                {loading
                  ? [1, 2, 3, 4].map(i => <Skel key={i} h={18} mb={12} />)
                  : Object.keys(deptGroups).length === 0
                    ? <div className="text-center text-sm text-muted-foreground">No department data</div>
                    : <DepartmentChart data={Object.entries(deptGroups).slice(0, 7).map(([department, count]) => ({ department, count }))} />
                }
              </div>
            </div>
          )}

        </div>}{/* end MIDDLE col */}

        {/* ── RIGHT column — Calendar ────────────────────────────────────── */}
        {showRightColumn && <div className="dashboard-bento-column" >

          {showUpdates && <div className="card">
            <div className="card-header">
              <span className={cn("card-title", "flex items-center gap-[8px]")} >
                <CalendarCheck2 size={17} color="var(--primary)" /> Calendar
              </span>
            </div>
            <div className="card-body">
              <MiniCalendar holidays={holidays} />
            </div>
          </div>}

          {showUpdates && <div className="card">
            <div className="card-header">
              <span className={cn("card-title", "flex items-center gap-[8px]")} >
                <CalendarDays size={17} aria-hidden="true" /> Upcoming Events
              </span>
            </div>
            <div className={cn("card-body", "pt-[8px] pb-[8px]")} >
              {loading
                ? [1, 2, 3].map(i => <Skel key={i} h={40} mb={8} />)
                : upcomingHolidays.length === 0
                  ? <div className="text-center p-[16px_0] text-[var(--text-muted)] text-[13px]" >No upcoming events</div>
                  : upcomingHolidays.map((h, i) => {
                    const eventColor = getEventColors(h);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-[12px] p-[12px_0]" style={{ borderBottom: i < upcomingHolidays.length - 1 ? "1px solid var(--border)" : "none" }}
                      >
                        <div className="w-[38px] h-[38px] flex flex-col items-center justify-center shrink-[0]" style={{ borderRadius: "var(--radius)", background: eventColor.bg }}>
                          <span className="text-[13px] font-semibold leading-[1.1]" style={{ color: eventColor.text }}>
                            {dayjs(h.eventDate).format("DD")}
                          </span>
                          <span className="text-[12px] font-semibold uppercase tracking-[0.05em]" style={{ color: eventColor.text }}>
                            {dayjs(h.eventDate).format("MMM")}
                          </span>
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-[var(--text-primary)]" >{h.eventName}</div>
                          <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >
                            {h.eventType}{h.workLocation && ` · ${h.workLocation}`}
                          </div>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>}

        </div>}{/* end RIGHT col */}

      </div>}{/* end main grid */}

      {showPeople && canViewLeaves && <section className="card dashboard-full-width-card" aria-labelledby="recent-leaves-heading">
        <div className="card-header">
          <span id="recent-leaves-heading" className={cn("card-title", "flex items-center gap-[8px]")}>
            <UserMinus size={17} className="text-primary" aria-hidden="true" /> Recent Leave Requests
          </span>
          <Button variant="outline" type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("/leave")}>
            View All <ArrowUpRight size={13} aria-hidden="true" />
          </Button>
        </div>
        {loading
          ? <div className="card-body">{[1, 2, 3].map((i) => <Skel key={i} h={44} mb={10} />)}</div>
          : <div className="overflow-x-auto">
            <table className="pro-table">
              <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Status</th></tr></thead>
              <tbody>
                {recentLeaves.length === 0
                  ? <tr><td colSpan={5}><div className="table-empty"><div className="table-empty-text">{leaveRows ? "No leave requests" : "Leave data unavailable"}</div></div></td></tr>
                  : recentLeaves.map((row, i) => {
                    const status = leaveStatus(row);
                    return <tr key={i}>
                      <td><div className="flex items-center gap-[8px]">
                        <div className="flex size-[28px] shrink-0 items-center justify-center bg-[var(--primary-ghost)] text-[12px] font-semibold text-primary" style={{ borderRadius: "var(--radius)", fontFamily: "var(--ui-font-heading)" }}>
                          {(row.employeeName || row.userName || "?")[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0"><div className="text-[13px] font-semibold text-foreground">{row.employeeName || row.userName}</div><div className="text-[12px] text-muted-foreground">{row.userName}</div></div>
                      </div></td>
                      <td className="text-[12px]">{row.leaveType}</td>
                      <td className="whitespace-nowrap text-[12px] text-muted-foreground">{formatDate(row.fromDate)}</td>
                      <td className="whitespace-nowrap text-[12px] text-muted-foreground">{formatDate(row.toDate)}</td>
                      <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                    </tr>;
                  })}
              </tbody>
            </table>
          </div>}
      </section>}
    </div>
  );
}
