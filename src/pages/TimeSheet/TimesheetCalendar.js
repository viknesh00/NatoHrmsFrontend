import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import {
  ChevronLeft, ChevronRight, ChevronDown, X, Save, Clock, Copy,
  FileSpreadsheet, Trash2, AlertCircle, ClipboardList, Plus, CheckCircle2, Zap,
} from "lucide-react";
import { getRequest, postRequest } from "../../services/Apiservice";
import { useLocation, useNavigate } from "react-router-dom";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { ToastSuccess, ToastError } from "../../services/ToastMsg";
import * as XLSX from "xlsx";
import { getCookie } from "../../services/Cookies";
dayjs.extend(isoWeek);

const MAX_REGULAR = 8;

const roundH = (n) => Math.round((Number(n) || 0) * 100) / 100;

const STATUS = {
  filled:   { bg: "#dcfce7", border: "#86efac", text: "#15803d",  label: "8 hrs" },
  overtime: { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8",  label: "Overtime" },
  partial:  { bg: "#fef9c3", border: "#fde047", text: "#a16207",  label: "< 8 hrs" },
  empty:    { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c",  label: "Pending" },
  leave:    { bg: "#ede9fe", border: "#c4b5f4", text: "#6c3fc5",  label: "On Leave" },
  approved: { bg: "#dcfce7", border: "#86efac", text: "#15803d",  label: "Leave ✓" },
  holiday:  { bg: "#fee2e2", border: "#fca5a5", text: "#b91c1c",  label: "Holiday" },
  weekend:  { bg: "#f8fafc", border: "var(--border)", text: "var(--text-muted)", label: "Weekend" },
  future:   { bg: "#f9fafb", border: "var(--border)", text: "#d1d5db", label: "Future" },
  pastlock: { bg: "#f1f5f9", border: "#cbd5e1", text: "#94a3b8",  label: "Locked" },
  outside:  { bg: "transparent", border: "transparent", text: "#e5e7eb", label: "" },
};

// True-decimal (h + m/60) -> total minutes. Used to work out how much of the
// 8h regular budget is left once other rows' hours are subtracted out, and
// to correctly sum week/month totals (see getWeekTotal/monthTotal below).
const decToMin = (v) => Math.round((Number(v) || 0) * 60);

const parseAllTasks = (taskStr, fallbackHours) => {
  const empty = { regularTasks: [{ name:"", hours:"" }], overtimeTasks: [] };
  if (!taskStr) return empty;
  let parsed;
  try { parsed = JSON.parse(taskStr); } catch { return { regularTasks:[{ name:taskStr, hours:fallbackHours||"" }], overtimeTasks:[] }; }
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { return { regularTasks:[{ name:parsed, hours:fallbackHours||"" }], overtimeTasks:[] }; }
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.regularTasks !== undefined) {
    const rt = Array.isArray(parsed.regularTasks) && parsed.regularTasks.length ? parsed.regularTasks : [{ name:"", hours:"" }];
    const ot = Array.isArray(parsed.overtimeTasks) ? parsed.overtimeTasks : [];
    return { regularTasks: rt, overtimeTasks: ot };
  }
  if (Array.isArray(parsed) && parsed.length) return { regularTasks: parsed, overtimeTasks: [] };
  return empty;
};

const sumHours = (tasks) => roundH(tasks.reduce((s,t) => s+(parseFloat(t.hours)||0), 0));

// ── HH:MM duration-picker helpers ───────────────────────────────────────────
// task.hours is still stored/validated as a decimal number of hours (e.g. 1.25 = 1h15m),
// these just convert that decimal to/from separate HH and MM dropdown values.
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i); // 0..59
const hhFromDecimal = (v) => Math.floor(Number(v) || 0);
const mmFromDecimal = (v) => Math.round((((Number(v) || 0) % 1) + 1e-9) * 60);
const hmToDecimal = (h, m) => roundH(Number(h || 0) + Number(m || 0) / 60);
// Display a decimal-hours value as "1h 15m" instead of the raw decimal (1.25),
// so it never reads like "25 minutes" when it's really the .25 fraction of an hour.
const fmtHM = (v) => {
  const totalMin = Math.round((Number(v) || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

// Format an already-summed total-minutes integer as "Xh Ym" — used for week/month
// totals, which sum multiple days' worth of minutes before formatting once.
const fmtMin = (totalMin) => {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

// Custom dropdown for picking an HH or MM value. Renders its option list through a
// portal, positioned with fixed coords anchored to the trigger's bottom edge — so it
// always opens downward and is never clipped or flipped upward by the modal's scroll box.
function DurationDropdown({ value, options, formatLabel, onChange, ot }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const btnRef  = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const closeOnScroll = (e) => {
      if (listRef.current && listRef.current.contains(e.target)) return; // scrolling the option list itself — keep it open
      setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnScroll);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnScroll);
    };
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen(o => !o);
  };

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
        style={{
          flex: 1, minWidth: 0, width: "100%",
          padding: "10px 6px", borderRadius: 10,
          border: `1.5px solid ${open ? "var(--primary)" : (ot ? "#bfdbfe" : "var(--border)")}`,
          boxShadow: open ? "0 0 0 3px var(--primary-ghost)" : "none",
          background: ot ? "#f8fbff" : "var(--bg)",
          fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 700,
          color: "var(--text-primary)", cursor: "pointer", outline: "none", boxSizing: "border-box",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
          transition: "all 0.15s",
        }}
      >
        {formatLabel(value)} <ChevronDown size={11} style={{ opacity: 0.55, flexShrink: 0 }} />
      </button>
      {open && rect && ReactDOM.createPortal(
        <div
          ref={listRef}
          style={{
            position: "fixed",
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            maxHeight: 190,
            overflowY: "auto",
            background: "#fff",
            border: "1.5px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 10px 28px rgba(0,0,0,0.16)",
            zIndex: 999999,
          }}
        >
          {options.map(o => (
            <div
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              style={{
                padding: "7px 4px",
                fontSize: 12, fontWeight: 700, textAlign: "center", cursor: "pointer",
                background: o === value ? "var(--primary)" : "#fff",
                color: o === value ? "#fff" : "var(--text-primary)",
              }}
              onMouseEnter={e => { if (o !== value) e.currentTarget.style.background = "var(--primary-ghost)"; }}
              onMouseLeave={e => { if (o !== value) e.currentTarget.style.background = "#fff"; }}
            >
              {formatLabel(o)}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default function TimesheetCalendar({tabSwitcher}) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { viewData, selectedMonth: viewMonth } = location.state || {};

  const [currentMonth, setCurrentMonth] = useState(
    viewMonth ? dayjs(viewMonth, "MMM-YYYY") : dayjs()
  );

  const [entries,      setEntries]      = useState({});
  const [leaveList,    setLeaveList]    = useState([]);
  const [holidayList,  setHolidayList]  = useState([]);
  const [loading,      setLoading]      = useState(false);

  const [modal,        setModal]        = useState(false);
  const [selDate,      setSelDate]      = useState(null);
  const [regularTasks, setRegularTasks] = useState([{ name:"", hours:"" }]);
  const [overtimeTasks,setOvertimeTasks]= useState([]);
  const [showOvertime, setShowOvertime] = useState(false);
  const [nameErrors,   setNameErrors]   = useState({ reg:{}, ot:{} });
  const [leaveType,    setLeaveType]    = useState("");
  const [copyOpt,      setCopyOpt]      = useState("");
  const [otherDays,    setOtherDays]    = useState([]);
  const [deleteConfirm,setDeleteConfirm]= useState(false);
  const [tooltip,      setTooltip]      = useState({ visible:false, date:null, x:0, y:0 });
  const [dayMode,      setDayMode]      = useState("");
  const [manualHolidayName, setManualHolidayName] = useState("");

  // Department-based weekend working days (set at login from DepartmentTimings)
const includeSaturday = getCookie("includeSaturday") === "true" || getCookie("includeSaturday") === true;
const includeSunday   = getCookie("includeSunday")   === "true" || getCookie("includeSunday")   === true;

  const geoFenceEnabled  = getCookie("geoFenceEnabled") === "true" || getCookie("geoFenceEnabled") === true;
  const networkLocation  = (getCookie("networkLocation")  || "").trim();
  const workLocationCity = (getCookie("workLocationCity") || "").trim();

  const locationMismatch = geoFenceEnabled && networkLocation && workLocationCity && networkLocation.toLowerCase() !== workLocationCity.toLowerCase();

  // ── Grace period config ─────────────────────────────────────────────────
  const GRACE_DAYS = 5; // previous month stays editable for this many days into the new month
  const today          = dayjs();
  const isCurrentMonth = currentMonth.isSame(today, "month");
  const isPrevMonth = currentMonth.isSame(today.subtract(1, "month"), "month");
  const isPrevMonthGrace = isPrevMonth && today.date() <= GRACE_DAYS;

  const isViewMode = !!viewData;
  const canEdit    = !isViewMode && (isCurrentMonth || isPrevMonthGrace);

  const startDay = currentMonth.startOf("month").startOf("isoWeek");
  const endDay   = currentMonth.endOf("month").endOf("isoWeek");
  const allDays  = [];

  // Helper: is this date a non-working weekend day for the user's department?
  const isNonWorkingWeekendDay = (date) => {
    const dow = date.day(); // dayjs: 0 = Sunday, 6 = Saturday
    if (dow === 6) return !includeSaturday;
    if (dow === 0) return !includeSunday;
    return false;
  };

  let d = startDay;
  while (d.isBefore(endDay,"day") || d.isSame(endDay,"day")) { allDays.push(d); d=d.add(1,"day"); }
  const weeks = [];
  for (let i=0; i<allDays.length; i+=7) weeks.push(allDays.slice(i,i+7));

  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  useEffect(() => {
    loadLeaves();
    if (!viewData) loadEntries();
    else {
      const fmt = viewData.timesheet.reduce((acc,item) => {
        if (item.entryDate) {
          const dt = item.entryDate.split("T")[0];
          acc[dt] = { task: item.taskDetails||"", hours: item.workingHours??0, leaveType: item.leaveType||null };
        }
        return acc;
      }, {});
      setEntries(fmt);
    }
  }, [currentMonth]);

  const loadLeaves = () => {
    const month = currentMonth.format("YYYY-MM");
    const url = viewData
      ? `User/GetLeaveForUser?userName=${viewData.username}&month=${month}`
      : `User/GetMyLeave?month=${month}`;
    getRequest(url).then(res => {
      if (res.data) {
        setLeaveList(res.data.leaves.map(l => ({
          ...l,
          fromDate: l.fromDate ? dayjs(l.fromDate).format("YYYY-MM-DD") : l.fromDate,
          toDate: l.toDate ? dayjs(l.toDate).format("YYYY-MM-DD") : l.toDate,
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
    getRequest(`TimeSheet/GetMyTimeSheet?month=${currentMonth.format("YYYY-MM")}`)  // ← was TimeSheet/GetTimeSheet
      .then(res => {
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
    const from=dayjs(l.fromDate,"YYYY-MM-DD"), to=dayjs(l.toDate,"YYYY-MM-DD");
    return date.isSame(from,"day")||date.isSame(to,"day")||(date.isAfter(from,"day")&&date.isBefore(to,"day"));
  });
  const getHolidayForDay = (date) => holidayList.find(h=>h.eventDate===date.format("YYYY-MM-DD"));

  const getCellStatus = (date) => {
    const inCurrentMonth = date.month()===currentMonth.month();
    if (!inCurrentMonth) return "outside";
    if (date.isAfter(today,"day")) return "future";
    if (!isCurrentMonth && !isPrevMonthGrace && !isViewMode) return "pastlock";

    const nonWorkingWeekend = isNonWorkingWeekendDay(date);
    const entry   = entries[date.format("YYYY-MM-DD")];
    const holiday = getHolidayForDay(date);
    const leave   = getLeaveForDay(date);

    // If it's a non-working Sat/Sun for this department, ignore leave/holiday entirely.
    // Only show actual logged hours (if any were saved), otherwise plain "weekend".
    if (nonWorkingWeekend) {
      if (!entry || !entry.hours) return "weekend";
      if (entry.hours > MAX_REGULAR) return "overtime";
      if (entry.hours === MAX_REGULAR) return "filled";
      return "partial";
    }

    // Working Sat/Sun (or a weekday) — behaves like a normal day, leave/holiday apply
    if (holiday) return "holiday";
    if (leave && !leave.approverReason && !entry?.hours) {
      return leave.isApproved===true||leave.isApproved==="true" ? "approved" : "leave";
    }
    if (entry?.leaveType && !entry?.hours) return "leave";
    if (!entry || entry.hours===0) return "empty";
    if (entry.hours > MAX_REGULAR)  return "overtime";
    if (entry.hours === MAX_REGULAR) return "filled";
    return "partial";
  };

  const handleCellClick = (date) => {
    if (isViewMode) return;
    if (!canEdit) { ToastError("Previous month timesheets are locked for editing"); return; }
    if (locationMismatch) { ToastError(`You're in ${networkLocation}, but your work location is ${workLocationCity}. Timesheet entry is disabled until you're on-site.`); return; }
    const status    = getCellStatus(date);
    const apiLeave  = getLeaveForDay(date);
    const apiHoliday= getHolidayForDay(date);
    if (["outside","future","approved","pastlock"].includes(status)) return;
    if (apiHoliday) return;
    if (apiLeave && !apiLeave.approverReason) return;

    setSelDate(date);
    const entry = entries[date.format("YYYY-MM-DD")];
    const { regularTasks: rt, overtimeTasks: ot } = parseAllTasks(entry?.task, entry?.hours);
    const sanitized = (list) => {
      if (list.length === 1 && list[0].name && list[0].name.trim().startsWith("{")) {
        const recovered = parseAllTasks(list[0].name, list[0].hours);
        if (recovered.regularTasks[0]?.name !== list[0].name) return recovered;
      }
      return { regularTasks: list, overtimeTasks: ot };
    };
    const { regularTasks: cleanRt, overtimeTasks: cleanOt } = sanitized(rt);
    setRegularTasks(cleanRt.length ? cleanRt : [{ name:"", hours:"" }]);
    setOvertimeTasks(cleanOt);
    setShowOvertime(cleanOt.length > 0);
    setNameErrors({ reg:{}, ot:{} });

    const savedLeave = entry?.leaveType||"";
    if (savedLeave.startsWith("Holiday:")) {
      setDayMode("holiday"); setManualHolidayName(savedLeave.replace("Holiday:","").trim()); setLeaveType("");
    } else if (savedLeave) {
      setDayMode("leave"); setLeaveType(savedLeave); setManualHolidayName("");
    } else {
      setDayMode(""); setLeaveType(""); setManualHolidayName("");
    }

    setCopyOpt(""); setOtherDays([]); setDeleteConfirm(false); setModal(true);
    document.body.style.overflow = "hidden";
    setTooltip({ visible:false, date:null, x:0, y:0 });
  };

  const handleCellMouseEnter = (e, date) => {
    const iso    = date.format("YYYY-MM-DD");
    const entry  = entries[iso];
    const holiday= getHolidayForDay(date);
    const leave  = getLeaveForDay(date);
    const status = getCellStatus(date);
    const nonWorkingWeekend = isNonWorkingWeekendDay(date);
    if (nonWorkingWeekend) return;
    if (status==="outside") return;
    if (!entry?.task && !holiday && !leave && !isNonWorkingWeekendDay(date)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ visible:true, date, x:rect.left+rect.width/2, y:rect.top-8 });
  };
  const handleCellMouseLeave = () => setTooltip({ visible:false, date:null, x:0, y:0 });

  // ── Computed totals ───────────────────────────────────────────────────────
  const regularTotal  = sumHours(regularTasks);
  const overtimeTotal = sumHours(overtimeTasks);
  const grandTotal    = regularTotal + overtimeTotal;
  const regularOver   = regularTotal > MAX_REGULAR;

  // ── FIX: if a regular task gets deleted (or edited down) and regular hours
  // drop below the 8h requirement, collapse the Overtime panel back to the
  // banner state — but only when it's still empty/unfilled. If the person has
  // already typed real overtime, leave it alone so saveEntry's validation
  // message ("complete regular 8h first") can guide them instead of us
  // silently discarding what they entered.
  useEffect(() => {
    if (!showOvertime || regularTotal >= MAX_REGULAR) return;
    const hasRealOt = overtimeTasks.some(t => t.name.trim() && parseFloat(t.hours) > 0);
    if (!hasRealOt) {
      setShowOvertime(false);
      setOvertimeTasks([]);
    }
  }, [regularTotal]);

  // ── FIX: helper to decide if a regular task row's X button should show ───
  // Hide the X when overtime tasks exist (user must keep regular at 8h)
  // OR when it's the last remaining regular task row
  const canRemoveRegTask = (idx) => {
    // Never remove the last row
    if (regularTasks.length === 1) return false;
    // When overtime tasks are present, removing this row must not drop regular < 8h
    if (overtimeTasks.length > 0) {
      const hoursWithout = roundH(regularTotal - (parseFloat(regularTasks[idx].hours) || 0));
      if (hoursWithout < MAX_REGULAR) return false;
    }
    return true;
  };

  // ── Task helpers ──────────────────────────────────────────────────────────
  const updateTask = (kind, idx, field, value) => {
    const setter = kind==="reg" ? setRegularTasks : setOvertimeTasks;
    const list   = kind==="reg" ? regularTasks    : overtimeTasks;
    const upd    = list.map((t,i) => i===idx ? { ...t, [field]:value } : t);

    if (field==="hours") {
      if (kind==="reg") {
        const newReg = upd.reduce((s,t)=>s+(parseFloat(t.hours)||0),0);
        if (newReg > MAX_REGULAR) { ToastError(`Regular hours cannot exceed ${MAX_REGULAR}h — log extra as Overtime`); return; }
      }
      const newGrand = (kind==="reg"?upd.reduce((s,t)=>s+(parseFloat(t.hours)||0),0):regularTotal)
                     + (kind==="ot"?upd.reduce((s,t)=>s+(parseFloat(t.hours)||0),0):overtimeTotal);
      if (newGrand > 24) { ToastError("Total hours cannot exceed 24"); return; }
      if ((kind==="reg"?upd:regularTasks).reduce((s,t)=>s+(parseFloat(t.hours)||0),0)>0) {
        setDayMode(""); setLeaveType(""); setManualHolidayName("");
      }
    }
    if (field==="name" && value.trim()) {
      setNameErrors(prev => {
        const n = { ...prev };
        delete n[kind][idx];
        return { ...n, [kind]:{ ...n[kind] } };
      });
      setDayMode(""); setLeaveType(""); setManualHolidayName("");
    }
    setter(upd);
  };

  const removeTask = (kind, idx) => {
    const setter = kind==="reg" ? setRegularTasks : setOvertimeTasks;
    const list   = kind==="reg" ? regularTasks    : overtimeTasks;
    setter(list.filter((_,i)=>i!==idx));
    setNameErrors(prev => {
      const copy = { ...prev[kind] };
      delete copy[idx];
      return { ...prev, [kind]:copy };
    });
  };

  const addTask = (kind) => {
    if (kind==="reg") {
      if (regularTotal >= MAX_REGULAR) { ToastError(`Regular hours full (${MAX_REGULAR}h) — use Overtime`); return; }
      setRegularTasks(p => [...p, { name:"", hours:"" }]);
    } else {
      if (grandTotal >= 24) { ToastError("Total 24h limit reached"); return; }
      setOvertimeTasks(p => [...p, { name:"", hours:"" }]);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveEntry = () => {
    const errors = { reg:{}, ot:{} };
    regularTasks.forEach((t,i)=>{ if ((parseFloat(t.hours)>0||t.hours!=="")&&!t.name.trim()) errors.reg[i]=true; });
    overtimeTasks.forEach((t,i)=>{ if ((parseFloat(t.hours)>0||t.hours!=="")&&!t.name.trim()) errors.ot[i]=true; });
    if (Object.keys(errors.reg).length||Object.keys(errors.ot).length) {
      setNameErrors(errors); ToastError("Task name is required for all tasks"); return;
    }
    setNameErrors({ reg:{}, ot:{} });

    const validReg = regularTasks.filter(t=>t.name.trim()&&parseFloat(t.hours)>0);
    const validOt  = overtimeTasks.filter(t=>t.name.trim()&&parseFloat(t.hours)>0);
    const totalReg = sumHours(validReg);
    const totalOt  = sumHours(validOt);
    const totalHrs = totalReg + totalOt;

    // ── FIX: Overtime validation — regular must be exactly 8h before saving OT ──
    if (validOt.length > 0 && totalReg < MAX_REGULAR) {
      ToastError(`Please complete your regular ${MAX_REGULAR}h first before logging overtime`);
      return;
    }

    const resolvedLeave = dayMode==="holiday"
      ? (manualHolidayName.trim() ? `Holiday: ${manualHolidayName.trim()}` : "")
      : leaveType;

    if (!totalHrs && !resolvedLeave) {
      if (!dayMode) ToastError("Please select a day type (Leave or Holiday)");
      else if (dayMode==="holiday") ToastError("Please enter the holiday name");
      else ToastError("Please select a Leave Type");
      return;
    }
    if (totalHrs > 24) { ToastError("Total hours cannot exceed 24"); return; }

    const taskPayload = (validReg.length||validOt.length)
      ? JSON.stringify({ regularTasks: validReg, overtimeTasks: validOt })
      : "";

    const upd = { ...entries };
    upd[selDate.format("YYYY-MM-DD")] = {
      task: taskPayload,
      hours: totalHrs,
      leaveType: !totalHrs ? resolvedLeave : null,
    };

    const applyToDate = (dd) => {
      if (isNonWorkingWeekendDay(dd)) return; // skip non-working Sat/Sun entirely
      if (getHolidayForDay(dd)) return;
      if (getLeaveForDay(dd) && !getLeaveForDay(dd)?.approverReason) return;
      if (!dd.isAfter(today, "day") && dd.month() === currentMonth.month())
        upd[dd.format("YYYY-MM-DD")] = { task: taskPayload, hours: totalHrs, leaveType: null };
    };

    if (copyOpt==="week") {
      let dd=selDate.startOf("isoWeek");
      while (dd.isBefore(selDate.endOf("isoWeek"))||dd.isSame(selDate.endOf("isoWeek"),"day")) { applyToDate(dd); dd=dd.add(1,"day"); }
    } else if (copyOpt==="month") {
      let dd=currentMonth.startOf("month");
      while (dd.isBefore(today,"day")||dd.isSame(today,"day")) { applyToDate(dd); dd=dd.add(1,"day"); }
    } else if (copyOpt==="custom") {
      otherDays.forEach(dd=>applyToDate(dd));
    }

    const payload = Object.keys(upd).map(dt => ({
      entryDate: dt,
      taskDetails: upd[dt].task||"",
      workingHours: upd[dt].hours??0,
      leaveType: upd[dt].leaveType||null,
    }));
    setLoading(true);
    postRequest("TimeSheet/InsertOrUpdateTimeSheet", payload).then(res => {
      if (res.data) { loadEntries(); setModal(false); ToastSuccess("Timesheet saved"); }
    }).catch(console.error).finally(()=>setLoading(false));
  };

  // ── Clear ─────────────────────────────────────────────────────────────────
  const clearEntry = () => {
    if (!selDate) return;
    const upd = { ...entries };
    upd[selDate.format("YYYY-MM-DD")] = { task:"", hours:0, leaveType:null };
    const payload = Object.keys(upd).map(dt=>({
      entryDate: dt, taskDetails: upd[dt].task||"", workingHours: upd[dt].hours??0, leaveType: upd[dt].leaveType||null,
    }));
    setLoading(true);
    postRequest("TimeSheet/InsertOrUpdateTimeSheet", payload).then(()=>{
      loadEntries(); setModal(false); setDeleteConfirm(false); ToastSuccess("Entry cleared");
    }).catch(console.error).finally(()=>setLoading(false));
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  // FIX: entry.hours is stored as a true decimal fraction (h + m/60, e.g. 2h3m = 2.05)
  // via hmToDecimal/sumHours — NOT the literal "HH.MM" encoding toMin/fromMin expect.
  // Summing with toMin silently misreads the minute digits (e.g. reads .05 as "5 min"
  // instead of converting the fraction back to 3 min) and fromMin then prints the raw
  // literal string with no unit formatting. decToMin + fmtMin match the actual encoding.
  const getWeekTotal = (week) => fmtMin(week.reduce((s,day)=>s+decToMin(entries[day.format("YYYY-MM-DD")]?.hours||0),0));
  const monthTotal   = fmtMin(Object.values(entries).reduce((s,e)=>s+decToMin(e.hours||0),0));

  // ── Excel export ───────────────────────────────────────────────────────────
  const handleExcelExport = () => {
    const rows = [];
    const daysInMonth = [];
    let day = currentMonth.startOf("month");
    while (day.isSame(currentMonth,"month")) { daysInMonth.push(day.clone()); day=day.add(1,"day"); }

    daysInMonth.forEach(d => {
      const iso = d.format("YYYY-MM-DD");
      const entry = entries[iso];
      const isWknd = isNonWorkingWeekendDay(d);
      const holiday = getHolidayForDay(d);
      const leave = getLeaveForDay(d);
      const isFuture = d.isAfter(today, "day");
      const { regularTasks: rt, overtimeTasks: ot } = parseAllTasks(entry?.task, entry?.hours);
      rows.push({
        "Date": d.format("DD-MM-YYYY"),
        "Day": d.format("dddd"),
        "Status": isWknd ? "Weekend"
                  : holiday ? "Holiday"
                    : leave ? "On Leave"
                      : isFuture ? ""
                        : entry?.hours > 0 ? "Present"
                          : "Absent",
        "Regular Hours": roundH(Math.min(entry?.hours || 0, MAX_REGULAR)),
        "Overtime Hours": roundH(Math.max((entry?.hours || 0) - MAX_REGULAR, 0)),
        "Total Hours": entry?.hours || 0,
        "Regular Tasks": rt.filter(t => t.name).map(t => `${t.name} (${t.hours}h)`).join("; "),
        "Overtime Tasks": ot.filter(t => t.name).map(t => `${t.name} (${t.hours}h)`).join("; "),
        "Leave Type": isWknd ? "" : (entry?.leaveType || leave?.leaveType || ""),
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");
    XLSX.writeFile(wb, `Timesheet_${(viewData?.employeeName||"My")}_${currentMonth.format("MMM-YYYY")}.xlsx`);
    ToastSuccess("Exported to Excel");
  };

  const legend = [
    { key:"filled",   label:"8 hrs" },
    { key:"overtime", label:"Overtime" },
    { key:"partial",  label:"<8 hrs" },
    { key:"empty",    label:"Pending" },
    { key:"leave",    label:"Leave" },
    { key:"holiday",  label:"Holiday" },
    { key:"pastlock", label:"Locked" },
  ];

  const breadItems = viewData
    ? [{ label:"Timesheet", link:"/timesheet" }, { label:`${viewData.employeeName} – ${viewMonth||""}` }]
    : [{ label:"Timesheet" }];

  const tooltipEntry   = tooltip.date ? entries[tooltip.date.format("YYYY-MM-DD")] : null;
  const tooltipHoliday = tooltip.date ? getHolidayForDay(tooltip.date) : null;
  const tooltipLeave   = tooltip.date && !isNonWorkingWeekendDay(tooltip.date) ? getLeaveForDay(tooltip.date)   : null;
  const tooltipStatus  = tooltip.date ? getCellStatus(tooltip.date)    : null;
  const tooltipS       = tooltipStatus ? STATUS[tooltipStatus] : null;
  const { regularTasks: ttReg, overtimeTasks: ttOt } = tooltipEntry
    ? parseAllTasks(tooltipEntry.task, tooltipEntry.hours) : { regularTasks:[], overtimeTasks:[] };
  const tooltipTasks   = [...ttReg, ...ttOt].filter(t=>t.name||t.hours);

  const currentEntry   = selDate ? entries[selDate.format("YYYY-MM-DD")] : null;
  const { regularTasks: savedReg, overtimeTasks: savedOt } = currentEntry
    ? parseAllTasks(currentEntry.task, currentEntry.hours) : { regularTasks:[], overtimeTasks:[] };
  const currentTaskList = [...savedReg.filter(t=>t.name||t.hours), ...savedOt.filter(t=>t.name||t.hours)];

  const regularPct     = Math.min((regularTotal / MAX_REGULAR) * 100, 100);
  const addRegDisabled = regularTotal >= MAX_REGULAR;

  // Whether overtime tasks exist (to gate regular task delete buttons)
  const hasOvertimeTasks = overtimeTasks.length > 0;

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
          {tabSwitcher}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button className="icon-btn" onClick={handleExcelExport} title="Export to Excel" style={{ color:"var(--teal)", width:38, height:38 }}>
            <FileSpreadsheet size={18} />
          </button>
          <div style={{ background:"var(--primary-ghost)", border:"1px solid var(--border)", borderRadius:10, padding:"8px 16px", textAlign:"center" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--primary)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Month Total</div>
            <div style={{ fontSize:20, fontWeight:900, color:"var(--primary)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{monthTotal}</div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card">
        <div className="card-header" style={{ flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {!isViewMode && <button className="calendar-nav-btn" onClick={()=>setCurrentMonth(c=>c.subtract(1,"month"))}><ChevronLeft size={16}/></button>}
            {isViewMode && <div style={{ width:30 }}/>}
            <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:17, fontWeight:800, color:"var(--text-primary)", minWidth:160, textAlign:"center" }}>
              {currentMonth.format("MMMM YYYY")}
            </span>
            {!isViewMode && (
              <button className="calendar-nav-btn"
                onClick={()=>{ if (currentMonth.isBefore(today,"month")) setCurrentMonth(c=>c.add(1,"month")); }}
                style={{ opacity:currentMonth.isBefore(today,"month")?1:0.3, cursor:currentMonth.isBefore(today,"month")?"pointer":"not-allowed" }}>
                <ChevronRight size={16}/>
              </button>
            )}
            {isViewMode && <div style={{ width:30 }}/>}
            {!canEdit && !isViewMode && (
              <span style={{ background: "#fff7ed", color: "#b45309", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 5 }}>
                <AlertCircle size={12} /> Locked
              </span>
            )}
            {canEdit && isPrevMonthGrace && (
              <span style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={12} /> Editable until {today.startOf("month").date(GRACE_DAYS).format("DD MMM")}
              </span>
            )}
            {canEdit && !isViewMode && locationMismatch && (
              <span style={{ background: "#fff1f2", color: "#be123c", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 5 }}>
                <AlertCircle size={12} /> Off-site — entry disabled
              </span>
            )}
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {legend.map(({ key, label }) => (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:3, background:STATUS[key].bg, border:`1.5px solid ${STATUS[key].border}` }}/>
                <span style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto", padding: "4px 8px 8px" }}>
          <table style={{ width: "100%", maxWidth: 880, margin: "0 auto", borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
            <colgroup>
              {/* 7 equal day columns + 1 slightly wider total column */}
              {Array.from({ length: 7 }).map((_, i) => (
                <col key={i} style={{ width: "12.2%" }} />
              ))}
              <col style={{ width: "13.5%" }} />
            </colgroup>
            <thead>
              <tr>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Week Total"].map(h => (
                  <th key={h} style={{
                    padding: "10px 6px",
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--bg)",
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map(day => {
                    const status = getCellStatus(day);
                    const s = STATUS[status] || STATUS.outside;
                    const entry = entries[day.format("YYYY-MM-DD")];
                    const holiday = getHolidayForDay(day);
                    const leave = getLeaveForDay(day);
                    const nonWorkingWeekend = isNonWorkingWeekendDay(day);
                    const isToday2 = day.format("YYYY-MM-DD") === today.format("YYYY-MM-DD");
                    const inCurrentMonth = day.month() === currentMonth.month();
                    const apiLeave = getLeaveForDay(day);
                    const apiHoliday = getHolidayForDay(day);
                    const clickable = canEdit
                      && !locationMismatch
                      && !["outside", "future", "approved", "pastlock"].includes(status)
                      && !apiHoliday
                      && !(apiLeave && !apiLeave.approverReason);
                    const hasTooltip = !!(entry?.task || holiday || leave);
                    const rawTotal = roundH(entry?.hours || 0);
                    const regHours = roundH(Math.min(rawTotal, MAX_REGULAR));
                    const otHours = roundH(Math.max(rawTotal - MAX_REGULAR, 0));
                    return (
                      <td key={day.format("YYYY-MM-DD")}
                        onClick={() => handleCellClick(day)}
                        onMouseEnter={e => { if (clickable) e.currentTarget.style.filter = "brightness(0.96)"; if (hasTooltip && inCurrentMonth) handleCellMouseEnter(e, day); }}
                        onMouseLeave={e => { e.currentTarget.style.filter = ""; handleCellMouseLeave(); }}
                        style={{
                          border: "1px solid var(--border)",
                          background: status === "outside" ? "transparent" : s.bg,
                          cursor: clickable ? "pointer" : "default",
                          verticalAlign: "middle",
                          padding: 0,
                          transition: "filter 0.15s",
                          boxShadow: isToday2 ? "inset 0 0 0 2px var(--primary)" : "none",
                          position: "relative",
                          overflow: "hidden",
                          height: 84,
                        }}
                      >
                        <div style={{ position: "relative", width: "100%", height: "100%" }}>
                          <div style={{ position: "absolute", inset: 0 }}>
                            {inCurrentMonth && (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "6px", gap: 3 }}>
                                <div style={{ position: "absolute", top: 5, left: 7, fontSize: 12, fontWeight: isToday2 ? 900 : 600, color: isToday2 ? "var(--primary)" : s.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{day.format("D")}</div>
                                {rawTotal > 0 && !holiday && !leave && (
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 4 }}>
                                    <span style={{ fontSize: 16, fontWeight: 900, color: s.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>
                                      {fmtHM(regHours)}
                                    </span>
                                    {otHours > 0 && (
                                      <span style={{ fontSize: 9, fontWeight: 800, color: "#1d4ed8", background: "#dbeafe", padding: "1px 5px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 2, maxWidth: "92%", overflow: "hidden", whiteSpace: "nowrap" }}>
                                        <Zap size={8} /> +{fmtHM(otHours)} OT
                                      </span>
                                    )}
                                  </div>
                                )}
                                {holiday && <div style={{ fontSize: 10, color: s.text, fontWeight: 700, textAlign: "center", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: "rgba(255,255,255,0.5)", padding: "2px 5px", borderRadius: 4 }}>{holiday.eventName}</div>}
                                {!nonWorkingWeekend && leave && !holiday && <div style={{ fontSize: 10, color: s.text, fontWeight: 700, textAlign: "center", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{leave.leaveType}</div>}
                                {!nonWorkingWeekend && !leave && !holiday && entry?.leaveType && <div style={{ fontSize: 10, color: s.text, fontWeight: 700, textAlign: "center", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.leaveType}</div>}
                                {status === "pastlock" && <div style={{ fontSize: 16, color: s.text, textAlign: "center" }}>🔒</div>}
                                {entry?.task && !holiday && !leave && <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.text, opacity: 0.5, flexShrink: 0 }} />}
                              </div>
                            )}
                            {!inCurrentMonth && <div style={{ padding: "5px 6px", color: "#e5e7eb", fontSize: 12, fontWeight: 500 }}>{day.format("D")}</div>}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td style={{
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    padding: 0,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 60, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 800, color: "var(--primary)" }}>
                      {getWeekTotal(week)}
                    </div>
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
            <div style={{ position:"absolute", bottom:-7, left:"50%", width:12, height:12, background:"var(--bg-card,#fff)", border:"1.5px solid var(--border)", borderTop:"none", borderLeft:"none", transform:"translateX(-50%) rotate(45deg)" }}/>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>{tooltip.date.format("ddd, DD MMM YYYY")}</div>
            {tooltipHoliday && <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}><div style={{ width:8, height:8, borderRadius:2, background:tooltipS?.bg, border:`1.5px solid ${tooltipS?.border}`, flexShrink:0 }}/><span style={{ fontSize:12, fontWeight:700, color:tooltipS?.text }}>{tooltipHoliday.eventName}</span></div>}
            {tooltipLeave && !tooltipHoliday && <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}><div style={{ width:8, height:8, borderRadius:2, background:tooltipS?.bg, border:`1.5px solid ${tooltipS?.border}`, flexShrink:0 }}/><span style={{ fontSize:12, fontWeight:700, color:tooltipS?.text }}>{tooltipLeave.leaveType}</span></div>}
            {tooltipEntry?.hours>0 && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:tooltipTasks.length?8:0 }}>
                <Clock size={11} color="var(--text-muted)"/>
                <span style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)" }}>
                  {fmtHM(roundH(Math.min(tooltipEntry.hours,MAX_REGULAR)))} regular
                  {tooltipEntry.hours>MAX_REGULAR && ` + ${fmtHM(roundH(tooltipEntry.hours-MAX_REGULAR))} OT`}
                </span>
              </div>
            )}
            {tooltipTasks.length>0 && (
              <>
                <div style={{ height:1, background:"var(--border)", margin:"8px 0" }}/>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:5 }}>Tasks</div>
                {tooltipTasks.map((t,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, color:"var(--text-primary)", lineHeight:1.8, gap:8 }}>
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</span>
                    {t.hours && <span style={{ fontWeight:800, flexShrink:0, color:"var(--primary)" }}>{fmtHM(t.hours)}</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Entry Modal ──────────────────────────────────────────────────────── */}
      {modal && selDate && ReactDOM.createPortal(
        <div
          onClick={()=>setModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            // FIX 1: Solid dark overlay so calendar never bleeds through
            background: "rgba(15, 15, 25, 0.72)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            // FIX 2: Toast renders above this overlay via its own portal/z-index;
            // keep modal at a high but not max z-index so ToastMsg (z:999999) sits above it
            zIndex: 99998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            overflowY: "auto",
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: 560,
              width: "100%",
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
              margin: "auto",
              position: "relative",
              // Ensure modal content sits above the backdrop
              zIndex: 99999,
            }}
            onClick={e=>e.stopPropagation()}
          >

            {/* Header */}
            <div className="modal-header">
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div className="modal-icon" style={{ background:"var(--primary-ghost)" }}><Clock size={20} color="var(--primary)"/></div>
                <div>
                  <div className="modal-title">Log Hours</div>
                  <div className="modal-subtitle">{selDate.format("dddd, DD MMM YYYY")}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {(currentEntry?.hours>0||currentEntry?.leaveType||currentEntry?.task) && (
                  <button className="icon-btn" title="Clear this entry" style={{ color:"var(--coral)" }} onClick={()=>setDeleteConfirm(true)}><Trash2 size={15}/></button>
                )}
                <button className="modal-close" onClick={()=>setModal(false)}><X size={16}/></button>
              </div>
            </div>

            {/* Saved Tasks Preview */}
            {currentTaskList.length>0 && !deleteConfirm && (
              <div style={{ margin:"0 24px 16px" }}>
                <div style={{ borderRadius:12, border:"1px solid var(--border)", overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 14px", background:"var(--primary-ghost)", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <CheckCircle2 size={13} color="var(--primary)"/>
                      <span style={{ fontSize:11, fontWeight:700, color:"var(--primary)", textTransform:"uppercase", letterSpacing:"0.06em" }}>Saved Entry</span>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      {savedReg.filter(t=>t.name).length>0 && (
                        <span style={{ fontSize:11, fontWeight:700, color:"var(--primary)", background:"white", border:"1.5px solid var(--primary)", padding:"1px 9px", borderRadius:20 }}>
                          {fmtHM(sumHours(savedReg.filter(t=>t.name)))} regular
                        </span>
                      )}
                      {savedOt.filter(t=>t.name).length>0 && (
                        <span style={{ fontSize:11, fontWeight:700, color:"#1d4ed8", background:"#dbeafe", border:"1.5px solid #93c5fd", padding:"1px 9px", borderRadius:20, display:"flex", alignItems:"center", gap:4 }}>
                          <Zap size={10}/>{fmtHM(sumHours(savedOt.filter(t=>t.name)))} OT
                        </span>
                      )}
                    </div>
                  </div>
                  {currentTaskList.map((t,i)=>(
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 60px", alignItems:"center", padding:"8px 14px", borderTop:i===0?"none":"1px solid var(--border)", background:i%2===0?"var(--bg-card,#fff)":"var(--bg,#fafafa)", gap:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--primary)", opacity:0.45, flexShrink:0 }}/>
                        <span style={{ fontSize:13, color:"var(--text-primary)", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</span>
                      </div>
                      <span style={{ fontSize:13, fontWeight:800, color:"var(--primary)", textAlign:"right", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{fmtHM(t.hours)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delete confirm */}
            {deleteConfirm && (
              <div style={{ margin:"12px 24px", padding:"12px 14px", background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <AlertCircle size={16} color="var(--coral)"/>
                  <span style={{ fontSize:13, fontWeight:600, color:"#be123c" }}>Clear this day's entry?</span>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>setDeleteConfirm(false)} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid var(--border)", background:"white", cursor:"pointer", fontSize:12, fontWeight:600 }}>Cancel</button>
                  <button onClick={clearEntry} style={{ padding:"4px 10px", borderRadius:6, border:"none", background:"var(--coral)", color:"white", cursor:"pointer", fontSize:12, fontWeight:700 }}>Clear</button>
                </div>
              </div>
            )}

            <div className="modal-body">

              {/* ── Hours summary bar ── */}
              <div style={{ display:"flex", gap:10, marginBottom:18 }}>
                <div style={{ flex:1, background:"var(--primary-ghost)", border:"1.5px solid var(--primary)", borderRadius:12, padding:"10px 14px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"var(--primary)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Regular Hours</div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                    <span style={{ fontSize:22, fontWeight:900, color:"var(--primary)", fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1 }}>{fmtHM(regularTotal)}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)" }}>/ {MAX_REGULAR}h</span>
                  </div>
                  <div style={{ marginTop:6, height:4, borderRadius:99, background:"rgba(0,0,0,0.08)", overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:99, width:`${regularPct}%`, background:regularOver?"var(--coral)":"var(--primary)", transition:"width 0.3s" }}/>
                  </div>
                </div>
                <div style={{ flex:1, background:overtimeTotal>0?"#eff6ff":"var(--bg)", border:`1.5px solid ${overtimeTotal>0?"#93c5fd":"var(--border)"}`, borderRadius:12, padding:"10px 14px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:overtimeTotal>0?"#1d4ed8":"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4, display:"flex", alignItems:"center", gap:5 }}>
                    <Zap size={10}/> Overtime Hours
                  </div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                    <span style={{ fontSize:22, fontWeight:900, color:overtimeTotal>0?"#1d4ed8":"var(--text-muted)", fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1 }}>{fmtHM(overtimeTotal)}</span>
                  </div>
                  <div style={{ marginTop:6, fontSize:11, color:overtimeTotal>0?"#1d4ed8":"var(--text-muted)", fontWeight:600 }}>
                    {overtimeTotal>0 ? `Total: ${fmtHM(grandTotal)} logged` : "No overtime logged"}
                  </div>
                </div>
              </div>

              {/* ── REGULAR TASKS SECTION ── */}
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <label className="fc-label" style={{ margin:0, display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ display:"inline-flex", width:18, height:18, borderRadius:5, background:"var(--primary)", color:"#fff", fontSize:10, fontWeight:800, alignItems:"center", justifyContent:"center" }}>R</span>
                    Regular Tasks <span className="req">*</span>
                    <span style={{ fontSize:10, fontWeight:600, color:"var(--text-muted)", textTransform:"none", letterSpacing:"normal" }}>(max {MAX_REGULAR}h)</span>
                  </label>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 128px 36px", gap:8, marginBottom:6, padding:"0 2px" }}>
                  <span style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Task Name <span style={{ color:"var(--coral)" }}>*</span></span>
                  <div style={{ display:"flex", gap:4 }}>
                    <span style={{ flex:1, fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"center" }}>HH</span>
                    <span style={{ flex:1, fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"center" }}>MM</span>
                  </div>
                  <span/>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {regularTasks.map((task, idx) => {
                    const removable = canRemoveRegTask(idx);
                    // ── FIX: cap this row's HH/MM options to whatever's left of the
                    // 8h regular budget once every OTHER regular task's hours are
                    // subtracted out (e.g. task 1 = 4h10m -> task 2 maxes at 3h50m).
                    const otherRegMin  = regularTasks.reduce((s,t,i)=> i===idx ? s : s + decToMin(t.hours), 0);
                    const remainingMin = Math.max(0, MAX_REGULAR*60 - otherRegMin);
                    const maxHour      = Math.floor(remainingMin/60);
                    const maxMinAtMax  = remainingMin % 60;
                    const curHH        = hhFromDecimal(task.hours);
                    const curMM        = mmFromDecimal(task.hours);
                    const hhOptions    = Array.from({ length: maxHour+1 }, (_,i)=>i);
                    const mmOptions    = curHH>=maxHour ? Array.from({ length: maxMinAtMax+1 }, (_,i)=>i) : MINUTE_OPTIONS;
                    return (
                      <div key={idx} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 128px 36px", gap:8, alignItems:"center" }}>
                          <input
                            className={`fc-input${nameErrors.reg[idx]?" fc-input-error":""}`}
                            style={{ fontSize:13 }}
                            placeholder="e.g. Code review, Bug fix…"
                            value={task.name}
                            onChange={e=>updateTask("reg",idx,"name",e.target.value)}
                          />
                          <div style={{ display:"flex", gap:4 }}>
                            <DurationDropdown
                              value={curHH}
                              options={hhOptions}
                              formatLabel={h=>`${h}h`}
                              onChange={h=>{
                                // Clamp minutes down if switching to the max-hour row leaves less room than currently selected
                                const capAtH = h===maxHour ? maxMinAtMax : 59;
                                updateTask("reg",idx,"hours",hmToDecimal(h, Math.min(curMM, capAtH)));
                              }}
                            />
                            <DurationDropdown
                              value={curMM}
                              options={mmOptions}
                              formatLabel={m=>`${String(m).padStart(2,"0")}m`}
                              onChange={m=>updateTask("reg",idx,"hours",hmToDecimal(curHH, m))}
                            />
                          </div>
                          {/*
                            FIX 3: Hide the X button entirely when overtime tasks exist and
                            removing this row would drop regular below MAX_REGULAR.
                            Also hide when it's the last remaining row.
                            Show a spacer div to preserve grid alignment.
                          */}
                          {removable ? (
                            <button
                              type="button"
                              onClick={()=>removeTask("reg",idx)}
                              title="Remove task"
                              style={{
                                background: "none",
                                border: "1.5px solid #fecdd3",
                                borderRadius: 8,
                                cursor: "pointer",
                                color: "var(--coral)",
                                width: 36,
                                height: 42,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                transition: "all 0.15s",
                              }}
                            >
                              <X size={14}/>
                            </button>
                          ) : (
                            // Spacer keeps the grid column intact
                            <div style={{ width:36, height:42, flexShrink:0 }}/>
                          )}
                        </div>
                        {nameErrors.reg[idx] && (
                          <div style={{ display:"flex", alignItems:"center", gap:4, paddingLeft:2 }}>
                            <AlertCircle size={11} color="var(--coral)"/>
                            <span style={{ fontSize:11, color:"var(--coral)", fontWeight:600 }}>Task name is required</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Inline hint when overtime is active and regular is full */}
                {hasOvertimeTasks && regularTotal >= MAX_REGULAR && (
                  <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:6, padding:"6px 10px", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8 }}>
                    <AlertCircle size={12} color="#3b82f6"/>
                    <span style={{ fontSize:11, fontWeight:600, color:"#1d4ed8" }}>
                      Delete is hidden — regular tasks must stay at {MAX_REGULAR}h while overtime is logged
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={addRegDisabled}
                  onClick={()=>addTask("reg")}
                  style={{ marginTop:10, padding:"8px 14px", borderRadius:9, border:`1.5px dashed ${addRegDisabled?"var(--border)":"var(--primary)"}`, background:addRegDisabled?"#f9fafb":"var(--primary-ghost)", color:addRegDisabled?"#d1d5db":"var(--primary)", fontSize:12, fontWeight:700, cursor:addRegDisabled?"not-allowed":"pointer", width:"100%", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
                >
                  <Plus size={13}/>
                  {addRegDisabled ? `${MAX_REGULAR}h limit reached` : "Add Regular Task"}
                </button>
              </div>

              {/* ── Overtime prompt banner ── */}
              {regularTotal >= MAX_REGULAR && !showOvertime && !dayMode && (
                <div style={{ marginBottom:16, padding:"12px 16px", background:"#eff6ff", border:"1.5px solid #93c5fd", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Zap size={16} color="#1d4ed8"/>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1d4ed8" }}>Did you work beyond {MAX_REGULAR} hours?</div>
                      <div style={{ fontSize:11, color:"#3b82f6", marginTop:2 }}>Log remaining hours as overtime to keep records accurate.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={()=>{ setShowOvertime(true); if(overtimeTasks.length===0) setOvertimeTasks([{ name:"", hours:"" }]); }}
                    style={{ padding:"7px 14px", borderRadius:8, border:"1.5px solid #93c5fd", background:"white", color:"#1d4ed8", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5, transition:"all 0.15s" }}
                  >
                    <Zap size={12}/> Add Overtime
                  </button>
                </div>
              )}

              {/* ── OVERTIME TASKS SECTION ── */}
              {showOvertime && (
                <div style={{ marginBottom:16, padding:"14px 16px", background:"#f0f9ff", border:"1.5px solid #93c5fd", borderRadius:14 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                    <label className="fc-label" style={{ margin:0, display:"flex", alignItems:"center", gap:6, color:"#1d4ed8" }}>
                      <span style={{ display:"inline-flex", width:18, height:18, borderRadius:5, background:"#1d4ed8", color:"#fff", fontSize:10, fontWeight:800, alignItems:"center", justifyContent:"center" }}><Zap size={10}/></span>
                      Overtime Tasks
                      <span style={{ fontSize:10, fontWeight:600, color:"#3b82f6", textTransform:"none", letterSpacing:"normal" }}>({grandTotal}/24h used)</span>
                    </label>
                    <button
                      type="button"
                      onClick={()=>{ setShowOvertime(false); setOvertimeTasks([]); }}
                      style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:600, padding:"2px 6px" }}
                    >
                      <X size={12}/> Remove OT
                    </button>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 128px 36px", gap:8, marginBottom:6, padding:"0 2px" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:"#3b82f6", textTransform:"uppercase", letterSpacing:"0.05em" }}>OT Task Name <span style={{ color:"var(--coral)" }}>*</span></span>
                    <div style={{ display:"flex", gap:4 }}>
                      <span style={{ flex:1, fontSize:10, fontWeight:700, color:"#3b82f6", textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"center" }}>HH</span>
                      <span style={{ flex:1, fontSize:10, fontWeight:700, color:"#3b82f6", textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"center" }}>MM</span>
                    </div>
                    <span/>
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {overtimeTasks.map((task,idx)=>{
                      // ── FIX: cap this OT row's HH/MM options to whatever's left of the
                      // 24h total budget once regular hours + every OTHER OT row are
                      // subtracted out (mirrors the regular-task capping above).
                      const otherOtMin   = overtimeTasks.reduce((s,t,i)=> i===idx ? s : s + decToMin(t.hours), 0);
                      const remainingMin = Math.max(0, 24*60 - decToMin(regularTotal) - otherOtMin);
                      const maxHour      = Math.min(16, Math.floor(remainingMin/60));
                      const maxMinAtMax  = maxHour===16 ? 0 : remainingMin % 60;
                      const curHH        = hhFromDecimal(task.hours);
                      const curMM        = mmFromDecimal(task.hours);
                      const hhOptions    = Array.from({ length: maxHour+1 }, (_,i)=>i);
                      const mmOptions    = curHH>=maxHour ? Array.from({ length: maxMinAtMax+1 }, (_,i)=>i) : MINUTE_OPTIONS;
                      return (
                      <div key={idx} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 128px 36px", gap:8, alignItems:"center" }}>
                          <input
                            className={`fc-input fc-input-ot${nameErrors.ot[idx]?" fc-input-error":""}`}
                            style={{ fontSize:13 }}
                            placeholder="e.g. Production hotfix, Client call…"
                            value={task.name}
                            onChange={e=>updateTask("ot",idx,"name",e.target.value)}
                          />
                          <div style={{ display:"flex", gap:4 }}>
                            <DurationDropdown
                              value={curHH}
                              options={hhOptions}
                              formatLabel={h=>`${h}h`}
                              onChange={h=>{
                                const capAtH = h===maxHour ? maxMinAtMax : 59;
                                updateTask("ot",idx,"hours",hmToDecimal(h, Math.min(curMM, capAtH)));
                              }}
                              ot
                            />
                            <DurationDropdown
                              value={curMM}
                              options={mmOptions}
                              formatLabel={m=>`${String(m).padStart(2,"0")}m`}
                              onChange={m=>updateTask("ot",idx,"hours",hmToDecimal(curHH, m))}
                              ot
                            />
                          </div>
                          <button
                            type="button"
                            onClick={()=>removeTask("ot",idx)}
                            title="Remove"
                            style={{ background:"none", border:"1.5px solid #bfdbfe", borderRadius:8, cursor:"pointer", color:"#3b82f6", width:36, height:42, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}
                          >
                            <X size={14}/>
                          </button>
                        </div>
                        {nameErrors.ot[idx] && (
                          <div style={{ display:"flex", alignItems:"center", gap:4, paddingLeft:2 }}>
                            <AlertCircle size={11} color="var(--coral)"/>
                            <span style={{ fontSize:11, color:"var(--coral)", fontWeight:600 }}>Task name is required</span>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={grandTotal>=24}
                    onClick={()=>addTask("ot")}
                    style={{ marginTop:10, padding:"8px 14px", borderRadius:9, border:`1.5px dashed ${grandTotal>=24?"#bfdbfe":"#3b82f6"}`, background:grandTotal>=24?"#f0f9ff":"white", color:grandTotal>=24?"#93c5fd":"#1d4ed8", fontSize:12, fontWeight:700, cursor:grandTotal>=24?"not-allowed":"pointer", width:"100%", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
                  >
                    <Plus size={13}/>
                    {grandTotal>=24 ? "24h total limit reached" : "Add Overtime Task"}
                  </button>
                </div>
              )}

              {/* ── Day Type (only when hours = 0) ── */}
              {grandTotal===0 && (
                <div style={{ marginBottom:14 }}>
                  <label className="fc-label">Day Type <span className="req">*</span></label>
                  <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                    {[
                      { val:"leave",   label:"On Leave",  icon:"🏖️" },
                      { val:"holiday", label:"Holiday",   icon:"🎉" },
                    ].map(({ val, label, icon })=>(
                      <button key={val} type="button" onClick={()=>{ setDayMode(val); setLeaveType(""); setManualHolidayName(""); }}
                        style={{ flex:1, padding:"10px 14px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center", gap:6, border:`1.5px solid ${dayMode===val?"var(--primary)":"var(--border)"}`, background:dayMode===val?"var(--primary-ghost)":"var(--bg)", color:dayMode===val?"var(--primary)":"var(--text-secondary)", boxShadow:dayMode===val?"0 0 0 3px var(--primary-ghost)":"none" }}>
                        <span style={{ fontSize:15 }}>{icon}</span> {label}
                      </button>
                    ))}
                  </div>

                  {dayMode==="leave" && (
                    <>
                      <select className="fc-input" value={leaveType} onChange={e=>setLeaveType(e.target.value)}
                        style={{ borderColor:!leaveType?"var(--coral)":undefined, boxShadow:!leaveType?"0 0 0 3px rgba(239,68,68,0.1)":undefined }}>
                        <option value="">Select leave type…</option>
                        {["Sick Leave","Casual Leave","Compensatory Off","Maternity Leave","Paternity Leave","Other Leave"].map(o=>(
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                      {!leaveType && (
                        <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:5 }}>
                          <AlertCircle size={11} color="var(--coral)"/>
                          <span style={{ fontSize:11, color:"var(--coral)", fontWeight:600 }}>Please select a leave type</span>
                        </div>
                      )}
                    </>
                  )}

                  {dayMode==="holiday" && (
                    <>
                      <input className={`fc-input${!manualHolidayName.trim()?" fc-input-error":""}`}
                        placeholder="e.g. Diwali, Christmas, Pongal…"
                        value={manualHolidayName} onChange={e=>setManualHolidayName(e.target.value)}/>
                      {!manualHolidayName.trim() && (
                        <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:5 }}>
                          <AlertCircle size={11} color="var(--coral)"/>
                          <span style={{ fontSize:11, color:"var(--coral)", fontWeight:600 }}>Holiday name is required</span>
                        </div>
                      )}
                    </>
                  )}

                  {!dayMode && (
                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                      <AlertCircle size={11} color="var(--coral)"/>
                      <span style={{ fontSize:11, color:"var(--coral)", fontWeight:600 }}>Since hours is 0, please select a day type above</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Copy To ── */}
              {!dayMode && (
                <div>
                  <label className="fc-label" style={{ display:"flex", alignItems:"center", gap:6 }}><Copy size={12}/> Copy To</label>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                    {[
                      { val:"",       label:"This day" },
                      { val:"week",   label:"Whole week" },
                      { val:"month",  label:"Whole month" },
                      { val:"custom", label:"Pick days" },
                    ].map(({ val, label })=>(
                      <button key={val} type="button" onClick={()=>setCopyOpt(val)}
                        style={{ padding:"6px 12px", borderRadius:8, border:`1.5px solid ${copyOpt===val?"var(--primary)":"var(--border)"}`, background:copyOpt===val?"var(--primary-ghost)":"var(--bg)", color:copyOpt===val?"var(--primary)":"var(--text-secondary)", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {copyOpt==="custom" && (
                    <div style={{ marginTop:10 }}>
                      <label className="fc-label">Select days</label>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        {allDays.filter(dd=>{
                          if (dd.month()!==currentMonth.month()) return false;
                          if (dd.isAfter(today,"day")) return false;
                          if (getHolidayForDay(dd)) return false;
                          if (getLeaveForDay(dd)&&!getLeaveForDay(dd)?.approverReason) return false;
                          return true;
                        }).map(dd=>{
                          const iso  = dd.format("YYYY-MM-DD");
                          const isSel= otherDays.find(x=>x.isSame(dd,"day"));
                          return (
                            <button key={iso} type="button"
                              onClick={()=>setOtherDays(prev=>prev.find(x=>x.isSame(dd,"day"))?prev.filter(x=>!x.isSame(dd,"day")):[...prev,dd])}
                              style={{ width:32, height:32, borderRadius:7, border:`1.5px solid ${isSel?"var(--primary)":"var(--border)"}`, background:isSel?"var(--primary)":"var(--bg)", color:isSel?"white":"var(--text-secondary)", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                              {dd.format("D")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(false)}><X size={14}/> Cancel</button>
              <button className="btn btn-primary" onClick={saveEntry}><Save size={14}/> Save Entry</button>
            </div>
          </div>
        </div>
        , document.body
      )}

      <style>{`
        .fc-label { display:block; font-family:'Plus Jakarta Sans',sans-serif; font-size:11.5px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:7px; }
        .req { color:var(--coral); margin-left:2px; }
        .fc-input { width:100%; padding:10px 13px; border-radius:10px; border:1.5px solid var(--border); background:var(--bg); font-family:'DM Sans',sans-serif; font-size:13.5px; color:var(--text-primary); outline:none; transition:all 0.2s; box-sizing:border-box; }
        .fc-input:focus { border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-ghost); background:#fff; }
        .fc-input-ot { border-color:#bfdbfe !important; background:#f8fbff !important; }
        .fc-input-ot:focus { border-color:#3b82f6 !important; box-shadow:0 0 0 3px rgba(59,130,246,0.12) !important; }
        .fc-input-error { border-color:var(--coral) !important; box-shadow:0 0 0 3px rgba(239,68,68,0.1) !important; }
        .fc-input-error:focus { border-color:var(--coral) !important; }
        textarea.fc-input { resize:vertical; min-height:70px; line-height:1.6; }
        select.fc-input { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; }
      `}</style>
    </div>
  );
}