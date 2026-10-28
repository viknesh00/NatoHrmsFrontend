import React, { useEffect, useState } from "react";
import { FileBarChart2 } from "lucide-react";
import dayjs from "dayjs";
import { getRequest } from "../../services/Apiservice";
import { ToastError } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable from "../../components/ProTable";
import { FormDate } from "../../components/FormComponents";
import { getCookie } from "../../services/Cookies";

const fmtDate = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "—");

export default function WorkStatusReport() {
  const role = getCookie("role");
  const allowed = role !== "Employee";           // Admin, Manager and Team Lead
  // default period: the last 12 months
  const defaultFrom = () => dayjs().subtract(1, "year").format("YYYY-MM-DD");
  const defaultTo = () => dayjs().format("YYYY-MM-DD");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
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

  useEffect(() => { if (allowed) run(); /* eslint-disable-next-line */ }, [allowed]);

  if (!allowed) {
    return <div style={{ padding: 24, color: "var(--text-muted)" }}>The Work Status report is not available for your role.</div>;
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

  // date range lives inside the table's own Filters panel (applied together with the column filters)
  const dateFilters = (
    <>
      <FormDate label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
      <FormDate label="To" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
    </>
  );

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<FileBarChart2 size={13} />} items={[{ label: "Work Status Report" }]} />
          <h1 className="page-title">Work Status Report</h1>
          <p className="page-subtitle">Work status records for the last 12 months. Use Filters to choose another date range.</p>
        </div>
      </div>

      <ProTable
        title="Work Status Report"
        columns={columns}
        data={rows}
        multiSelect={false}
        filterComponents={dateFilters}
        onApplyFilters={() => run()}
        onResetFilters={() => { const f = defaultFrom(), t = defaultTo(); setFrom(f); setTo(t); run(f, t); }}
        externalFilters={[{ label: "Period", value: from || to ? `${from ? fmtDate(from) : "…"} to ${to ? fmtDate(to) : "…"}` : "" }]}
      />
    </div>
  );
}
