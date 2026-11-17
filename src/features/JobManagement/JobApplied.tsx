import WorkflowDialog from "../../components/WorkflowDialog";
import { cn } from "cn";
import { Button } from "../../components/ui/button";
import { NativeSelect } from "../../components/ui/native-select";
import { useEffect, useRef, useState } from "react";
import { Download, X, Check, Plus } from "lucide-react";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import LoadingMask from "../../shared/services/LoadingMask";
import { getCookie } from "../../auth/Cookies";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import ProTable from "../../components/ProTable";
import { useNavigate } from "react-router-dom";

const STATUS_OPTS = ["New", "Still Searching", "Interviewing", "Placed", "Rejected"].map(v => ({ label: v, value: v }));

const STATUS_MAP = {
  "new":             { bg: "var(--primary-ghost)", color: "var(--primary-dark)" },
  "still searching": { bg: "var(--warning-subtle)", color: "var(--warning)" },
  "interviewing":    { bg: "var(--primary-ghost)", color: "var(--primary)" },
  "placed":          { bg: "var(--success-subtle)", color: "var(--success)" },
  "rejected":        { bg: "var(--error-subtle)", color: "var(--error)" },
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
          type: String(res.headers["content-type"] || "application/octet-stream"),
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

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
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

  const CandidateChip = ({ status }: Record<string, any>) => {
    const s = STATUS_MAP[(status || "new").toLowerCase()] || { bg: "var(--muted)", color: "var(--muted-foreground)" };
    return (
      <span
        className="p-[4px_12px] text-[12px] font-semibold cursor-pointer" style={{background:    s.bg, color:         s.color, borderRadius:  "var(--radius)", display:       "inline-block", textTransform: "capitalize"}}
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
      options:    STATUS_OPTS,
      renderCell: (row) => (
        <span onClick={() => handleStatusClick(row)}>
          <CandidateChip status={row.candidateStatus} />
        </span>
      ),
    },
    { field: "assignedTo", label: "Assigned To", filterable: true },
    {
      field:      "actions",
      label:      "Resume",
      renderCell: (row) =>
        row.resumeFileName ? (
          <Button variant="ghost" type="button"
            className={cn("icon-btn", "text-[var(--teal)]")}
            title="Download Resume"
            onClick={() => downloadSingle(row.applicationId, row.resumeFileName)}
            
          >
            <Download size={14} />
          </Button>
        ) : null,
    },
  ];

  // Bulk actions bar — shown inside ProTable toolbar (same pattern as CompanyDocument)
  const tableActions = (
    <>

      {selected.length > 0 && (
        <Button variant="default" type="button"
          className="btn btn-teal btn-sm"
          onClick={handleBulkDownload}
        >
          <Download size={14} /> Download ({selected.length})
        </Button>
      )}
    </>
  );

  // ─────────────────────────── Render ───────────────────────────

  return (
    <div>
      <LoadingMask loading={loading} />

      {/* ── Page Header ── */}
      <div className={cn("page-header", "justify-end")} >
        <Button variant="default" type="button"
          className="btn btn-primary"
          onClick={() => navigate("/job-management/add-profile")}
        >
          <Plus size={14} /> Add Profile
        </Button>
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
        <WorkflowDialog title="Update Application Status" onClose={() => setModal(false)} busy={loading}>
<div
            onClick={e => e.stopPropagation()}
            className="bg-card w-[100%] max-w-[440px] overflow-hidden" style={{borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)"}}
          >
            {/* top accent bar */}
            <div className="h-[4px] bg-primary"  />

            {/* Header */}
            <div className="p-[24px_24px_16px] flex items-start justify-between" style={{borderBottom: "1px solid var(--border)"}}>
              <div>
                <div className="font-semibold text-[16px] text-foreground" >
                  Update Application Status
                </div>
                <div className="text-[13px] text-muted-foreground mt-[4px]" >
                  {selApp.firstName} {selApp.lastName} — {selApp.jobTitle}
                </div>
              </div>
              <Button variant="ghost" type="button"
                onClick={() => setModal(false)}
                className="w-[36px] h-[36px] bg-muted cursor-pointer flex items-center justify-center text-muted-foreground" style={{borderRadius: "var(--radius)", border: "none"}}
              >
                <X size={16} />
              </Button>
            </div>

            {/* Info strip */}
            <div className="p-[16px_24px_0] flex gap-[28px] flex-wrap" >
              {[
                ["Job Code",   selApp.jobCode   || "—"],
                ["Applied On", selApp.appliedOn  || "—"],
                ["Email",      selApp.email      || "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.06em]" >{k}</div>
                  <div className="text-[13px] text-foreground mt-[4px]" >{v}</div>
                </div>
              ))}
            </div>

            {/* Body */}
            <div className="p-[20px_24px]" >
              {/* Status pill buttons */}
              <div className="mb-[20px]" >
                <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-[8px]" >
                  Candidate Status <span className="text-error" >*</span>
                </label>
                <div className="flex flex-wrap gap-[8px]" >
                  {STATUS_OPTS.map(o => (
                    <Button variant="ghost"
                      key={o.value}
                      type="button"
                      onClick={() => setSelStatus(o.value)}
                      className="p-[8px_16px] text-[13px] font-semibold cursor-pointer" style={{borderRadius: "var(--radius)", border:       `1px solid ${selStatus === o.value ? "var(--primary-dark)" : "var(--border)"}`, background:   selStatus === o.value ? "var(--primary-dark)" : "var(--muted)", color:        selStatus === o.value ? "var(--card)" : "var(--muted-foreground)", transition:   "all 0.15s"}}
                    >
                      {o.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Assign To dropdown */}
              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-[8px]" >
                  Assign To <span className="text-error" >*</span>
                </label>
                <NativeSelect
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  className="w-[100%] p-[12px_12px] bg-muted text-[14px] text-foreground" style={{borderRadius: "var(--radius)", border:       "1px solid var(--border)", outline:      "none", appearance:   "none", fontFamily:   "inherit"}}
                >
                  <option value="">Select employee...</option>
                  {employeesList.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {/* Footer */}
            <div className="p-[0_24px_24px] flex gap-[12px] justify-end" >
              <Button variant="ghost" type="button"
                onClick={() => setModal(false)}
                className="p-[8px_20px] bg-card text-muted-foreground text-[13px] font-semibold cursor-pointer" style={{borderRadius: "var(--radius)", border: "1px solid var(--border)", fontFamily: "inherit"}}
              >
                Cancel
              </Button>
              <Button variant="ghost" type="button"
                onClick={handleStatusSave}
                className="p-[8px_20px] bg-[var(--primary-dark)] text-primary-foreground text-[13px] font-semibold cursor-pointer inline-flex items-center gap-[8px]" style={{borderRadius: "var(--radius)", border: "none", fontFamily: "inherit", boxShadow: "0 3px 12px var(--primary-glow)"}}
              >
                <Check size={15} /> Update
              </Button>
            </div>
          </div>
</WorkflowDialog>
      )}
    </div>
  );
}
