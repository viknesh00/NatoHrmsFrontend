import { NativeSelect } from "../../components/ui/native-select";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import LoadingMask from "../../shared/services/LoadingMask";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { Upload, Eye, Trash2, Save, X, Users } from "lucide-react";

const STATUS_OPTS = [
  { label: "New",            value: "New" },
  { label: "Still Searching",value: "Still Searching" },
  { label: "Interviewing",   value: "Interviewing" },
  { label: "Placed",         value: "Placed" },
  { label: "Rejected",       value: "Rejected" },
];

const defaultForm = {
  jobId:           null,
  jobCode:         "",
  title:           "",
  role:            "",
  location:        "",
  salary:          "",
  jobType:         "",
  firstName:       "",
  lastName:        "",
  email:           "",
  phone:           "",
  skill:           "",
  candidateStatus: "New",
};

// ── tiny reusable field wrapper ──────────────────────────────
const Field = ({ label, required, children }: Record<string, any>) => (
  <div className="flex flex-col gap-[8px]" >
    <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.06em]" >
      {label}{required && <span className="text-error ml-[4px]" >*</span>}
    </label>
    {children}
  </div>
);

const inputStyle: import("react").CSSProperties = {
  width:        "100%",
  padding:      "10px 13px",
  borderRadius: "var(--radius)",
  border:       "1px solid var(--border)",
  background:   "var(--muted)",
  fontSize:     14,
  color:        "var(--foreground)",
  outline:      "none",
  fontFamily:   "inherit",
  boxSizing:    "border-box",
};

const disabledInputStyle = {
  ...inputStyle,
  background: "var(--muted)",
  color:      "var(--muted-foreground)",
  cursor:     "not-allowed",
};

