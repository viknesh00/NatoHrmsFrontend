import React, { useState, useEffect } from "react";
import { CalendarCheck2 } from "lucide-react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { getCookie } from "../../services/Cookies";
import Breadcrumb from "../../services/Breadcrumb";
import { ToastSuccess, ToastError } from "../../services/ToastMsg";
import ProTable, { StatusChip } from "../../components/ProTable";
import { FormDate } from "../../components/FormComponents";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const fmt     = (d) => d ? dayjs(d).format("DD-MM-YYYY") : "—";
const fmtTime = (d) => d ? dayjs(d).format("hh:mm A")   : "—";

export default function Attendance() {
  const [logType,    setLogType]    = useState("daily");
  const [fromDate,   setFromDate]   = useState(dayjs().subtract(1, "month").format("YYYY-MM-DD"));
  const [toDate,     setToDate]     = useState(dayjs().format("YYYY-MM-DD"));
  const [singleDate, setSingleDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [filteredData, setFilteredData] = useState([]);
  const [loading,    setLoading]    = useState(false);

  const userRole        = getCookie("role");
  const isAdminOrManager = userRole === "Admin" || userRole === "Manager";

  useEffect(() => {
    setFilteredData([]);
    if (logType === "daily") getDailyLog(dayjs().format("YYYY-MM-DD"));
    else getMonthlyLog(
      dayjs().subtract(1, "month").format("YYYY-MM-DD"),
      dayjs().format("YYYY-MM-DD")
    );
  }, [logType]);

  const getDailyLog = (date) => {
    setLoading(true);
    postRequest("Attendance/GetDailyAttendance", { date })
      .then(res => { if (res.data) setFilteredData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const getMonthlyLog = (from, to) => {
    setLoading(true);
    postRequest("Attendance/GetMonthlyAttendance", { fromDate: from, toDate: to })
      .then(res => {
        if (res.data)
          setFilteredData(res.data.map(d => ({
            ...d,
            attendanceDate: d.attendanceDate ? fmt(d.attendanceDate)         : "—",
            firstClockIn:   d.firstClockIn   ? fmtTime(d.firstClockIn)       : "—",
            latestClockOut: d.latestClockOut  ? fmtTime(d.latestClockOut)     : "—",
          })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleFilter = () => {
    if (logType === "daily") {
      getDailyLog(singleDate);
      ToastSuccess(`Filtered for ${dayjs(singleDate).format("DD-MM-YYYY")}`);
    } else {
      if (dayjs(toDate).isBefore(dayjs(fromDate))) {
        ToastError("To date must be after From date");
        return;
      }
      getMonthlyLog(fromDate, toDate);
    }
  };

  const handleReset = () => {
    const today = dayjs().format("YYYY-MM-DD");
    const prev  = dayjs().subtract(1, "month").format("YYYY-MM-DD");
    if (logType === "daily") {
      setSingleDate(today);
      getDailyLog(today);
    } else {
      setFromDate(prev);
      setToDate(today);
      getMonthlyLog(prev, today);
    }
    ToastSuccess("Filters reset");
  };

  /* ── columns ── */
  const columnsDaily = [
    { field: "slNo",      label: "#", width: 50 },
    ...(isAdminOrManager ? [{ field: "userName", label: "Employee", filterable: true }] : []),
    { field: "time",      label: "Time" },
    { field: "type",      label: "Type", filterable: true },
    { field: "ipAddress", label: "IP Address" },
    { field: "location",  label: "Location" },
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
    { field: "status",          label: "Status",   filterable: true, renderCell: (row) => <StatusChip label={row.status} /> },
    ...(isAdminOrManager ? [{ field: "userEmail", label: "Employee", filterable: true }] : []),
    { field: "firstClockIn",    label: "Clock In" },
    { field: "latestClockOut",  label: "Clock Out" },
    { field: "totalWorkDuration", label: "Work Hrs" },
    { field: "breakCount",      label: "Breaks" },
    { field: "breakDuration",   label: "Break Hrs" },
    { field: "clockInIp",       label: "Clock In IP" },
    { field: "clockOutIp",      label: "Clock Out IP" },
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
    <div>
      <LoadingMask loading={loading} />

      <div className="page-header">
        <div>
          <Breadcrumb icon={<CalendarCheck2 size={13} />} items={[{ label: "Attendance" }]} />
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Track employee attendance records</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:4, background:"var(--bg-card)", padding:4, borderRadius:10, border:"1px solid var(--border)", width:"fit-content", marginBottom:20, boxShadow:"var(--shadow-sm)" }}>
        {["daily", "monthly"].map(t => (
          <button
            key={t}
            onClick={() => setLogType(t)}
            style={{
              padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600,
              background: logType === t ? "linear-gradient(135deg,var(--primary),var(--primary-light))" : "transparent",
              color:      logType === t ? "white" : "var(--text-secondary)",
              boxShadow:  logType === t ? "0 2px 8px var(--primary-glow)" : "none",
              transition: "all 0.2s",
            }}
          >
            {t === "daily" ? "Daily Log" : "Monthly Log"}
          </button>
        ))}
      </div>

      <ProTable
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