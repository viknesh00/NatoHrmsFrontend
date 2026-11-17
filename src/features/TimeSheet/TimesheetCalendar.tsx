import WorkflowDialog from "../../components/WorkflowDialog";
import { cn } from "cn";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { NativeSelect } from "../../components/ui/native-select";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import customParseFormat from "dayjs/plugin/customParseFormat"; // FIX: needed so dayjs(str, format) parses deterministically instead of falling back to the native Date constructor (which is browser/engine-dependent and returned "Invalid Date" on Safari/iOS for "Aug-2026" while working fine on desktop Chrome)
 // FIX: needed so dayjs(str, format) parses deterministically instead of falling back to the native Date constructor (which is browser/engine-dependent and returned "Invalid Date" on Safari/iOS for "Aug-2026" while working fine on desktop Chrome)
import { ChevronLeft, ChevronRight, X, Save, Clock, Copy, FileSpreadsheet, Trash2, AlertCircle, ClipboardList, Plus, CheckCircle2, Zap, LockKeyhole, Palmtree, CalendarDays, Pencil, BarChart3 } from "lucide-react";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import { useLocation } from "react-router-dom";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { ToastSuccess, ToastError } from "../../shared/services/ToastMsg";
import { getCookie } from "../../auth/Cookies";
dayjs.extend(isoWeek);
dayjs.extend(customParseFormat); // FIX: registers the format-based parser used below

const MAX_REGULAR = 8;

const roundH = (n) => Math.round((Number(n) || 0) * 100) / 100;

const STATUS: Record<string, any> = {
  filled:   { bg: "var(--success-subtle)", border: "var(--success-border)", text: "var(--success)",  label: "8 hrs" },
  overtime: { bg: "var(--primary-ghost)", border: "var(--border-strong)", text: "var(--primary-dark)",  label: "Overtime" },
  partial:  { bg: "var(--warning-subtle)", border: "var(--warning-border)", text: "var(--warning)",  label: "< 8 hrs" },
  empty:    { bg: "var(--warning-subtle)", border: "var(--warning-border)", text: "var(--warning)",  label: "Pending" },
  leave:    { bg: "var(--primary-ghost)", border: "var(--border-strong)", text: "var(--primary)",  label: "On Leave" },
  approved: { bg: "var(--success-subtle)", border: "var(--success-border)", text: "var(--success)",  label: "Leave ✓" },
  holiday:  { bg: "var(--error-subtle)", border: "var(--error-border)", text: "var(--error)",  label: "Holiday" },
  weekend:  { bg: "var(--muted)", border: "var(--border)", text: "var(--text-muted)", label: "Weekend" },
  future:   { bg: "var(--muted)", border: "var(--border)", text: "var(--border-strong)", label: "Future" },
  pastlock: { bg: "var(--muted)", border: "var(--border-strong)", text: "var(--muted-foreground)",  label: "Locked" },
  outside:  { bg: "transparent", border: "transparent", text: "var(--border)", label: "" },
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  filled: CheckCircle2,
  overtime: Zap,
  partial: Clock,
  empty: AlertCircle,
  leave: Palmtree,
  approved: CheckCircle2,
  holiday: CalendarDays,
  weekend: CalendarDays,
  future: CalendarDays,
  pastlock: LockKeyhole,
};

// Heatmap intensity is derived from saved working hours. Special calendar
// states keep their semantic colors, so holidays and leave remain distinct.
const getHeatmapColor = (status: string, hours: number) => {
  if (["holiday", "leave", "approved", "weekend", "future", "pastlock", "outside"].includes(status)) {
    return STATUS[status]?.bg || STATUS.outside.bg;
  }
  if (hours <= 0) return "var(--card)";
  if (hours < 4) return "color-mix(in srgb, var(--warning) 13%, var(--card))";
  if (hours < MAX_REGULAR) return "color-mix(in srgb, var(--primary) 16%, var(--card))";
  if (hours === MAX_REGULAR) return "color-mix(in srgb, var(--success) 20%, var(--card))";
  return "color-mix(in srgb, var(--primary) 30%, var(--card))";
};

function StatusIconForDay({ status }: { status: string }) {
  const Icon = STATUS_ICONS[status];
  return Icon ? <Icon size={13} aria-hidden="true" style={{ color: STATUS[status]?.text }} /> : null;
}

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

