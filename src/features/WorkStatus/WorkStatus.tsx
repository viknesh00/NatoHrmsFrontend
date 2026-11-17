import WorkflowDialog from "../../components/WorkflowDialog";
import { cn } from "cn";
import { Button } from "../../components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, Plus, Pencil, Trash2, X, AlertTriangle, Eye } from "lucide-react";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import ProTable from "../../components/ProTable";
import { FormInput, FormSelect, FormDate, FormCombo, FormCreatableMultiSelect, FormTextarea, FormMultiSelect } from "../../components/FormComponents";
import { getCookie } from "../../auth/Cookies";
import WorkStatusDetailSheet from "./WorkStatusDetailSheet";

const STATUS_OPTIONS = [{ label: "Active", value: "Active" }, { label: "Deactive", value: "Deactive" }];
const fmtDate = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "N/A");
const splitValues = (v) => (v ? String(v).split(";").map((x) => x.trim()).filter(Boolean) : []);
const TABLE_FILTERS = [
  { key: "salCodes", label: "SAL Code", get: (r) => [r.salCode] },
  { key: "pmNames", label: "PM Name", get: (r) => [r.pmName] },
  { key: "statuses", label: "Work Status", get: (r) => [r.workStatus] },
  { key: "assets", label: "Asset", get: (r) => splitValues(r.asset) },
  { key: "activities", label: "Activity", get: (r) => splitValues(r.activity) },
];
const EMPTY_TABLE_FILTERS = Object.fromEntries(TABLE_FILTERS.map((f) => [f.key, []]));
const EMPTY = { workStatusId: null, submissionId: "", salCode: "", pmName: "", startDate: "", endDate: "", workStatus: "Active", assets: [], comments: "", activities: [] };

