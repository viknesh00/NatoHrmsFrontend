import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import { getCookie } from "../../services/Cookies";
import { postRequest } from "../../services/Apiservice";
import { format, parse, isAfter, isBefore, isEqual } from "date-fns";
import Breadcrumb from "../../services/Breadcrumb";
import { FormInput, FormDate, FormSelect, FormDropdown, FormTextarea, FormCheckbox, FormCard, FormSection, FormRow } from "../../components/FormComponents";
import { UserMinus, Save, X } from "lucide-react";

const LEAVE_TYPES = ["Casual Leave","Sick Leave","Paid Leave","Unpaid Leave","Compensatory Off"].map(v=>({label:v,value:v}));
const DAY_TYPES   = ["Full Day","Half Day","Off Day"].map(v=>({label:v,value:v}));

const LeaveForm = () => {
  const navigate = useNavigate();
  const location  = useLocation();
  const editData  = location.state?.editData || null;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const parseDMY = (s) => {
    if (!s) return "";
    const parts = s.split(/[-/]/);
    if (parts.length !== 3) return "";
    // handles DD-MM-YYYY → YYYY-MM-DD for date input
    const [d,m,y] = parts;
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
    const e = {};
    if (!form.fromDate) e.fromDate = "From date is required";
    if (!form.toDate)   e.toDate   = "To date is required";
    if (form.fromDate && form.toDate && form.toDate < form.fromDate) e.toDate = "To date must be after from date";
    if (!form.leaveType) e.leaveType = "Leave type is required";
    if (!form.dayType)   e.dayType   = "Day type is required";
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
    const diff = Math.ceil((to - from) / (1000*60*60*24)) + 1;
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

      <div style={{ maxWidth:700, margin:"0 auto" }}>
        <FormCard
          icon={<UserMinus />}
          title={editData ? "Edit Leave Request" : "New Leave Application"}
          subtitle="Fill in the details below and submit for manager approval"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => navigate("/leave")}><X size={15}/> Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={15}/> {editData ? "Update" : "Submit"} Request</button>
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
              <div style={{ background:"var(--primary-ghost)", border:"1px solid var(--border-strong)", borderRadius:10, padding:"10px 14px", marginBottom:18, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"var(--primary)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Duration</span>
                <span style={{ fontSize:14, fontWeight:800, color:"var(--primary)" }}>{days} day{days>1?"s":""}</span>
              </div>
            )}

            <FormRow cols={2}>
              <FormDropdown label="Day Type" required options={DAY_TYPES} value={form.dayType} onChange={o => set("dayType")(o.value)} error={errors.dayType} placeholder="Select day type..." />
              <FormDropdown label="Leave Type" required options={LEAVE_TYPES} value={form.leaveType} onChange={o => set("leaveType")(o.value)} error={errors.leaveType} placeholder="Select leave type..." />
            </FormRow>

            <FormTextarea label="Reason for Leave" value={form.reason} onChange={e => set("reason")(e.target.value)} placeholder="Briefly describe the reason for your leave..." rows={3} />

            {editData && (
              <FormCheckbox label="Cancel this leave request" checked={form.cancelLeave} onChange={v => set("cancelLeave")(v)} />
            )}
          </FormSection>
        </FormCard>
      </div>
    </div>
  );
};

export default LeaveForm;
