import { Button } from "../../components/ui/button";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { postRequest } from "../../shared/services/Apiservice";
import { ToastSuccess, ToastError } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { FormInput, FormTime, FormCheckbox, FormCard, FormSection, FormRow } from "../../components/FormComponents";
import { Clock, Save, Users, X } from "lucide-react";

const WorkingHoursForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData || null;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, any>>({});

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
    const e: Record<string, any> = {};
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

      <div className="max-w-[620px] m-[0_auto]" >
        <FormCard
          icon={<Clock />}
          title={editData ? "Edit Timing" : "New Department Timing"}
          subtitle="Define working hours and weekend policy for this department"
          footer={
            <>
              <Button variant="outline" type="button" className="btn btn-ghost" onClick={() => navigate("/employees/working-hours")}>
                <X size={15} /> Cancel
              </Button>
              <Button variant="default" type="button" className="btn btn-primary" onClick={handleSave}>
                <Save size={15} /> {editData ? "Update" : "Save"}
              </Button>
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
              <div className="bg-[var(--teal-ghost)] p-[12px_16px] mb-[20px] flex items-center gap-[8px]" style={{border: "1px solid var(--teal)", borderRadius: "var(--radius)"}}>
                <Clock size={15} color="var(--teal)" />
                <span className="text-[12px] font-semibold text-[var(--teal)] uppercase tracking-[0.05em]" >Total Hours:</span>
                <span className="text-[14px] font-semibold text-[var(--teal)]" >{hours}</span>
              </div>
            )}
          </FormSection>

          <FormSection title="Weekend Policy">
            <div className="flex gap-[24px]" >
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