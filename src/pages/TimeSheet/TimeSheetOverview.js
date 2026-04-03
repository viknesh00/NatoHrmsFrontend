import React, { useEffect, useState } from "react";
import { Check, RotateCcw, Eye } from "lucide-react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { getRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable from "../../components/ProTable";

const decimalToHHMM = (h) => {
  if (!h || isNaN(h)) return "0.00";
  const hrs = Math.floor(h), min = Math.round((h-hrs)*60);
  return `${hrs}.${String(min).padStart(2,"0")}`;
};

export default function TimeSheetOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [tableData, setTableData] = useState([]);

  useEffect(() => { fetchTimesheet(selectedMonth); }, []);

  const groupByUser = (data) => {
    const grouped = {};
    data.forEach(item => {
      const uid = item.userId;
      if (!grouped[uid]) grouped[uid] = { employeeName: item.employeeName, employeeId: item.employeeId, username: item.username, totalWorkingHours: 0, timesheet: [] };
      grouped[uid].timesheet.push(item);
      grouped[uid].totalWorkingHours += Number(item.workingHours || 0);
    });
    return Object.values(grouped).map(d => ({ ...d, totalWorkingHours: decimalToHHMM(d.totalWorkingHours) }));
  };

  const fetchTimesheet = (month) => {
    setLoading(true);
    getRequest(`TimeSheet/GetTimeSheet?month=${month}`)
      .then(res => { if (res?.data) setTableData(groupByUser(res.data)); else setTableData([]); })
      .catch(console.error).finally(() => setLoading(false));
  };

  const handleExport = (data) => {
    const mObj = dayjs(selectedMonth + "-01");
    const end = mObj.endOf("month");
    const allDates = [];
    let d = mObj.startOf("month");
    while (d.isBefore(end) || d.isSame(end,"day")) { allDates.push(d.format("DD-MM-YYYY")); d = d.add(1,"day"); }

    const rows = data.map(emp => {
      const row = { "Employee Name": emp.employeeName, "Employee ID": emp.employeeId, "Email": emp.username };
      let total = 0;
      allDates.forEach(ds => {
        const e = emp.timesheet?.find(t => dayjs(t.entryDate).format("DD-MM-YYYY") === ds);
        const h = e ? e.workingHours : 0;
        row[ds] = decimalToHHMM(h); total += h;
      });
      row["TOTAL"] = decimalToHHMM(total);
      return row;
    });

    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => r[h]).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `Timesheet_${dayjs(selectedMonth+"-01").format("MMM-YYYY")}.csv`; a.click();
  };

  const inputStyle = { padding:"7px 11px", borderRadius:8, border:"1.5px solid var(--border)", fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"var(--text-primary)", background:"var(--bg-card)", outline:"none" };

  const filterBar = (
    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:12, color:"var(--text-muted)", fontWeight:600 }}>Month</span>
        <input type="month" style={inputStyle} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => fetchTimesheet(selectedMonth)}><Check size={14} /> Apply</button>
      <button className="btn btn-ghost btn-sm" onClick={() => { const m=dayjs().format("YYYY-MM"); setSelectedMonth(m); fetchTimesheet(m); }}><RotateCcw size={14} /> Reset</button>
    </div>
  );

  const columns = [
    { field: "employeeId",        label: "Emp ID", width: 90 },
    { field: "employeeName",      label: "Employee" },
    { field: "username",          label: "Email" },
    { field: "totalWorkingHours", label: "Total Hours" },
    {
      field: "action", label: "Action",
      renderCell: (row) => (
        <button className="icon-btn" onClick={() => navigate("/timesheet/timesheet-view", { state: { viewData: row, selectedMonth: dayjs(selectedMonth+"-01").format("MMM-YYYY") } })}>
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
          <Breadcrumb items={[{ label: "Timesheet" }]} />
          <h1 className="page-title">Timesheet</h1>
          <p className="page-subtitle">Monthly working hours overview</p>
        </div>
      </div>
      <ProTable title="Employee Timesheet" columns={columns} data={tableData} filterComponents={filterBar} onExport={handleExport} />
    </div>
  );
}
