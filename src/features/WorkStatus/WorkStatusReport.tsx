import React, { useEffect, useState } from "react";
import { FileBarChart2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { getRequest } from "../../shared/services/Apiservice";
import { ToastError } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import ProTable from "../../components/ProTable";
import { FormDate, FormMultiSelect } from "../../components/FormComponents";
import { Button } from "../../components/ui/button";
import { getCookie } from "../../auth/Cookies";
import WorkStatusDetailSheet from "./WorkStatusDetailSheet";

const fmtDate = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "N/A");
const split = (value) => (value ? String(value).split(",").map((item) => item.trim()).filter(Boolean) : []);
const FILTERS = [
  { key: "employeeStatuses", label: "Employee Status", get: (row) => [row.employeeStatus] },
  { key: "salCodes", label: "SAL Code", get: (row) => [row.salCode] },
  { key: "pmNames", label: "PM Name", get: (row) => [row.pmName] },
  { key: "statuses", label: "Work Status", get: (row) => [row.workStatus] },
  { key: "assets", label: "Asset", get: (row) => (row.asset === "N/A" ? [] : split(row.asset)) },
  { key: "activities", label: "Activity", get: (row) => (row.activity === "N/A" ? [] : split(row.activity)) },
];
const EMPTY_FILTER = Object.fromEntries(FILTERS.map(({ key }) => [key, []]));

export default function WorkStatusReport() {
  const navigate = useNavigate();
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
  const [detailRecord, setDetailRecord] = useState(null);

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
        asset: (r.asset ? String(r.asset).split(";").map((item) => item.trim()).filter(Boolean).join(", ") : "") || "N/A",
        comments: r.comments || "N/A",
        activity: (r.activity || "").split(";").map((item) => item.trim()).filter(Boolean).join(", ") || "N/A",
      }))))
      .catch((err) => ToastError(err.response?.data?.message || "Failed to load the report"))
      .finally(() => setLoading(false));
  };

  // Keep the initial report fetch independent from edits to the date filter fields.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (allowed) run(); }, [allowed]);

  if (!allowed) {
    return <div className="p-[24px] text-[var(--text-muted)]" >The Work Status report is not available for your role.</div>;
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
    { field: "asset", label: "Asset", maxWidth: 160 },
    { field: "comments", label: "Comments", maxWidth: 280 },
    { field: "activity", label: "Activity", maxWidth: 200 },
    {
      field: "details", label: "Details",
      renderCell: (row) => <Button variant="ghost" size="icon-sm" type="button" title="View details" aria-label={`View work status details for ${row.employeeName}`} onClick={() => setDetailRecord(row)}><Eye size={15} aria-hidden="true" /></Button>,
    },
  ];

  const visibleRows = rows.filter((row) => FILTERS.every(({ key, get }) =>
    !filters[key].length || get(row).some((value) => filters[key].includes(value))
  ));
  const filterOptions = Object.fromEntries(FILTERS.map(({ key, get }) => [
    key,
    [...new Set(rows.flatMap(get).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
  ]));

  // date range lives inside the table's own Filters panel (applied together with the column filters)
  const dateFilters = (
    <>
      <FormDate label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
      <FormDate label="To" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
      {FILTERS.map((filter) => (
        <FormMultiSelect
          key={filter.key}
          label={filter.label}
          options={filterOptions[filter.key]}
          value={filterDraft[filter.key]}
          placeholder="All"
          onChange={(value) => setFilterDraft((draft) => ({ ...draft, [filter.key]: value }))}
        />
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
        onRowClick={setDetailRecord}
        getRowLabel={(row) => `View work status details for ${row.employeeName}`}
        filterComponents={dateFilters}
        onApplyFilters={() => { setFilters(filterDraft); run(); }}
        onResetFilters={() => { const f = defaultFrom(), t = defaultTo(); setFrom(f); setTo(t); setFilterDraft(EMPTY_FILTER); setFilters(EMPTY_FILTER); run(f, t); }}
        externalFilters={[
          { label: "Period", value: from || to ? `${from ? fmtDate(from) : "…"} to ${to ? fmtDate(to) : "…"}` : "" },
          ...FILTERS.map(({ key, label }) => ({ label, value: filters[key].join(", ") })),
        ]}
      />
      <WorkStatusDetailSheet
        record={detailRecord}
        onOpenChange={(open) => { if (!open) setDetailRecord(null); }}
        onOpenWorkStatuses={(record) => {
          setDetailRecord(null);
          navigate(`/work-status?employee=${encodeURIComponent(record.submissionId)}`);
        }}
      />
    </div>
  );
}
