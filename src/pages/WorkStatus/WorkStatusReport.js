import React, { useEffect, useState } from "react";
import { FileBarChart2 } from "lucide-react";
import dayjs from "dayjs";
import { getRequest } from "../../services/Apiservice";
import { ToastError } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable from "../../components/ProTable";
import { FormMultiSelect, FormDate } from "../../components/FormComponents";
import { getCookie } from "../../services/Cookies";

const fmtDate = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "N/A");

// filters of the table: several values per column, combined across columns (same as the Onboarding page)
const split = (v) => (v ? String(v).split(",").map((x) => x.trim()).filter(Boolean) : []);
const FILTERS = [
  { key: "employeeStatuses", label: "Employee Status", get: (r) => [r.employeeStatus] },
  { key: "salCodes", label: "SAL Code", get: (r) => [r.salCode] },
  { key: "pmNames", label: "PM Name", get: (r) => [r.pmName] },
  { key: "statuses", label: "Work Status", get: (r) => [r.workStatus] },
  { key: "assets", label: "Asset", get: (r) => (r.asset === "N/A" ? [] : split(r.asset)) },
  { key: "activities", label: "Activity", get: (r) => (r.activity === "N/A" ? [] : split(r.activity)) },
];
const EMPTY_FILTER = Object.fromEntries(FILTERS.map((f) => [f.key, []]));

export default function WorkStatusReport() {
  const role = getCookie("role");
  const allowed = role !== "Employee";           // Admin, Manager and Team Lead
  // default period: the last 12 months
  const defaultFrom = () => dayjs().subtract(1, "year").format("YYYY-MM-DD");
  const defaultTo = () => dayjs().format("YYYY-MM-DD");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [rows, setRows] = useState([]);
  const [filterDraft, setFilterDraft] = useState(EMPTY_FILTER);
  const [filters, setFilters] = useState(EMPTY_FILTER);
  const [loading, setLoading] = useState(false);

  const run = (f = from, t = to) => {
    if (f && t && t < f) { ToastError("The end date cannot be before the start date"); return; }
    const q = [f && `from=${f}`, t && `to=${t}`].filter(Boolean).join("&");
    setLoading(true);
    getRequest("WorkStatus/Report" + (q ? `?${q}` : ""))
      .then((res) => setRows((res.data || []).map((r) => ({
        ...r,
        employeeName: `${r.firstName} ${r.lastName}`.trim(),
        location: [r.city, r.country].filter(Boolean).join(", ") || "N/A",
        startDateText: fmtDate(r.startDate),
        endDateText: r.endDate ? fmtDate(r.endDate) : "N/A",
        asset: (r.asset ? String(r.asset).split(";").map((x) => x.trim()).filter(Boolean).join(", ") : "") || "N/A",
        comments: r.comments || "N/A",
        activity: (r.activity || "").split(";").map((x) => x.trim()).filter(Boolean).join(", ") || "N/A",
      }))))
      .catch((err) => ToastError(err.response?.data?.message || "Failed to load the report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (allowed) run(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  if (!allowed) {
    return <div style={{ padding: 24, color: "var(--text-muted)" }}>The Work Status report is not available for your role.</div>;
  }

  const columns = [
    { field: "employeeName", label: "Employee" },
    { field: "passportNo", label: "Passport No." },
    { field: "location", label: "City / Country" },
    { field: "employeeStatus", label: "Employee Status" },
    { field: "salCode", label: "SAL Code" },
    { field: "pmName", label: "PM Name" },
    { field: "startDateText", label: "Start Date" },
    { field: "endDateText", label: "End Date" },
    { field: "workStatus", label: "Work Status" },
    { field: "asset", label: "Asset", maxWidth: 160 },
    { field: "comments", label: "Comments", maxWidth: 200 },
    { field: "activity", label: "Activity", maxWidth: 160 },
  ];

  const visibleRows = rows.filter((r) => FILTERS.every((f) => !filters[f.key].length || f.get(r).some((v) => filters[f.key].includes(v))));
  const filterOptions = Object.fromEntries(FILTERS.map((f) => [f.key, [...new Set(rows.flatMap(f.get).filter(Boolean))].sort((a, b) => a.localeCompare(b))]));

  // date range lives inside the table's own Filters panel (applied together with the column filters)
  const dateFilters = (
    <>
      <FormDate label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
      <FormDate label="To" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
      {FILTERS.map((f) => (
        <FormMultiSelect key={f.key} label={f.label} options={filterOptions[f.key]} value={filterDraft[f.key]} placeholder="All"
          onChange={(v) => setFilterDraft((d) => ({ ...d, [f.key]: v }))} />
      ))}
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
        data={visibleRows}
        multiSelect={false}
        filterComponents={dateFilters}
        onApplyFilters={() => { setFilters(filterDraft); run(); }}
        onResetFilters={() => { const f = defaultFrom(), t = defaultTo(); setFrom(f); setTo(t); setFilterDraft(EMPTY_FILTER); setFilters(EMPTY_FILTER); run(f, t); }}
        externalFilters={[{ label: "Period", value: from || to ? `${from ? fmtDate(from) : "…"} to ${to ? fmtDate(to) : "…"}` : "" }, ...FILTERS.map((f) => ({ label: f.label, value: filters[f.key].join(", ") }))]}
      />
    </div>
  );
}