// Radix Select keeps duration options reachable inside the modal focus boundary.
function DurationDropdown({ value, options, formatLabel, onChange, ot }: Record<string, any>) {
  return (
    <Select value={String(value)} onValueChange={next => onChange(options.find(option => String(option) === next))}>
      <SelectTrigger aria-label={formatLabel(0).endsWith("m") ? "Minutes" : "Hours"} className="duration-trigger w-full min-w-0" style={{ background: ot ? "var(--muted)" : "var(--card)" }}>
        <SelectValue>{formatLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-48">
        {options.map(option => <SelectItem key={option} value={String(option)}>{formatLabel(option)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function TimesheetCalendar({tabSwitcher}: Record<string, any>) {
  const location  = useLocation();
  const { viewData, selectedMonth: viewMonth } = location.state || {};

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (!viewMonth) return dayjs();
    const parsed = dayjs(viewMonth, "MMM-YYYY", true);
    return parsed.isValid() ? parsed : dayjs();
  });

  const [calendarView, setCalendarView] = useState("month");
  const [weekIndex, setWeekIndex] = useState(0);

  useEffect(() => {
    const first = currentMonth.startOf("month").startOf("isoWeek");
    const anchor = currentMonth.isSame(dayjs(), "month") ? dayjs() : currentMonth.startOf("month");
    setWeekIndex(Math.floor(anchor.diff(first, "day") / 7));
  }, [currentMonth]);

  const [entries,      setEntries]      = useState<Record<string, any>>({});
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
const includeSaturday = getCookie("includeSaturday") === "true";
const includeSunday   = getCookie("includeSunday")   === "true";

  const geoFenceEnabled  = getCookie("geoFenceEnabled") === "true";
  const networkLocation  = (getCookie("networkLocation")  || "").trim();
  const workLocationCity = (getCookie("workLocationCity") || "").trim();

  const locationMismatch = geoFenceEnabled && networkLocation && workLocationCity && networkLocation.toLowerCase() !== workLocationCity.toLowerCase();

  // ── Grace period config ─────────────────────────────────────────────────
  const GRACE_DAYS = 15; // previous month stays editable for this many days into the new month
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

  const isTaskIncomplete = (t) => !t.name.trim() || !(parseFloat(t.hours) > 0);

  const addTask = (kind) => {
    if (kind === "reg") {
      if (regularTasks.some(isTaskIncomplete)) {
        ToastError("Please fill in task name and hours before adding another task");
        return;
      }
      if (regularTotal >= MAX_REGULAR) { ToastError(`Regular hours full (${MAX_REGULAR}h) — use Overtime`); return; }
      setRegularTasks(p => [...p, { name: "", hours: "" }]);
    } else {
      if (overtimeTasks.some(isTaskIncomplete)) {
        ToastError("Please fill in task name and hours before adding another task");
        return;
      }
      if (grandTotal >= 24) { ToastError("Total 24h limit reached"); return; }
      setOvertimeTasks(p => [...p, { name: "", hours: "" }]);
    }
  };

  const otIncomplete = overtimeTasks.some(isTaskIncomplete);
  const addOtDisabled = grandTotal >= 24 || otIncomplete;

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
  const handleExcelExport = async () => {
    const XLSX = await import("xlsx");
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

  const statusLegend = [
    { key:"filled",   label:"8 hrs" },
    { key:"overtime", label:"Overtime" },
    { key:"partial",  label:"<8 hrs" },
    { key:"empty",    label:"Pending" },
    { key:"leave",    label:"Leave" },
    { key:"holiday",  label:"Holiday" },
    { key:"pastlock", label:"Locked" },
  ];
  const heatmapLegend = [
    { id: "no-hours", key: "empty", label: "No hours", bg: "var(--card)", border: "var(--border)" },
    { id: "short-hours", key: "partial", label: "Under 4 hrs", bg: "color-mix(in srgb, var(--warning) 13%, var(--card))", border: "var(--warning-border)" },
    { id: "regular-hours", key: "partial", label: "4–8 hrs", bg: "color-mix(in srgb, var(--primary) 16%, var(--card))", border: "var(--border)" },
    { id: "complete-hours", key: "filled", label: "8 hrs", bg: "color-mix(in srgb, var(--success) 20%, var(--card))", border: "var(--success-border)" },
    { id: "overtime-hours", key: "overtime", label: "Over 8 hrs", bg: "color-mix(in srgb, var(--primary) 30%, var(--card))", border: "var(--border-strong)" },
    { id: "leave-days", key: "leave", label: "Leave", bg: STATUS.leave.bg, border: STATUS.leave.border },
    { id: "holiday-days", key: "holiday", label: "Holiday", bg: STATUS.holiday.bg, border: STATUS.holiday.border },
  ];
  const legend = calendarView === "heatmap" ? heatmapLegend : statusLegend;

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
  const regIncomplete = regularTasks.some(isTaskIncomplete);
  const addRegDisabled = regularTotal >= MAX_REGULAR || regIncomplete;

  // Whether overtime tasks exist (to gate regular task delete buttons)
  const hasOvertimeTasks = overtimeTasks.length > 0;

  return (
    <div className="timesheet-calendar-page">
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
        <div className="flex items-center gap-[12px]" >
          <Button variant="ghost" type="button" className={cn("icon-btn", "text-[var(--teal)] w-[38px] h-[38px]")} onClick={handleExcelExport} title="Export to Excel" >
            <FileSpreadsheet size={18} />
          </Button>
          <div className="bg-[var(--primary-ghost)] p-[8px_16px] text-center" style={{border:"1px solid var(--border)", borderRadius:"var(--radius)"}}>
            <div className="text-[12px] font-semibold text-primary uppercase tracking-[0.05em]" >Month Total</div>
            <div className="text-[20px] font-semibold text-primary" style={{fontFamily:"var(--ui-font-heading)"}}>{monthTotal}</div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card timesheet-calendar-card">
        <div className={cn("card-header", "timesheet-calendar-header flex-wrap gap-[12px]")} >
          <div className="timesheet-month-controls flex items-center gap-[12px]" >
            {!isViewMode && <Button variant="outline" type="button" aria-label="Previous month" className="calendar-nav-btn" onClick={()=>setCurrentMonth(c=>c.subtract(1,"month"))}><ChevronLeft size={16}/></Button>}
            {isViewMode && <div className="w-[30px]" />}
            <span className="timesheet-month-label text-[18px] font-semibold text-[var(--text-primary)] min-w-[160px] text-center" style={{fontFamily:"var(--ui-font-heading)"}}>
              {currentMonth.format("MMMM YYYY")}
            </span>
            {!isViewMode && (
              <Button variant="outline" type="button" aria-label="Next month" disabled={!currentMonth.isBefore(today,"month")} className="calendar-nav-btn"
                onClick={()=>{ if (currentMonth.isBefore(today,"month")) setCurrentMonth(c=>c.add(1,"month")); }}
                style={{ opacity:currentMonth.isBefore(today,"month")?1:0.3, cursor:currentMonth.isBefore(today,"month")?"pointer":"not-allowed" }}>
                <ChevronRight size={16}/>
              </Button>
            )}
            {isViewMode && <div className="w-[30px]" />}
            {!canEdit && !isViewMode && (
              <span className="bg-warning-subtle text-warning text-[12px] font-semibold p-[4px_12px] flex items-center gap-[4px]" style={{borderRadius: "var(--radius)"}}>
                <AlertCircle size={12} /> Locked
              </span>
            )}
            {canEdit && isPrevMonthGrace && (
              <span className="bg-[var(--primary-ghost)] text-[var(--primary-dark)] text-[12px] font-semibold p-[4px_12px] flex items-center gap-[4px]" style={{borderRadius: "var(--radius)"}}>
                <Clock size={12} /> Editable until {today.startOf("month").date(GRACE_DAYS).format("DD MMM")}
              </span>
            )}
            {canEdit && !isViewMode && locationMismatch && (
              <span className="bg-error-subtle text-error text-[12px] font-semibold p-[4px_12px] flex items-center gap-[4px]" style={{borderRadius: "var(--radius)"}}>
                <AlertCircle size={12} /> Off-site — entry disabled
              </span>
            )}
          </div>
          <div className="calendar-toolbar">
            {!isViewMode && <Button variant="outline" className="timesheet-today-action" onClick={() => setCurrentMonth(dayjs())}><CalendarDays size={15} aria-hidden="true" /> Today</Button>}
            <Tabs value={calendarView} onValueChange={setCalendarView}>
              <TabsList className="calendar-view-switch" aria-label="Calendar view">
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="heatmap"><BarChart3 size={14} aria-hidden="true" /> Hours</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="timesheet-status-legend flex gap-[12px] flex-wrap w-[100%]" aria-label="Timesheet status legend">
            {legend.map(({ id, key, label, bg, border }: Record<string, any>, index: number) => (
              <div key={id || `${key}-${index}`} className="timesheet-status-legend-item">
                {calendarView === "heatmap" && <span className="timesheet-legend-swatch" style={{ background: bg || STATUS[key].bg, borderColor: border || STATUS[key].border }} aria-hidden="true" />}
                {(() => { const Icon = STATUS_ICONS[key]; return Icon ? <Icon size={14} aria-hidden="true" style={{ color: STATUS[key].text }} /> : null; })()}
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

          {calendarView === "week" && <div className={cn("calendar-help", "justify-between items-center")} >
            <Button variant="outline" size="icon" aria-label="Previous week" disabled={weekIndex <= 0} onClick={() => setWeekIndex(i => i - 1)}><ChevronLeft size={16}/></Button>
            <span>{weeks[weekIndex]?.[0].format("DD MMM")} – {weeks[weekIndex]?.[6].format("DD MMM YYYY")}</span>
            <Button variant="outline" size="icon" aria-label="Next week" disabled={weekIndex >= weeks.length - 1} onClick={() => setWeekIndex(i => i + 1)}><ChevronRight size={16}/></Button>
          </div>}
          {calendarView === "agenda" ? <div className="calendar-agenda">
            {allDays.filter(day => day.isSame(currentMonth, "month")).map(day => {
              const iso = day.format("YYYY-MM-DD");
              const entry = entries[iso];
              const holiday = getHolidayForDay(day);
              const leave = getLeaveForDay(day);
              const status = getCellStatus(day);
              const tasks = parseAllTasks(entry?.task, entry?.hours);
              const taskSummary = [...tasks.regularTasks, ...tasks.overtimeTasks].map(task => task.name).filter(Boolean).join(", ");
              const editable = canEdit && !locationMismatch && !["outside", "future", "approved", "pastlock"].includes(status) && !holiday && !(leave && !leave.approverReason);
              const StatusIcon = STATUS_ICONS[status];
              const statusColor = STATUS[status];
              return <div className="calendar-agenda-row timesheet-agenda-row" key={iso}>
                <div className="calendar-agenda-date">{day.format("ddd, DD")} {day.isSame(today, "day") && <Badge variant="secondary">Today</Badge>}</div>
                <div className="timesheet-agenda-description"><Badge variant="outline" className="timesheet-status-badge" style={{ background: statusColor?.bg, borderColor: statusColor?.border, color: statusColor?.text }}>{StatusIcon && <StatusIcon size={13} aria-hidden="true" />}{STATUS[status]?.label || status}</Badge><div className="calendar-agenda-detail">{holiday?.eventName || leave?.leaveType || taskSummary || entry?.leaveType || (day.isAfter(today, "day") ? "Upcoming" : "No hours logged")}</div></div>
                <div className="flex items-center gap-[12px]" ><span className="calendar-agenda-hours">{fmtHM(entry?.hours || 0)}</span>{editable && <Button variant="outline" size="sm" aria-label={`${entry ? "Edit" : "Log hours for"} ${day.format("DD MMMM YYYY")}`} onClick={() => handleCellClick(day)}>{entry ? <><Pencil size={13} /> Edit</> : <><Plus size={14} /> Log hours</>}</Button>}</div>
              </div>;
            })}
          </div> : <div className={cn("timesheet-calendar-scroll", "overflow-x-auto p-[4px_8px_8px]")} >
          <table className={cn("timesheet-calendar-grid", calendarView === "heatmap" && "is-heatmap", "w-[100%] max-w-[880px] m-[0_auto]")} style={{borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed"}}>
            <colgroup>
              {/* 7 equal day columns + 1 slightly wider total column */}
              {Array.from({ length: 7 }).map((_, i) => (
                <col key={i} className="w-[12.2%]"  />
              ))}
              <col className="w-[13.5%]"  />
            </colgroup>
            <thead>
              <tr>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Week Total"].map(h => (
                  <th key={h} className="p-[12px_8px] text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] bg-[var(--bg)] whitespace-nowrap" style={{borderBottom: "1px solid var(--border)"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.filter((_, index) => calendarView !== "week" || index === weekIndex).map((week, wi) => (
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
                        role="button"
                        tabIndex={clickable ? 0 : -1}
                        aria-disabled={!clickable}
                        aria-label={`${day.format("DD MMMM YYYY")}, ${status}, ${fmtHM(rawTotal)}`}
                        onKeyDown={e => { if (clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); handleCellClick(day); } }}
                        onClick={() => clickable && handleCellClick(day)}
                        onMouseEnter={e => { if (clickable) e.currentTarget.style.filter = "brightness(0.96)"; if (hasTooltip && inCurrentMonth) handleCellMouseEnter(e, day); }}
                        onMouseLeave={e => { e.currentTarget.style.filter = ""; handleCellMouseLeave(); }}
                        className="p-[0px] relative overflow-hidden h-[84px]" style={{border: `1px solid ${calendarView === "heatmap" ? s.border : "var(--border)"}`, background: calendarView === "heatmap" ? getHeatmapColor(status, rawTotal) : status === "outside" ? "transparent" : s.bg, cursor: clickable ? "pointer" : "default", verticalAlign: "middle", transition: "filter 0.15s", boxShadow: isToday2 ? "inset 0 0 0 2px var(--primary)" : "none"}}
                      >
                        <div className="relative w-[100%] h-[100%]" >
                          <div className="absolute" style={{inset: 0}}>
                            {inCurrentMonth && (
                              <div className="flex flex-col items-center justify-center h-[100%] p-[8px] gap-[4px]" >
                                <div className="timesheet-day-date absolute top-[5px] left-[7px] text-[12px]" style={{fontWeight: 600, color: isToday2 ? "var(--primary)" : s.text, fontFamily: "var(--ui-font-heading)"}}>{day.format("D")}</div>
                                {STATUS_ICONS[status] && <span className="timesheet-day-status-icon" title={STATUS[status]?.label} aria-hidden="true"><StatusIconForDay status={status} /></span>}
                                {rawTotal > 0 && !holiday && !leave && (
                                  <div className="flex flex-col items-center gap-[4px] mt-[4px]" >
                                    <span className="text-[16px] font-semibold leading-[1]" style={{color: s.text, fontFamily: "var(--ui-font-heading)"}}>
                                      {fmtHM(regHours)}
                                    </span>
                                    {otHours > 0 && (
                                      <span className="text-[12px] font-semibold text-[var(--primary-dark)] bg-[var(--primary-ghost)] p-[4px_4px] inline-flex items-center gap-[4px] max-w-[92%] overflow-hidden whitespace-nowrap" style={{borderRadius: "var(--radius)"}}>
                                        <Zap size={8} /> +{fmtHM(otHours)} OT
                                      </span>
                                    )}
                                  </div>
                                )}
                                {holiday && <div className="text-[12px] font-semibold text-center max-w-[90%] overflow-hidden whitespace-nowrap p-[4px_4px]" style={{color: s.text, textOverflow: "ellipsis", background: "color-mix(in srgb, var(--card) 50%, transparent)", borderRadius: "var(--radius)"}}>{holiday.eventName}</div>}
                                {!nonWorkingWeekend && leave && !holiday && <div className="text-[12px] font-semibold text-center max-w-[90%] overflow-hidden whitespace-nowrap" style={{color: s.text, textOverflow: "ellipsis"}}>{leave.leaveType}</div>}
                                {!nonWorkingWeekend && !leave && !holiday && entry?.leaveType && <div className="text-[12px] font-semibold text-center max-w-[90%] overflow-hidden whitespace-nowrap" style={{color: s.text, textOverflow: "ellipsis"}}>{entry.leaveType}</div>}
                                {status === "pastlock" && <LockKeyhole size={14} color={s.text} aria-label="Locked day" />}
                                {entry?.task && !holiday && !leave && <div className="w-[5px] h-[5px] opacity-[0.5] shrink-[0]" style={{borderRadius: "50%", background: s.text}} />}
                              </div>
                            )}
                            {!inCurrentMonth && <div className="p-[4px_8px] text-border text-[12px] font-medium" >{day.format("D")}</div>}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="bg-[var(--bg)] p-[0px]" style={{border: "1px solid var(--border)"}}>
                    <div className="flex items-center justify-center h-[100%] min-h-[60px] text-[13px] font-semibold text-primary" style={{fontFamily: "var(--ui-font-heading)"}}>
                      {getWeekTotal(week)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
        <div className="calendar-help"><CalendarDays size={14}/><span>{canEdit ? "Select an available date to log hours. Use arrow controls to browse dates." : "Browse recorded hours, leave, and holidays."}</span></div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.date && (
        <div className="fixed z-[9999]" style={{left:tooltip.x, top:tooltip.y, transform:"translate(-50%, -100%)", pointerEvents:"none"}}>
          <div className="p-[12px_16px] min-w-[200px] max-w-[280px]" style={{background:"var(--bg-card,var(--card))", border:"1px solid var(--border)", borderRadius:"var(--radius)", boxShadow: "var(--shadow-sm)"}}>
            <div className="absolute left-[50%] w-[12px] h-[12px]" style={{bottom:-7, background:"var(--bg-card,var(--card))", border:"1px solid var(--border)", borderTop:"none", borderLeft:"none", transform:"translateX(-50%) rotate(45deg)"}}/>
            <div className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] mb-[8px]" >{tooltip.date.format("ddd, DD MMM YYYY")}</div>
            {tooltipHoliday && <div className="flex items-center gap-[8px] mb-[8px]" ><div className="w-[8px] h-[8px] shrink-[0]" style={{borderRadius:"var(--radius)", background:tooltipS?.bg, border:`1px solid ${tooltipS?.border}`}}/><span className="text-[12px] font-semibold" style={{color:tooltipS?.text}}>{tooltipHoliday.eventName}</span></div>}
            {tooltipLeave && !tooltipHoliday && <div className="flex items-center gap-[8px] mb-[8px]" ><div className="w-[8px] h-[8px] shrink-[0]" style={{borderRadius:"var(--radius)", background:tooltipS?.bg, border:`1px solid ${tooltipS?.border}`}}/><span className="text-[12px] font-semibold" style={{color:tooltipS?.text}}>{tooltipLeave.leaveType}</span></div>}
            {tooltipEntry?.hours>0 && (
              <div className="flex items-center gap-[8px]" style={{marginBottom:tooltipTasks.length?8:0}}>
                <Clock size={11} color="var(--text-muted)"/>
                <span className="text-[12px] font-semibold text-[var(--text-primary)]" >
                  {fmtHM(roundH(Math.min(tooltipEntry.hours,MAX_REGULAR)))} regular
                  {tooltipEntry.hours>MAX_REGULAR && ` + ${fmtHM(roundH(tooltipEntry.hours-MAX_REGULAR))} OT`}
                </span>
              </div>
            )}
            {tooltipTasks.length>0 && (
              <>
                <div className="h-[1px] bg-border m-[8px_0]" />
                <div className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] mb-[4px]" >Tasks</div>
                {tooltipTasks.map((t,i)=>(
                  <div key={i} className="flex justify-between items-center text-[12px] text-[var(--text-primary)] leading-[1.8] gap-[8px]" >
                    <span className="overflow-hidden whitespace-nowrap" style={{textOverflow:"ellipsis"}}>{t.name}</span>
                    {t.hours && <span className="font-semibold shrink-[0] text-primary" >{fmtHM(t.hours)}</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Entry Modal ──────────────────────────────────────────────────────── */}
      {modal && selDate && <WorkflowDialog title="Log Hours" onClose={() => setModal(false)} busy={loading} width="560px" dismissible={true}>
<div
            className={cn("modal", "max-w-[560px] w-[100%] max-h-[calc(100vh_-_32px)] overflow-y-auto m-[auto] relative z-[99999]")}
            
            onClick={e=>e.stopPropagation()}
          >

            {/* Header */}
            <div className="modal-header">
              <div className="flex items-center gap-[12px]" >
                <div className={cn("modal-icon", "bg-[var(--primary-ghost)]")} ><Clock size={20} color="var(--primary)"/></div>
                <div>
                  <div className="modal-title">Log Hours</div>
                  <div className="modal-subtitle">{selDate.format("dddd, DD MMM YYYY")}</div>
                </div>
              </div>
              <div className="flex gap-[8px]" >
                {(currentEntry?.hours>0||currentEntry?.leaveType||currentEntry?.task) && (
                  <Button variant="ghost" type="button" className={cn("icon-btn", "text-[var(--coral)]")} title="Clear this entry"  onClick={()=>setDeleteConfirm(true)}><Trash2 size={15}/></Button>
                )}
                <Button variant="ghost" type="button" className="modal-close" onClick={()=>setModal(false)}><X size={16}/></Button>
              </div>
            </div>

            {/* Saved Tasks Preview */}
            {currentTaskList.length>0 && !deleteConfirm && (
              <div className="m-[0_24px_16px]" >
                <div className="overflow-hidden" style={{borderRadius:"var(--radius)", border:"1px solid var(--border)", boxShadow: "var(--shadow-sm)"}}>
                  <div className="flex items-center justify-between p-[8px_16px] bg-[var(--primary-ghost)]" style={{borderBottom:"1px solid var(--border)"}}>
                    <div className="flex items-center gap-[8px]" >
                      <CheckCircle2 size={13} color="var(--primary)"/>
                      <span className="text-[12px] font-semibold text-primary uppercase tracking-[0.06em]" >Saved Entry</span>
                    </div>
                    <div className="flex gap-[8px] items-center" >
                      {savedReg.filter(t=>t.name).length>0 && (
                        <span className="text-[12px] font-semibold text-primary bg-card p-[4px_8px]" style={{border:"1px solid var(--primary)", borderRadius:"var(--radius)"}}>
                          {fmtHM(sumHours(savedReg.filter(t=>t.name)))} regular
                        </span>
                      )}
                      {savedOt.filter(t=>t.name).length>0 && (
                        <span className="text-[12px] font-semibold text-[var(--primary-dark)] bg-[var(--primary-ghost)] p-[4px_8px] flex items-center gap-[4px]" style={{border:"1px solid var(--border-strong)", borderRadius:"var(--radius)"}}>
                          <Zap size={10}/>{fmtHM(sumHours(savedOt.filter(t=>t.name)))} OT
                        </span>
                      )}
                    </div>
                  </div>
                  {currentTaskList.map((t,i)=>(
                    <div key={i} className="grid items-center p-[8px_16px] gap-[8px]" style={{gridTemplateColumns:"1fr 60px", borderTop:i===0?"none":"1px solid var(--border)", background:i%2===0?"var(--bg-card,var(--card))":"var(--bg,var(--muted))"}}>
                      <div className="flex items-center gap-[8px] min-w-[0px]" >
                        <div className="w-[6px] h-[6px] bg-primary opacity-[0.45] shrink-[0]" style={{borderRadius:"50%"}}/>
                        <span className="text-[13px] text-[var(--text-primary)] font-medium overflow-hidden whitespace-nowrap" style={{textOverflow:"ellipsis"}}>{t.name}</span>
                      </div>
                      <span className="text-[13px] font-semibold text-primary text-right" style={{fontFamily:"var(--ui-font-heading)"}}>{fmtHM(t.hours)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delete confirm */}
            {deleteConfirm && (
              <div className="m-[12px_24px] p-[12px_16px] bg-error-subtle flex items-center justify-between gap-[12px]" style={{border:"1px solid var(--error-border)", borderRadius:"var(--radius)"}}>
                <div className="flex items-center gap-[8px]" >
                  <AlertCircle size={16} color="var(--coral)"/>
                  <span className="text-[13px] font-semibold text-error" >Clear this day's entry?</span>
                </div>
                <div className="flex gap-[8px]" >
                  <Button variant="ghost" type="button" onClick={()=>setDeleteConfirm(false)} className="p-[4px_12px] bg-card cursor-pointer text-[12px] font-semibold" style={{borderRadius:"var(--radius)", border:"1px solid var(--border)"}}>Cancel</Button>
                  <Button variant="ghost" type="button" onClick={clearEntry} className="p-[4px_12px] bg-[var(--coral)] text-primary-foreground cursor-pointer text-[12px] font-semibold" style={{borderRadius:"var(--radius)", border:"none"}}>Clear</Button>
                </div>
              </div>
            )}

            <div className="modal-body">

              {/* ── Hours summary bar ── */}
              <div className="flex gap-[12px] mb-[20px]" >
                <div className="bg-[var(--primary-ghost)] p-[12px_16px]" style={{flex:1, border:"1px solid var(--primary)", borderRadius:"var(--radius)"}}>
                  <div className="text-[12px] font-semibold text-primary uppercase tracking-[0.06em] mb-[4px]" >Regular Hours</div>
                  <div className="flex gap-[4px]" style={{alignItems:"baseline"}}>
                    <span className="text-[22px] font-semibold text-primary leading-[1]" style={{fontFamily:"var(--ui-font-heading)"}}>{fmtHM(regularTotal)}</span>
                    <span className="text-[12px] font-semibold text-[var(--text-muted)]" >/ {MAX_REGULAR}h</span>
                  </div>
                  <div className="mt-[8px] h-[4px] overflow-hidden" style={{borderRadius:"var(--radius)", background:"color-mix(in srgb, var(--foreground) 8%, transparent)"}}>
                    <div className="h-[100%]" style={{borderRadius:"var(--radius)", width:`${regularPct}%`, background:regularOver?"var(--coral)":"var(--primary)", transition:"width 0.3s"}}/>
                  </div>
                </div>
                <div className="p-[12px_16px]" style={{flex:1, background:overtimeTotal>0?"var(--primary-ghost)":"var(--bg)", border:`1px solid ${overtimeTotal>0?"var(--border-strong)":"var(--border)"}`, borderRadius:"var(--radius)"}}>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.06em] mb-[4px] flex items-center gap-[4px]" style={{color:overtimeTotal>0?"var(--primary-dark)":"var(--text-muted)"}}>
                    <Zap size={10}/> Overtime Hours
                  </div>
                  <div className="flex gap-[4px]" style={{alignItems:"baseline"}}>
                    <span className="text-[22px] font-semibold leading-[1]" style={{color:overtimeTotal>0?"var(--primary-dark)":"var(--text-muted)", fontFamily:"var(--ui-font-heading)"}}>{fmtHM(overtimeTotal)}</span>
                  </div>
                  <div className="mt-[8px] text-[12px] font-semibold" style={{color:overtimeTotal>0?"var(--primary-dark)":"var(--text-muted)"}}>
                    {overtimeTotal>0 ? `Total: ${fmtHM(grandTotal)} logged` : "No overtime logged"}
                  </div>
                </div>
              </div>

              {/* ── REGULAR TASKS SECTION ── */}
              <div className="mb-[16px]" >
                <div className="flex items-center justify-between mb-[12px]" >
                  <label className={cn("fc-label", "m-[0px] flex items-center gap-[8px]")} >
                    <span className="inline-flex w-[18px] h-[18px] bg-primary text-primary-foreground text-[12px] font-semibold items-center justify-center" style={{borderRadius:"var(--radius)"}}>R</span>
                    Regular Tasks <span className="req">*</span>
                    <span className="text-[12px] font-semibold text-[var(--text-muted)] normal-case tracking-[normal]" >(max {MAX_REGULAR}h)</span>
                  </label>
                </div>

                <div className="grid gap-[8px] mb-[8px] p-[0_4px]" style={{gridTemplateColumns:"1fr 128px 36px"}}>
                  <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em]" >Task Name <span className="text-[var(--coral)]" >*</span></span>
                  <div className="flex gap-[4px]" >
                    <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] text-center" style={{flex:1}}>HH</span>
                    <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] text-center" style={{flex:1}}>MM</span>
                  </div>
                  <span/>
                </div>

                <div className="flex flex-col gap-[8px]" >
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
                      <div key={idx} className="flex flex-col gap-[4px]" >
                        <div className="grid gap-[8px] items-center" style={{gridTemplateColumns:"1fr 128px 36px"}}>
                          <Input
                            className={cn(`fc-input${nameErrors.reg[idx]?" fc-input-error":""}`, "text-[13px]")}
                            
                            aria-label={`Regular task ${idx + 1}`}
                            placeholder="e.g. Code review, Bug fix…"
                            value={task.name}
                            onChange={e=>updateTask("reg",idx,"name",e.target.value)}
                          />
                          <div className="flex gap-[4px]" >
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
                            <Button variant="ghost"
                              type="button"
                              onClick={()=>removeTask("reg",idx)}
                              title="Remove task"
                              className="bg-[none] cursor-pointer text-[var(--coral)] w-[36px] h-[42px] flex items-center justify-center shrink-[0]" style={{border: "1px solid var(--error-border)", borderRadius: "var(--radius)", transition: "all 0.15s"}}
                            >
                              <X size={14}/>
                            </Button>
                          ) : (
                            // Spacer keeps the grid column intact
                            <div className="w-[36px] h-[42px] shrink-[0]" />
                          )}
                        </div>
                        {nameErrors.reg[idx] && (
                          <div className="flex items-center gap-[4px] pl-[4px]" >
                            <AlertCircle size={11} color="var(--coral)"/>
                            <span className="text-[12px] text-[var(--coral)] font-semibold" >Task name is required</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Inline hint when overtime is active and regular is full */}
                {hasOvertimeTasks && regularTotal >= MAX_REGULAR && (
                  <div className="mt-[8px] flex items-center gap-[8px] p-[8px_12px] bg-[var(--primary-ghost)]" style={{border:"1px solid var(--border-strong)", borderRadius:"var(--radius)"}}>
                    <AlertCircle size={12} color="var(--primary)"/>
                    <span className="text-[12px] font-semibold text-[var(--primary-dark)]" >
                      Delete is hidden — regular tasks must stay at {MAX_REGULAR}h while overtime is logged
                    </span>
                  </div>
                )}

                <Button variant="ghost"
                  type="button"
                  disabled={addRegDisabled}
                  onClick={()=>addTask("reg")}
                  className="mt-[12px] p-[8px_16px] text-[12px] font-semibold w-[100%] flex items-center justify-center gap-[8px]" style={{borderRadius:"var(--radius)", border:`1.5px dashed ${addRegDisabled?"var(--border)":"var(--primary)"}`, background:addRegDisabled?"var(--muted)":"var(--primary-ghost)", color:addRegDisabled?"var(--border-strong)":"var(--primary)", cursor:addRegDisabled?"not-allowed":"pointer", transition:"all 0.2s"}}
                >
                  <Plus size={13}/>
                  {addRegDisabled ? (regularTotal >= MAX_REGULAR ? `${MAX_REGULAR}h limit reached` : "Fill task details first") : "Add Regular Task"}
                </Button>
              </div>

              {/* ── Overtime prompt banner ── */}
              {regularTotal >= MAX_REGULAR && !showOvertime && !dayMode && (
                <div className="mb-[16px] p-[12px_16px] bg-[var(--primary-ghost)] flex items-center justify-between gap-[12px]" style={{border:"1px solid var(--border-strong)", borderRadius:"var(--radius)"}}>
                  <div className="flex items-center gap-[12px]" >
                    <div className="w-[32px] h-[32px] bg-[var(--primary-ghost)] flex items-center justify-center shrink-[0]" style={{borderRadius:"var(--radius)"}}>
                      <Zap size={16} color="var(--primary-dark)"/>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-[var(--primary-dark)]" >Did you work beyond {MAX_REGULAR} hours?</div>
                      <div className="text-[12px] text-primary mt-[4px]" >Log remaining hours as overtime to keep records accurate.</div>
                    </div>
                  </div>
                  <Button variant="ghost"
                    type="button"
                    onClick={()=>{ setShowOvertime(true); if(overtimeTasks.length===0) setOvertimeTasks([{ name:"", hours:"" }]); }}
                    className="p-[8px_16px] bg-card text-[var(--primary-dark)] text-[12px] font-semibold cursor-pointer whitespace-nowrap flex items-center gap-[4px]" style={{borderRadius:"var(--radius)", border:"1px solid var(--border-strong)", transition:"all 0.15s"}}
                  >
                    <Zap size={12}/> Add Overtime
                  </Button>
                </div>
              )}

              {/* ── OVERTIME TASKS SECTION ── */}
              {showOvertime && (
                <div className="mb-[16px] p-[16px_16px] bg-[var(--primary-ghost)]" style={{border:"1px solid var(--border-strong)", borderRadius:"var(--radius)"}}>
                  <div className="flex items-center justify-between mb-[12px]" >
                    <label className={cn("fc-label", "m-[0px] flex items-center gap-[8px] text-[var(--primary-dark)]")} >
                      <span className="inline-flex w-[18px] h-[18px] bg-[var(--primary-dark)] text-primary-foreground text-[12px] font-semibold items-center justify-center" style={{borderRadius:"var(--radius)"}}><Zap size={10}/></span>
                      Overtime Tasks
                      <span className="text-[12px] font-semibold text-primary normal-case tracking-[normal]" >({grandTotal}/24h used)</span>
                    </label>
                    <Button variant="ghost"
                      type="button"
                      onClick={()=>{ setShowOvertime(false); setOvertimeTasks([]); }}
                      className="bg-[none] cursor-pointer text-muted-foreground flex items-center gap-[4px] text-[12px] font-semibold p-[4px_8px]" style={{border:"none"}}
                    >
                      <X size={12}/> Remove OT
                    </Button>
                  </div>

                  <div className="grid gap-[8px] mb-[8px] p-[0_4px]" style={{gridTemplateColumns:"1fr 128px 36px"}}>
                    <span className="text-[12px] font-semibold text-primary uppercase tracking-[0.05em]" >OT Task Name <span className="text-[var(--coral)]" >*</span></span>
                    <div className="flex gap-[4px]" >
                      <span className="text-[12px] font-semibold text-primary uppercase tracking-[0.05em] text-center" style={{flex:1}}>HH</span>
                      <span className="text-[12px] font-semibold text-primary uppercase tracking-[0.05em] text-center" style={{flex:1}}>MM</span>
                    </div>
                    <span/>
                  </div>

                  <div className="flex flex-col gap-[8px]" >
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
                      <div key={idx} className="flex flex-col gap-[4px]" >
                        <div className="grid gap-[8px] items-center" style={{gridTemplateColumns:"1fr 128px 36px"}}>
                          <Input
                            className={cn(`fc-input fc-input-ot${nameErrors.ot[idx]?" fc-input-error":""}`, "text-[13px]")}
                            
                            aria-label={`Overtime task ${idx + 1}`}
                            placeholder="e.g. Production hotfix, Client call…"
                            value={task.name}
                            onChange={e=>updateTask("ot",idx,"name",e.target.value)}
                          />
                          <div className="flex gap-[4px]" >
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
                          <Button variant="ghost"
                            type="button"
                            onClick={()=>removeTask("ot",idx)}
                            title="Remove"
                            className="bg-[none] cursor-pointer text-primary w-[36px] h-[42px] flex items-center justify-center shrink-[0]" style={{border:"1px solid var(--border-strong)", borderRadius:"var(--radius)", transition:"all 0.15s"}}
                          >
                            <X size={14}/>
                          </Button>
                        </div>
                        {nameErrors.ot[idx] && (
                          <div className="flex items-center gap-[4px] pl-[4px]" >
                            <AlertCircle size={11} color="var(--coral)"/>
                            <span className="text-[12px] text-[var(--coral)] font-semibold" >Task name is required</span>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>

                  <Button variant="ghost"
                    type="button"
                    disabled={addOtDisabled}
                    onClick={() => addTask("ot")}
                    className="mt-[12px] p-[8px_16px] text-[12px] font-semibold w-[100%] flex items-center justify-center gap-[8px]" style={{borderRadius: "var(--radius)", border: `1.5px dashed ${addOtDisabled ? "var(--border-strong)" : "var(--primary)"}`, background: addOtDisabled ? "var(--primary-ghost)" : "var(--card)", color: addOtDisabled ? "var(--border-strong)" : "var(--primary-dark)", cursor: addOtDisabled ? "not-allowed" : "pointer", transition: "all 0.2s"}}
                  >
                    <Plus size={13} />
                    {grandTotal >= 24 ? "24h total limit reached" : otIncomplete ? "Fill task details first" : "Add Overtime Task"}
                  </Button>
                </div>
              )}

              {/* ── Day Type (only when hours = 0) ── */}
              {grandTotal===0 && (
                <div className="mb-[16px]" >
                  <label className="fc-label">Day Type <span className="req">*</span></label>
                  <div className="flex gap-[8px] mb-[12px]" >
                    {[
                      { val:"leave",   label:"On Leave",  icon:Palmtree },
                      { val:"holiday", label:"Holiday",   icon:CalendarDays },
                    ].map(({ val, label, icon: Icon }: Record<string, any>)=>(
                      <Button variant="ghost" key={val} type="button" onClick={()=>{ setDayMode(val); setLeaveType(""); setManualHolidayName(""); }}
                        className="p-[12px_16px] text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-[8px]" style={{flex:1, borderRadius:"var(--radius)", transition:"all 0.15s", border:`1px solid ${dayMode===val?"var(--primary)":"var(--border)"}`, background:dayMode===val?"var(--primary-ghost)":"var(--bg)", color:dayMode===val?"var(--primary)":"var(--text-secondary)", boxShadow:dayMode===val?"0 0 0 3px var(--primary-ghost)":"none"}}>
                        <Icon size={15} aria-hidden="true" /> {label}
                      </Button>
                    ))}
                  </div>

                  {dayMode==="leave" && (
                    <>
                      <NativeSelect className="fc-input" value={leaveType} onChange={e=>setLeaveType(e.target.value)}
                        style={{ borderColor:!leaveType?"var(--coral)":undefined, boxShadow:!leaveType?"0 0 0 3px color-mix(in srgb, var(--error) 10%, transparent)":undefined }}>
                        <option value="">Select leave type…</option>
                        {["Sick Leave","Casual Leave","Compensatory Off","Maternity Leave","Paternity Leave","Other Leave"].map(o=>(
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </NativeSelect>
                      {!leaveType && (
                        <div className="flex items-center gap-[4px] mt-[4px]" >
                          <AlertCircle size={11} color="var(--coral)"/>
                          <span className="text-[12px] text-[var(--coral)] font-semibold" >Please select a leave type</span>
                        </div>
                      )}
                    </>
                  )}

                  {dayMode==="holiday" && (
                    <>
                      <Input className={`fc-input${!manualHolidayName.trim()?" fc-input-error":""}`}
                        placeholder="e.g. Diwali, Christmas, Pongal…"
                        value={manualHolidayName} onChange={e=>setManualHolidayName(e.target.value)}/>
                      {!manualHolidayName.trim() && (
                        <div className="flex items-center gap-[4px] mt-[4px]" >
                          <AlertCircle size={11} color="var(--coral)"/>
                          <span className="text-[12px] text-[var(--coral)] font-semibold" >Holiday name is required</span>
                        </div>
                      )}
                    </>
                  )}

                  {!dayMode && (
                    <div className="flex items-center gap-[4px] mt-[4px]" >
                      <AlertCircle size={11} color="var(--coral)"/>
                      <span className="text-[12px] text-[var(--coral)] font-semibold" >Since hours is 0, please select a day type above</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Copy To ── */}
              {!dayMode && (
                <div>
                  <label className={cn("fc-label", "flex items-center gap-[8px]")} ><Copy size={12}/> Copy To</label>
                  <div className="flex gap-[8px] flex-wrap" >
                    {[
                      { val:"",       label:"This day" },
                      { val:"week",   label:"Whole week" },
                      { val:"month",  label:"Whole month" },
                      { val:"custom", label:"Pick days" },
                    ].map(({ val, label }: Record<string, any>)=>(
                      <Button variant="ghost" key={val} type="button" onClick={()=>setCopyOpt(val)}
                        className="p-[8px_12px] text-[12px] font-semibold cursor-pointer" style={{borderRadius:"var(--radius)", border:`1px solid ${copyOpt===val?"var(--primary)":"var(--border)"}`, background:copyOpt===val?"var(--primary-ghost)":"var(--bg)", color:copyOpt===val?"var(--primary)":"var(--text-secondary)", transition:"all 0.15s"}}>
                        {label}
                      </Button>
                    ))}
                  </div>
                  {copyOpt==="custom" && (
                    <div className="mt-[12px]" >
                      <label className="fc-label">Select days</label>
                      <div className="flex gap-[4px] flex-wrap" >
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
                            <Button variant="ghost" key={iso} type="button"
                              onClick={()=>setOtherDays(prev=>prev.find(x=>x.isSame(dd,"day"))?prev.filter(x=>!x.isSame(dd,"day")):[...prev,dd])}
                              className="w-[36px] h-[36px] text-[12px] font-semibold cursor-pointer" style={{borderRadius:"var(--radius)", border:`1px solid ${isSel?"var(--primary)":"var(--border)"}`, background:isSel?"var(--primary)":"var(--bg)", color:isSel?"var(--card)":"var(--text-secondary)", transition:"all 0.15s", fontFamily:"var(--ui-font-heading)"}}>
                              {dd.format("D")}
                            </Button>
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
              <Button variant="outline" type="button" className="btn btn-ghost" onClick={()=>setModal(false)}><X size={14}/> Cancel</Button>
              <Button variant="default" type="button" className="btn btn-primary" onClick={saveEntry}><Save size={14}/> Save Entry</Button>
            </div>
          </div>
</WorkflowDialog>}

    </div>
  );
}
