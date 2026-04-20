import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import {
  ChevronLeft, ChevronRight, X, Save, Clock, Copy,
  FileSpreadsheet, Trash2, AlertCircle, ClipboardList, Plus, CheckCircle2,
} from "lucide-react";
import { getRequest, postRequest } from "../../services/Apiservice";
import { useLocation, useNavigate } from "react-router-dom";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { ToastSuccess, ToastError } from "../../services/ToastMsg";
import * as XLSX from "xlsx";

dayjs.extend(isoWeek);

const STATUS = {
  filled:   { bg:"#dcfce7", border:"#86efac", text:"#15803d", label:"8+ hrs" },
  partial:  { bg:"#dbeafe", border:"#93c5fd", text:"#1d4ed8", label:"< 8 hrs" },
  empty:    { bg:"#fff7ed", border:"#fed7aa", text:"#c2410c", label:"Pending" },
  leave:    { bg:"#ede9fe", border:"#c4b5f4", text:"#6c3fc5", label:"On Leave" },
  approved: { bg:"#dcfce7", border:"#86efac", text:"#15803d", label:"Leave ✓" },
  holiday:  { bg:"#fee2e2", border:"#fca5a5", text:"#b91c1c", label:"Holiday" },
  weekend:  { bg:"#f8fafc", border:"var(--border)", text:"var(--text-muted)", label:"Weekend" },
  future:   { bg:"#f9fafb", border:"var(--border)", text:"#d1d5db", label:"Future" },
  pastlock: { bg:"#f1f5f9", border:"#cbd5e1", text:"#94a3b8", label:"Locked" },
  outside:  { bg:"transparent", border:"transparent", text:"#e5e7eb", label:"" },
};

const toMin   = (v) => { if (!v) return 0; const p = String(v).split("."); return parseInt(p[0]||0)*60 + parseInt(p[1]||0); };
const fromMin = (m) => { const h = Math.floor(m/60), min = m%60; return min===0 ? `${h}` : `${h}.${String(min).padStart(2,"0")}`; };

