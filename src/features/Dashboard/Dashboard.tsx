import { cn } from "cn";
import { Button } from "../../components/ui/button";
import React, { useEffect, useState, useCallback } from "react";
import { Users, CalendarCheck2, UserMinus, Megaphone, Clock, ChevronRight, ArrowUpRight, Briefcase, ClipboardList, Sparkles, CalendarDays } from "lucide-react";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import { getCookie } from "../../auth/Cookies";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(isoWeek);

const ACCENT_COLORS = [
  { bg:"var(--primary)", ghost:"var(--primary-ghost)", text:"var(--primary)" },
  { bg:"var(--primary)", ghost:"var(--primary-ghost)", text:"var(--primary)" },
  { bg:"var(--primary)", ghost:"var(--primary-ghost)", text:"var(--primary)" },
  { bg:"var(--primary)", ghost:"var(--primary-ghost)", text:"var(--primary)" },
];

const PROJECT_COLORS = [
  { bg:"var(--primary-ghost)", text:"var(--primary-dark)" },
  { bg:"var(--primary-ghost)", text:"var(--primary)" },
  { bg:"var(--primary-ghost)", text:"var(--muted-foreground)" },
  { bg:"var(--primary-ghost)", text:"var(--primary)" },
  { bg:"var(--primary-ghost)", text:"var(--muted-foreground)" },
  { bg:"var(--primary-ghost)", text:"var(--primary)" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "—");

function deptMatch(projDept, userDept) {
  if (!projDept || !userDept) return false;
  const pDepts = projDept.toLowerCase().split(",").map(d => d.trim());
  const uDepts = userDept.toLowerCase().split(",").map(d => d.trim());
  return pDepts.some(d => uDepts.includes(d));
}

function projectStatusBadge(status) {
  if (!status) return { cls:"badge-gray", label:"—" };
  const s = status.toLowerCase();
  if (s === "active" || s === "in progress") return { cls:"badge-green",  label:status };
  if (s === "completed")                      return { cls:"badge-blue",   label:status };
  if (s === "on hold")                        return { cls:"badge-yellow", label:status };
  if (s === "cancelled")                      return { cls:"badge-red",    label:status };
  return { cls:"badge-gray", label:status };
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
  const end   = project._rawEnd   ? dayjs(project._rawEnd)   : null;
  const now   = dayjs();
  let pct = 0;
  if (start && end && start.isValid() && end.isValid() && end.isAfter(start)) {
    pct = Math.min(100, Math.max(0,
      Math.round((now.diff(start, "day") / end.diff(start, "day")) * 100)
    ));
  }
  const st = projectStatusBadge(project.status);

  return (
    <div className="bg-[var(--bg)] p-[16px_16px]" style={{borderRadius:"var(--radius)", border:"1px solid var(--border)"}}>
      <div className="flex justify-between items-start mb-[8px]" >
        <div>
          <div className="text-[16px] font-semibold text-[var(--text-primary)]" style={{fontFamily:"var(--ui-font-heading)"}}>
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
        <div className="h-[6px] bg-border overflow-hidden" style={{borderRadius:"var(--radius)"}}>
          <div className="h-[100%] bg-primary" style={{width:`${pct}%`, borderRadius:"var(--radius)", transition:"width 1s ease"}} />
        </div>
      </div>

      <div className="grid gap-[12px_16px] mt-[16px]" style={{gridTemplateColumns:"1fr 1fr"}}>
        {[
          { label:"Start Date",  value: project.startDate  || "—" },
          { label:"End Date",    value: project.endDate    || "—" },
          {
            label: "Department", value: (() => {
              if (!project.department) return "—";
              if (!userDept) return project.department;
              const projDepts = project.department.split(",").map(d => d.trim());
              const userDepts = userDept.split(",").map(d => d.trim());
              const matched = projDepts.filter(d => userDepts.map(u => u.toLowerCase()).includes(d.toLowerCase()));
              return matched.length ? matched.join(", ") : project.department;
            })()
          },
          { label:"Description", value: project.description
              ? project.description.slice(0, 40) + (project.description.length > 40 ? "…" : "")
              : "—" },
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
function AttRow({ label, count, total, color }: Record<string, any>) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-[16px]" >
      <div className="flex justify-between mb-[4px]" >
        <span className="text-[13px] text-[var(--text-secondary)] font-medium" >{label}</span>
        <span className="text-[13px] font-semibold text-[var(--text-primary)]" >
          {count} <span className="text-[12px] text-[var(--text-muted)] font-normal" >({pct}%)</span>
        </span>
      </div>
      <div className="h-[8px] bg-[var(--bg)] overflow-hidden" style={{borderRadius:"var(--radius)"}}>
        <div className="h-[100%]" style={{width:`${pct}%`, background:color, borderRadius:"var(--radius)", transition:"width 0.8s ease"}} />
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ h=18, w="100%", mb=8 }: Record<string, any>) {
  return <div className="skeleton" style={{ height:h, width:w, marginBottom:mb, borderRadius:"var(--radius)" }} />;
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────
function MiniCalendar({ holidays }: Record<string, any>) {
  const [current, setCurrent] = useState(dayjs());
  const startDate = current.startOf("month").startOf("isoWeek");
  const days = Array.from({ length:42 }, (_, i) => startDate.add(i, "day"));

  return (
    <div>
      <div className="calendar-header">
        <Button variant="ghost" type="button" className="calendar-nav-btn" onClick={() => setCurrent(c => c.subtract(1, "month"))}>
          <ChevronRight size={14} style={{ transform:"rotate(180deg)" }}/>
        </Button>
        <span className="calendar-month">{current.format("MMMM YYYY")}</span>
        <Button variant="ghost" type="button" className="calendar-nav-btn" onClick={() => setCurrent(c => c.add(1, "month"))}>
          <ChevronRight size={14}/>
        </Button>
      </div>
      <table className={cn("calendar-grid", "w-[100%]")} style={{tableLayout:"fixed"}}>
        <thead>
          <tr>
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
              <th key={d} className="w-[14.28%]" >{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length:6 }, (_, wi) => (
            <tr key={wi}>
              {days.slice(wi * 7, wi * 7 + 7).map(day => {
                const iso     = day.format("YYYY-MM-DD");
                const inMonth = day.month() === current.month();
                const isToday = iso === dayjs().format("YYYY-MM-DD");
                const isWknd  = day.day() === 0 || day.day() === 6;
                const holiday = holidays.find(h => h.eventDate === iso);
                let cls = "cal-day";
                if (!inMonth)     cls += " dim";
                else if (isToday) cls += " today";
                else if (holiday) cls += holiday.eventType === "Holiday" ? " has-holiday" : " has-event";
                else if (isWknd)  cls += " weekend";
                return (
                  <td key={iso}>
                    <div className={cls} title={holiday?.eventName || ""}>{day.format("D")}</div>
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

  const [loading, setLoading]          = useState(true);
  const [employees, setEmployees]      = useState([]);
  const [todayAttendance, setTodayAtt] = useState([]);
  const [monthlyAtt, setMonthlyAtt]    = useState([]);
  const [leaves, setLeaves]            = useState([]);
  const [announcements, setAnn]        = useState([]);
  const [holidays, setHolidays]        = useState([]);
  const [projects, setProjects]        = useState([]);
  const [myUserData, setMyUserData]    = useState(null);

  const firstName    = getCookie("firstName") || "User";
  const userRole     = getCookie("role");
  const userEmail    = getCookie("email");

  /* ── Role flags ──
     Admin        → sees everything, unscoped
     Manager      → department-scoped
     TeamLead     → same admin/manager-style dashboard layout, but data is
                    already scoped to "self + direct reports" by the backend
                    procs (Get_All_Users, GetAttendanceRecords[Range],
                    GetEmployeeLeave, GetAnnouncements). Projects have no
                    per-employee scope, so TeamLead is department-filtered
                    there, same as Manager. */
  const isAdmin      = userRole === "Admin";
  const isManager    = userRole === "Manager";
  const isTeamLead   = userRole === "TeamLead";
  const isAdminOrMgr = isAdmin || isManager || isTeamLead;
  const isEmployee   = !isAdminOrMgr;
  const todayStr     = dayjs().format("YYYY-MM-DD");
  const hour         = new Date().getHours();
  const greeting     = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today        = dayjs().format("dddd, DD MMM YYYY");

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return dayjs(dateStr).format("DD-MM-YYYY");
  };

  // ── Fetch all ───────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [empR, attDailyR, attMonthlyR, lvR, annR, holR, projR, myUserR] = await Promise.allSettled([
        isAdminOrMgr ? getRequest("User/All") : Promise.resolve(null),
        postRequest("Attendance/GetDailyAttendance", { date: todayStr }),
        postRequest("Attendance/GetMonthlyAttendance", { fromDate: todayStr, toDate: todayStr }),
        getRequest("User/GetEmployeeLeave"),
        getRequest("Announcement/GetAnnouncement"),
        getRequest("Holiday/GetHolidays"),
        getRequest("Project/All"),
        getRequest(`User/GetUser/${userEmail}`),
      ]);

      if (empR?.status === "fulfilled" && empR.value?.data)
        setEmployees(empR.value.data);
      if (attDailyR?.status === "fulfilled" && attDailyR.value?.data)
        setTodayAtt(attDailyR.value.data);
      if (attMonthlyR?.status === "fulfilled" && attMonthlyR.value?.data)
        setMonthlyAtt(attMonthlyR.value.data);
      if (lvR?.status === "fulfilled" && lvR.value?.data)
        setLeaves(lvR.value.data.leaves || []);
      if (annR?.status === "fulfilled" && annR.value?.data)
        setAnn(annR.value.data.filter(a => a.isActive !== false).slice(0, 6));
      if (holR?.status === "fulfilled" && holR.value?.data)
        setHolidays(holR.value.data.map(h => ({
          ...h,
          eventDate: dayjs(h.eventDate).format("YYYY-MM-DD"),
        })));
      if (projR?.status === "fulfilled" && projR.value?.data)
        setProjects(projR.value.data);
      if (myUserR?.status === "fulfilled" && myUserR.value?.data?.length)
        setMyUserData(myUserR.value.data[0]);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [isAdminOrMgr, todayStr, userEmail]);

  useEffect(() => { fetchAll(true); }, [fetchAll]);

  useEffect(() => {
    const handler = () => fetchAll(false);
    window.addEventListener("attendance:updated", handler);
    return () => window.removeEventListener("attendance:updated", handler);
  }, [fetchAll]);

  // ── Attendance derived ──────────────────────────────────────────────────────
  const totalEmp  = employees.length;
  const activeEmp = employees.filter(e => e.isActive).length;

  const presentToday = [...new Set(
    todayAttendance
      .filter(a => (a.type||"").toLowerCase().includes("clock") && (a.type||"").toLowerCase().includes("in"))
      .map(a => a.userName || a.userEmail)
  )].length;

  const todayLeaves = leaves.filter(l => {
    const from = dayjs(l.fromDate, ["DD-MM-YYYY","YYYY-MM-DD","DD/MM/YYYY"]);
    const to   = dayjs(l.toDate,   ["DD-MM-YYYY","YYYY-MM-DD","DD/MM/YYYY"]);
    const now  = dayjs();
    return now.isSame(from,"day") || now.isSame(to,"day") ||
           (now.isAfter(from,"day") && now.isBefore(to,"day"));
  });

  const approvedTodayLeaves = todayLeaves.filter(l => l.isApproved && l.approvedBy).length;
  const pendingTodayLeaves  = todayLeaves.filter(l => !l.approvedBy).length;
  const allPendingLeaves    = leaves.filter(l => !l.approvedBy).length;
  const absentToday         = Math.max(0, activeEmp - presentToday - approvedTodayLeaves);
  const recentLeaves        = [...leaves].slice(0, 6);

  // ── Project derived ─────────────────────────────────────────────────────────
  const projectsFormatted = projects.map(p => ({
    ...p,
    _rawStart: p.startDate,
    _rawEnd:   p.endDate,
    startDate: fmt(p.startDate),
    endDate:   fmt(p.endDate),
  }));

  // Use fresh API data for current user (projectAssigned, department)
  const myDepartment      = myUserData?.department || getCookie("department") || "";
  const myProjectAssigned = myUserData?.projectAssigned || null;
  const isDeizeisau = myDepartment.trim().toLowerCase() === "deizeisau";

  // Admin              → all projects, unscoped
  // Manager / TeamLead → department's projects only (Project entity has no
  //                      per-employee scope, so department is as granular as it gets)
  const myDeptProjects = isAdmin
    ? projectsFormatted
    : projectsFormatted.filter(p => deptMatch(p.department, myDepartment));

  const activeProjects  = myDeptProjects.filter(p =>
    ["active","in progress"].includes((p.status||"").toLowerCase())
  );
  const pendingProjects = myDeptProjects.filter(p =>
    ["planning","on hold"].includes((p.status||"").toLowerCase())
  );
  const recentProjects  = myDeptProjects.slice(0, 4);

  // Employee → only show if projectAssigned is explicitly set (not null/empty)
  const myProject = isEmployee
    ? (myProjectAssigned
        ? projectsFormatted.find(p =>
            p.projectName?.toLowerCase().trim() === myProjectAssigned.toLowerCase().trim()
          ) ?? null
        : null)
    : null;

  // ── Stat cards ──────────────────────────────────────────────────────────────
  const statCards = isAdminOrMgr ? [
    { label: "Total Employees", value: totalEmp, sub: `${activeEmp} active`, icon: <Users size={22} />, accent: ACCENT_COLORS[0], link: "/employees" },
    { label: "Present Today", value: presentToday, sub: `of ${activeEmp} active`, icon: <CalendarCheck2 size={22} />, accent: ACCENT_COLORS[1], link: "/attendance" },
    { label: "Pending Leaves", value: allPendingLeaves, sub: "Awaiting approval", icon: <UserMinus size={22} />, accent: ACCENT_COLORS[2], link: "/leave" },
    { label: "Announcements", value: announcements.length, sub: "Active notices", icon: <Megaphone size={22} />, accent: ACCENT_COLORS[3], link: "/announcement" },
  ] : [
    { label: "My Leaves", value: leaves.length, sub: `${leaves.filter(l => l.isApproved && l.approvedBy).length} approved`, icon: <UserMinus size={22} />, accent: ACCENT_COLORS[0], link: "/leave" },
    ...(!isDeizeisau ? [{ label: "Present Today", value: presentToday > 0 ? "Yes" : "—", sub: "Clock-in recorded", icon: <CalendarCheck2 size={22} />, accent: ACCENT_COLORS[1], link: "/attendance" }] : []),
    { label: "Announcements", value: announcements.length, sub: "Active notices", icon: <Megaphone size={22} />, accent: ACCENT_COLORS[3], link: "/announcement" },
  ];

  const leaveStatus = (row) => {
    if (!row.approvedBy) return { cls:"badge-yellow", label:"Pending"  };
    if (row.isApproved)  return { cls:"badge-green",  label:"Approved" };
    return                      { cls:"badge-red",    label:"Declined" };
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
    <div className="p-[0_0_24px]" >

      {/* Greeting Banner */}
      <div className={cn("greeting-banner", "mb-[24px]")} >
        <div className="greeting-title">{greeting}, {firstName}! <Sparkles size={18} aria-hidden="true" /></div>
        <div className="greeting-sub">Here's what's happening at Natobotics today.</div>
        <div className="greeting-date">
          <Clock size={12} className="mr-[4px]" style={{verticalAlign:"middle"}}/>{today}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-stats-grid" style={{ "--stat-columns": statCards.length } as React.CSSProperties}>
        {statCards.map((s, i) => (
          <div
            key={i}
            className="stat-card"
            style={{ "--accent-color":s.accent.ghost, cursor:s.link ? "pointer" : "default" } as React.CSSProperties}
            onClick={() => s.link && navigate(s.link)}
          >
            <div className="stat-icon" style={{ background:s.accent.bg }}>
              {React.cloneElement(s.icon, { color:"var(--card)" })}
            </div>
            {loading ? (
              <><Skel h={28} w="55%" mb={5}/><Skel h={13} w="40%"/></>
            ) : (
              <>
                <div className="stat-value">{s.value ?? 0}</div>
                <div className="stat-label">{s.label}</div>
                {s.sub && <div className="stat-sub">{s.sub}</div>}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className={`dashboard-main-grid${isAdminOrMgr ? " is-admin" : ""}`}>

        {/* ── LEFT column ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-[16px]" >

          {/* Today's Attendance — admin/mgr/teamlead only */}
          {isAdminOrMgr && (
            <div className="card">
              <div className="card-header">
                <span className={cn("card-title", "flex items-center gap-[8px]")} >
                  <CalendarCheck2 size={17} color="var(--primary)"/> Today's Attendance
                </span>
                <Button variant="outline" type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("/attendance")}>
                  View All <ArrowUpRight size={13}/>
                </Button>
              </div>
              <div className="card-body">
                {loading ? [1,2,3,4].map(i => <Skel key={i} h={22} mb={14}/>) : (
                  <>
                    <AttRow label="Present"       count={presentToday}        total={activeEmp} color="var(--emerald)"/>
                    <AttRow label="On Leave"      count={approvedTodayLeaves} total={activeEmp} color="var(--sky)"/>
                    <AttRow label="Pending Leave" count={pendingTodayLeaves}  total={activeEmp} color="var(--amber)"/>
                    <AttRow label="Absent"        count={absentToday}         total={activeEmp} color="var(--coral)"/>
                    <div className="flex justify-between pt-[12px] mt-[4px]" style={{borderTop:"1px solid var(--border)"}}>
                      <span className="text-[12px] text-[var(--text-muted)]" >Total Workforce</span>
                      <span className="text-[14px] font-semibold text-primary" >{activeEmp}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Projects Card ──────────────────────────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <span className={cn("card-title", "flex items-center gap-[8px]")} >
                <Briefcase size={17} color="var(--primary)"/>
                {isAdminOrMgr ? "Projects" : "My Project"}
              </span>
              {isAdminOrMgr && (
                <Button variant="outline" type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("/employees/projects")}>
                  View All <ArrowUpRight size={13}/>
                </Button>
              )}
            </div>

            {isAdminOrMgr ? (
              /* Admin / Manager / TeamLead view */
              <div>
                {/* Mini stat strip */}
                <div className="grid gap-[4px]" style={{gridTemplateColumns:"repeat(3,1fr)", borderBottom:"1px solid var(--border)"}}>
                  {[
                    { label: isAdmin ? "Total" : "Dept Total", value: myDeptProjects.length, color:"var(--text-primary)" },
                    { label:"Active",   value: activeProjects.length,  color:"var(--emerald)" },
                    { label:"Planning", value: pendingProjects.length, color:"var(--amber)"   },
                  ].map((s, i) => (
                    <div key={i} className="p-[12px_0] text-center" style={{borderRight:i < 2 ? "1px solid var(--border)" : "none"}}>
                      <div className="text-[20px] font-semibold" style={{color:s.color, fontFamily:"var(--ui-font-heading)"}}>
                        {loading ? "—" : s.value}
                      </div>
                      <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Project rows */}
                <div className="p-[4px_20px_8px]" >
                  {loading
                    ? [1,2,3].map(i => <Skel key={i} h={44} mb={8}/>)
                    : recentProjects.length === 0
                      ? (
                        <div className="text-center p-[20px_0] text-[var(--text-muted)] text-[13px]" >
                          {isAdmin ? "No projects found" : "No projects in your department"}
                        </div>
                      )
                      : recentProjects.map((proj, i) => {
                          const c  = PROJECT_COLORS[i % PROJECT_COLORS.length];
                          const st = projectStatusBadge(proj.status);
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-[12px] p-[12px_0]" style={{borderBottom: i < recentProjects.length - 1 ? "1px solid var(--border)" : "none"}}
                            >
                              <div className="w-[32px] h-[32px] flex items-center justify-center text-[13px] font-semibold shrink-[0]" style={{borderRadius:"var(--radius)", background:c.bg, fontFamily:"var(--ui-font-heading)", color:c.text}}>
                                {(proj.projectName || "P")[0].toUpperCase()}
                              </div>
                              <div className="min-w-[0px]" style={{flex:1}}>
                                <div className="text-[13px] font-semibold text-[var(--text-primary)] overflow-hidden whitespace-nowrap" style={{textOverflow:"ellipsis"}}>
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
                  ? <><Skel h={20} w="60%" mb={8}/><Skel h={14} mb={12}/><Skel h={6} mb={14}/><Skel h={60}/></>
                  : <ProjectProgress project={myProject} userDept={myDepartment} />
                }
              </div>
            )}
          </div>
          {/* ── End Projects Card ─────────────────────────────────────────── */}

          {/* Recent Leaves Table */}
          <div className="card">
            <div className="card-header">
              <span className={cn("card-title", "flex items-center gap-[8px]")} >
                <UserMinus size={17} color="var(--primary)"/> Recent Leave Requests
              </span>
              <Button variant="outline" type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("/leave")}>
                View All <ArrowUpRight size={13}/>
              </Button>
            </div>
            {loading
              ? <div className="card-body">{[1,2,3].map(i => <Skel key={i} h={44} mb={10}/>)}</div>
              : (
                <div className="overflow-x-auto" >
                  <table className="pro-table">
                    <thead>
                      <tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {recentLeaves.length === 0
                        ? (
                          <tr>
                            <td colSpan={5}>
                              <div className="table-empty"><div className="table-empty-text">No leave requests</div></div>
                            </td>
                          </tr>
                        )
                        : recentLeaves.map((row, i) => {
                            const s = leaveStatus(row);
                            return (
                              <tr key={i}>
                                <td>
                                  <div className="flex items-center gap-[8px]" >
                                    <div className="w-[28px] h-[28px] bg-[var(--primary-ghost)] flex items-center justify-center text-[12px] font-semibold text-primary shrink-[0]" style={{borderRadius:"var(--radius)", fontFamily:"var(--ui-font-heading)"}}>
                                      {(row.employeeName || row.userName || "?")[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-[13px] font-semibold text-[var(--text-primary)]" >
                                        {row.employeeName || row.userName}
                                      </div>
                                      <div className="text-[12px] text-[var(--text-muted)]" >{row.userName}</div>
                                    </div>
                                  </div>
                                </td>
                                <td><span className="text-[12px]" >{row.leaveType}</span></td>
                                <td className="text-[12px] text-[var(--text-secondary)] whitespace-nowrap" >{formatDate(row.fromDate)}</td>
                                <td className="text-[12px] text-[var(--text-secondary)] whitespace-nowrap" >{formatDate(row.toDate)}</td>
                                <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                              </tr>
                            );
                          })
                      }
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>

        </div>{/* end LEFT col */}

        {/* ── MIDDLE column ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-[16px]" >

          {/* Announcements */}
          <div className="card">
            <div className="card-header">
              <span className={cn("card-title", "flex items-center gap-[8px]")} >
                <Megaphone size={17} color="var(--primary)"/> Announcements
              </span>
              <Button variant="outline" type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("/announcement")}>
                View All <ArrowUpRight size={13}/>
              </Button>
            </div>
            <div className={cn("card-body", "pt-[8px] pb-[8px]")} >
              {loading
                ? [1,2,3].map(i => <Skel key={i} h={48} mb={10}/>)
                : announcements.length === 0
                  ? <div className="text-center p-[24px_0] text-[var(--text-muted)] text-[13px]" >No announcements</div>
                  : announcements.map((ann, i) => {
                      const colors = ["var(--primary)", "var(--primary)", "var(--primary)"];
                      const c = colors[i % colors.length];
                      const isNew = dayjs().diff(dayjs(ann.announcementDate || ann.createdDate, "DD-MM-YYYY"), "day") <= 7;
                      return (
                        <div key={i} className="flex gap-[12px] p-[12px_0]" style={{borderBottom:"1px solid var(--border)"}}>
                          <div className="w-[36px] h-[36px] flex items-center justify-center shrink-[0]" style={{borderRadius:"var(--radius)", background:`${c}18`}}>
                            <Megaphone size={15} color={c}/>
                          </div>
                          <div className="min-w-[0px]" style={{flex:1}}>
                            <div className="flex items-center gap-[8px] flex-wrap" >
                              <span className="text-[14px] font-semibold text-[var(--text-primary)] overflow-hidden whitespace-nowrap" style={{textOverflow:"ellipsis"}}>
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
          </div>

          {/* Department distribution — admin/mgr/teamlead only */}
          {isAdminOrMgr && (
            <div className="card">
              <div className="card-header">
                <span className={cn("card-title", "flex items-center gap-[8px]")} >
                  <Users size={17} color="var(--primary)"/> By Department
                </span>
              </div>
              <div className="card-body">
                {loading
                  ? [1,2,3,4].map(i => <Skel key={i} h={18} mb={12}/>)
                  : Object.entries(deptGroups).slice(0, 7).map(([k, v]) => (
                    <div key={k} className="dist-row">
                      <span className={cn("dist-label", "text-[12px] font-semibold text-[var(--text-secondary)]")} >{k}</span>
                      <div className="dist-bar-wrap">
                        <div className={cn("dist-bar-fill", "bg-primary")} style={{width:`${totalEmp ? (v / totalEmp) * 100 : 0}%`}}/>
                      </div>
                      <span className="dist-count">{v}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

        </div>{/* end MIDDLE col */}

        {/* ── RIGHT column — Calendar ────────────────────────────────────── */}
        <div className="flex flex-col gap-[16px]" >

          <div className="card">
            <div className="card-header">
              <span className={cn("card-title", "flex items-center gap-[8px]")} >
                <CalendarCheck2 size={17} color="var(--primary)"/> Calendar
              </span>
            </div>
            <div className="card-body">
              <MiniCalendar holidays={holidays}/>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className={cn("card-title", "flex items-center gap-[8px]")} >
                <CalendarDays size={17} aria-hidden="true" /> Upcoming Events
              </span>
            </div>
            <div className={cn("card-body", "pt-[8px] pb-[8px]")} >
              {loading
                ? [1,2,3].map(i => <Skel key={i} h={40} mb={8}/>)
                : upcomingHolidays.length === 0
                  ? <div className="text-center p-[16px_0] text-[var(--text-muted)] text-[13px]" >No upcoming events</div>
                  : upcomingHolidays.map((h, i) => {
                      const c  = h.eventType === "Holiday" ? "var(--error-subtle)" : "var(--primary-ghost)";
                      const tc = h.eventType === "Holiday" ? "var(--coral)" : "var(--primary)";
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-[12px] p-[12px_0]" style={{borderBottom: i < upcomingHolidays.length - 1 ? "1px solid var(--border)" : "none"}}
                        >
                          <div className="w-[38px] h-[38px] flex flex-col items-center justify-center shrink-[0]" style={{borderRadius:"var(--radius)", background:c}}>
                            <span className="text-[13px] font-semibold leading-[1.1]" style={{color:tc}}>
                              {dayjs(h.eventDate).format("DD")}
                            </span>
                            <span className="text-[12px] font-semibold uppercase tracking-[0.05em]" style={{color:tc}}>
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
          </div>

        </div>{/* end RIGHT col */}

      </div>{/* end main grid */}
    </div>
  );
}
