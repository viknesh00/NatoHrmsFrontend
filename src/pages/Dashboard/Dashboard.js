import React, { useEffect, useState, useCallback } from "react";
import { Users, CalendarCheck2, UserMinus, Megaphone, Clock, ChevronRight, ArrowUpRight, Briefcase } from "lucide-react";
import { getRequest, postRequest } from "../../services/Apiservice";
import { getCookie } from "../../services/Cookies";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(isoWeek);

const ACCENT_COLORS = [
  { bg:"linear-gradient(135deg,#6c3fc5,#8b5cf6)", ghost:"#ede9fe", text:"#6c3fc5" },
  { bg:"linear-gradient(135deg,#0d9488,#14b8a6)", ghost:"#ccfbf1", text:"#0d9488" },
  { bg:"linear-gradient(135deg,#f59e0b,#fbbf24)", ghost:"#fef3c7", text:"#b45309" },
  { bg:"linear-gradient(135deg,#f43f5e,#fb7185)", ghost:"#ffe4e6", text:"#f43f5e" },
];

const PROJECT_COLORS = [
  { bg:"#ede9fe", text:"#6c3fc5" },
  { bg:"#ccfbf1", text:"#0d9488" },
  { bg:"#fef3c7", text:"#b45309" },
  { bg:"#ffe4e6", text:"#f43f5e" },
  { bg:"#dbeafe", text:"#1e40af" },
  { bg:"#dcfce7", text:"#166534" },
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
function ProjectProgress({ project, userDept }) {
  if (!project) return (
    <div style={{ textAlign:"center", padding:"28px 0", color:"var(--text-muted)", fontSize:13 }}>
      <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
      <div style={{ fontWeight:600, color:"var(--text-secondary)", marginBottom:4 }}>No project assigned</div>
      <div style={{ fontSize:12 }}>Contact your manager to get assigned to a project</div>
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
    <div style={{ background:"var(--bg)", borderRadius:10, padding:"14px 16px", border:"1px solid var(--border)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:"var(--text-primary)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            {project.projectName}
          </div>
          {project.clientName && (
            <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
              Client: {project.clientName}
            </div>
          )}
        </div>
        <span className={`badge ${st.cls}`}>{st.label}</span>
      </div>

      <div style={{ marginTop:10, marginBottom:4 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--text-muted)", marginBottom:5 }}>
          <span>Timeline progress</span>
          <span style={{ fontWeight:700, color:"var(--text-primary)" }}>{pct}%</span>
        </div>
        <div style={{ height:6, borderRadius:3, background:"var(--border)", overflow:"hidden" }}>
          <div style={{
            height:"100%",
            width:`${pct}%`,
            background:"linear-gradient(90deg,var(--primary),var(--primary-light))",
            borderRadius:3,
            transition:"width 1s ease",
          }} />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px", marginTop:14 }}>
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
            <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>
              {f.label}
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", marginTop:2 }}>
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AttRow ────────────────────────────────────────────────────────────────────
function AttRow({ label, count, total, color }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:13, color:"var(--text-secondary)", fontWeight:500 }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)" }}>
          {count} <span style={{ fontSize:11, color:"var(--text-muted)", fontWeight:400 }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height:8, borderRadius:6, background:"var(--bg)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:6, transition:"width 0.8s ease" }} />
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ h=18, w="100%", mb=8 }) {
  return <div className="skeleton" style={{ height:h, width:w, marginBottom:mb, borderRadius:8 }} />;
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────
function MiniCalendar({ holidays }) {
  const [current, setCurrent] = useState(dayjs());
  const startDate = current.startOf("month").startOf("isoWeek");
  const days = Array.from({ length:42 }, (_, i) => startDate.add(i, "day"));

  return (
    <div>
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={() => setCurrent(c => c.subtract(1, "month"))}>
          <ChevronRight size={14} style={{ transform:"rotate(180deg)" }}/>
        </button>
        <span className="calendar-month">{current.format("MMMM YYYY")}</span>
        <button className="calendar-nav-btn" onClick={() => setCurrent(c => c.add(1, "month"))}>
          <ChevronRight size={14}/>
        </button>
      </div>
      <table className="calendar-grid" style={{ width:"100%", tableLayout:"fixed" }}>
        <thead>
          <tr>
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
              <th key={d} style={{ width:"14.28%" }}>{d}</th>
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
  const isAdminOrMgr = userRole === "Admin" || userRole === "Manager";
  const isManager    = userRole === "Manager";
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

  // Manager → their department's projects only
  // Admin   → all projects
  const myDeptProjects = isAdminOrMgr && !isManager
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

  const deptGroups = {};
  employees.forEach(e => {
    const k = e.department || "Unknown";
    deptGroups[k] = (deptGroups[k] || 0) + 1;
  });

  const upcomingHolidays = holidays
    .filter(h => dayjs(h.eventDate).isAfter(dayjs().subtract(1, "day")))
    .slice(0, 4);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:"0 0 24px" }}>

      {/* Greeting Banner */}
      <div className="greeting-banner" style={{ marginBottom:24 }}>
        <div className="greeting-title">{greeting}, {firstName}! 👋</div>
        <div className="greeting-sub">Here's what's happening at Natobotics today.</div>
        <div className="greeting-date">
          <Clock size={12} style={{ verticalAlign:"middle", marginRight:5 }}/>{today}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${statCards.length},1fr)`, gap:14, marginBottom:20 }}>
        {statCards.map((s, i) => (
          <div
            key={i}
            className="stat-card"
            style={{ "--accent-color":s.accent.ghost, cursor:s.link ? "pointer" : "default" }}
            onClick={() => s.link && navigate(s.link)}
          >
            <div className="stat-icon" style={{ background:s.accent.bg }}>
              {React.cloneElement(s.icon, { color:"white" })}
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
      <div style={{
        display:"grid",
        gridTemplateColumns: isAdminOrMgr ? "1fr 1fr 260px" : "1fr 260px",
        gap:16,
        alignItems:"start",
      }}>

        {/* ── LEFT column ────────────────────────────────────────────────── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Today's Attendance — admin/mgr only */}
          {isAdminOrMgr && (
            <div className="card">
              <div className="card-header">
                <span className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <CalendarCheck2 size={17} color="var(--primary)"/> Today's Attendance
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate("/attendance")}>
                  View All <ArrowUpRight size={13}/>
                </button>
              </div>
              <div className="card-body">
                {loading ? [1,2,3,4].map(i => <Skel key={i} h={22} mb={14}/>) : (
                  <>
                    <AttRow label="Present"       count={presentToday}        total={activeEmp} color="var(--emerald)"/>
                    <AttRow label="On Leave"      count={approvedTodayLeaves} total={activeEmp} color="var(--sky)"/>
                    <AttRow label="Pending Leave" count={pendingTodayLeaves}  total={activeEmp} color="var(--amber)"/>
                    <AttRow label="Absent"        count={absentToday}         total={activeEmp} color="var(--coral)"/>
                    <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:"1px solid var(--border)", marginTop:4 }}>
                      <span style={{ fontSize:12, color:"var(--text-muted)" }}>Total Workforce</span>
                      <span style={{ fontSize:14, fontWeight:800, color:"var(--primary)" }}>{activeEmp}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Projects Card ──────────────────────────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Briefcase size={17} color="var(--primary)"/>
                {isAdminOrMgr ? "Projects" : "My Project"}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/employees/projects")}>
                View All <ArrowUpRight size={13}/>
              </button>
            </div>

            {isAdminOrMgr ? (
              /* Admin / Manager view */
              <div>
                {/* Mini stat strip */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1, borderBottom:"1px solid var(--border)" }}>
                  {[
                    { label: isManager ? "Dept Total" : "Total", value: myDeptProjects.length, color:"var(--text-primary)" },
                    { label:"Active",   value: activeProjects.length,  color:"var(--emerald)" },
                    { label:"Planning", value: pendingProjects.length, color:"var(--amber)"   },
                  ].map((s, i) => (
                    <div key={i} style={{ padding:"10px 0", textAlign:"center", borderRight:i < 2 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ fontSize:20, fontWeight:800, color:s.color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                        {loading ? "—" : s.value}
                      </div>
                      <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Project rows */}
                <div style={{ padding:"4px 20px 8px" }}>
                  {loading
                    ? [1,2,3].map(i => <Skel key={i} h={44} mb={8}/>)
                    : recentProjects.length === 0
                      ? (
                        <div style={{ textAlign:"center", padding:"20px 0", color:"var(--text-muted)", fontSize:13 }}>
                          {isManager ? "No projects in your department" : "No projects found"}
                        </div>
                      )
                      : recentProjects.map((proj, i) => {
                          const c  = PROJECT_COLORS[i % PROJECT_COLORS.length];
                          const st = projectStatusBadge(proj.status);
                          return (
                            <div
                              key={i}
                              style={{
                                display:"flex", alignItems:"center", gap:10, padding:"10px 0",
                                borderBottom: i < recentProjects.length - 1 ? "1px solid var(--border)" : "none",
                              }}
                            >
                              <div style={{
                                width:32, height:32, borderRadius:8, background:c.bg,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontFamily:"'Plus Jakarta Sans',sans-serif",
                                fontSize:13, fontWeight:800, color:c.text, flexShrink:0,
                              }}>
                                {(proj.projectName || "P")[0].toUpperCase()}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                  {proj.projectName}
                                </div>
                                <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:1 }}>
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
              <span className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
                <UserMinus size={17} color="var(--primary)"/> Recent Leave Requests
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/leave")}>
                View All <ArrowUpRight size={13}/>
              </button>
            </div>
            {loading
              ? <div className="card-body">{[1,2,3].map(i => <Skel key={i} h={44} mb={10}/>)}</div>
              : (
                <div style={{ overflowX:"auto" }}>
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
                                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                    <div style={{
                                      width:28, height:28, borderRadius:7,
                                      background:"var(--primary-ghost)",
                                      display:"flex", alignItems:"center", justifyContent:"center",
                                      fontFamily:"'Plus Jakarta Sans',sans-serif",
                                      fontSize:11, fontWeight:800, color:"var(--primary)", flexShrink:0,
                                    }}>
                                      {(row.employeeName || row.userName || "?")[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>
                                        {row.employeeName || row.userName}
                                      </div>
                                      <div style={{ fontSize:11, color:"var(--text-muted)" }}>{row.userName}</div>
                                    </div>
                                  </div>
                                </td>
                                <td><span style={{ fontSize:12 }}>{row.leaveType}</span></td>
                                <td style={{ fontSize:12, color:"var(--text-secondary)", whiteSpace:"nowrap" }}>{formatDate(row.fromDate)}</td>
                                <td style={{ fontSize:12, color:"var(--text-secondary)", whiteSpace:"nowrap" }}>{formatDate(row.toDate)}</td>
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
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Announcements */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Megaphone size={17} color="var(--primary)"/> Announcements
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/announcement")}>
                View All <ArrowUpRight size={13}/>
              </button>
            </div>
            <div className="card-body" style={{ paddingTop:8, paddingBottom:8 }}>
              {loading
                ? [1,2,3].map(i => <Skel key={i} h={48} mb={10}/>)
                : announcements.length === 0
                  ? <div style={{ textAlign:"center", padding:"24px 0", color:"var(--text-muted)", fontSize:13 }}>No announcements</div>
                  : announcements.map((ann, i) => {
                      const colors = ["var(--primary)","var(--teal)","var(--coral)","var(--amber)","var(--sky)","var(--emerald)"];
                      const c = colors[i % colors.length];
                      const isNew = dayjs().diff(dayjs(ann.announcementDate || ann.createdDate, "DD-MM-YYYY"), "day") <= 7;
                      return (
                        <div key={i} style={{ display:"flex", gap:12, padding:"11px 0", borderBottom:"1px solid var(--border)" }}>
                          <div style={{
                            width:36, height:36, borderRadius:10,
                            background:`${c}18`,
                            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                          }}>
                            <Megaphone size={15} color={c}/>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              <span style={{ fontSize:13.5, fontWeight:600, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                {ann.description}
                              </span>
                              {isNew && <span className="badge badge-purple" style={{ fontSize:10, padding:"1px 7px" }}>NEW</span>}
                            </div>
                            <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>
                              {ann.department} · {formatDate(ann.announcementDate)}
                            </div>
                          </div>
                        </div>
                      );
                    })
              }
            </div>
          </div>

          {/* Department distribution — admin/mgr only */}
          {isAdminOrMgr && (
            <div className="card">
              <div className="card-header">
                <span className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Users size={17} color="var(--primary)"/> By Department
                </span>
              </div>
              <div className="card-body">
                {loading
                  ? [1,2,3,4].map(i => <Skel key={i} h={18} mb={12}/>)
                  : Object.entries(deptGroups).slice(0, 7).map(([k, v]) => (
                    <div key={k} className="dist-row">
                      <span className="dist-label" style={{ fontSize:12, fontWeight:600, color:"var(--text-secondary)" }}>{k}</span>
                      <div className="dist-bar-wrap">
                        <div className="dist-bar-fill" style={{
                          width:`${totalEmp ? (v / totalEmp) * 100 : 0}%`,
                          background:"linear-gradient(90deg,var(--primary),var(--primary-light))",
                        }}/>
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
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
                <CalendarCheck2 size={17} color="var(--primary)"/> Calendar
              </span>
            </div>
            <div className="card-body">
              <MiniCalendar holidays={holidays}/>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
                🎉 Upcoming Events
              </span>
            </div>
            <div className="card-body" style={{ paddingTop:8, paddingBottom:8 }}>
              {loading
                ? [1,2,3].map(i => <Skel key={i} h={40} mb={8}/>)
                : upcomingHolidays.length === 0
                  ? <div style={{ textAlign:"center", padding:"16px 0", color:"var(--text-muted)", fontSize:13 }}>No upcoming events</div>
                  : upcomingHolidays.map((h, i) => {
                      const c  = h.eventType === "Holiday" ? "#fee2e2" : "var(--primary-ghost)";
                      const tc = h.eventType === "Holiday" ? "var(--coral)" : "var(--primary)";
                      return (
                        <div
                          key={i}
                          style={{
                            display:"flex", alignItems:"center", gap:10, padding:"10px 0",
                            borderBottom: i < upcomingHolidays.length - 1 ? "1px solid var(--border)" : "none",
                          }}
                        >
                          <div style={{
                            width:38, height:38, borderRadius:10, background:c,
                            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                            flexShrink:0,
                          }}>
                            <span style={{ fontSize:13, fontWeight:900, color:tc, lineHeight:1.1 }}>
                              {dayjs(h.eventDate).format("DD")}
                            </span>
                            <span style={{ fontSize:9, fontWeight:700, color:tc, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                              {dayjs(h.eventDate).format("MMM")}
                            </span>
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>{h.eventName}</div>
                            <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:1 }}>
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