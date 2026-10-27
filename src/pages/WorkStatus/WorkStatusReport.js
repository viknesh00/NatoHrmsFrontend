import React, { useEffect, useState } from "react";
import { FileBarChart2 } from "lucide-react";
import dayjs from "dayjs";
import { getRequest } from "../../services/Apiservice";
import { ToastError } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable from "../../components/ProTable";
import { FormDate } from "../../components/FormComponents";
import { usePermissions } from "../../services/Permissions";

const fmtDate = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "—");

export default function WorkStatusReport() {
  const perms = usePermissions();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const run = (f = from, t = to) => {
    if (f && t && t < f) { ToastError("The end date cannot be before the start date"); return; }
    const q = [f && `from=${f}`, t && `to=${t}`].filter(Boolean).join("&");
    setLoading(true);
    getRequest("WorkStatus/Report" + (q ? `?${q}` : ""))
      .then((res) => setRows((res.data || []).map((r) => ({
        ...r,
        employeeName: `${r.firstName} ${r.lastName}`.trim(),
        location: [r.city, r.country].filter(Boolean).join(", ") || "—",
        startDateText: fmtDate(r.startDate),
        endDateText: r.endDate ? fmtDate(r.endDate) : "—",
      }))))
      .catch((err) => ToastError(err.response?.data?.message || "Failed to load the report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (perms?.isAdminOrManager) run("", ""); /* eslint-disable-next-line */ }, [perms?.isAdminOrManager]);

  if (perms && !perms.isAdminOrManager) {
    return <div style={{ padding: 24, color: "var(--text-muted)" }}>The Work Status report is available to Admin and Manager only.</div>;
  }

  const columns = [
    { field: "employeeName", label: "Employee" },
    { field: "passportNo", label: "Passport No." },
    { field: "location", label: "City / Country" },
    { field: "employeeStatus", label: "Employee Status", filterable: true },
    { field: "salCode", label: "SAL Code", filterable: true },
    { field: "pmName", label: "PM Name", filterable: true },
    { field: "startDateText", label: "Start Date" },
    { field: "endDateText", label: "End Date" },
    { field: "workStatus", label: "Work Status", filterable: true },
  ];

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<FileBarChart2 size={13} />} items={[{ label: "Work Status Report" }]} />
          <h1 className="page-title">Work Status Report</h1>
          <p className="page-subtitle">Records that overlap the selected date or date range. One date shows that day only.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ minWidth: 180 }}><FormDate label="From" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div style={{ minWidth: 180 }}><FormDate label="To" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button className="btn btn-primary" onClick={() => run()}>Show report</button>
          <button className="btn btn-outline" onClick={() => { setFrom(""); setTo(""); run("", ""); }}>Clear</button>
        </div>
      </div>

      <ProTable title="Work Status Report" columns={columns} data={rows} multiSelect={false} />
    </div>
  );
}
