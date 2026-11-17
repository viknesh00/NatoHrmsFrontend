import { Button } from "../../components/ui/button";
import { useState, useEffect } from "react";
import { CalendarCheck2 } from "lucide-react";
import dayjs from "dayjs";
import { postRequest } from "../../shared/services/Apiservice";
import LoadingMask from "../../shared/services/LoadingMask";
import { getCookie } from "../../auth/Cookies";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { ToastSuccess, ToastError } from "../../shared/services/ToastMsg";
import ProTable, { StatusChip } from "../../components/ProTable";
import { FormDate } from "../../components/FormComponents";

const fmt = (d) => d ? dayjs(d).format("DD-MM-YYYY") : "—";
const fmtTime = (d) => d ? dayjs(d).format("hh:mm A") : "—";
const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && dayjs(value).isValid() && dayjs(value).format("YYYY-MM-DD") === value;

export default function Attendance() {
  const [logType, setLogType] = useState<"daily" | "monthly">("daily");
  const [fromDate, setFromDate] = useState(dayjs().subtract(1, "month").format("YYYY-MM-DD"));
  const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [singleDate, setSingleDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [filteredData, setFilteredData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  // Draft picker values change locally; only Apply/Reset commits a query.
  const [appliedDates, setAppliedDates] = useState({ singleDate, fromDate, toDate });

  const userRole = getCookie("role");
  const isAdminOrManager = userRole === "Admin" || userRole === "Manager";

  useEffect(() => {
    let cancelled = false;
    setFilteredData([]);
    setLoading(true);
    setError("");

    const load = async () => {
      try {
        const res = logType === "daily"
          ? await postRequest("Attendance/GetDailyAttendance", { date: appliedDates.singleDate })
          : await postRequest("Attendance/GetMonthlyAttendance", { fromDate: appliedDates.fromDate, toDate: appliedDates.toDate });
        if (cancelled) return;
        const records = res.data ?? [];
        if (!Array.isArray(records)) throw new Error("Invalid attendance response");
        setFilteredData(logType === "daily" ? records : records.map(d => ({
          ...d,
          attendanceDate: d.attendanceDate ? fmt(d.attendanceDate) : "—",
          firstClockIn: d.firstClockIn ? fmtTime(d.firstClockIn) : "—",
          latestClockOut: d.latestClockOut ? fmtTime(d.latestClockOut) : "—",
        })));
      } catch (err) {
        if (cancelled) return;
        const message = err?.response?.data?.message;
        setError(typeof message === "string" ? message : "Unable to load attendance records. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    // A slower response from a previous view/date must never replace the current one.
    return () => { cancelled = true; };
  }, [logType, appliedDates, refreshVersion]);

  useEffect(() => {
    const refresh = () => setRefreshVersion(version => version + 1);
    window.addEventListener("attendance:updated", refresh);
    return () => window.removeEventListener("attendance:updated", refresh);
  }, []);

  const handleLogTypeChange = (type: "daily" | "monthly") => {
    if (type === logType) return;
    // Discard unapplied edits so the visible pickers match the requested records.
    setSingleDate(appliedDates.singleDate);
    setFromDate(appliedDates.fromDate);
    setToDate(appliedDates.toDate);
    setLogType(type);
  };

  const handleFilter = () => {
    if (logType === "daily") {
      if (!isValidDate(singleDate)) { ToastError("Select a valid attendance date"); return; }
      setAppliedDates(previous => ({ ...previous, singleDate }));
    } else {
      if (!isValidDate(fromDate) || !isValidDate(toDate)) {
        ToastError("Select valid From and To dates");
        return;
      }
      if (dayjs(toDate).isBefore(dayjs(fromDate))) {
        ToastError("To date must be on or after From date");
        return;
      }
      setAppliedDates(previous => ({ ...previous, fromDate, toDate }));
    }
  };

  const handleReset = () => {
    const today = dayjs().format("YYYY-MM-DD");
    const prev = dayjs().subtract(1, "month").format("YYYY-MM-DD");
    if (logType === "daily") {
      setSingleDate(today);
      setAppliedDates(previous => ({ ...previous, singleDate: today }));
    } else {
      setFromDate(prev);
      setToDate(today);
      setAppliedDates(previous => ({ ...previous, fromDate: prev, toDate: today }));
    }
    ToastSuccess("Filters reset");
  };

  /* ── columns ── */
  const columnsDaily = [
    { field: "slNo", label: "#", width: 50 },
    ...(isAdminOrManager ? [
      { field: "userName", label: "Employee", filterable: true },
      { field: "department", label: "Department", filterable: true },
      { field: "projectAssigned", label: "Project", filterable: true },
    ] : []),
    { field: "time", label: "Time" },
    { field: "type", label: "Type", filterable: true },
    { field: "ipAddress", label: "IP Address" },
    { field: "location", label: "Location" },
  ];

  const columnsMonthly = [
    {
      field: "attendanceDate", label: "Date",
      renderCell: (row) => (
        <span style={{ color: (row.status === "WO" || row.status === "Holiday") ? "var(--coral)" : "var(--text-primary)" }}>
          {row.attendanceDate}
        </span>
      ),
    },
    { field: "status", label: "Status", filterable: true, renderCell: (row) => <StatusChip label={row.status} /> },
    ...(isAdminOrManager ? [
      { field: "userEmail", label: "Employee", filterable: true },
      { field: "department", label: "Department", filterable: true },
      { field: "projectAssigned", label: "Project", filterable: true },
    ] : []),
    { field: "firstClockIn", label: "Clock In" },
    { field: "latestClockOut", label: "Clock Out" },
    { field: "totalWorkDuration", label: "Work Hrs" },
    { field: "breakCount", label: "Breaks" },
    { field: "breakDuration", label: "Break Hrs" },
    { field: "clockInIp", label: "Clock In IP" },
    { field: "clockOutIp", label: "Clock Out IP" },
    { field: "clockInLocation", label: "Clock In Location" },
    { field: "clockOutLocation", label: "Clock Out Location" },
  ];

  /* ── Filter panel content — individual fields flow into ProTable grid ── */
  const filterBar = logType === "daily" ? (
    <FormDate
      label="Select Date"
      value={singleDate}
      onChange={e => setSingleDate(e.target.value)}
    />
  ) : (
    <>
      <FormDate
        label="From Date"
        value={fromDate}
        onChange={e => setFromDate(e.target.value)}
      />
      <FormDate
        label="To Date"
        value={toDate}
        onChange={e => setToDate(e.target.value)}
      />
    </>
  );

  return (
    <div aria-busy={loading}>
      <LoadingMask loading={loading} />

      <div className="page-header">
        <div>
          <Breadcrumb icon={<CalendarCheck2 size={13} />} items={[{ label: "Attendance" }]} />
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Track employee attendance records</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-[4px] bg-[var(--bg-card)] p-[4px] w-[fit-content] mb-[20px]" style={{borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)"}}>
        {(["daily", "monthly"] as const).map(t => (
          <Button variant="ghost" type="button"
            key={t}
            onClick={() => handleLogTypeChange(t)}
            aria-pressed={logType === t}
            className="p-[8px_20px] cursor-pointer text-[13px] font-semibold" style={{borderRadius: "var(--radius)", border: "none", fontFamily: "var(--ui-font-sans)", background: logType === t ? "var(--primary)" : "transparent", color: logType === t ? "var(--card)" : "var(--text-secondary)", boxShadow: logType === t ? "0 2px 8px var(--primary-glow)" : "none", transition: "all 0.2s"}}
          >
            {t === "daily" ? "Daily Log" : "Monthly Log"}
          </Button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-error-subtle p-4 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" type="button" onClick={() => setRefreshVersion(version => version + 1)}>Retry</Button>
        </div>
      )}

      <ProTable
        key={logType}
        title={logType === "daily" ? "Daily Attendance" : "Monthly Attendance"}
        columns={logType === "daily" ? columnsDaily : columnsMonthly}
        data={filteredData}
        filterComponents={filterBar}
        onApplyFilters={handleFilter}
        onResetFilters={handleReset}
      />
    </div>
  );
}
