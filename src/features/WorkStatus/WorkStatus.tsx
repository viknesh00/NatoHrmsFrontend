import WorkflowDialog from "../../components/WorkflowDialog";
import { cn } from "cn";
import { Button } from "../../components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import ProTable from "../../components/ProTable";
import { FormInput, FormSelect, FormDate, FormCombo } from "../../components/FormComponents";
import { getCookie } from "../../auth/Cookies";

const STATUS_OPTIONS = [{ label: "Active", value: "Active" }, { label: "Deactive", value: "Deactive" }];
const fmtDate = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "—");
const EMPTY = { workStatusId: null, submissionId: "", salCode: "", pmName: "", startDate: "", endDate: "", workStatus: "Active" };

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

  const load = () => {
    setLoading(true);
    getRequest("WorkStatus/GetAll" + (employeeFilter ? `?submissionId=${employeeFilter}` : ""))
      .then((res) => setRows((res.data || []).map((r) => ({
        ...r,
        employeeName: `${r.firstName} ${r.lastName}`.trim(),
        startDateText: fmtDate(r.startDate),
        endDateText: r.endDate ? fmtDate(r.endDate) : "—",
      }))))
      .catch((err) => ToastError(err.response?.data?.message || "Failed to load the work status records"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getRequest("EmployeeOnboarding/GetAll").then((res) => setEmployees(res.data || [])).catch(() => {});
    getRequest("WorkStatus/PmList").then((res) => setPms(res.data || [])).catch(() => {});
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
    });
  };

  const set = (f) => (e) => { setForm((p) => ({ ...p, [f]: e.target.value })); setErrors((p) => ({ ...p, [f]: undefined })); };
  const pickEmployee = (e) => {
    const v = e.target.value;
    const emp = employees.find((x) => String(x.submissionId) === v);
    setForm((p) => ({ ...p, submissionId: v, salCode: p.salCode || emp?.salCode || "" }));
    setErrors((p) => ({ ...p, submissionId: undefined }));
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
    { field: "employeeName", label: "Employee" },
    { field: "passportNo", label: "Passport No." },
    { field: "salCode", label: "SAL Code", filterable: true },
    { field: "pmName", label: "PM Name", filterable: true },
    { field: "startDateText", label: "Start Date" },
    { field: "endDateText", label: "End Date" },
    { field: "workStatus", label: "Work Status", filterable: true },
    ...(canEdit ? [{
      field: "actions", label: "Actions",
      renderCell: (row) => (
        <div className="flex gap-[4px]" >
          <Button variant="ghost" type="button" className="icon-btn" title="Edit" onClick={() => openEdit(row)}><Pencil size={15} /></Button>
          <Button variant="ghost" type="button" className="icon-btn" title="Delete" onClick={() => setDeleteTarget(row)}><Trash2 size={15} /></Button>
        </div>
      ),
    }] : []),
  ];

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

      <ProTable title="Work Status" columns={columns} data={rows} multiSelect={false} />

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
              <FormSelect label="Work Status" required options={STATUS_OPTIONS} value={form.workStatus} onChange={set("workStatus")} error={errors.workStatus} />
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
    </div>
  );
}
