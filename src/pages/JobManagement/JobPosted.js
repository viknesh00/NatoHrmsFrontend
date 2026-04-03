import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MapPin, Calendar, Banknote, AlertTriangle, X } from "lucide-react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { getRequest, deleteRequest } from "../../services/Apiservice";
import { ToastSuccess, ToastError } from "../../services/ToastMsg";
import { getCookie } from "../../services/Cookies";
import LoadingMask from "../../services/LoadingMask";
import { useNavigate } from "react-router-dom";

export default function JobPosted() {
  const navigate   = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [jobs, setJobs]         = useState([]);
  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState(null);
  const [page, setPage]         = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const perPage = 6;
  const isAdmin = getCookie("role") === "Admin";

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = () => {
    setLoading(true);
    getRequest("Jobs/GetJobs")
      .then(res => {
        if (res.data) setJobs(res.data.map(j => ({
          ...j,
          id:    j.jobId,
          title: j.jobTitle,
          date:  j.postedDate ? dayjs(j.postedDate).format("DD-MM-YYYY") : "—",
          responsibilities: j.responsibilities
            ? j.responsibilities.split(",").map(s => s.trim()).filter(Boolean)
            : [],
          qualifications: j.qualifications
            ? j.qualifications.split(",").map(s => s.trim()).filter(Boolean)
            : [],
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const confirmDelete = (job) => setDeleteTarget(job);

  const executeDelete = () => {
    if (!deleteTarget) return;
    setLoading(true);
    deleteRequest(`Jobs/DeleteJob?jobId=${deleteTarget.id}`)
      .then(() => {
        ToastSuccess("Job deleted");
        setJobs(prev => prev.filter(x => x.id !== deleteTarget.id));
        setDeleteTarget(null);
      })
      .catch(() => ToastError("Delete failed"))
      .finally(() => setLoading(false));
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(jobs.map(j => ({
      "Job Code":        j.jobCode,
      "Job Title":       j.title,
      "Role":            j.role,
      "Location":        j.location,
      "Salary":          j.salary,
      "Job Type":        j.jobType,
      "Posted Date":     j.date,
      "Description":     j.description,
      "Responsibilities": j.responsibilities.join(", "),
      "Qualifications":   j.qualifications.join(", "),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jobs");
    XLSX.writeFile(wb, "Job_Postings.xlsx");
  };

  const filtered = jobs.filter(j => {
    const kw = search.toLowerCase();
    return (
      (j.jobCode        && j.jobCode.toLowerCase().includes(kw))        ||
      (j.title          && j.title.toLowerCase().includes(kw))          ||
      (j.role           && j.role.toLowerCase().includes(kw))           ||
      (j.location       && j.location.toLowerCase().includes(kw))       ||
      (j.salary         && j.salary.toLowerCase().includes(kw))         ||
      (j.jobType        && j.jobType.toLowerCase().includes(kw))        ||
      (j.description    && j.description.toLowerCase().includes(kw))    ||
      (j.responsibilities && j.responsibilities.join(" ").toLowerCase().includes(kw)) ||
      (j.qualifications   && j.qualifications.join(" ").toLowerCase().includes(kw))
    );
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged      = filtered.slice(page * perPage, (page + 1) * perPage);

  const JOB_TYPE_STYLES = {
    "Full-time":  { bg: "#dcfce7", color: "#15803d" },
    "Part-time":  { bg: "#dbeafe", color: "#1d4ed8" },
    "Contract":   { bg: "#fef3c7", color: "#b45309" },
    "Remote":     { bg: "#ede9fe", color: "#6c3fc5" },
    "Internship": { bg: "#fee2e2", color: "#b91c1c" },
  };

  return (
    <>
      <LoadingMask loading={loading} />

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            placeholder="Search jobs..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>

        <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
          {filtered.length} position{filtered.length !== 1 ? "s" : ""}
        </span>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            className="icon-btn"
            onClick={handleExport}
            title="Export Excel"
            style={{ color: "var(--teal)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
          </button>

          {isAdmin && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate("/job-management/create-job")}
            >
              <Plus size={14} /> Post Job
            </button>
          )}
        </div>
      </div>

      {/* Job Cards Grid */}
      {paged.length === 0 ? (
        <div className="table-empty">
          <div className="table-empty-text">No job postings found</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16, marginBottom: 20, alignItems: "start" }}>
          {paged.map(job => {
            const isExp = expanded === job.id;
            const ts    = JOB_TYPE_STYLES[job.jobType] || { bg: "var(--primary-ghost)", color: "var(--primary)" };

            return (
              <div
                key={job.id}
                style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden", transition: "box-shadow 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "var(--shadow-sm)"}
              >
                {/* accent bar */}
                <div style={{ height: 4, background: "linear-gradient(90deg,var(--primary),var(--teal))" }} />

                <div style={{ padding: "14px 16px" }}>
                  {/* Title row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14.5, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {job.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{job.role}</div>
                    </div>

                    {isAdmin && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          className="icon-btn"
                          style={{ width: 28, height: 28 }}
                          onClick={() => navigate("/job-management/update-job", { state: { editData: job } })}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="icon-btn"
                          style={{ width: 28, height: 28, color: "var(--coral)" }}
                          onClick={() => confirmDelete(job)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {job.jobType && (
                      <span style={{ background: ts.bg, color: ts.color, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>
                        {job.jobType}
                      </span>
                    )}
                    {job.jobCode && (
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>#{job.jobCode}</span>
                    )}
                  </div>

                  {/* Meta */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                    {[
                      [<MapPin size={12} />,    job.location],
                      [<Banknote size={12} />,  job.salary],
                      [<Calendar size={12} />,  job.date ? `Posted ${job.date}` : null],
                    ].filter(m => m[1]).map((m, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--primary)", flexShrink: 0 }}>{m[0]}</span>
                        {m[1]}
                      </div>
                    ))}
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpanded(isExp ? null : job.id)}
                    style={{
                      width: "100%", padding: "7px 0", borderRadius: 8,
                      border:      `1.5px solid ${isExp ? "var(--primary)" : "var(--border)"}`,
                      background:  isExp ? "var(--primary)" : "var(--bg)",
                      color:       isExp ? "white" : "var(--text-muted)",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "all 0.2s",
                    }}
                  >
                    {isExp ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Details</>}
                  </button>
                </div>

                {/* Expandable section */}
                {isExp && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px", background: "var(--bg)", animation: "pageIn 0.2s ease" }}>
                    {job.description && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Description</div>
                        <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>{job.description}</p>
                      </div>
                    )}
                    {job.responsibilities.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Responsibilities</div>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {job.responsibilities.map((r, i) => (
                            <li key={i} style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 3, lineHeight: 1.5 }}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {job.qualifications.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Qualifications</div>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {job.qualifications.map((q, i) => (
                            <li key={i} style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 3, lineHeight: 1.5 }}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pro-table-footer">
          <span className="pro-table-info">
            Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length}
          </span>
          <div className="page-btns">
            <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`page-btn ${i === page ? "active" : ""}`}
                onClick={() => setPage(i)}
              >
                {i + 1}
              </button>
            ))}
            <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal (identical style to Sidebar logout) ── */}
      {deleteTarget && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,0,50,0.55)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "100%", maxWidth: 380, overflow: "hidden", animation: "slideUp 0.25s ease" }}>

            {/* accent bar */}
            <div style={{ height: 4, background: "linear-gradient(90deg,#f43f5e,#f97316)" }} />

            <div style={{ padding: "24px 24px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <AlertTriangle size={24} color="#f43f5e" />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 900, color: "#1e1143" }}>
                      Confirm Delete
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                      "{deleteTarget.title}" will be removed
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{ width: 30, height: 30, borderRadius: 8, background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.7, marginBottom: 22, paddingLeft: 62 }}>
                This action cannot be undone. The job posting will be permanently deleted from the system.
              </p>
            </div>

            <div style={{ padding: "0 24px 22px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ padding: "9px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f43f5e,#f97316)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: "0 3px 12px rgba(244,63,94,0.3)" }}
              >
                <Trash2 size={15} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}