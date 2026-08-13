import React, { useEffect, useState } from "react";
import { ClipboardList, Eye, Zap } from "lucide-react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { getRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable from "../../components/ProTable";
import { FormMonth } from "../../components/FormComponents";
import * as XLSX from "xlsx";

const MAX_REGULAR = 8;

const toMin = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const s = typeof v === "number" ? v.toFixed(2) : String(v);
  const [hStr, mStrRaw] = s.split(".");
  const h = parseInt(hStr, 10) || 0;
  const mStr = (mStrRaw || "0").padEnd(2, "0").slice(0, 2); // guarantee 2-digit minute field
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
};

/** Convert total minutes back to "H.MM" display string */
const fromMin = (m) => {
  const total = Math.max(0, Math.round(m || 0));
  const h = Math.floor(total / 60), min = total % 60;
  return `${h}.${String(min).padStart(2, "0")}`;
};

/** Given total minutes for a day, split into { regularMin, overtimeMin } */
const splitMinutes = (totalMin) => {
  const regularMin  = Math.min(totalMin, MAX_REGULAR * 60);
  const overtimeMin = Math.max(totalMin - MAX_REGULAR * 60, 0);
  return { regularMin, overtimeMin };
};

export default function TimeSheetOverview({ tabSwitcher }) {
  const navigate = useNavigate();
  const [loading, setLoading]             = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [appliedMonth, setAppliedMonth]   = useState(null);
  const [tableData, setTableData]         = useState([]);

  useEffect(() => {
    const m = dayjs().format("YYYY-MM");
    setAppliedMonth(m);
    fetchTimesheet(m);
  }, []);

  /** Collapse any "Holiday: X" variant into a single "Holiday" bucket */
  const normalizeLeaveType = (leaveType) => {
    if (!leaveType) return leaveType;
    if (/^holiday\s*:/i.test(leaveType.trim())) return "Holiday";
    return leaveType.trim();
  };

  // ── Group API rows by user and compute regular / overtime / total / leave counts ──
  const groupByUser = (data) => {
    const grouped = {};
    data.forEach(item => {
      const uid = item.userId;
      if (!grouped[uid]) {
        grouped[uid] = {
          employeeName: item.employeeName,
          employeeId: item.employeeId,
          username: item.username,
          department: item.department,
          projectAssigned: item.projectAssigned,
          totalWorkingMin: 0,
          totalRegularMin: 0,
          totalOvertimeMin: 0,
          leaveCounts: {},
          timesheet: [],
        };
      }
      const dayTotalMin = toMin(item.workingHours);
      const { regularMin, overtimeMin } = splitMinutes(dayTotalMin);
      grouped[uid].timesheet.push(item);
      grouped[uid].totalWorkingMin  += dayTotalMin;
      grouped[uid].totalRegularMin  += regularMin;
      grouped[uid].totalOvertimeMin += overtimeMin;

      if (item.leaveType) {
        const key = normalizeLeaveType(item.leaveType);
        grouped[uid].leaveCounts[key] = (grouped[uid].leaveCounts[key] || 0) + 1;
      }
    });

    return Object.values(grouped).map(d => ({
      ...d,
      totalWorkingHours: fromMin(d.totalWorkingMin),
      totalRegularHours: fromMin(d.totalRegularMin),
      totalOvertimeHours: fromMin(d.totalOvertimeMin),
      _rawTotal: d.totalWorkingMin,    // minutes (not decimal hours)
      _rawRegular: d.totalRegularMin,  // minutes
      _rawOvertime: d.totalOvertimeMin,// minutes
      _totalLeaveDays: Object.values(d.leaveCounts).reduce((a, b) => a + b, 0),
    }));
  };

  const fetchTimesheet = (month) => {
    setLoading(true);
    getRequest(`TimeSheet/GetTimeSheet?month=${month}`)
      .then(res => { if (res?.data) setTableData(groupByUser(res.data)); else setTableData([]); })
      .catch(console.error).finally(() => setLoading(false));
  };

  const handleApply = () => { fetchTimesheet(selectedMonth); setAppliedMonth(selectedMonth); };

  const handleReset = () => {
    const m = dayjs().format("YYYY-MM");
    setSelectedMonth(m);
    setAppliedMonth(m);
    fetchTimesheet(m);
  };

  const normalizeDate = (raw) => {
    if (!raw) return "";
    return dayjs(raw.toString().split("T")[0]).format("DD-MM-YYYY");
  };

  // ── Build the "Leave Summary" sheet ──────────────────────────────────────
  const buildLeaveSummarySheet = (data) => {
    // Collect all distinct leave types present this month
    const leaveTypesSet = new Set();
    data.forEach(emp => {
      Object.keys(emp.leaveCounts || {}).forEach(lt => leaveTypesSet.add(lt));
    });

    // Fixed priority order: Holiday → Sick Leave → Casual Leave → anything new (alphabetical)
    const LEAVE_ORDER = ["Holiday", "Sick Leave", "Casual Leave"];
    const leaveTypes = [
      ...LEAVE_ORDER.filter(lt => leaveTypesSet.has(lt)),
      ...Array.from(leaveTypesSet).filter(lt => !LEAVE_ORDER.includes(lt)).sort(),
    ];

    // Column layout:
    // [0-4] Emp ID | Employee Name | Email | Department | Project Assigned
    // [5..4+N] leave type columns (Holiday, Sick Leave, Casual Leave, …)
    // [5+N..7+N] TOTAL → Regular | Overtime | Total
    const leaveStartCol  = 5;
    const totalStartCol  = leaveStartCol + leaveTypes.length;

    const headerRow1 = [
      "Emp ID", "Employee Name", "Email", "Department", "Project Assigned",
      ...leaveTypes,
      "TOTAL", "", "",
    ];
    const headerRow2 = [
      "", "", "", "", "",
      ...leaveTypes.map(() => ""),
      "Regular", "Overtime", "Total",
    ];

    const dataRows = data.map(emp => [
      emp.employeeId,
      emp.employeeName,
      emp.username,
      emp.department,
      emp.projectAssigned,
      ...leaveTypes.map(lt => emp.leaveCounts?.[lt] || 0),
      emp.totalRegularHours,
      emp.totalOvertimeHours,
      emp.totalWorkingHours,
    ]);

    // Grand total row — leave columns intentionally left blank
    // NOTE: _rawRegular / _rawOvertime / _rawTotal are now in MINUTES
    let grandRegMin = 0, grandOtMin = 0, grandAllMin = 0;
    data.forEach(emp => {
      grandRegMin += emp._rawRegular  || 0;
      grandOtMin  += emp._rawOvertime || 0;
      grandAllMin += emp._rawTotal    || 0;
    });
    const totalRow = [
      "", "", "", "",
      ...leaveTypes.map(() => ""),
      "TOTAL",
      fromMin(grandRegMin), fromMin(grandOtMin), fromMin(grandAllMin),
    ];

    const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows, totalRow]);

    // Merges: only TOTAL spans 3 cols across row 1; leave columns are single cells (no merge)
    const merges = [
      { s: { r: 0, c: totalStartCol }, e: { r: 0, c: totalStartCol + 2 } }, // TOTAL
    ];
    ws["!merges"] = merges;

    ws["!cols"] = [
      { wch: 12 }, { wch: 24 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
      ...leaveTypes.map(() => ({ wch: 16 })),
      { wch: 10 }, { wch: 10 }, { wch: 10 },
    ];

    return ws;
  };

  // ── Excel export — per-day columns split into Reg / OT / Total ───────────
  const handleExport = (data) => {
    const mObj = dayjs(selectedMonth + "-01");
    const end = mObj.endOf("month");
    const allDates = [];
    let d = mObj.startOf("month");
    while (d.isBefore(end) || d.isSame(end, "day")) {
      allDates.push(d.format("DD-MM-YYYY"));
      d = d.add(1, "day");
    }

    // Build header: fixed cols, then for each date 3 sub-cols, then 3 grand totals
    const headerRow1 = [
      "Emp ID", "Employee Name", "Email", "Department", "Project Assigned",
      ...allDates.flatMap(ds => [ds, "", ""]),
      "TOTAL", "", "",
    ];
    const headerRow2 = [
      "", "", "", "", "",
      ...allDates.flatMap(() => ["Regular", "Overtime", "Total"]),
      "Regular", "Overtime", "Total",
    ];

    const dataRows = data.map(emp => {
      const dayCells = allDates.flatMap(ds => {
        const entry = emp.timesheet?.find(t => normalizeDate(t.entryDate) === ds);
        const dayTotalMin = toMin(entry?.workingHours);
        const { regularMin, overtimeMin } = splitMinutes(dayTotalMin);
        return [fromMin(regularMin), fromMin(overtimeMin), fromMin(dayTotalMin)];
      });

      return [
        emp.employeeId,
        emp.employeeName,
        emp.username,
        emp.department,
        emp.projectAssigned,
        ...dayCells,
        emp.totalRegularHours,
        emp.totalOvertimeHours,
        emp.totalWorkingHours,
      ];
    });

    // Daily summary row
    const totalRow = ["", "", "", "", "DAILY TOTAL"];
    let grandRegMin = 0, grandOtMin = 0, grandAllMin = 0;
    allDates.forEach(ds => {
      let colRegMin = 0, colOtMin = 0, colTotalMin = 0;
      data.forEach(emp => {
        const entry = emp.timesheet?.find(t => normalizeDate(t.entryDate) === ds);
        const dayTotalMin = toMin(entry?.workingHours);
        const { regularMin, overtimeMin } = splitMinutes(dayTotalMin);
        colRegMin += regularMin;
        colOtMin  += overtimeMin;
        colTotalMin += dayTotalMin;
      });
      grandRegMin += colRegMin;
      grandOtMin  += colOtMin;
      grandAllMin += colTotalMin;
      totalRow.push(fromMin(colRegMin), fromMin(colOtMin), fromMin(colTotalMin));
    });
    totalRow.push(fromMin(grandRegMin), fromMin(grandOtMin), fromMin(grandAllMin));

    const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows, totalRow]);

    // Merge date header cells (3 cols per date) and total header
    const merges = [];
    allDates.forEach((_, i) => {
      const col = 5 + i * 3;
      merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + 2 } });
    });
    const totalStartCol = 5 + allDates.length * 3;
    merges.push({ s: { r: 0, c: totalStartCol }, e: { r: 0, c: totalStartCol + 2 } });
    ws["!merges"] = merges;

    ws["!cols"] = [
      { wch: 12 }, { wch: 24 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
      ...allDates.flatMap(() => [{ wch: 10 }, { wch: 10 }, { wch: 10 }]),
      { wch: 10 }, { wch: 10 }, { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();

    // Leave Summary first
    const leaveSummaryWs = buildLeaveSummarySheet(data);
    XLSX.utils.book_append_sheet(wb, leaveSummaryWs, "Leave Summary");

    // Timesheet second
    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");

    XLSX.writeFile(wb, `Timesheet_${mObj.format("MMM-YYYY")}.xlsx`);
  };

  // ── Filter bar ────────────────────────────────────────────────────────────
  const filterBar = (
    <FormMonth
      label="Month"
      value={selectedMonth}
      onChange={e => setSelectedMonth(e.target.value)}
    />
  );

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    { field: "employeeId",         label: "Emp ID",           width: 100 },
    { field: "employeeName",       label: "Employee" },
    { field: "username",           label: "Email" },
    { field: "department",         label: "Department",        filterable: true },
    { field: "projectAssigned",    label: "Project Assigned",  filterable: true },
    {
      field: "totalRegularHours",
      label: "Regular Hrs",
      renderCell: (row) => (
        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          color: "#15803d",
          background: "#dcfce7",
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: 12,
          display: "inline-block",
        }}>
          {row.totalRegularHours}
        </span>
      ),
    },
    {
      field: "totalOvertimeHours",
      label: "Overtime Hrs",
      renderCell: (row) => {
        const hasOt = row._rawOvertime > 0;
        return (
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            color:      hasOt ? "#1d4ed8" : "#94a3b8",
            background: hasOt ? "#dbeafe"  : "#f1f5f9",
            padding:    "3px 10px",
            borderRadius: 20,
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}>
            {hasOt && <Zap size={10} />}
            {row.totalOvertimeHours}
          </span>
        );
      },
    },
    {
      field: "totalWorkingHours",
      label: "Total Hours",
      renderCell: (row) => (
        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800,
          color: "var(--primary, #6366f1)",
          fontSize: 13,
        }}>
          {row.totalWorkingHours}
        </span>
      ),
    },
    {
      field: "action",
      label: "Action",
      renderCell: (row) => (
        <button
          className="icon-btn"
          onClick={() => navigate("/timesheet/timesheet-view", {
            state: {
              viewData: row,
              selectedMonth: dayjs((appliedMonth ?? selectedMonth) + "-01").format("MMM-YYYY"),
            },
          })}
        >
          <Eye size={15} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<ClipboardList size={13} />} items={[{ label: "Timesheet" }]} />
          <h1 className="page-title">Timesheet</h1>
          <p className="page-subtitle">Monthly working hours overview</p>
          {tabSwitcher}
        </div>
      </div>
      <ProTable
        title="Employee Timesheet"
        columns={columns}
        data={tableData}
        filterComponents={filterBar}
        onApplyFilters={handleApply}
        onResetFilters={handleReset}
        onExport={handleExport}
        externalFilters={[
          {
            label: "Month",
            value: appliedMonth ? dayjs(appliedMonth + "-01").format("MMM YYYY") : null,
          },
        ]}
      />
    </div>
  );
}