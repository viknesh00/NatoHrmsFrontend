import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { postRequest, putRequest } from "../../shared/services/Apiservice";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { FormInput, FormTextarea, FormSelect, FormCard, FormSection, FormRow } from "../../components/FormComponents";
import { Briefcase, Save, X } from "lucide-react";
import dayjs from "dayjs";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Remote", "Internship"].map(v => ({ label: v, value: v }));

export default function CreateJob() {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData || null;
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<Record<string, any>>({});

  const [form, setForm] = useState({
    jobCode:          editData?.jobCode                      || "",
    title:            editData?.title                        || "",
    role:             editData?.role                         || "",
    location:         editData?.location                     || "",
    salary:           editData?.salary                       || "",
    jobType:          editData?.jobType                      || "Full-time",
    skills:           editData?.skills                       || "", // Added.
    date:             editData?.postedDate
                        ? dayjs(editData.postedDate).format("YYYY-MM-DD")
                        : dayjs().format("YYYY-MM-DD"),
    description:      editData?.description                  || "",
    responsibilities: editData?.responsibilities?.join("\n") || "",
    qualifications:   editData?.qualifications?.join("\n")   || "",
  });

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const e: Record<string, any> = {};
    if (!form.jobCode.trim())          e.jobCode = "Required";
    if (!form.title.trim())            e.title   = "Required";
    if (!form.role.trim())             e.role    = "Required";
    if (!form.location.trim())         e.loc     = "Required";
    if (!form.salary.trim())           e.salary  = "Required";
    if (!form.skills.trim())           e.skills  = "Required"; // Added.
    if (!form.description.trim())      e.desc    = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) { ToastError("Please fill required fields"); return; }

    const payload = {
      jobCode:          form.jobCode,
      jobTitle:         form.title,
      role:             form.role,
      location:         form.location,
      salary:           form.salary,
      jobType:          form.jobType,
      skills:           form.skills,           // Added.
      description:      form.description,
      responsibilities: form.responsibilities,
      qualifications:   form.qualifications,
      postedDate:       form.date,
    };

    setLoading(true);
    const req = editData?.id
      ? putRequest("Jobs/UpdateJob", { ...payload, jobId: editData.id })
      : postRequest("Jobs/CreateJob", payload);

    req
      .then(() => {
        ToastSuccess(editData ? "Job updated successfully" : "Job created successfully");
        navigate("/job-management");
      })
      .catch(err => ToastError(err?.response?.data || "Job code already exists"))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <LoadingMask loading={loading} />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <Breadcrumb
            icon={<Briefcase size={13} />}
            items={[
              { label: "Job Management", link: "/job-management" },
              { label: editData ? "Edit Job" : "Create Job" },
            ]}
          />
          <h1 className="page-title">
            {editData ? "Update Job Posting" : "Create Job Posting"}
          </h1>
          <p className="page-subtitle">Post an open position to attract talent</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-[900px] m-[0_auto]" >
        <FormCard
          icon={<Briefcase />}
          title={editData ? "Edit Job Posting" : "New Job Posting"}
          subtitle="Fill in the job details to publish an opening"
          footer={
            <>
              <Button variant="outline" type="button" className="btn btn-ghost" onClick={() => navigate("/job-management")}>
                <X size={15} /> Cancel
              </Button>
              <Button variant="default" type="button" className="btn btn-primary" onClick={handleSave}>
                <Save size={15} /> {editData ? "Update" : "Publish"} Job
              </Button>
            </>
          }
        >
          {/* Section 1 – Basic Info */}
          <FormSection title="Basic Information">

            {/* Row 1: Job Code | Job Title */}
            <FormRow cols={2}>
              <FormInput
                label="Job Code"
                required
                value={form.jobCode}
                onChange={set("jobCode")}
                error={errors.jobCode}
                placeholder="e.g. ENG-001"
              />
              <FormInput
                label="Job Title"
                required
                value={form.title}
                onChange={set("title")}
                error={errors.title}
                placeholder="e.g. Senior React Developer"
              />
            </FormRow>

            {/* Row 2: Role | Location | Salary */}
            <FormRow cols={3}>
              <FormInput
                label="Role / Function"
                required
                value={form.role}
                onChange={set("role")}
                error={errors.role}
                placeholder="e.g. Frontend Engineer"
              />
              <FormInput
                label="Location"
                required
                value={form.location}
                onChange={set("location")}
                error={errors.loc}
                placeholder="e.g. Chennai, Remote"
              />
              <FormInput
                label="Salary / CTC"
                required
                value={form.salary}
                onChange={set("salary")}
                error={errors.salary}
                placeholder="e.g. 8-12 LPA"
              />
            </FormRow>

            {/* Row 3: Employment Type | Date Posted */}
            <FormRow cols={2}>
              <FormSelect
                label="Employment Type"
                options={JOB_TYPES}
                value={form.jobType}
                onChange={set("jobType")}
              />
              <div>
                <label className="fc-label">
                  Posted Date
                </label>
                <Input
                  type="date"
                  className="fc-input"
                  value={form.date}
                  onChange={set("date")}
                />
              </div>
            </FormRow>

            {/* Row 4: Skills (full width). */}
            <FormRow cols={1}>
              <FormInput
                label="Skills"
                required
                value={form.skills}
                onChange={set("skills")}
                error={errors.skills}
                placeholder="e.g. React, Node.js, SQL, Python"
                hint="Separate skills with commas"
              />
            </FormRow>

          </FormSection>

          {/* Section 2 – Description */}
          <FormSection title="Job Description">
            <FormTextarea
              label="Description"
              required
              value={form.description}
              onChange={set("description")}
              error={errors.desc}
              rows={4}
              placeholder="Describe the role, team, and what you'll be working on..."
            />
          </FormSection>

          {/* Section 3 – Responsibilities & Qualifications */}
          <FormSection title="Responsibilities & Qualifications">
            <FormTextarea
              label="Key Responsibilities"
              value={form.responsibilities}
              onChange={set("responsibilities")}
              rows={5}
              placeholder="Enter each responsibility on a new line..."
              hint="Each line = one bullet point"
            />
            <FormTextarea
              label="Required Qualifications"
              value={form.qualifications}
              onChange={set("qualifications")}
              rows={5}
              placeholder="Enter each qualification on a new line..."
              hint="Each line = one bullet point"
            />
          </FormSection>

        </FormCard>
      </div>

      <style>{`
        .fc-label { display:block; font-family:var(--ui-font-heading); font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px; }
        .fc-input { width:100%; padding:12px 12px; border-radius:var(--radius); border:1px solid var(--border); background:var(--bg); font-family:var(--ui-font-sans); font-size:14px; color:var(--text-primary); outline:none; transition:all 0.2s; box-sizing:border-box; }
        .fc-input:focus { border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-ghost); background:var(--card); }
        .fc-error { font-size:12px; color:var(--coral); margin-top:4px; }
        .fc-hint  { font-size:12px; color:var(--text-muted); margin-top:4px; }
      `}</style>
    </div>
  );
}
