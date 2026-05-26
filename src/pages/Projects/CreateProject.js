import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { postRequest } from "../../services/Apiservice";
import { ToastSuccess, ToastError } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import {
  FormInput,
  FormDate,
  FormSelect,
  FormTextarea,
  FormCard,
  FormSection,
  FormRow,
} from "../../components/FormComponents";
import { Briefcase, Save, X } from "lucide-react";

// helper at the top of the file
const parseDMY = (d) => {
  if (!d) return "";
  // already ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10);
  // DD-MM-YYYY → YYYY-MM-DD
  const [day, month, year] = d.split("-");
  if (day && month && year) return `${year}-${month}-${day}`;
  return "";
};

const CreateProject = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const editData  = location.state?.editData || null;

  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  const [form, setForm] = useState({
  projectId:    editData?.projectId    ?? null,
  projectName:  editData?.projectName  || "",
  description:  editData?.description  || "",
  clientName:   editData?.clientName   || "",
  managerEmail: editData?.managerEmail || "",
  startDate:    parseDMY(editData?.startDate),  // ← was editData.startDate.substring(0,10)
  endDate:      parseDMY(editData?.endDate),    // ← was editData.endDate.substring(0,10)
  status:       editData?.status || "Active",
});

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!form.projectName.trim()) e.projectName = "Project name is required";
    if (!form.startDate)          e.startDate   = "Start date is required";
    if (form.endDate && form.endDate < form.startDate)
      e.endDate = "End date must be after start date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Duration badge ── */
  const calcDuration = () => {
    if (!form.startDate || !form.endDate) return null;
    const diff = Math.ceil(
      (new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)
    );
    if (diff <= 0) return null;
    const months = Math.floor(diff / 30);
    const days   = diff % 30;
    return months > 0 ? `${months}m ${days}d` : `${diff} day${diff !== 1 ? "s" : ""}`;
  };

  const duration = calcDuration();

  /* ── Save ── */
  const handleSave = () => {
    if (!validate()) { ToastError("Please fill all required fields"); return; }

    const payload = {
      projectId:    form.projectId,
      projectName:  form.projectName,
      description:  form.description  || null,
      clientName:   form.clientName   || null,
      managerEmail: form.managerEmail || null,
      startDate:    form.startDate    || null,
      endDate:      form.endDate      || null,
      status:       form.status,
    };

    setLoading(true);
    postRequest("Project/InsertOrUpdate", payload)
      .then((res) => {
        if (res.status === 200) {
          ToastSuccess(res.data?.message || "Project saved successfully");
          navigate("/employees/projects");
        }
      })
      .catch((err) =>
        ToastError(err?.response?.data?.message || "Failed to save project")
      )
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <LoadingMask loading={loading} />

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <Breadcrumb
            icon={<Briefcase size={13} />}
            items={[
              { label: "Employees", link: "/employees" },
              { label: "Projects",  link: "/employees/projects" },
              { label: editData ? "Edit Project" : "Create Project" },
            ]}
          />
          <h1 className="page-title">
            {editData ? "Edit Project" : "Create Project"}
          </h1>
          <p className="page-subtitle">
            {editData
              ? "Update the project details"
              : "Set up a new project for your team"}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <FormCard
          icon={<Briefcase />}
          title={editData ? "Edit Project" : "New Project"}
          subtitle="Fill in the project details, timeline, and status"
          footer={
            <>
              <button
                className="btn btn-ghost"
                onClick={() => navigate("/employees/projects")}
              >
                <X size={15} /> Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={15} /> {editData ? "Update" : "Save"}
              </button>
            </>
          }
        >
          {/* ── Project Information ── */}
          <FormSection title="Project Information">
            <FormInput
              label="Project Name"
              required
              value={form.projectName}
              onChange={set("projectName")}
              error={errors.projectName}
              placeholder="e.g. HR Portal Revamp"
            />
            <FormTextarea
              label="Description"
              value={form.description}
              onChange={set("description")}
              placeholder="Brief description of the project goals and scope..."
              rows={3}
            />
            <FormInput
              label="Client Name"
              value={form.clientName}
              onChange={set("clientName")}
              placeholder="e.g. Acme Corp (leave blank if internal)"
            />
          </FormSection>

          {/* ── Timeline ── */}
          <FormSection title="Timeline">
            <FormRow cols={2}>
              <FormDate
                label="Start Date"
                required
                value={form.startDate}
                onChange={set("startDate")}
                error={errors.startDate}
              />
              <FormDate
                label="End Date"
                value={form.endDate}
                onChange={set("endDate")}
                error={errors.endDate}
              />
            </FormRow>

            {duration && (
              <div
                style={{
                  background: "var(--teal-ghost)",
                  border: "1px solid var(--teal)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Briefcase size={15} color="var(--teal)" />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--teal)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Duration:
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--teal)" }}>
                  {duration}
                </span>
              </div>
            )}
          </FormSection>

          {/* ── Assignment & Status ── */}
          <FormSection title="Assignment & Status">
            <FormInput
              label="Project Manager Email"
              value={form.managerEmail}
              onChange={set("managerEmail")}
              placeholder="manager@company.com"
            />
            <FormSelect
              label="Status"
              value={form.status}
              onChange={set("status")}
              options={[
                { label: "Active",    value: "Active" },
                { label: "On Hold",   value: "On Hold" },
                { label: "Completed", value: "Completed" },
                { label: "Cancelled", value: "Cancelled" },
              ]}
            />
          </FormSection>
        </FormCard>
      </div>
    </div>
  );
};

export default CreateProject;