const parseTasks = (taskStr, fallbackHours) => {
  if (!taskStr) return [{ name: "", hours: "" }];
  try {
    const parsed = JSON.parse(taskStr);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return [{ name: taskStr, hours: fallbackHours || "" }];
};

const sumTaskHours = (tasks) => tasks.reduce((s, t) => s + (parseFloat(t.hours) || 0), 0);

export default function TimesheetCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { viewData, selectedMonth: viewMonth } = location.state || {};

  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [entries, setEntries]           = useState({});
  const [leaveList, setLeaveList]       = useState([]);
  const [holidayList, setHolidayList]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [modal, setModal]               = useState(false);
  const [selDate, setSelDate]           = useState(null);
  const [tasks, setTasks]               = useState([{ name: "", hours: "" }]);
  const [nameErrors, setNameErrors]     = useState({});
  const [leaveType, setLeaveType]       = useState("");
  const [copyOpt, setCopyOpt]           = useState("");
  const [otherDays, setOtherDays]       = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [tooltip, setTooltip]           = useState({ visible: false, date: null, x: 0, y: 0 });

  const isViewMode     = !!viewData;
  const today          = dayjs();
  const isCurrentMonth = currentMonth.isSame(today, "month");
  const canEdit        = !isViewMode && isCurrentMonth;

  const startDay = currentMonth.startOf("month").startOf("isoWeek");
  const endDay   = currentMonth.endOf("month").endOf("isoWeek");
  const allDays  = [];
  let d = startDay;
  while (d.isBefore(endDay, "day") || d.isSame(endDay, "day")) { allDays.push(d); d = d.add(1, "day"); }
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));

  useEffect(() => {
    loadLeaves();
    if (!viewData) loadEntries();
    else {
      const fmt = viewData.timesheet.reduce((acc, item) => {
        if (item.entryDate) {
          const dt = item.entryDate.split("T")[0];
          acc[dt] = { task: item.taskDetails || "", hours: item.workingHours ?? 0, leaveType: item.leaveType || null };
        }
        return acc;
      }, {});
      setEntries(fmt);
    }
  }, [currentMonth]);

  const loadLeaves = () => {
    const url = viewData ? `User/GetEmployeeLeave?userName=${viewData.username}` : `User/GetEmployeeLeave`;
    getRequest(url).then(res => {
      if (res.data) {
        setLeaveList(res.data.leaves.map(l => ({
          ...l,
          fromDate: l.fromDate ? dayjs(l.fromDate).format("YYYY-MM-DD") : l.fromDate,
          toDate:   l.toDate   ? dayjs(l.toDate).format("YYYY-MM-DD")   : l.toDate,
        })));
        setHolidayList(
          res.data.holidays?.filter(h => h.eventType === "Holiday")
            .map(h => ({ ...h, eventDate: dayjs(h.eventDate).format("YYYY-MM-DD") })) || []
        );
      }
    }).catch(console.error);
  };

  const loadEntries = () => {
    setLoading(true);
    getRequest(`TimeSheet/GetTimeSheet?month=${currentMonth.format("YYYY-MM")}`).then(res => {
      if (res.data) {
        const fmt = res.data.reduce((acc, item) => {
          if (item.entryDate) {
            const dt = item.entryDate.split("T")[0];
            acc[dt] = { task: item.taskDetails || "", hours: item.workingHours ?? 0, leaveType: item.leaveType || null };
          }
          return acc;
        }, {});
        setEntries(fmt);
      }
    }).catch(console.error).finally(() => setLoading(false));
  };

  const getLeaveForDay   = (date) => leaveList.find(l => {
    const from = dayjs(l.fromDate, "YYYY-MM-DD"), to = dayjs(l.toDate, "YYYY-MM-DD");
    return date.isSame(from, "day") || date.isSame(to, "day") || (date.isAfter(from, "day") && date.isBefore(to, "day"));
  });
  const getHolidayForDay = (date) => holidayList.find(h => h.eventDate === date.format("YYYY-MM-DD"));

  const getCellStatus = (date) => {
    const inCurrentMonth = date.month() === currentMonth.month();
    if (!inCurrentMonth) return "outside";
    if (date.isAfter(today, "day")) return "future";
    if (!currentMonth.isSame(today, "month") && !isViewMode) return "pastlock";
    const holiday = getHolidayForDay(date); if (holiday) return "holiday";
    const isWknd  = date.day() === 0 || date.day() === 6;
    const leave   = getLeaveForDay(date);
    if (leave && !leave.approverReason)
      return leave.isApproved === true || leave.isApproved === "true" ? "approved" : "leave";
    const entry = entries[date.format("YYYY-MM-DD")];
    if (isWknd && !entry?.hours) return "weekend";
    if (!entry || entry.hours === 0) return isWknd ? "weekend" : "empty";
    if (entry.hours >= 8) return "filled";
    return "partial";
  };

  const handleCellClick = (date) => {
    if (isViewMode) return;
    if (!canEdit) { ToastError("Previous month timesheets are locked for editing"); return; }
    const status = getCellStatus(date);
    if (["outside","future","holiday","approved","leave","pastlock"].includes(status)) return;
    setSelDate(date);
    const entry = entries[date.format("YYYY-MM-DD")];
    setTasks(parseTasks(entry?.task, entry?.hours));
    setNameErrors({});
    setLeaveType(entry?.leaveType || "");
    setCopyOpt("");
    setOtherDays([]);
    setDeleteConfirm(false);
    setModal(true);
    setTooltip({ visible: false, date: null, x: 0, y: 0 });
  };

  const handleCellMouseEnter = (e, date) => {
    const iso = date.format("YYYY-MM-DD");
    const entry = entries[iso];
    const holiday = getHolidayForDay(date);
    const leave   = getLeaveForDay(date);
    const status  = getCellStatus(date);
    if (status === "outside") return;
    if (!entry?.task && !holiday && !leave) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ visible: true, date, x: rect.left + rect.width / 2, y: rect.top - 8 });
  };
  const handleCellMouseLeave = () => setTooltip({ visible: false, date: null, x: 0, y: 0 });

  // ─── Save ────────────────────────────────────────────────────────────────────
  const saveEntry = () => {
    // Validate: every row that has hours must have a name; every row must have a name if it has any value
    const errors = {};
    tasks.forEach((t, i) => {
      const hasHours = parseFloat(t.hours) > 0;
      const hasName  = t.name.trim().length > 0;
      if ((hasHours || t.hours !== "") && !hasName) errors[i] = true;
    });
    if (Object.keys(errors).length) {
      setNameErrors(errors);
      ToastError("Task name is required for all tasks");
      return;
    }
    setNameErrors({});

    const validTasks = tasks.filter(t => t.name.trim() && parseFloat(t.hours) > 0);
    const totalHrs   = sumTaskHours(validTasks);

    if (!totalHrs && !leaveType) { ToastError("Please select a Leave Type when hours is 0"); return; }
    if (totalHrs > 24)           { ToastError("Total hours cannot exceed 24"); return; }

    const upd = { ...entries };
    upd[selDate.format("YYYY-MM-DD")] = {
      task:      JSON.stringify(validTasks),
      hours:     totalHrs,
      leaveType: !totalHrs ? leaveType : null,
    };

    const applyToDate = (d) => {
      if (!d.isAfter(today, "day") && d.month() === currentMonth.month())
        upd[d.format("YYYY-MM-DD")] = { task: JSON.stringify(validTasks), hours: totalHrs, leaveType: null };
    };
    if (copyOpt === "week") {
      let d = selDate.startOf("isoWeek");
      while (d.isBefore(selDate.endOf("isoWeek")) || d.isSame(selDate.endOf("isoWeek"), "day")) { applyToDate(d); d = d.add(1, "day"); }
    } else if (copyOpt === "month") {
      let d = selDate.startOf("month");
      while (d.isBefore(selDate) || d.isSame(selDate, "day")) { applyToDate(d); d = d.add(1, "day"); }
    } else if (copyOpt === "custom") {
      otherDays.forEach(d => applyToDate(d));
    }

    const payload = Object.keys(upd).map(dt => ({
      entryDate:    dt,
      taskDetails:  upd[dt].task || "",
      workingHours: upd[dt].hours ?? 0,
      leaveType:    upd[dt].leaveType || null,
    }));
    setLoading(true);
    postRequest("TimeSheet/InsertOrUpdateTimeSheet", payload).then(res => {
      if (res.data) { loadEntries(); setModal(false); ToastSuccess("Timesheet saved"); }
    }).catch(console.error).finally(() => setLoading(false));
  };

  // ─── Clear ───────────────────────────────────────────────────────────────────
  const clearEntry = () => {
    if (!selDate) return;
    const upd = { ...entries };
    upd[selDate.format("YYYY-MM-DD")] = { task: "", hours: 0, leaveType: null };
    const payload = Object.keys(upd).map(dt => ({
      entryDate:    dt,
      taskDetails:  upd[dt].task || "",
      workingHours: upd[dt].hours ?? 0,
      leaveType:    upd[dt].leaveType || null,
    }));
    setLoading(true);
    postRequest("TimeSheet/InsertOrUpdateTimeSheet", payload).then(() => {
      loadEntries(); setModal(false); setDeleteConfirm(false); ToastSuccess("Entry cleared");
    }).catch(console.error).finally(() => setLoading(false));
  };

  // ─── Task helpers ─────────────────────────────────────────────────────────────
  const updateTask = (idx, field, value) => {
    const upd = tasks.map((t, i) => i === idx ? { ...t, [field]: value } : t);
    if (field === "hours") {
      const newTotal = sumTaskHours(upd);
      if (newTotal > 24) { ToastError("Total hours cannot exceed 24"); return; }
    }
    if (field === "name" && value.trim()) {
      setNameErrors(prev => { const n = { ...prev }; delete n[idx]; return n; });
    }
    setTasks(upd);
  };
  const removeTask = (idx) => {
    setTasks(tasks.filter((_, i) => i !== idx));
    setNameErrors(prev => {
      const n = {};
      Object.keys(prev).forEach(k => { if (Number(k) !== idx) n[Number(k) > idx ? Number(k) - 1 : k] = true; });
      return n;
    });
  };
  const addTask = () => { if (sumTaskHours(tasks) >= 24) return; setTasks([...tasks, { name: "", hours: "" }]); };

  const totalHours  = sumTaskHours(tasks);
  const hoursOver   = totalHours > 24;
  const addDisabled = totalHours >= 24;
  const progressPct = Math.min((totalHours / 24) * 100, 100);

  // ─── Totals ───────────────────────────────────────────────────────────────────
  const getWeekTotal = (week) => fromMin(week.reduce((s, d) => s + toMin(entries[d.format("YYYY-MM-DD")]?.hours || 0), 0));
  const monthTotal   = fromMin(Object.values(entries).reduce((s, e) => s + toMin(e.hours || 0), 0));

  // ─── Excel export ─────────────────────────────────────────────────────────────
  const handleExcelExport = () => {
    const rows = [];
    const daysInMonth = [];
    let day = currentMonth.startOf("month");
    while (day.isSame(currentMonth, "month")) { daysInMonth.push(day.clone()); day = day.add(1, "day"); }

    if (!isViewMode) {
      daysInMonth.forEach(d => {
        const iso      = d.format("YYYY-MM-DD");
        const entry    = entries[iso];
        const holiday  = getHolidayForDay(d);
        const leave    = getLeaveForDay(d);
        const isWknd   = d.day() === 0 || d.day() === 6;
        const taskList = parseTasks(entry?.task, entry?.hours).filter(t => t.name || t.hours);
        rows.push({
          "Date":        d.format("DD-MM-YYYY"),
          "Day":         d.format("dddd"),
          "Status":      holiday ? "Holiday" : leave ? "On Leave" : isWknd ? "Weekend" : entry?.hours > 0 ? "Present" : "Absent",
          "Total Hours": entry?.hours || 0,
          "Tasks":       taskList.map(t => `${t.name} (${t.hours}h)`).join("; "),
          "Leave Type":  entry?.leaveType || leave?.leaveType || "",
        });
      });
    } else {
      const header = { "Employee": viewData.employeeName, "Email": viewData.username };
      daysInMonth.forEach(d => { const iso = d.format("YYYY-MM-DD"); header[d.format("DD-MM-YYYY (ddd)")] = entries[iso]?.hours || 0; });
      daysInMonth.forEach(d => {
        const iso = d.format("YYYY-MM-DD");
        const taskList = parseTasks(entries[iso]?.task, entries[iso]?.hours).filter(t => t.name);
        if (taskList.length) header[`Tasks ${d.format("DD-MM")}`] = taskList.map(t => `${t.name} (${t.hours}h)`).join("; ");
      });
      header["Total Hours"] = monthTotal;
      rows.push(header);
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");
    XLSX.writeFile(wb, `Timesheet_${(viewData?.employeeName || "My")}_${currentMonth.format("MMM-YYYY")}.xlsx`);
    ToastSuccess("Exported to Excel");
  };

  const legend = [
    { key:"filled",   label:"8+ hrs"  },
    { key:"partial",  label:"<8 hrs"  },
    { key:"empty",    label:"Pending" },
    { key:"leave",    label:"Leave"   },
    { key:"holiday",  label:"Holiday" },
    { key:"pastlock", label:"Locked"  },
  ];

  const breadItems = viewData
    ? [{ label:"Timesheet", link:"/timesheet" }, { label:`${viewData.employeeName} – ${viewMonth||""}` }]
    : [{ label:"Timesheet" }];

  const tooltipEntry   = tooltip.date ? entries[tooltip.date.format("YYYY-MM-DD")] : null;
  const tooltipHoliday = tooltip.date ? getHolidayForDay(tooltip.date) : null;
  const tooltipLeave   = tooltip.date ? getLeaveForDay(tooltip.date)   : null;
  const tooltipStatus  = tooltip.date ? getCellStatus(tooltip.date)    : null;
  const tooltipS       = tooltipStatus ? STATUS[tooltipStatus]         : null;
  const tooltipTasks   = tooltipEntry  ? parseTasks(tooltipEntry.task, tooltipEntry.hours).filter(t => t.name || t.hours) : [];

  const currentEntry    = selDate ? entries[selDate.format("YYYY-MM-DD")] : null;
  const currentTaskList = currentEntry ? parseTasks(currentEntry.task, currentEntry.hours).filter(t => t.name || t.hours) : [];

  return (
    <div>
      <LoadingMask loading={loading} />

      {/* Page header */}
      <div className="page-header">
        <div>
          <Breadcrumb icon={<ClipboardList size={13} />} items={breadItems} />
          <h1 className="page-title">{viewData ? `${viewData.employeeName}'s Timesheet` : "My Timesheet"}</h1>
          <p className="page-subtitle">
            {canEdit ? "Click a date to log hours ·" : isViewMode ? "View only ·" : "Previous months are locked ·"} {currentMonth.format("MMMM YYYY")}
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button className="icon-btn" onClick={handleExcelExport} title="Export to Excel" style={{ color:"var(--teal)", width:38, height:38 }}>
            <FileSpreadsheet size={18} />
          </button>
          <div style={{ background:"var(--primary-ghost)", border:"1px solid var(--border)", borderRadius:10, padding:"8px 16px", textAlign:"center" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--primary)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Month Total</div>
            <div style={{ fontSize:20, fontWeight:900, color:"var(--primary)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{monthTotal} hrs</div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card">
        <div className="card-header" style={{ flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {!isViewMode && <button className="calendar-nav-btn" onClick={() => setCurrentMonth(c => c.subtract(1, "month"))}><ChevronLeft size={16} /></button>}
            {isViewMode && <div style={{ width:30 }} />}
            <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:17, fontWeight:800, color:"var(--text-primary)", minWidth:160, textAlign:"center" }}>
              {currentMonth.format("MMMM YYYY")}
            </span>
            {!isViewMode && (
              <button className="calendar-nav-btn"
                onClick={() => { if (currentMonth.isBefore(today, "month")) setCurrentMonth(c => c.add(1, "month")); }}
                style={{ opacity: currentMonth.isBefore(today, "month") ? 1 : 0.3, cursor: currentMonth.isBefore(today, "month") ? "pointer" : "not-allowed" }}>
                <ChevronRight size={16} />
              </button>
            )}
            {isViewMode && <div style={{ width:30 }} />}
            {!canEdit && !isViewMode && (
              <span style={{ background:"#fff7ed", color:"#b45309", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, display:"flex", alignItems:"center", gap:5 }}>
                <AlertCircle size={12} /> Locked
              </span>
            )}
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {legend.map(({ key, label }) => (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:3, background:STATUS[key].bg, border:`1.5px solid ${STATUS[key].border}` }} />
                <span style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ overflowX:"auto", padding:"4px 8px 8px" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:680 }}>
            <thead>
              <tr>
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun","Week Total"].map(h => (
                  <th key={h} style={{ padding:"10px 6px", textAlign:"center", fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"1px solid var(--border)", background:"var(--bg)", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map(day => {
                    const status         = getCellStatus(day);
                    const s              = STATUS[status] || STATUS.outside;
                    const entry          = entries[day.format("YYYY-MM-DD")];
                    const holiday        = getHolidayForDay(day);
                    const leave          = getLeaveForDay(day);
                    const isToday2       = day.format("YYYY-MM-DD") === today.format("YYYY-MM-DD");
                    const inCurrentMonth = day.month() === currentMonth.month();
                    const clickable      = canEdit && !["outside","future","holiday","approved","leave","pastlock"].includes(status);
                    const hasTooltip     = !!(entry?.task || holiday || leave);
                    return (
                      <td key={day.format("YYYY-MM-DD")}
                        onClick={() => handleCellClick(day)}
                        onMouseEnter={e => { if (clickable) e.currentTarget.style.filter = "brightness(0.95)"; if (hasTooltip && inCurrentMonth) handleCellMouseEnter(e, day); }}
                        onMouseLeave={e => { e.currentTarget.style.filter = ""; handleCellMouseLeave(); }}
                        style={{ width:80, height:80, border:"1px solid var(--border)", background: status === "outside" ? "transparent" : s.bg, cursor: clickable ? "pointer" : "default", verticalAlign:"middle", padding:0, transition:"all 0.15s", boxShadow: isToday2 ? "inset 0 0 0 2px var(--primary)" : "none", position:"relative" }}
                      >
                        {inCurrentMonth && (
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", padding:"6px", gap:4 }}>
                            <div style={{ position:"absolute", top:6, left:8, fontSize:12, fontWeight: isToday2 ? 900 : 600, color: isToday2 ? "var(--primary)" : s.text, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{day.format("D")}</div>
                            {holiday && <div style={{ fontSize:10, color:s.text, fontWeight:700, textAlign:"center", maxWidth:"90%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", background:"rgba(255,255,255,0.5)", padding:"2px 5px", borderRadius:4 }}>{holiday.eventName}</div>}
                            {leave && !holiday && <div style={{ fontSize:10, color:s.text, fontWeight:700, textAlign:"center", maxWidth:"90%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{leave.leaveType}</div>}
                            {entry?.hours > 0 && !holiday && !leave && <span style={{ fontSize:18, fontWeight:900, color:s.text, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1 }}>{entry.hours}h</span>}
                            {status === "pastlock" && <div style={{ fontSize:16, color:s.text, textAlign:"center" }}>🔒</div>}
                            {entry?.task && !holiday && !leave && <div style={{ width:5, height:5, borderRadius:"50%", background:s.text, opacity:0.5, flexShrink:0 }} />}
                          </div>
                        )}
                        {!inCurrentMonth && <div style={{ padding:"5px 6px", color:"#e5e7eb", fontSize:12, fontWeight:500 }}>{day.format("D")}</div>}
                      </td>
                    );
                  })}
                  <td style={{ textAlign:"center", border:"1px solid var(--border)", background:"var(--bg)", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, fontWeight:800, color:"var(--primary)", padding:8, whiteSpace:"nowrap" }}>
                    {getWeekTotal(week)} hrs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.date && (
        <div style={{ position:"fixed", left:tooltip.x, top:tooltip.y, transform:"translate(-50%, -100%)", zIndex:9999, pointerEvents:"none" }}>
          <div style={{ background:"var(--bg-card,#fff)", border:"1.5px solid var(--border)", borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", padding:"12px 14px", minWidth:200, maxWidth:280 }}>
            <div style={{ position:"absolute", bottom:-7, left:"50%", width:12, height:12, background:"var(--bg-card,#fff)", border:"1.5px solid var(--border)", borderTop:"none", borderLeft:"none", transform:"translateX(-50%) rotate(45deg)" }} />
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>{tooltip.date.format("ddd, DD MMM YYYY")}</div>
            {tooltipHoliday && <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}><div style={{ width:8, height:8, borderRadius:2, background:tooltipS?.bg, border:`1.5px solid ${tooltipS?.border}`, flexShrink:0 }} /><span style={{ fontSize:12, fontWeight:700, color:tooltipS?.text }}>{tooltipHoliday.eventName}</span></div>}
            {tooltipLeave && !tooltipHoliday && <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}><div style={{ width:8, height:8, borderRadius:2, background:tooltipS?.bg, border:`1.5px solid ${tooltipS?.border}`, flexShrink:0 }} /><span style={{ fontSize:12, fontWeight:700, color:tooltipS?.text }}>{tooltipLeave.leaveType}</span></div>}
            {tooltipEntry?.hours > 0 && <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom: tooltipTasks.length ? 8 : 0 }}><Clock size={11} color="var(--text-muted)" /><span style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)" }}>{tooltipEntry.hours} hours logged</span></div>}
            {tooltipTasks.length > 0 && (<><div style={{ height:1, background:"var(--border)", margin:"8px 0" }} /><div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:5 }}>Tasks</div>{tooltipTasks.map((t, i) => <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, color:"var(--text-primary)", lineHeight:1.8, gap:8 }}><span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</span>{t.hours && <span style={{ fontWeight:800, flexShrink:0, color:"var(--primary)" }}>{t.hours}h</span>}</div>)}</>)}
          </div>
        </div>
      )}

      {/* ── Entry Modal ── */}
      {modal && selDate && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth:540 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div className="modal-icon" style={{ background:"var(--primary-ghost)" }}><Clock size={20} color="var(--primary)" /></div>
                <div>
                  <div className="modal-title">Log Hours</div>
                  <div className="modal-subtitle">{selDate.format("dddd, DD MMM YYYY")}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {(currentEntry?.hours > 0 || currentEntry?.leaveType || currentEntry?.task) && (
                  <button className="icon-btn" title="Clear this entry" style={{ color:"var(--coral)" }} onClick={() => setDeleteConfirm(true)}><Trash2 size={15} /></button>
                )}
                <button className="modal-close" onClick={() => setModal(false)}><X size={16} /></button>
              </div>
            </div>

            {/* ── Saved Tasks Preview ── polished table card */}
            {currentTaskList.length > 0 && !deleteConfirm && (
              <div style={{ margin:"0 24px 16px" }}>
                <div style={{ borderRadius:12, border:"1px solid var(--border)", overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
                  {/* Card title bar */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 14px", background:"var(--primary-ghost)", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <CheckCircle2 size={13} color="var(--primary)" />
                      <span style={{ fontSize:11, fontWeight:700, color:"var(--primary)", textTransform:"uppercase", letterSpacing:"0.06em" }}>Saved Tasks</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:800, color:"var(--primary)", background:"white", border:"1.5px solid var(--primary)", padding:"1px 10px", borderRadius:20 }}>
                      {currentEntry?.hours}h total
                    </span>
                  </div>

                  {/* Column header */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 60px", gap:0, padding:"6px 14px 4px", background:"var(--bg)" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Task</span>
                    <span style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"right" }}>Hrs</span>
                  </div>

                  {/* Rows */}
                  {currentTaskList.map((t, i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 60px", alignItems:"center", padding:"8px 14px", borderTop:"1px solid var(--border)", background: i % 2 === 0 ? "var(--bg-card,#fff)" : "var(--bg,#fafafa)", gap:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--primary)", opacity:0.45, flexShrink:0 }} />
                        <span style={{ fontSize:13, color:"var(--text-primary)", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</span>
                      </div>
                      <span style={{ fontSize:13, fontWeight:800, color:"var(--primary)", textAlign:"right", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{t.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delete confirm */}
            {deleteConfirm && (
              <div style={{ margin:"12px 24px", padding:"12px 14px", background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <AlertCircle size={16} color="var(--coral)" />
                  <span style={{ fontSize:13, fontWeight:600, color:"#be123c" }}>Clear this day's entry?</span>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => setDeleteConfirm(false)} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid var(--border)", background:"white", cursor:"pointer", fontSize:12, fontWeight:600 }}>Cancel</button>
                  <button onClick={clearEntry} style={{ padding:"4px 10px", borderRadius:6, border:"none", background:"var(--coral)", color:"white", cursor:"pointer", fontSize:12, fontWeight:700 }}>Clear</button>
                </div>
              </div>
            )}

            <div className="modal-body">

              {/* ── Task Input Section ── */}
              <div style={{ marginBottom:16 }}>

                {/* Header + progress */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <label className="fc-label" style={{ margin:0 }}>Tasks <span className="req">*</span></label>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {/* Mini progress bar */}
                    <div style={{ width:72, height:5, borderRadius:99, background:"var(--border)", overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:99, transition:"width 0.3s, background 0.3s", width:`${progressPct}%`, background: hoursOver ? "var(--coral)" : totalHours >= 20 ? "#f59e0b" : "var(--primary)" }} />
                    </div>
                    <span style={{ fontSize:12, fontWeight:800, color: hoursOver ? "var(--coral)" : totalHours > 0 ? "var(--primary)" : "var(--text-muted)", minWidth:72, textAlign:"right" }}>
                      {totalHours} / 24 hrs
                    </span>
                  </div>
                </div>

                {/* Column labels */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 76px 36px", gap:8, marginBottom:6, padding:"0 2px" }}>
                  <span style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    Task Name <span style={{ color:"var(--coral)" }}>*</span>
                  </span>
                  <span style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"center" }}>Hours</span>
                  <span />
                </div>

                {/* Rows */}
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {tasks.map((task, idx) => (
                    <div key={idx} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 76px 36px", gap:8, alignItems:"center" }}>
                        <input
                          className={`fc-input${nameErrors[idx] ? " fc-input-error" : ""}`}
                          style={{ fontSize:13 }}
                          placeholder={`e.g. Code review, Bug fix…`}
                          value={task.name}
                          onChange={e => updateTask(idx, "name", e.target.value)}
                        />
                        <input
                          type="number" min="0" max="24" step="0.5"
                          className="fc-input"
                          style={{ fontSize:13, fontWeight:700, textAlign:"center", padding:"10px 4px" }}
                          placeholder="0"
                          value={task.hours}
                          onChange={e => updateTask(idx, "hours", e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeTask(idx)}
                          disabled={tasks.length === 1}
                          title="Remove task"
                          style={{
                            background:"none",
                            border:`1.5px solid ${tasks.length === 1 ? "var(--border)" : "#fecdd3"}`,
                            borderRadius:8,
                            cursor: tasks.length === 1 ? "not-allowed" : "pointer",
                            color: tasks.length === 1 ? "#d1d5db" : "var(--coral)",
                            width:36, height:42,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            flexShrink:0, transition:"all 0.15s",
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {/* Inline name error */}
                      {nameErrors[idx] && (
                        <div style={{ display:"flex", alignItems:"center", gap:4, paddingLeft:2 }}>
                          <AlertCircle size={11} color="var(--coral)" />
                          <span style={{ fontSize:11, color:"var(--coral)", fontWeight:600 }}>Task name is required</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Task */}
                <button
                  type="button"
                  disabled={addDisabled}
                  onClick={addTask}
                  style={{
                    marginTop:10, padding:"8px 14px", borderRadius:9,
                    border:`1.5px dashed ${addDisabled ? "var(--border)" : "var(--primary)"}`,
                    background:  addDisabled ? "#f9fafb" : "var(--primary-ghost)",
                    color:       addDisabled ? "#d1d5db" : "var(--primary)",
                    fontSize:12, fontWeight:700,
                    cursor:      addDisabled ? "not-allowed" : "pointer",
                    width:"100%", transition:"all 0.2s",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  }}
                >
                  <Plus size={13} />
                  {addDisabled ? "24h limit reached — cannot add more tasks" : "Add Another Task"}
                </button>
              </div>

              {/* Leave Type */}
              {totalHours === 0 && (
                <div style={{ marginBottom:14 }}>
                  <label className="fc-label">Leave Type <span className="req">*</span></label>
                  <select
                    className="fc-input"
                    value={leaveType}
                    onChange={e => setLeaveType(e.target.value)}
                    style={{ borderColor: !leaveType ? "var(--coral)" : undefined, boxShadow: !leaveType ? "0 0 0 3px rgba(239,68,68,0.1)" : undefined }}
                  >
                    <option value="">Select leave type…</option>
                    {["Sick Leave","Casual Leave","Other Leave"].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {!leaveType && (
                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:5 }}>
                      <AlertCircle size={11} color="var(--coral)" />
                      <span style={{ fontSize:11, color:"var(--coral)", fontWeight:600 }}>Required when no hours are logged</span>
                    </div>
                  )}
                </div>
              )}

              {/* Copy To */}
              <div>
                <label className="fc-label" style={{ display:"flex", alignItems:"center", gap:6 }}><Copy size={12} /> Copy To</label>
                <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                  {[{ val:"", label:"This day" },{ val:"week", label:"Whole week" },{ val:"month", label:"Whole month" },{ val:"custom", label:"Pick days" }].map(({ val, label }) => (
                    <button key={val} type="button" onClick={() => setCopyOpt(val)}
                      style={{ padding:"6px 12px", borderRadius:8, border:`1.5px solid ${copyOpt===val ? "var(--primary)" : "var(--border)"}`, background: copyOpt===val ? "var(--primary-ghost)" : "var(--bg)", color: copyOpt===val ? "var(--primary)" : "var(--text-secondary)", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }}>
                      {label}
                    </button>
                  ))}
                </div>
                {copyOpt === "custom" && (
                  <div style={{ marginTop:10 }}>
                    <label className="fc-label">Select days</label>
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                      {allDays.filter(d => d.month() === currentMonth.month() && !d.isAfter(today, "day")).map(d => {
                        const iso   = d.format("YYYY-MM-DD");
                        const isSel = otherDays.find(x => x.isSame(d, "day"));
                        return (
                          <button key={iso} type="button"
                            onClick={() => setOtherDays(prev => prev.find(x => x.isSame(d, "day")) ? prev.filter(x => !x.isSame(d, "day")) : [...prev, d])}
                            style={{ width:32, height:32, borderRadius:7, border:`1.5px solid ${isSel ? "var(--primary)" : "var(--border)"}`, background: isSel ? "var(--primary)" : "var(--bg)", color: isSel ? "white" : "var(--text-secondary)", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                            {d.format("D")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}><X size={14} /> Cancel</button>
              <button className="btn btn-primary" onClick={saveEntry}><Save size={14} /> Save Entry</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fc-label { display:block; font-family:'Plus Jakarta Sans',sans-serif; font-size:11.5px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:7px; }
        .req { color:var(--coral); margin-left:2px; }
        .fc-input { width:100%; padding:10px 13px; border-radius:10px; border:1.5px solid var(--border); background:var(--bg); font-family:'DM Sans',sans-serif; font-size:13.5px; color:var(--text-primary); outline:none; transition:all 0.2s; box-sizing:border-box; }
        .fc-input:focus { border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-ghost); background:#fff; }
        .fc-input-error { border-color:var(--coral) !important; box-shadow:0 0 0 3px rgba(239,68,68,0.1) !important; }
        .fc-input-error:focus { border-color:var(--coral) !important; }
        textarea.fc-input { resize:vertical; min-height:70px; line-height:1.6; }
        select.fc-input { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; }
      `}</style>
    </div>
  );
}