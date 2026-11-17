import WorkflowDialog from "../../components/WorkflowDialog";
import { cn } from "cn";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MapPin, Calendar, Banknote, AlertTriangle, X } from "lucide-react";
import dayjs from "dayjs";
import { getRequest, deleteRequest } from "../../shared/services/Apiservice";
import { ToastSuccess, ToastError } from "../../shared/services/ToastMsg";
import { getCookie } from "../../auth/Cookies";
import LoadingMask from "../../shared/services/LoadingMask";
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
  const isAdminOrManager = isAdmin || getCookie("role") === "Manager";

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

  const handleExport = async () => {
    const XLSX = await import("xlsx");
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
    "Full-time":  { bg: "var(--success-subtle)", color: "var(--success)" },
    "Part-time":  { bg: "var(--primary-ghost)", color: "var(--primary-dark)" },
    "Contract":   { bg: "var(--warning-subtle)", color: "var(--warning)" },
    "Remote":     { bg: "var(--primary-ghost)", color: "var(--primary)" },
    "Internship": { bg: "var(--error-subtle)", color: "var(--error)" },
  };

  return (
    <>
      <LoadingMask loading={loading} />

      {/* Toolbar */}
      <div className="flex gap-[12px] mb-[20px] items-center flex-wrap" >
        <div className={cn("search-box", "min-w-[220px] max-w-[360px]")} style={{flex: 1}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>

        <span className="text-[13px] text-[var(--text-muted)] font-semibold" >
          {filtered.length} position{filtered.length !== 1 ? "s" : ""}
        </span>

        <div className="ml-[auto] flex gap-[8px]" >
          <Button variant="ghost" type="button"
            className={cn("icon-btn", "text-[var(--teal)]")}
            onClick={handleExport}
            title="Export Excel"
            
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
          </Button>

          {isAdminOrManager && (
            <Button variant="default" type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate("/job-management/create-job")}
            >
              <Plus size={14} /> Post Job
            </Button>
          )}
        </div>
      </div>

      {/* Job Cards Grid */}
      {paged.length === 0 ? (
        <div className="table-empty">
          <div className="table-empty-text">No job postings found</div>
        </div>
      ) : (
        <div className="grid gap-[16px] mb-[20px]" style={{gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", alignItems: "start"}}>
          {paged.map(job => {
            const isExp = expanded === job.id;
            const ts    = JOB_TYPE_STYLES[job.jobType] || { bg: "var(--primary-ghost)", color: "var(--primary)" };

            return (
              <div
                key={job.id}
                className="bg-[var(--bg-card)] overflow-hidden" style={{borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", transition: "box-shadow 0.2s"}}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "var(--shadow-sm)"}
              >
                {/* accent bar */}
                <div className="h-[4px] bg-primary"  />

                <div className="p-[16px_16px]" >
                  {/* Title row */}
                  <div className="flex justify-between items-start mb-[8px]" >
                    <div className="min-w-[0px] pr-[8px]" style={{flex: 1}}>
                      <div className="text-[14.5px] font-semibold text-[var(--text-primary)] mb-[4px] overflow-hidden whitespace-nowrap" style={{fontFamily: "var(--ui-font-heading)", textOverflow: "ellipsis"}}>
                        {job.title}
                      </div>
                      <div className="text-[12px] text-[var(--text-muted)]" >{job.role}</div>
                    </div>

                    {isAdmin && (
                      <div className="flex gap-[4px] shrink-[0]" >
                        <Button variant="ghost" type="button"
                          className={cn("icon-btn", "w-[36px] h-[36px]")}
                          
                          onClick={() => navigate("/job-management/update-job", { state: { editData: job } })}
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button variant="ghost" type="button"
                          className={cn("icon-btn", "w-[36px] h-[36px] text-[var(--coral)]")}
                          
                          onClick={() => confirmDelete(job)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex gap-[8px] flex-wrap mb-[12px]" >
                    {job.jobType && (
                      <span className="text-[12px] font-semibold p-[4px_8px]" style={{background: ts.bg, color: ts.color, borderRadius: "var(--radius)"}}>
                        {job.jobType}
                      </span>
                    )}
                    {job.jobCode && (
                      <span className={cn("badge badge-gray", "text-[12px]")} >#{job.jobCode}</span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-col gap-[4px] mb-[12px]" >
                    {[
                      [<MapPin size={12} />,    job.location],
                      [<Banknote size={12} />,  job.salary],
                      [<Calendar size={12} />,  job.date ? `Posted ${job.date}` : null],
                    ].filter(m => m[1]).map((m, i) => (
                      <div key={i} className="flex items-center gap-[8px] text-[12px] text-[var(--text-secondary)]" >
                        <span className="text-primary shrink-[0]" >{m[0]}</span>
                        {m[1]}
                      </div>
                    ))}
                  </div>

                  {/* Expand toggle */}
                  <Button variant="ghost" type="button"
                    onClick={() => setExpanded(isExp ? null : job.id)}
                    className="w-[100%] p-[8px_0] text-[12px] font-semibold cursor-pointer flex items-center justify-center gap-[8px]" style={{borderRadius: "var(--radius)", border:      `1px solid ${isExp ? "var(--primary)" : "var(--border)"}`, background:  isExp ? "var(--primary)" : "var(--bg)", color:       isExp ? "var(--card)" : "var(--text-muted)", transition: "all 0.2s"}}
                  >
                    {isExp ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Details</>}
                  </Button>
                </div>

                {/* Expandable section */}
                {isExp && (
                  <div className="p-[16px_16px] bg-[var(--bg)]" style={{borderTop: "1px solid var(--border)", animation: "pageIn 0.2s ease"}}>
                    {job.description && (
                      <div className="mb-[12px]" >
                        <div className="text-[12px] font-semibold text-primary uppercase tracking-[0.07em] mb-[4px]" >Description</div>
                        <p className="text-[13px] text-[var(--text-secondary)] leading-[1.7] m-[0px]" >{job.description}</p>
                      </div>
                    )}
                    {job.responsibilities.length > 0 && (
                      <div className="mb-[12px]" >
                        <div className="text-[12px] font-semibold text-primary uppercase tracking-[0.07em] mb-[4px]" >Responsibilities</div>
                        <ul className="m-[0px] pl-[16px]" >
                          {job.responsibilities.map((r, i) => (
                            <li key={i} className="text-[13px] text-[var(--text-secondary)] mb-[4px] leading-[1.5]" >{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {job.qualifications.length > 0 && (
                      <div>
                        <div className="text-[12px] font-semibold text-primary uppercase tracking-[0.07em] mb-[4px]" >Qualifications</div>
                        <ul className="m-[0px] pl-[16px]" >
                          {job.qualifications.map((q, i) => (
                            <li key={i} className="text-[13px] text-[var(--text-secondary)] mb-[4px] leading-[1.5]" >{q}</li>
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
            <Button variant="ghost" type="button" className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button variant="ghost" type="button"
                key={i}
                className={`page-btn ${i === page ? "active" : ""}`}
                onClick={() => setPage(i)}
              >
                {i + 1}
              </Button>
            ))}
            <Button variant="ghost" type="button" className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</Button>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal (identical style to Sidebar logout) ── */}
      {deleteTarget && <WorkflowDialog title="Confirm Delete" onClose={() => setDeleteTarget(null)} busy={loading} width="380px" dismissible={false}>
<div className="bg-card w-[100%] max-w-[380px] overflow-hidden" style={{borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", animation: "slideUp 0.25s ease"}}>

            {/* accent bar */}
            <div className="h-[4px] bg-destructive"  />

            <div className="p-[24px_24px_0]" >
              <div className="flex justify-between items-start mb-[16px]" >
                <div className="flex items-center gap-[16px]" >
                  <div className="w-[48px] h-[48px] bg-error-subtle flex items-center justify-center shrink-[0]" style={{borderRadius: "var(--radius)"}}>
                    <AlertTriangle size={24} color="var(--coral)" />
                  </div>
                  <div>
                    <div className="text-[18px] font-semibold text-[var(--text-primary)]" style={{fontFamily: "var(--ui-font-heading)"}}>
                      Confirm Delete
                    </div>
                    <div className="text-[13px] text-muted-foreground mt-[4px]" >
                      "{deleteTarget.title}" will be removed
                    </div>
                  </div>
                </div>
                <Button variant="ghost" type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="w-[36px] h-[36px] bg-muted cursor-pointer flex items-center justify-center text-muted-foreground" style={{borderRadius: "var(--radius)", border: "none"}}
                >
                  <X size={16} />
                </Button>
              </div>

              <p className="text-[14px] text-muted-foreground leading-[1.7] mb-[24px] pl-[64px]" >
                This action cannot be undone. The job posting will be permanently deleted from the system.
              </p>
            </div>

            <div className="p-[0_24px_24px] flex gap-[12px] justify-end" >
              <Button variant="ghost" type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-[8px_20px] bg-card text-muted-foreground text-[13px] font-semibold cursor-pointer" style={{borderRadius: "var(--radius)", border: "1px solid var(--border)", fontFamily: "var(--ui-font-sans)"}}
              >
                Cancel
              </Button>
              <Button variant="ghost" type="button"
                onClick={executeDelete}
                className="p-[8px_20px] bg-destructive text-primary-foreground text-[13px] font-semibold cursor-pointer flex items-center gap-[8px]" style={{borderRadius: "var(--radius)", border: "none", fontFamily: "var(--ui-font-sans)", boxShadow: "none"}}
              >
                <Trash2 size={15} /> Yes, Delete
              </Button>
            </div>
          </div>
</WorkflowDialog>}
    </>
  );
}
