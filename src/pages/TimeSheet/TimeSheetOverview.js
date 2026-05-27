import React, { useEffect, useState } from "react";
import { ClipboardList, Eye } from "lucide-react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { getRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable from "../../components/ProTable";
import { FormMonth } from "../../components/FormComponents";
import * as XLSX from "xlsx";

const decimalToHHMM = (h) => {
  if (!h || isNaN(h)) return "0.00";
  const hrs = Math.floor(h), min = Math.round((h - hrs) * 60);
  return `${hrs}.${String(min).padStart(2, "0")}`;
};

export default function TimeSheetOverview() {
  const navigate = useNavigate();
  const [loading, setLoading]           = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [appliedMonth, setAppliedMonth]   = useState(null); // null = no filter applied yet
  const [tableData, setTableData]       = useState([]);

  useEffect(() => { fetchTimesheet(selectedMonth); }, []);

  const groupByUser = (data) => {
    const grouped = {};
    data.forEach(item => {
      const uid = item.userId;
      if (!grouped[uid]) {
        grouped[uid] = {
          employeeName: item.employeeName,
          employeeId: item.employeeId,
          username: item.username,
          department: item.department,           // ✅ add
          projectAssigned: item.projectAssigned, // ✅ add
          totalWorkingHours: 0,
          timesheet: [],
        };
      }
      grouped[uid].timesheet.push(item);
      grouped[uid].totalWorkingHours += Number(item.workingHours || 0);
    });
    return Object.values(grouped).map(d => ({
      ...d,
      totalWorkingHours: decimalToHHMM(d.totalWorkingHours),
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

  const handleExport = (data) => {
  const mObj = dayjs(selectedMonth + "-01");
  const end  = mObj.endOf("month");
  const allDates = [];
  let d = mObj.startOf("month");
  while (d.isBefore(end) || d.isSame(end, "day")) {
    allDates.push(d.format("DD-MM-YYYY"));
    d = d.add(1, "day");
  }

  const headerRow = [
    "Emp ID", "Employee Name", "Email", "Department", "Project Assigned",
    ...allDates,
    "TOTAL",
  ];

  const dataRows = data.map((emp) => {
    const hours = allDates.map((ds) => {
      const entry = emp.timesheet?.find((t) => normalizeDate(t.entryDate) === ds);
      return Number(entry?.workingHours || 0);
    });
    const total = hours.reduce((a, b) => a + b, 0);
    return [
      emp.employeeId,
      emp.employeeName,
      emp.username,
      emp.department,
      emp.projectAssigned,
      ...hours.map(decimalToHHMM),
      decimalToHHMM(total),
    ];
  });

  // ── Daily total row ──────────────────────────────
  const totalRow = ["", "", "", "", "DAILY TOTAL"];
  let grandTotal = 0;
  allDates.forEach((_, i) => {
    const colSum = data.reduce((acc, emp) => {
      const entry = emp.timesheet?.find((t) => normalizeDate(t.entryDate) === allDates[i]);
      return acc + Number(entry?.workingHours || 0);
    }, 0);
    grandTotal += colSum;
    totalRow.push(decimalToHHMM(colSum));
  });
  totalRow.push(decimalToHHMM(grandTotal));
  // ────────────────────────────────────────────────

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows, totalRow]);
  ws["!cols"] = [
    { wch: 12 }, { wch: 24 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
    ...allDates.map(() => ({ wch: 11 })),
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Timesheet");
  XLSX.writeFile(wb, `Timesheet_${mObj.format("MMM-YYYY")}.xlsx`);
};
  /* ── filter field — no buttons, ProTable footer handles Apply/Reset ── */
  const filterBar = (
    <FormMonth
      label="Month"
      value={selectedMonth}
      onChange={e => setSelectedMonth(e.target.value)}
    />
  );

  const columns = [
    { field: "employeeId",        label: "Emp ID",      width: 90 },
    { field: "employeeName",      label: "Employee" },
    { field: "username",          label: "Email" },
    { field: "department",      label: "Department",       filterable: true },
    { field: "projectAssigned", label: "Project Assigned",  filterable: true },
    { field: "totalWorkingHours", label: "Total Hours" },
    {
      field: "action", label: "Action",
      renderCell: (row) => (
        <button
          className="icon-btn"
          onClick={() => navigate("/timesheet/timesheet-view", { state: { viewData: row, selectedMonth: dayjs(selectedMonth + "-01").format("MMM-YYYY") } })}
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
          { label: "Month", value: appliedMonth ? dayjs(appliedMonth + "-01").format("MMM YYYY") : null },
        ]}
      />
    </div>
  );
}