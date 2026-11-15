import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { Briefcase, Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../services/Apiservice";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable from "../../components/ProTable";
import { FormInput, FormSelect, FormDate, FormCombo, FormCreatableMultiSelect, FormTextarea } from "../../components/FormComponents";
import { getCookie } from "../../services/Cookies";

const STATUS_OPTIONS = [{ label: "Active", value: "Active" }, { label: "Deactive", value: "Deactive" }];
const fmtDate = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "—");
const EMPTY = { workStatusId: null, submissionId: "", salCode: "", pmName: "", startDate: "", endDate: "", workStatus: "Active", asset: "", comments: "", activities: [] };
const splitActivities = (v) => (v ? String(v).split(";").map((x) => x.trim()).filter(Boolean) : []);   // a record keeps several activities as "A; B"

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
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activityDelete, setActivityDelete] = useState(null);  // activity waiting for the delete confirmation
  const [activities, setActivities] = useState([]);       // Activity master values for the dropdown

  const load = () => {
    setLoading(true);
    getRequest("WorkStatus/GetAll" + (employeeFilter ? `?submissionId=${employeeFilter}` : ""))
      .then((res) => setRows((res.data || []).map((r) => ({
        ...r,
        employeeName: `${r.firstName} ${r.lastName}`.trim(),
        startDateText: fmtDate(r.startDate),
        endDateText: r.endDate ? fmtDate(r.endDate) : "—",
        assetText: r.asset || "—",           // "—" is only for the table, the edit form uses the real values
        commentsText: r.comments || "—",
        activityText: splitActivities(r.activity).join(", ") || "—",
      }))))
      .catch((err) => ToastError(err.response?.data?.message || "Failed to load the work status records"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getRequest("EmployeeOnboarding/GetAll").then((res) => setEmployees(res.data || [])).catch(() => {});
    getRequest("WorkStatus/Activities").then((res) => setActivities((res.data || []).map((a) => a.activityName))).catch(() => {});
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
      asset: r.asset || "", comments: r.comments || "", activities: splitActivities(r.activity),
    });
  };

  // "+ Add" in the Activity dropdown: the new value is saved in the master table and is offered from now on
  const createActivity = async (name) => {
    try {
      const res = await postRequest("WorkStatus/Activity", { name });
      const saved = res.data?.activityName || name;
      setActivities((prev) => (prev.some((a) => a.toLowerCase() === saved.toLowerCase()) ? prev : [...prev, saved].sort((a, b) => a.localeCompare(b))));
      return saved;
    } catch (err) {
      ToastError(err.response?.data?.message || "Could not add the activity");
      throw err;
    }
  };

  // removes a saved value from the dropdown (soft delete in the master). Records that already use it keep the text.
  const confirmDeleteActivity = () => {
    const name = activityDelete;
    setLoading(true);
    postRequest("WorkStatus/Activity/Delete", { name })
      .then(() => {
        setActivities((prev) => prev.filter((a) => a !== name));
        setForm((p) => (p ? { ...p, activities: p.activities.filter((a) => a !== name) } : p));
        setActivityDelete(null);
        ToastSuccess("Activity removed from the list");
      })
      .catch((err) => ToastError(err.response?.data?.message || "Could not remove the activity"))
      .finally(() => setLoading(false));
  };

  const set = (f) => (e) => { setForm((p) => ({ ...p, [f]: e.target.value })); setErrors((p) => ({ ...p, [f]: undefined })); };
  const pickEmployee = (e) => {
    const v = e.target.value;
    const emp = employees.find((x) => String(x.submissionId) === v);
    setForm((p) => ({ ...p, submissionId: v, salCode: p.salCode || emp?.salCode || "" }));
    setErrors((p) => ({ ...p, submissionId: undefined }));
  };

  const save = () => {
    const e = {};
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
      asset: form.asset.trim() || null, comments: form.comments.trim() || null, activities: form.activities,
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
    { field: "assetText", label: "Asset", filterable: true },
    { field: "commentsText", label: "Comments" },
    { field: "activityText", label: "Activity" },
    ...(canEdit ? [{
      field: "actions", label: "Actions",
      renderCell: (row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button className="icon-btn" title="Edit" onClick={() => openEdit(row)}><Pencil size={15} /></button>
          <button className="icon-btn" title="Delete" onClick={() => setDeleteTarget(row)}><Trash2 size={15} /></button>
        </div>
      ),
    }] : []),
  ];

  const overlay = { position: "fixed", inset: 0, background: "rgba(16,24,20,0.46)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
  const card = { background: "white", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "100%", overflow: "hidden" };

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Briefcase size={13} />} items={[{ label: "Work Status" }]} />
          <h1 className="page-title">Work Status</h1>
          <p className="page-subtitle">SAL Code, PM and work period of each employee{employeeFilter ? " (one employee)" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {employeeFilter && <button className="btn btn-outline" onClick={() => navigate("/work-status")}>Show all</button>}
          {canWrite && <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add work status</button>}
        </div>
      </div>

      <ProTable title="Work Status" columns={columns} data={rows} multiSelect={false} />

      {form && createPortal(
        <div style={overlay}>
          <div style={{ ...card, maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 4, background: "var(--primary)" }} />
            <div style={{ padding: "20px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "var(--ui-font-heading)", fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>{form.workStatusId ? "Edit work status" : "Add work status"}</div>
              <button onClick={() => setForm(null)} style={{ width: 30, height: 30, borderRadius: 8, background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}><X size={16} /></button>
            </div>
            <div style={{ padding: "8px 24px 4px", maxHeight: "70vh", overflowY: "auto", minHeight: 360 }}>
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
                <FormCreatableMultiSelect label="Activity" options={activities} value={form.activities} error={errors.activity}
                  placeholder="Select or add activities" onCreate={createActivity}
                  onDeleteOption={canEdit ? (name) => setActivityDelete(name) : undefined}
                  onChange={(v) => { setForm((p) => ({ ...p, activities: v })); setErrors((p) => ({ ...p, activity: undefined })); }} />
              </div>
              <FormInput label="Asset" value={form.asset} onChange={set("asset")} error={errors.asset} maxLength={200} placeholder="e.g. Laptop, Access card" />
              <FormTextarea label="Comments" value={form.comments} onChange={set("comments")} error={errors.comments} maxLength={1000} rows={3} placeholder="Any notes for this work status" />
            </div>
            <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-outline" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {activityDelete && createPortal(
        <div style={{ ...overlay, zIndex: 10100 }}>
          <div style={{ ...card, maxWidth: 420, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, color: "#e11d48", fontWeight: 800, fontSize: 16 }}><AlertTriangle size={20} /> Remove activity?</div>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 18 }}>
              "{activityDelete}" will no longer be offered in the Activity list. Work status records that already use it keep the value.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setActivityDelete(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: "#e11d48" }} onClick={confirmDeleteActivity}>Remove</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteTarget && createPortal(
        <div style={overlay}>
          <div style={{ ...card, maxWidth: 420, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, color: "#e11d48", fontWeight: 800, fontSize: 16 }}><AlertTriangle size={20} /> Delete work status?</div>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 18 }}>
              The record of {deleteTarget.employeeName} ({deleteTarget.salCode}, {deleteTarget.startDateText}) will be removed from the list. It is kept in the database (soft delete).
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: "#e11d48" }} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