// ── main component ───────────────────────────────────────────
export default function AddProfile() {
  const navigate   = useNavigate();
  const fileRef    = useRef(null);
  const [loading, setLoading]   = useState(false);
  const [jobs, setJobs]         = useState([]);
  const [form, setForm]         = useState(defaultForm);
  const [uploadedFile, setUploadedFile] = useState(null);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    getRequest("Jobs/GetJobs")
      .then(res => {
        if (res.data) setJobs(res.data);
      })
      .catch(console.error);
  }, []);

  // ── handlers ────────────────────────────────────────────────

  const handleJobSelect = (e) => {
    const jobId = e.target.value;
    if (!jobId) { setForm(defaultForm); return; }
    const job = jobs.find(j => String(j.jobId) === String(jobId));
    if (job) {
      setForm(prev => ({
        ...prev,
        jobId:    job.jobId,
        jobCode:  job.jobCode  || "",
        title:    job.jobTitle || "",
        role:     job.role     || "",
        location: job.location || "",
        salary:   job.salary   || "",
        jobType:  job.jobType  || "",
      }));
    }
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileSelect = (file) => { if (file) setUploadedFile(file); };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer?.files?.[0]);
  };

  const removeFile = () => setUploadedFile(null);

  const previewFile = () => {
    const url = URL.createObjectURL(uploadedFile);
    window.open(url, "_blank");
  };

  const handleSave = () => {
    if (!form.jobCode || !form.firstName || !form.lastName ||
        !form.email   || !form.phone     || !form.skill || !uploadedFile) {
      ToastError("Please fill all required fields and upload a resume");
      return;
    }

    const payload = new FormData();
    payload.append("JobId",           form.jobId);
    payload.append("FirstName",       form.firstName);
    payload.append("LastName",        form.lastName);
    payload.append("Email",           form.email);
    payload.append("Phone",           form.phone);
    payload.append("Skills",          form.skill);
    payload.append("ResumeFileName",  uploadedFile.name);
    payload.append("ResumeFileType",  uploadedFile.type);
    payload.append("CandidateStatus", form.candidateStatus || "New");
    payload.append("Resume",          uploadedFile);

    setLoading(true);
    postRequest("Jobs/AddApplication", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    })
      .then(() => {
        ToastSuccess("Profile added successfully");
        navigate("/job-management", { state: { tab: "jobApplied" } });
      })
      .catch(() => ToastError("This Profile is already applied for this job"))
      .finally(() => setLoading(false));
  };

  const handleCancel = () => {
    setForm(defaultForm);
    setUploadedFile(null);
    navigate("/job-management", { state: { tab: "jobApplied" } });
  };

  // ── render ───────────────────────────────────────────────────

  return (
    <div>
      <LoadingMask loading={loading} />

      {/* Page header */}
      <div className="page-header">
        <div>
          <Breadcrumb
            icon={<Users size={13} />}
            items={[
              { label: "Job Management", link: "/job-management" },
              { label: "Add Profile" },
            ]}
          />
          <h1 className="page-title">Add Candidate Profile</h1>
          <p className="page-subtitle">Fill in the details and upload a resume</p>
        </div>
      </div>

      {/* Card */}
      <div className="max-w-[860px] bg-card overflow-hidden m-[0_auto_40px]" style={{borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)"}}>

        {/* Card header accent */}
        <div className="h-[4px] bg-primary"  />

        <div className="p-[28px_28px_0]" >
          <div className="text-[16px] font-semibold text-foreground mb-[4px]" >Job & Candidate Details</div>
          <div className="text-[13px] text-muted-foreground mb-[24px]" >Select a job opening and enter the candidate information below</div>

          {/* ── Section: Job Info ── */}
          <div className="text-[12px] font-semibold text-[var(--primary-dark)] uppercase tracking-[0.08em] mb-[16px] pb-[8px]" style={{borderBottom: "1px solid var(--border)"}}>
            Job Position
          </div>

          <div className="grid gap-[16px] mb-[24px]" style={{gridTemplateColumns: "1fr 1fr 1fr"}}>
            {/* Job Code dropdown */}
            <Field label="Job Code" required>
              <NativeSelect
                value={form.jobId || ""}
                onChange={handleJobSelect}
                style={inputStyle}
              >
                <option value="">Select job code...</option>
                {jobs.map(j => (
                  <option key={j.jobId} value={j.jobId}>
                    {j.jobCode}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Job Title">
              <Input style={disabledInputStyle} value={form.title} disabled />
            </Field>

            <Field label="Role">
              <Input style={disabledInputStyle} value={form.role} disabled />
            </Field>

            <Field label="Location">
              <Input style={disabledInputStyle} value={form.location} disabled />
            </Field>

            <Field label="Salary">
              <Input style={disabledInputStyle} value={form.salary} disabled />
            </Field>

            <Field label="Job Type">
              <Input style={disabledInputStyle} value={form.jobType} disabled />
            </Field>
          </div>

          {/* ── Section: Candidate Info ── */}
          <div className="text-[12px] font-semibold text-[var(--primary-dark)] uppercase tracking-[0.08em] mb-[16px] pb-[8px]" style={{borderBottom: "1px solid var(--border)"}}>
            Candidate Information
          </div>

          <div className="grid gap-[16px] mb-[24px]" style={{gridTemplateColumns: "1fr 1fr 1fr"}}>
            <Field label="First Name" required>
              <Input style={inputStyle} name="firstName" value={form.firstName} onChange={handleChange} placeholder="John" />
            </Field>

            <Field label="Last Name" required>
              <Input style={inputStyle} name="lastName" value={form.lastName} onChange={handleChange} placeholder="Doe" />
            </Field>

            <Field label="Email" required>
              <Input style={inputStyle} name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@example.com" />
            </Field>

            <Field label="Phone Number" required>
              <Input style={inputStyle} name="phone" value={form.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
            </Field>

            <Field label="Primary Skill Set" required>
              <Input style={inputStyle} name="skill" value={form.skill} onChange={handleChange} placeholder="e.g. React, Node.js" />
            </Field>

            <Field label="Candidate Status" required>
              <NativeSelect
                value={form.candidateStatus}
                onChange={e => setForm(prev => ({ ...prev, candidateStatus: e.target.value }))}
                style={inputStyle}
              >
                {STATUS_OPTS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          {/* ── Section: Resume Upload ── */}
          <div className="text-[12px] font-semibold text-[var(--primary-dark)] uppercase tracking-[0.08em] mb-[16px] pb-[8px]" style={{borderBottom: "1px solid var(--border)"}}>
            Resume Upload <span className="text-error" >*</span>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="p-[36px_20px] text-center cursor-pointer bg-muted mb-[16px]" style={{border:        "2px dashed var(--border-strong)", borderRadius:  "var(--radius)", transition:    "all 0.2s"}}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary-dark)"; e.currentTarget.style.background = "var(--primary-ghost)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.background = "var(--muted)"; }}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden" 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
              onChange={e => handleFileSelect(e.target.files[0])}
            />
            <Upload size={30} color="var(--primary-dark)" className="m-[0_auto_10px]"  />
            <div className="text-[14px] font-semibold text-foreground mb-[4px]" >
              Drag & drop resume here or click to browse
            </div>
            <div className="text-[12px] text-muted-foreground" >
              PDF, DOC, DOCX, XLS, PNG, JPG accepted
            </div>
          </div>

          {/* Uploaded file row */}
          {uploadedFile && (
            <div className="flex items-center gap-[12px] p-[12px_16px] bg-[var(--primary-ghost)] mb-[16px]" style={{borderRadius: "var(--radius)", border: "1px solid var(--border-strong)"}}>
              <div className="w-[36px] h-[36px] bg-[var(--primary-ghost)] flex items-center justify-center shrink-[0]" style={{borderRadius: "var(--radius)"}}>
                <span className="text-[12px] font-semibold text-[var(--primary-dark)]" >
                  {uploadedFile.name.split(".").pop()?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-[0px]" style={{flex: 1}}>
                <div className="text-[13px] font-semibold text-foreground overflow-hidden whitespace-nowrap" style={{textOverflow: "ellipsis"}}>
                  {uploadedFile.name}
                </div>
                <div className="text-[12px] text-muted-foreground" >
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <Button variant="ghost" type="button"
                onClick={previewFile}
                title="Preview"
                className="bg-[none] cursor-pointer text-[var(--primary-dark)] p-[4px] flex items-center" style={{border: "none"}}
              >
                <Eye size={16} />
              </Button>
              <Button variant="ghost" type="button"
                onClick={removeFile}
                title="Remove"
                className="bg-[none] cursor-pointer text-error p-[4px] flex items-center" style={{border: "none"}}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* Card footer */}
        <div className="flex justify-end gap-[12px] p-[20px_28px] mt-[8px]" style={{borderTop: "1px solid var(--border)"}}>
          <Button variant="ghost" type="button"
            onClick={handleCancel}
            className="p-[8px_20px] bg-card text-muted-foreground text-[13px] font-semibold cursor-pointer inline-flex items-center gap-[8px]" style={{borderRadius: "var(--radius)", border: "1px solid var(--border)", fontFamily: "inherit"}}
          >
            <X size={14} /> Cancel
          </Button>
          <Button variant="ghost" type="button"
            onClick={handleSave}
            className="p-[8px_24px] bg-[var(--primary-dark)] text-primary-foreground text-[13px] font-semibold cursor-pointer inline-flex items-center gap-[8px]" style={{borderRadius: "var(--radius)", border: "none", fontFamily: "inherit", boxShadow: "0 3px 12px var(--primary-glow)"}}
          >
            <Save size={14} /> Save Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
