import React, { useEffect, useRef, useState } from "react";
import { Download, X, Check, FileSpreadsheet, Plus } from "lucide-react";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { getCookie } from "../../services/Cookies";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import ProTable from "../../components/ProTable";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

const STATUS_OPTS = ["New", "Still Searching", "Interviewing", "Placed", "Rejected"].map(v => ({ label: v, value: v }));

const STATUS_MAP = {
  "new":             { bg: "#dbeafe", color: "#1d4ed8" },
  "still searching": { bg: "#fff7ed", color: "#c2410c" },
  "interviewing":    { bg: "#ede9fe", color: "#6c3fc5" },
  "placed":          { bg: "#dcfce7", color: "#15803d" },
  "rejected":        { bg: "#fee2e2", color: "#b91c1c" },
};

export default function JobApplied() {
  const navigate = useNavigate();

  const [loading, setLoading]             = useState(false);
  const [applications, setApplications]   = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [modal, setModal]                 = useState(false);
  const [selApp, setSelApp]               = useState(null);
  const [selStatus, setSelStatus]         = useState("New");
  const [assignedTo, setAssignedTo]       = useState("");
  const [selected, setSelected]           = useState([]);   // array of row indices

  const called = useRef(false);

  const userRole  = getCookie("role");
  const userEmail = getCookie("email");
  const isAdmin   = userRole === "Admin" || userRole === "Manager";

  useEffect(() => {
    if (called.current) return;
    loadApplications();
    loadUsers();
    called.current = true;
  }, []);

  // ─────────────────────────── API ───────────────────────────

  const loadApplications = () => {
    setLoading(true);
    getRequest("Jobs")
      .then(res => {
        if (res.data) {
          setApplications(
            res.data.map(d => ({
              ...d,
              appliedOn: d.appliedOn ? dayjs(d.appliedOn).format("DD/MM/YYYY") : "—",
              updatedAt: d.updatedAt ? dayjs(d.updatedAt).format("DD/MM/YYYY") : "—",
            }))
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadUsers = () => {
    getRequest("User/All")
      .then(res => {
        if (res.data) {
          let list = res.data.map(u => ({ label: u.email, value: u.email }));
          if (!isAdmin) list = list.filter(e => e.value === userEmail);
          setEmployeesList(list.sort((a, b) => a.label.localeCompare(b.label)));
        }
      })
      .catch(console.error);
  };

  const downloadSingle = (id, name) => {
    setLoading(true);
    getRequest(`Jobs/Download/${id}`, null, true)
      .then(res => {
        const blob = new Blob([res.data], {
          type: res.headers["content-type"] || "application/octet-stream",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name || "resume";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        ToastSuccess("Downloaded");
        loadApplications();
        setSelected([]);
      })
      .catch(() => ToastError("Download failed"))
      .finally(() => setLoading(false));
  };

  const downloadMultiple = (ids) => {
    setLoading(true);
    postRequest("Jobs/DownloadMultiple", ids, true)
      .then(res => {
        const blob = new Blob([res.data], { type: "application/zip" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Resumes_${dayjs().format("DDMMYYYY")}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        ToastSuccess("Downloaded");
        loadApplications();
        setSelected([]);
      })
      .catch(() => ToastError("Download failed"))
      .finally(() => setLoading(false));
  };

  // ─────────────────────────── Handlers ───────────────────────────

  const handleBulkDownload = () => {
    const rows = selected.map(i => applications[i]).filter(Boolean);
    if (!rows.length) return;
    if (rows.length === 1) {
      const row = rows[0];
      if (row?.resumeFileName) downloadSingle(row.applicationId, row.resumeFileName);
    } else {
      const ids = rows.map(r => r.applicationId).filter(Boolean);
      downloadMultiple(ids);
    }
  };

  const handleStatusClick = (row) => {
    const canEdit = isAdmin || row.assignedTo === userEmail || !row.assignedTo;
    if (!canEdit) {
      ToastError("You are not authorized to update this candidate status");
      return;
    }
    setSelApp(row);
    setSelStatus(row.candidateStatus || "New");
    setAssignedTo(row.assignedTo || "");
    setModal(true);
  };

  const handleStatusSave = () => {
    if (!selStatus) { ToastError("Candidate Status is required"); return; }
    if (!assignedTo) { ToastError("Assigned To is required"); return; }

    setLoading(true);
    postRequest("Jobs/UpdateApplicationStaus", {
      applicationId:   selApp.applicationId,
      candidateStatus: selStatus,
      assignedTo,
    })
      .then(res => {
        if (res.status === 200) {
          ToastSuccess(res.data.message);
          loadApplications();
        }
      })
      .catch(err => ToastError(err?.response?.data?.message || "Failed to update status"))
      .finally(() => { setLoading(false); setModal(false); });
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      applications.map(r => ({
        "Job Code":    r.jobCode   || "—",
        "Job Title":   r.jobTitle  || "—",
        "Role":        r.role      || "—",
        "Location":    r.location  || "—",
        "Job Type":    r.jobType   || "—",
        "Salary":      r.salary    || "—",
        "First Name":  r.firstName || "—",
        "Last Name":   r.lastName  || "—",
        "Email":       r.email     || "—",
        "Phone":       r.phone     || "—",
        "Skills":      r.skills    || "—",
        "View Count":  r.readCount ?? "—",
        "Applied On":  r.appliedOn,
        "Updated At":  r.updatedAt,
        "Status":      r.candidateStatus || "New",
        "Assigned To": r.assignedTo || "—",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applications");
    XLSX.writeFile(wb, "Job_Applications.xlsx");
  };

  // ─────────────────────────── Sub-components ───────────────────────────

  const CandidateChip = ({ status }) => {
    const s = STATUS_MAP[(status || "new").toLowerCase()] || { bg: "#f1f5f9", color: "#475569" };
    return (
      <span
        style={{
          background:    s.bg,
          color:         s.color,
          padding:       "3px 10px",
          borderRadius:  20,
          fontSize:      11.5,
          fontWeight:    700,
          display:       "inline-block",
          textTransform: "capitalize",
          cursor:        "pointer",
        }}
      >
        {status || "New"}
      </span>
    );
  };

  // ─────────────────────────── Table config ───────────────────────────

  const columns = [
    { field: "jobCode",   label: "Job Code" },
    { field: "jobTitle",  label: "Job Title" },
    { field: "role",      label: "Role" },
    { field: "location",  label: "Location" },
    { field: "jobType",   label: "Job Type" },
    { field: "salary",    label: "Salary" },
    { field: "firstName", label: "First Name" },
    { field: "lastName",  label: "Last Name" },
    { field: "email",     label: "Email" },
    { field: "phone",     label: "Phone" },
    { field: "skills",    label: "Skills" },
    { field: "readCount", label: "View Count" },
    { field: "appliedOn", label: "Applied On" },
    { field: "updatedAt", label: "Updated At" },
    {
      field:      "candidateStatus",
      label:      "Status",
      filterable: true,
      renderCell: (row) => (
        <span onClick={() => handleStatusClick(row)}>
          <CandidateChip status={row.candidateStatus} />
        </span>
      ),
    },
    { field: "assignedTo", label: "Assigned To" },
    {
      field:      "actions",
      label:      "Resume",
      renderCell: (row) =>
        row.resumeFileName ? (
          <button
            className="icon-btn"
            title="Download Resume"
            onClick={() => downloadSingle(row.applicationId, row.resumeFileName)}
            style={{ color: "var(--teal)" }}
          >
            <Download size={14} />
          </button>
        ) : null,
    },
  ];

  // Bulk actions bar — shown inside ProTable toolbar (same pattern as CompanyDocument)
  const tableActions = (
    <>

      {selected.length > 0 && (
        <button
          className="btn btn-teal btn-sm"
          onClick={handleBulkDownload}
        >
          <Download size={14} /> Download ({selected.length})
        </button>
      )}
    </>
  );

  // ─────────────────────────── Render ───────────────────────────

  return (
    <div>
      <LoadingMask loading={loading} />

      {/* ── Page Header ── */}
      <div className="page-header" style={{ justifyContent: "flex-end" }}>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/job-management/add-profile")}
        >
          <Plus size={14} /> Add Profile
        </button>
      </div>

      <ProTable
        title="Job Applications"
        columns={columns}
        data={applications}
        actions={tableActions}
        onExport={handleExportExcel}
        multiSelect={true}
        onSelectionChange={setSelected}
      />

      {/* ── Status Modal ── */}
      {modal && selApp && (
        <div
          onClick={() => setModal(false)}
          style={{
            position:       "fixed",
            inset:          0,
            background:     "rgba(20,0,50,0.55)",
            backdropFilter: "blur(5px)",
            zIndex:         9999,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            padding:        20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:   "#fff",
              borderRadius: 20,
              width:        "100%",
              maxWidth:     440,
              boxShadow:    "0 20px 60px rgba(0,0,0,0.25)",
              overflow:     "hidden",
            }}
          >
            {/* top accent bar */}
            <div style={{ height: 4, background: "linear-gradient(90deg,#0c4a6e,#0ea5e9)" }} />

            {/* Header */}
            <div style={{ padding: "22px 24px 14px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#1e293b" }}>
                  Update Application Status
                </div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>
                  {selApp.firstName} {selApp.lastName} — {selApp.jobTitle}
                </div>
              </div>
              <button
                onClick={() => setModal(false)}
                style={{ width: 30, height: 30, borderRadius: 8, background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Info strip */}
            <div style={{ padding: "14px 24px 0", display: "flex", gap: 28, flexWrap: "wrap" }}>
              {[
                ["Job Code",   selApp.jobCode   || "—"],
                ["Applied On", selApp.appliedOn  || "—"],
                ["Email",      selApp.email      || "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
                  <div style={{ fontSize: 13, color: "#1e293b", marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Body */}
            <div style={{ padding: "18px 24px" }}>
              {/* Status pill buttons */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Candidate Status <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {STATUS_OPTS.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setSelStatus(o.value)}
                      style={{
                        padding:      "7px 14px",
                        borderRadius: 8,
                        fontSize:     12.5,
                        fontWeight:   700,
                        border:       `1.5px solid ${selStatus === o.value ? "#0c4a6e" : "#e2e8f0"}`,
                        background:   selStatus === o.value ? "#0c4a6e" : "#f8fafc",
                        color:        selStatus === o.value ? "#fff" : "#64748b",
                        cursor:       "pointer",
                        transition:   "all 0.15s",
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign To dropdown */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>
                  Assign To <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  style={{
                    width:        "100%",
                    padding:      "10px 13px",
                    borderRadius: 10,
                    border:       "1.5px solid #e2e8f0",
                    background:   "#f8fafc",
                    fontSize:     13.5,
                    color:        "#1e293b",
                    outline:      "none",
                    appearance:   "none",
                    fontFamily:   "inherit",
                  }}
                >
                  <option value="">Select employee...</option>
                  {employeesList.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "0 24px 22px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setModal(false)}
                style={{ padding: "9px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={handleStatusSave}
                style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "#0c4a6e", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "inherit", boxShadow: "0 3px 12px rgba(12,74,110,0.25)" }}
              >
                <Check size={15} /> Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}