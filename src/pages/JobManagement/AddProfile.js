import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import Breadcrumb from "../../services/Breadcrumb";
import { Upload, Eye, Trash2, Save, X, Briefcase } from "lucide-react";

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
const Field = ({ label, required, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width:        "100%",
  padding:      "10px 13px",
  borderRadius: 10,
  border:       "1.5px solid #e2e8f0",
  background:   "#f8fafc",
  fontSize:     13.5,
  color:        "#1e293b",
  outline:      "none",
  fontFamily:   "inherit",
  boxSizing:    "border-box",
};

const disabledInputStyle = {
  ...inputStyle,
  background: "#f1f5f9",
  color:      "#94a3b8",
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
            icon={<Briefcase size={13} />}
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
      <div style={{ maxWidth: 860, background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.08)", overflow: "hidden", margin: "0 auto 40px" }}>

        {/* Card header accent */}
        <div style={{ height: 4, background: "linear-gradient(90deg,#0c4a6e,#0ea5e9)" }} />

        <div style={{ padding: "28px 28px 0" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Job & Candidate Details</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 24 }}>Select a job opening and enter the candidate information below</div>

          {/* ── Section: Job Info ── */}
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0c4a6e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, paddingBottom: 6, borderBottom: "1.5px solid #e2e8f0" }}>
            Job Position
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            {/* Job Code dropdown */}
            <Field label="Job Code" required>
              <select
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
              </select>
            </Field>

            <Field label="Job Title">
              <input style={disabledInputStyle} value={form.title} disabled />
            </Field>

            <Field label="Role">
              <input style={disabledInputStyle} value={form.role} disabled />
            </Field>

            <Field label="Location">
              <input style={disabledInputStyle} value={form.location} disabled />
            </Field>

            <Field label="Salary">
              <input style={disabledInputStyle} value={form.salary} disabled />
            </Field>

            <Field label="Job Type">
              <input style={disabledInputStyle} value={form.jobType} disabled />
            </Field>
          </div>

          {/* ── Section: Candidate Info ── */}
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0c4a6e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, paddingBottom: 6, borderBottom: "1.5px solid #e2e8f0" }}>
            Candidate Information
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Field label="First Name" required>
              <input style={inputStyle} name="firstName" value={form.firstName} onChange={handleChange} placeholder="John" />
            </Field>

            <Field label="Last Name" required>
              <input style={inputStyle} name="lastName" value={form.lastName} onChange={handleChange} placeholder="Doe" />
            </Field>

            <Field label="Email" required>
              <input style={inputStyle} name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@example.com" />
            </Field>

            <Field label="Phone Number" required>
              <input style={inputStyle} name="phone" value={form.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
            </Field>

            <Field label="Primary Skill Set" required>
              <input style={inputStyle} name="skill" value={form.skill} onChange={handleChange} placeholder="e.g. React, Node.js" />
            </Field>

            <Field label="Candidate Status" required>
              <select
                value={form.candidateStatus}
                onChange={e => setForm(prev => ({ ...prev, candidateStatus: e.target.value }))}
                style={inputStyle}
              >
                {STATUS_OPTS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── Section: Resume Upload ── */}
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0c4a6e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, paddingBottom: 6, borderBottom: "1.5px solid #e2e8f0" }}>
            Resume Upload <span style={{ color: "#ef4444" }}>*</span>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border:        "2px dashed #cbd5e1",
              borderRadius:  12,
              padding:       "36px 20px",
              textAlign:     "center",
              cursor:        "pointer",
              background:    "#f8fafc",
              marginBottom:  16,
              transition:    "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#0c4a6e"; e.currentTarget.style.background = "#f0f9ff"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#f8fafc"; }}
          >
            <input
              ref={fileRef}
              type="file"
              style={{ display: "none" }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
              onChange={e => handleFileSelect(e.target.files[0])}
            />
            <Upload size={30} color="#0c4a6e" style={{ margin: "0 auto 10px" }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
              Drag & drop resume here or click to browse
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              PDF, DOC, DOCX, XLS, PNG, JPG accepted
            </div>
          </div>

          {/* Uploaded file row */}
          {uploadedFile && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f0f9ff", borderRadius: 10, border: "1.5px solid #bae6fd", marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#0c4a6e" }}>
                  {uploadedFile.name.split(".").pop()?.toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {uploadedFile.name}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                onClick={previewFile}
                title="Preview"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#0c4a6e", padding: 4, display: "flex", alignItems: "center" }}
              >
                <Eye size={16} />
              </button>
              <button
                onClick={removeFile}
                title="Remove"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, display: "flex", alignItems: "center" }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Card footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "20px 28px", borderTop: "1px solid #f0f0f0", marginTop: 8 }}>
          <button
            onClick={handleCancel}
            style={{ padding: "9px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <X size={14} /> Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: "#0c4a6e", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 3px 12px rgba(12,74,110,0.25)" }}
          >
            <Save size={14} /> Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}