export default function WorkStatus() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const employeeFilter = params.get("employee");        // opened from the Onboarding list for one employee
  const role = getCookie("role");
  const canEdit = role === "Admin" || role === "Manager";     // modify / delete
  const canWrite = canEdit || role === "TeamLead";            // add new

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pms, setPms] = useState([]);
  const [form, setForm] = useState(null);                // record being added / edited
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [assets, setAssets] = useState([]);
  const [activities, setActivities] = useState([]);
  const [optionDelete, setOptionDelete] = useState(null);
  const [filterDraft, setFilterDraft] = useState(EMPTY_TABLE_FILTERS);
  const [filters, setFilters] = useState(EMPTY_TABLE_FILTERS);

  const load = () => {
    setLoading(true);
    getRequest("WorkStatus/GetAll" + (employeeFilter ? `?submissionId=${employeeFilter}` : ""))
      .then((res) => setRows((res.data || []).map((r) => ({
        ...r,
        employeeName: `${r.firstName} ${r.lastName}`.trim(),
        startDateText: fmtDate(r.startDate),
        endDateText: r.endDate ? fmtDate(r.endDate) : "N/A",
        assetText: splitValues(r.asset).join(", ") || "N/A",
        commentsText: r.comments || "N/A",
        activityText: splitValues(r.activity).join(", ") || "N/A",
      }))))
      .catch((err) => ToastError(err.response?.data?.message || "Failed to load the work status records"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getRequest("EmployeeOnboarding/GetAll").then((res) => setEmployees(res.data || [])).catch(() => {});
    getRequest("WorkStatus/PmList").then((res) => setPms(res.data || [])).catch(() => {});
    getRequest("WorkStatus/Assets").then((res) => setAssets((res.data || []).map((a) => a.assetName))).catch(() => {});
    getRequest("WorkStatus/Activities").then((res) => setActivities((res.data || []).map((a) => a.activityName))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeFilter]);

  const employeeOptions = useMemo(() => [
    { label: "Select employee", value: "" },
    ...employees.map((e) => ({ label: `${e.firstName} ${e.lastName}${e.passportNo ? ` (${e.passportNo})` : ""}`, value: String(e.submissionId) })),
  ], [employees]);

  const openAdd = () => {
    const emp = employees.find((e) => String(e.submissionId) === employeeFilter);
    setErrors({});
    setForm({ ...EMPTY, submissionId: employeeFilter || "", salCode: emp?.salCode || "" });
  };
  const openEdit = (r) => {
    setErrors({});
    setForm({
      workStatusId: r.workStatusId, submissionId: String(r.submissionId), salCode: r.salCode, pmName: r.pmName,
      startDate: r.startDate ? r.startDate.split("T")[0] : "", endDate: r.endDate ? r.endDate.split("T")[0] : "", workStatus: r.workStatus,
      assets: splitValues(r.asset), comments: r.comments || "", activities: splitValues(r.activity),
    });
  };

  const set = (f) => (e) => { setForm((p) => ({ ...p, [f]: e.target.value })); setErrors((p) => ({ ...p, [f]: undefined })); };
  const pickEmployee = (e) => {
    const v = e.target.value;
    const emp = employees.find((x) => String(x.submissionId) === v);
    setForm((p) => ({ ...p, submissionId: v, salCode: p.salCode || emp?.salCode || "" }));
    setErrors((p) => ({ ...p, submissionId: undefined }));
  };

  const createOption = (kind, setOptions, field) => async (name) => {
    try {
      const res = await postRequest(`WorkStatus/${kind}`, { name });
      const saved = res?.data?.[field] || name;
      setOptions((prev) => prev.some((item) => item.toLowerCase() === saved.toLowerCase()) ? prev : [...prev, saved].sort((a, b) => a.localeCompare(b)));
      return saved;
    } catch (err) {
      ToastError(err.response?.data?.message || `Could not add the ${kind.toLowerCase()}`);
      return null;
    }
  };
  const confirmDeleteOption = () => {
    if (!optionDelete) return;
    const { kind, name } = optionDelete;
    setLoading(true);
    postRequest(`WorkStatus/${kind}/Delete`, { name })
      .then(() => {
        if (kind === "Asset") { setAssets((prev) => prev.filter((item) => item !== name)); setForm((prev) => prev ? { ...prev, assets: prev.assets.filter((item) => item !== name) } : prev); }
        else { setActivities((prev) => prev.filter((item) => item !== name)); setForm((prev) => prev ? { ...prev, activities: prev.activities.filter((item) => item !== name) } : prev); }
        setOptionDelete(null); ToastSuccess(`${kind} removed from the list`);
      })
      .catch((err) => ToastError(err.response?.data?.message || `Could not remove the ${kind.toLowerCase()}`))
      .finally(() => setLoading(false));
  };

  const save = () => {
    const e: Record<string, any> = {};
    if (!form.submissionId) e.submissionId = "Please select an employee";
    if (!form.salCode.trim()) e.salCode = "SAL Code is required";
    else if (!/^[A-Za-z0-9\-_/ ]{1,50}$/.test(form.salCode.trim())) e.salCode = "SAL Code contains invalid characters";
    if (!form.pmName.trim()) e.pmName = "PM Name is required";
    if (!form.startDate) e.startDate = "Start Date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = "End Date cannot be before Start Date";
    if (!["Active", "Deactive"].includes(form.workStatus)) e.workStatus = "Select Active or Deactive";
    if (Object.keys(e).length) { setErrors(e); return; }

    const pmName = form.pmName.trim();
    const pm = pms.find((p) => p.name === pmName);
    setLoading(true);
    postRequest("WorkStatus/Save", {
      workStatusId: form.workStatusId, submissionId: Number(form.submissionId), salCode: form.salCode.trim(),
      pmName, pmEmail: pm?.email || null,
      startDate: form.startDate, endDate: form.endDate || null, workStatus: form.workStatus,
      assets: form.assets, comments: form.comments.trim() || null, activities: form.activities,
    })
      .then(() => { ToastSuccess("Work status saved"); setForm(null); load(); })
      .catch((err) => {
        const data = err.response?.data;
        if (data?.errors && typeof data.errors === "object") setErrors(data.errors);
        ToastError(data?.message || "Failed to save the work status");
      })
      .finally(() => setLoading(false));
  };

  const confirmDelete = () => {
    setLoading(true);
    postRequest("WorkStatus/Delete", [deleteTarget.workStatusId])
      .then(() => { ToastSuccess("Work status deleted"); setDeleteTarget(null); load(); })
      .catch((err) => ToastError(err.response?.data?.message || "Failed to delete"))
      .finally(() => setLoading(false));
  };

  const columns = [
    { field: "workStatusId", label: "Record ID", filterable: true },
    { field: "submissionId", label: "Submission ID", filterable: true },
    { field: "employeeName", label: "Employee", filterable: true },
    { field: "passportNo", label: "Passport No.", filterable: true },
    { field: "salCode", label: "SAL Code" },
    { field: "pmName", label: "PM Name" },
    { field: "pmEmail", label: "PM Email", filterable: true },
    { field: "startDate", label: "Start Date", valueFormatter: fmtDate, filterable: true },
    { field: "endDate", label: "End Date", valueFormatter: fmtDate, filterable: true },
    { field: "workStatus", label: "Work Status" },
    { field: "asset", label: "Assets", valueFormatter: (value) => value ? splitValues(value).join(", ") : "N/A" },
    { field: "comments", label: "Comments", maxWidth: 280, filterable: true },
    { field: "activity", label: "Activities", valueFormatter: (value) => value ? splitValues(value).join(", ") : "N/A" },
    { field: "city", label: "City", filterable: true },
    { field: "country", label: "Country", filterable: true },
    { field: "employeeStatus", label: "Employee Status", filterable: true },
    { field: "hasSiemensIdCard", label: "Siemens ID Card", filterable: true },
    {
      field: "actions", label: "Actions",
      renderCell: (row) => (
        <div className="flex gap-[4px]" >
          <Button variant="ghost" type="button" className="icon-btn" title="View details" aria-label={`View work status details for ${row.employeeName}`} onClick={() => setDetailRecord(row)}><Eye size={15} /></Button>
          {canWrite && <Button variant="ghost" type="button" className="icon-btn" title="Edit" aria-label={`Edit work status for ${row.employeeName}`} onClick={() => openEdit(row)}><Pencil size={15} /></Button>}
          {canEdit && <Button variant="ghost" type="button" className="icon-btn" title="Delete" onClick={() => setDeleteTarget(row)}><Trash2 size={15} /></Button>}
        </div>
      ),
    },
  ];

  const filterOptions = useMemo(() => Object.fromEntries(TABLE_FILTERS.map((filter) => [filter.key, [...new Set(rows.flatMap(filter.get).filter(Boolean))].sort((a, b) => a.localeCompare(b))])), [rows]);
  const filteredRows = rows.filter((row) => TABLE_FILTERS.every((filter) => !filters[filter.key].length || filter.get(row).some((value) => filters[filter.key].includes(String(value)))));
  const updateFilterDraft = (patch) => setFilterDraft((prev) => ({ ...prev, ...patch }));
  const tableFilterFields = <>{TABLE_FILTERS.map((filter) => <FormMultiSelect key={filter.key} label={filter.label} options={filterOptions[filter.key]} value={filterDraft[filter.key]} onChange={(value) => updateFilterDraft({ [filter.key]: value })} placeholder="All" />)}</>;
  const activeFilterChips = TABLE_FILTERS.map((filter) => ({ label: filter.label, value: filters[filter.key].join(", ") }));

  const card = { background: "var(--card)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", width: "100%", overflow: "hidden" };

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Briefcase size={13} />} items={[{ label: "Work Status" }]} />
          <h1 className="page-title">Work Status</h1>
          <p className="page-subtitle">SAL Code, PM and work period of each employee{employeeFilter ? " (one employee)" : ""}</p>
        </div>
        <div className="flex gap-[12px] flex-wrap" >
          {employeeFilter && <Button variant="outline" type="button" className="btn btn-outline" onClick={() => navigate("/work-status")}>Show all</Button>}
          {canWrite && <Button variant="default" type="button" className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add work status</Button>}
        </div>
      </div>

      <ProTable title="Work Status" columns={columns} data={filteredRows} multiSelect={false} onRowClick={setDetailRecord} getRowLabel={(row) => `View work status details for ${row.employeeName}`} filterComponents={tableFilterFields} onApplyFilters={() => setFilters(filterDraft)} onResetFilters={() => { setFilterDraft(EMPTY_TABLE_FILTERS); setFilters(EMPTY_TABLE_FILTERS); }} externalFilters={activeFilterChips} />

      <WorkStatusDetailSheet
        record={detailRecord}
        onOpenChange={(open) => { if (!open) setDetailRecord(null); }}
        canEdit={canEdit}
        onEdit={(record) => { setDetailRecord(null); openEdit(record); }}
      />

      {form && <WorkflowDialog title="Work status" onClose={() => setForm(null)} busy={loading} width="560px" dismissible={true}>
<div className="max-w-[560px]" style={{...card}} onClick={(e) => e.stopPropagation()}>
            <div className="h-[4px] bg-primary"  />
            <div className="p-[20px_24px_8px] flex justify-between items-center" >
              <div className="text-[18px] font-semibold text-[var(--text-primary)]" style={{fontFamily: "var(--ui-font-heading)"}}>{form.workStatusId ? "Edit work status" : "Add work status"}</div>
              <Button variant="ghost" type="button" onClick={() => setForm(null)} className="w-[36px] h-[36px] bg-muted cursor-pointer flex items-center justify-center text-muted-foreground" style={{borderRadius: "var(--radius)", border: "none"}}><X size={16} /></Button>
            </div>
            <div className="p-[8px_24px_4px] max-h-[70vh] overflow-y-auto" >
              <FormSelect label="Employee" required options={employeeOptions} value={form.submissionId} onChange={pickEmployee} error={errors.submissionId} disabled={!!form.workStatusId} />
              <div className="fc-row fc-row-2">
                <FormInput label="SAL Code" required value={form.salCode} onChange={set("salCode")} error={errors.salCode} maxLength={50} />
                <FormCombo label="PM Name" required options={pms.map((p) => p.name)} value={form.pmName} error={errors.pmName} maxLength={150}
                  placeholder="Select or type the PM name"
                  onChange={(v) => { setForm((p) => ({ ...p, pmName: v })); setErrors((p) => ({ ...p, pmName: undefined })); }} />
                <FormDate label="Start Date" required value={form.startDate} onChange={set("startDate")} error={errors.startDate} />
                <FormDate label="End Date" value={form.endDate} onChange={set("endDate")} error={errors.endDate} min={form.startDate || undefined} />
              </div>
              <div className="fc-row fc-row-2">
                <FormSelect label="Work Status" required options={STATUS_OPTIONS} value={form.workStatus} onChange={set("workStatus")} error={errors.workStatus} />
                <FormCreatableMultiSelect label="Activity" options={activities} value={form.activities} error={errors.activity} placeholder={canEdit ? "Select or add activities" : "Select activities"} onCreate={canEdit ? createOption("Activity", setActivities, "activityName") : undefined} onDeleteOption={canEdit ? (name) => setOptionDelete({ kind: "Activity", name }) : undefined} onChange={(v) => setForm((p) => ({ ...p, activities: v }))} />
              </div>
              <FormCreatableMultiSelect label="Asset" options={assets} value={form.assets} error={errors.asset} placeholder={canEdit ? "Select or add assets" : "Select assets"} onCreate={canEdit ? createOption("Asset", setAssets, "assetName") : undefined} onDeleteOption={canEdit ? (name) => setOptionDelete({ kind: "Asset", name }) : undefined} onChange={(v) => setForm((p) => ({ ...p, assets: v }))} />
              <FormTextarea label="Comments" value={form.comments} onChange={set("comments")} error={errors.comments} maxLength={1000} rows={3} placeholder="Any notes for this work status" />
            </div>
            <div className="p-[12px_24px_20px] flex gap-[12px] justify-end" style={{borderTop: "1px solid var(--border)"}}>
              <Button variant="outline" type="button" className="btn btn-outline" onClick={() => setForm(null)}>Cancel</Button>
              <Button variant="default" type="button" className="btn btn-primary" onClick={save}>Save</Button>
            </div>
          </div>
</WorkflowDialog>}

      {deleteTarget && <WorkflowDialog title="Delete work status?" onClose={() => setDeleteTarget(null)} busy={loading} width="420px" dismissible={true}>
<div className="max-w-[420px] p-[24px]" style={{...card}} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-[12px] mb-[12px] text-error font-semibold text-[16px]" ><AlertTriangle size={20} /> Delete work status?</div>
            <p className="text-[14px] text-[var(--text-secondary)] mb-[20px]" >
              The record of {deleteTarget.employeeName} ({deleteTarget.salCode}, {deleteTarget.startDateText}) will be removed from the list. It is kept in the database (soft delete).
            </p>
            <div className="flex gap-[12px] justify-end" >
              <Button variant="outline" type="button" className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="default" type="button" className={cn("btn btn-primary", "bg-error")}  onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
</WorkflowDialog>}
      {optionDelete && <WorkflowDialog title={`Remove ${optionDelete.kind}?`} onClose={() => setOptionDelete(null)} busy={loading} width="420px" dismissible={true}>
        <div className="max-w-[420px] p-[24px] bg-card" style={{ borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)" }} onClick={(e) => e.stopPropagation()}>
          <div className="mb-[12px] flex items-center gap-[12px] font-semibold text-error"><AlertTriangle size={20} /> Remove {optionDelete.kind}?</div>
          <p className="mb-[20px] text-[14px] text-muted-foreground">“{optionDelete.name}” will be removed from the available options.</p>
          <div className="flex justify-end gap-[12px]">
            <Button variant="outline" type="button" className="btn btn-outline" onClick={() => setOptionDelete(null)}>Cancel</Button>
            <Button variant="default" type="button" className={cn("btn btn-primary", "bg-error")} onClick={confirmDeleteOption}>Remove</Button>
          </div>
        </div>
      </WorkflowDialog>}
    </div>
  );
}
