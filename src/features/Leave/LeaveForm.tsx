import { Button } from "../../components/ui/button";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import { getCookie } from "../../auth/Cookies";
import { postRequest } from "../../shared/services/Apiservice";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { FormInput, FormDate, FormDropdown, FormTextarea, FormCheckbox, FormCard, FormSection, FormRow } from "../../components/FormComponents";
import { UserMinus, Save, X } from "lucide-react";

const LEAVE_TYPES = ["Casual Leave","Sick Leave","Paid Leave","Unpaid Leave","Compensatory Off"].map(v=>({label:v,value:v}));
const DAY_TYPES   = ["Full Day","Half Day","Off Day"].map(v=>({label:v,value:v}));

const LeaveForm = () => {
  const navigate = useNavigate();
  const location  = useLocation();
  const editData  = location.state?.editData || null;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, any>>({});

  // Handles both "DD-MM-YYYY" and ISO "2026-04-01T00:00:00" → "YYYY-MM-DD"
  const parseDMY = (s) => {
    if (!s) return "";
    // ISO datetime string e.g. "2026-04-01T00:00:00"
    if (s.includes("T")) return s.split("T")[0];
    const parts = s.split(/[-/]/);
    if (parts.length !== 3) return "";
    const [d, m, y] = parts;
    // If first part is 4 digits it's already YYYY-MM-DD
    if (d.length === 4) return `${d}-${m.padStart(2,"0")}-${parts[2].padStart(2,"0")}`;
    // DD-MM-YYYY → YYYY-MM-DD
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  };

  const [form, setForm] = useState({
    leaveId:      editData?.leaveId ?? null,
    employeeName: getCookie("firstName") + " " + getCookie("lastName"),
    userName:     getCookie("email"),
    fromDate:     editData?.fromDate ? parseDMY(editData.fromDate) : "",
    toDate:       editData?.toDate   ? parseDMY(editData.toDate)   : "",
    leaveType:    editData?.leaveType || "",
    dayType:      editData?.dayType   || "",
    reason:       editData?.reason    || "",
    cancelLeave:  editData?.cancelLeave || false,
    isApproved:   editData?.isApproved || false,
  });

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const validate = () => {
    const e: Record<string, any> = {};
    if (!form.fromDate) e.fromDate = "From date is required";
    if (!form.toDate)   e.toDate   = "To date is required";
    if (form.fromDate && form.toDate && form.toDate < form.fromDate) e.toDate = "To date must be after from date";
    if (!form.leaveType) e.leaveType = "Leave type is required";
    if (!form.dayType)   e.dayType   = "Day type is required";
    if (!form.reason || !form.reason.trim()) e.reason = "Reason is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) { ToastError("Please fill all required fields"); return; }
    setLoading(true);
    postRequest("User/ApplyLeave", {
      ...form,
      fromDate: form.fromDate,
      toDate:   form.toDate,
    }).then(res => {
      if (res.status === 200) { ToastSuccess(res.data.message); navigate("/leave"); }
    }).catch(err => { ToastError(err?.response?.data?.message || "Failed to save"); })
      .finally(() => setLoading(false));
  };

  const daysCount = () => {
    if (!form.fromDate || !form.toDate) return null;
    const from = new Date(form.fromDate), to = new Date(form.toDate);
    const diff = Math.ceil((to.getTime() - from.getTime()) / (1000*60*60*24)) + 1;
    return diff > 0 ? diff : null;
  };

  const days = daysCount();

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<UserMinus size={13} />} items={[{ label:"Leave", link:"/leave" }, { label: editData ? "Edit Leave" : "Apply Leave" }]} />
          <h1 className="page-title">{editData ? "Edit Leave Request" : "Apply for Leave"}</h1>
          <p className="page-subtitle">Submit your leave request for approval</p>
        </div>
      </div>

      <div className="max-w-[700px] m-[0_auto]" >
        <FormCard
          icon={<UserMinus />}
          title={editData ? "Edit Leave Request" : "New Leave Application"}
          subtitle="Fill in the details below and submit for manager approval"
          footer={
            <>
              <Button variant="outline" type="button" className="btn btn-ghost" onClick={() => navigate("/leave")}><X size={15}/> Cancel</Button>
              <Button variant="default" type="button" className="btn btn-primary" onClick={handleSave}><Save size={15}/> {editData ? "Update" : "Submit"} Request</Button>
            </>
          }
        >
          <FormSection title="Employee Information">
            <FormRow cols={2}>
              <FormInput label="Employee Name" value={form.employeeName} readOnly />
              <FormInput label="Email Address" value={form.userName} readOnly />
            </FormRow>
          </FormSection>

          <FormSection title="Leave Details">
            <FormRow cols={2}>
              <FormDate label="From Date" required value={form.fromDate} onChange={e => set("fromDate")(e.target.value)} error={errors.fromDate} max={form.toDate || undefined} />
              <FormDate label="To Date" required value={form.toDate} onChange={e => set("toDate")(e.target.value)} error={errors.toDate} min={form.fromDate || undefined} />
            </FormRow>

            {days && (
              <div className="bg-[var(--primary-ghost)] p-[12px_16px] mb-[20px] flex items-center gap-[8px]" style={{border:"1px solid var(--border-strong)", borderRadius:"var(--radius)"}}>
                <span className="text-[12px] font-semibold text-primary uppercase tracking-[0.05em]" >Duration</span>
                <span className="text-[14px] font-semibold text-primary" >{days} day{days>1?"s":""}</span>
              </div>
            )}

            <FormRow cols={2}>
              <FormDropdown label="Day Type" required options={DAY_TYPES} value={form.dayType} onChange={o => set("dayType")(o.value)} error={errors.dayType} placeholder="Select day type..." />
              <FormDropdown label="Leave Type" required options={LEAVE_TYPES} value={form.leaveType} onChange={o => set("leaveType")(o.value)} error={errors.leaveType} placeholder="Select leave type..." />
            </FormRow>

            <FormTextarea label="Reason for Leave" required value={form.reason} onChange={e => set("reason")(e.target.value)} placeholder="Briefly describe the reason for your leave..." rows={3} error={errors.reason}
/>

            {editData && (() => {
              // Use raw editData.fromDate for reliable comparison
              const fromStr = editData.fromDate ? parseDMY(editData.fromDate) : form.fromDate;
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
              const isPast = fromStr && fromStr < todayStr;
              if (isPast) return null;
              return (
                <FormCheckbox label="Cancel this leave request" checked={form.cancelLeave} onChange={v => set("cancelLeave")(v)} />
              );
            })()}
          </FormSection>
        </FormCard>
      </div>
    </div>
  );
};

export default LeaveForm;
