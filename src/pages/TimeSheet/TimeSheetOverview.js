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

/** Format decimal hours → "H.MM" string */
const decimalToHHMM = (h) => {
  if (!h || isNaN(h)) return "0.00";
  const hrs = Math.floor(h), min = Math.round((h - hrs) * 60);
  return `${hrs}.${String(min).padStart(2, "0")}`;
};

/** Given total hours for a day, return { regular, overtime } */
const splitHours = (total) => {
  const t = Number(total) || 0;
  const regular  = Math.min(t, MAX_REGULAR);
  const overtime = Math.max(t - MAX_REGULAR, 0);
  return { regular, overtime };
};

export default function TimeSheetOverview() {
  const navigate = useNavigate();
  const [loading, setLoading]             = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [appliedMonth, setAppliedMonth]   = useState(null);
  const [tableData, setTableData]         = useState([]);

  useEffect(() => { fetchTimesheet(selectedMonth); }, []);

  // ── Group API rows by user and compute regular / overtime / total ─────────
  const groupByUser = (data) => {
    const grouped = {};
    data.forEach(item => {
      const uid = item.userId;
      if (!grouped[uid]) {
        grouped[uid] = {
          employeeName:    item.employeeName,
          employeeId:      item.employeeId,
          username:        item.username,
          department:      item.department,
          projectAssigned: item.projectAssigned,
          totalWorkingHours:  0,
          totalRegularHours:  0,
          totalOvertimeHours: 0,
          timesheet: [],
        };
      }
      const dayTotal    = Number(item.workingHours || 0);
      const { regular, overtime } = splitHours(dayTotal);
      grouped[uid].timesheet.push(item);
      grouped[uid].totalWorkingHours  += dayTotal;
      grouped[uid].totalRegularHours  += regular;
      grouped[uid].totalOvertimeHours += overtime;
    });

    return Object.values(grouped).map(d => ({
      ...d,
      totalWorkingHours:  decimalToHHMM(d.totalWorkingHours),
      totalRegularHours:  decimalToHHMM(d.totalRegularHours),
      totalOvertimeHours: decimalToHHMM(d.totalOvertimeHours),
      // keep raw numbers too so export can use them
      _rawTotal:    d.totalWorkingHours,
      _rawRegular:  d.totalRegularHours,
      _rawOvertime: d.totalOvertimeHours,
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
    setAppliedMonth(null);
    fetchTimesheet(m);
  };

  const normalizeDate = (raw) => {
    if (!raw) return "";
    return dayjs(raw.toString().split("T")[0]).format("DD-MM-YYYY");
  };

  // ── Excel export — per-day columns split into Reg / OT / Total ───────────
  const handleExport = (data) => {
    const mObj     = dayjs(selectedMonth + "-01");
    const end      = mObj.endOf("month");
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
        const entry    = emp.timesheet?.find(t => normalizeDate(t.entryDate) === ds);
        const dayTotal = Number(entry?.workingHours || 0);
        const { regular, overtime } = splitHours(dayTotal);
        return [decimalToHHMM(regular), decimalToHHMM(overtime), decimalToHHMM(dayTotal)];
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
    let grandReg = 0, grandOt = 0, grandAll = 0;
    allDates.forEach(ds => {
      let colReg = 0, colOt = 0, colTotal = 0;
      data.forEach(emp => {
        const entry    = emp.timesheet?.find(t => normalizeDate(t.entryDate) === ds);
        const dayTotal = Number(entry?.workingHours || 0);
        const { regular, overtime } = splitHours(dayTotal);
        colReg   += regular;
        colOt    += overtime;
        colTotal += dayTotal;
      });
      grandReg  += colReg;
      grandOt   += colOt;
      grandAll  += colTotal;
      totalRow.push(decimalToHHMM(colReg), decimalToHHMM(colOt), decimalToHHMM(colTotal));
    });
    totalRow.push(decimalToHHMM(grandReg), decimalToHHMM(grandOt), decimalToHHMM(grandAll));

    const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows, totalRow]);

    // Merge date header cells (3 cols per date) and total header
    const merges = [];
    allDates.forEach((_, i) => {
      const col = 5 + i * 3;
      merges.push({ s:{ r:0, c:col }, e:{ r:0, c:col+2 } });
    });
    const totalStartCol = 5 + allDates.length * 3;
    merges.push({ s:{ r:0, c:totalStartCol }, e:{ r:0, c:totalStartCol+2 } });
    ws["!merges"] = merges;

    ws["!cols"] = [
      { wch:12 }, { wch:24 }, { wch:30 }, { wch:18 }, { wch:20 },
      ...allDates.flatMap(() => [{ wch:10 }, { wch:10 }, { wch:10 }]),
      { wch:10 }, { wch:10 }, { wch:10 },
    ];

    const wb = XLSX.utils.book_new();
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
              selectedMonth: dayjs(selectedMonth + "-01").format("MMM-YYYY"),
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