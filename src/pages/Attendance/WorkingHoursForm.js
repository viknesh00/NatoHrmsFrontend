import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { postRequest } from "../../services/Apiservice";
import { ToastSuccess, ToastError } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { FormInput, FormTime, FormCheckbox, FormCard, FormSection, FormRow } from "../../components/FormComponents";
import { Clock, Save, Users, X } from "lucide-react";

const WorkingHoursForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData || null;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const [form, setForm] = useState({
    deptId:          editData?.deptId ?? null,
    departmentName:  editData?.departmentName || editData?.department || "",
    startTime:       editData?.startTime ? editData.startTime.substring(0, 5) : "",
    endTime:         editData?.endTime   ? editData.endTime.substring(0, 5)   : "",
    includeSaturday: editData?.includeSaturday ?? false,
    includeSunday:   editData?.includeSunday   ?? false,
  });

  const set = (f) => (v) => setForm(prev => ({ ...prev, [f]: v }));

  const validate = () => {
    const e = {};
    if (!form.departmentName.trim()) e.dept      = "Department name is required";
    if (!form.startTime)             e.startTime = "Start time is required";
    if (!form.endTime)               e.endTime   = "End time is required";
    if (form.startTime && form.endTime && form.endTime <= form.startTime)
      e.endTime = "End time must be after start time";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const calcHours = () => {
    if (!form.startTime || !form.endTime) return null;
    const [sh, sm] = form.startTime.split(":").map(Number);
    const [eh, em] = form.endTime.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) return null;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const hours = calcHours();

  const handleSave = () => {
    if (!validate()) { ToastError("Please fill all required fields"); return; }
    const payload = {
      deptId:          form.deptId,
      departmentName:  form.departmentName,
      startTime:       form.startTime + ":00",
      endTime:         form.endTime + ":00",
      includeSaturday: form.includeSaturday,
      includeSunday:   form.includeSunday,
    };
    setLoading(true);
    postRequest("Attendance/InsertOrUpdateDepartmentTiming", payload)
      .then(res => {
        if (res.status === 200) {
          ToastSuccess(res.data?.message || "Saved");
          navigate("/employees/working-hours");
        }
      })
      .catch(err => ToastError(err?.response?.data?.message || "Failed"))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb
            icon={<Users size={13} />}
            items={[
              { label: "Employees", link: "/employees" },
              { label: "Departments", link: "/employees/working-hours" },
              { label: editData ? "Edit Timing" : "Add Timing" },
            ]}
          />
          <h1 className="page-title">{editData ? "Edit Department Timing" : "Add Department Timing"}</h1>
          <p className="page-subtitle">Configure working hours for this department</p>
        </div>
      </div>

      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <FormCard
          icon={<Clock />}
          title={editData ? "Edit Timing" : "New Department Timing"}
          subtitle="Define working hours and weekend policy for this department"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => navigate("/employees/working-hours")}>
                <X size={15} /> Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={15} /> {editData ? "Update" : "Save"}
              </button>
            </>
          }
        >
          <FormSection title="Department Information">
            <FormInput
              label="Department Name"
              required
              value={form.departmentName}
              onChange={e => set("departmentName")(e.target.value)}
              error={errors.dept}
              disabled={!!editData}
              placeholder="e.g. Information Technology"
            />
          </FormSection>

          <FormSection title="Working Hours">
            <FormRow cols={2}>
              <FormTime
                label="Start Time"
                required
                value={form.startTime}
                onChange={e => set("startTime")(e.target.value)}
                error={errors.startTime}
              />
              <FormTime
                label="End Time"
                required
                value={form.endTime}
                onChange={e => set("endTime")(e.target.value)}
                error={errors.endTime}
              />
            </FormRow>

            {hours && (
              <div style={{ background: "var(--teal-ghost)", border: "1px solid var(--teal)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={15} color="var(--teal)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--teal)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Hours:</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--teal)" }}>{hours}</span>
              </div>
            )}
          </FormSection>

          <FormSection title="Weekend Policy">
            <div style={{ display: "flex", gap: 24 }}>
              <FormCheckbox
                label="Include Saturday"
                checked={form.includeSaturday}
                onChange={v => set("includeSaturday")(v)}
              />
              <FormCheckbox
                label="Include Sunday"
                checked={form.includeSunday}
                onChange={v => set("includeSunday")(v)}
              />
            </div>
          </FormSection>
        </FormCard>
      </div>
    </div>
  );
};

export default WorkingHoursForm;