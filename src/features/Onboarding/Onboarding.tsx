import WorkflowDialog from "../../components/WorkflowDialog";
import { cn } from "cn";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Download, Link2, UserCheck, FileText, Image as ImageIcon, X, Trash2, AlertTriangle, Award, Eye, SlidersHorizontal, Briefcase } from "lucide-react";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import ProTable from "../../components/ProTable";
import { getCookie } from "../../auth/Cookies";
import { FormDate } from "../../components/FormComponents";

// Name, the selection box and Actions can never be hidden
const ALWAYS_VISIBLE = ["select", "fullName", "actions"];

const fmtDate = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "—");
const fmtDateTime = (d) => (d ? dayjs(d).format("DD-MM-YYYY HH:mm") : "—");

const saveBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // array of rows to delete
  const [certView, setCertView] = useState(null);         // { row, items } - certificates popup
  const role = getCookie("role");
  const isAdminOrManager = role === "Admin" || role === "Manager";
  const canEdit = isAdminOrManager;                        // only Admin / Manager can edit or delete
  const [hiddenCols, setHiddenCols] = useState([]);        // column keys hidden for everybody (set by Admin / Manager)
  const [dateDraft, setDateDraft] = useState({ from: "", to: "" });    // work-period filter being edited in the Filters panel
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });  // applied work-period filter
  const [colDraft, setColDraft] = useState(null);          // hidden list being edited in the Columns popup

  useEffect(() => {
    getRequest("EmployeeOnboarding/ColumnSettings")
      .then((res) => setHiddenCols(res.data?.hiddenColumns || []))
      .catch(() => {});
    fetchList();
     
  }, []);

  const fetchList = () => {
    setLoading(true);
    getRequest("EmployeeOnboarding/GetAll")
      .then((res) => {
        setList((res.data || []).map((d) => ({
          ...d,
          employeeStatus: d.employeeStatus || "Active",
          fullName: `${d.firstName} ${d.lastName}`,
          dobText: fmtDate(d.dateOfBirth),
          siemensMonthText: d.siemensIdReceivedMonth ? dayjs(d.siemensIdReceivedMonth).format("MMM YYYY") : "—",
          workStatus: d.workStatus || "Not assigned",
          workPmName: d.workPmName || "—",
          workStartText: fmtDate(d.workStartDate),
          workEndText: d.workStartDate ? (d.workEndDate ? fmtDate(d.workEndDate) : "Ongoing") : "—",
          consentText: d.consentGiven ? "Yes" : "—",
          visaExpiryText: fmtDate(d.workVisaExpiryDate),
          submittedText: fmtDateTime(d.submittedAt),
        })));
        setSelectedIds([]);
      })
      .catch((err) => ToastError(err.response?.data?.message || "Failed to load submissions"))
      .finally(() => setLoading(false));
  };

  /* ── downloads ── */
  const download = async (payload, fileName) => {
    try {
      setLoading(true);
      const res = await postRequest("EmployeeOnboarding/Download", payload, true);
      saveBlob(new Blob([res.data], { type: "application/zip" }), fileName);
      ToastSuccess("Downloaded");
    } catch {
      ToastError("Download failed");
    } finally {
      setLoading(false);
    }
  };

  const stamp = () => dayjs().format("YYYYMMDD_HHmmss");
  const downloadAll = () => download({ all: true }, `Employee_Details_All_${stamp()}.zip`);
  const downloadSelected = () => download({ ids: selectedIds }, `Employee_Details_Selected_${stamp()}.zip`);
  const downloadOne = (row) => download({ ids: [row.submissionId] }, `${row.firstName}_${row.lastName}_Details.zip`);

  /* ── open an attachment in a new tab ── */
  const openFile = async (row, type) => {
    try {
      setLoading(true);
      const res = await getRequest(`EmployeeOnboarding/File/${row.submissionId}/${type}`, null, true);
      const blob = new Blob([res.data], { type: String(res.headers["content-type"] || "application/octet-stream") });
      window.open(window.URL.createObjectURL(blob), "_blank");
    } catch {
      ToastError("Could not open the file");
    } finally {
      setLoading(false);
    }
  };

  /* ── Columns control (Admin / Manager) - one setting for all users, data is never changed ── */
  const saveColumns = () => {
    setLoading(true);
    postRequest("EmployeeOnboarding/ColumnSettings", { hiddenColumns: colDraft })
      .then(() => { setHiddenCols(colDraft); setColDraft(null); ToastSuccess("Column settings saved for all users"); })
      .catch((err) => ToastError(err.response?.data?.message || "Could not save the column settings"))
      .finally(() => setLoading(false));
  };

  /* ── delete (single row or selected rows) ── */
  const executeDelete = () => {
    if (!deleteTarget || deleteTarget.length === 0) return;
    setLoading(true);
    postRequest("EmployeeOnboarding/Delete", deleteTarget.map((r) => r.submissionId))
      .then(() => {
        ToastSuccess("Deleted successfully");
        setDeleteTarget(null);
        fetchList();
      })
      .catch((err) => ToastError(err.response?.data?.message || "Delete failed"))
      .finally(() => setLoading(false));
  };

  /* ── certificates popup (list -> view / download each file) ── */
  const openCertificates = async (row) => {
    try {
      setLoading(true);
      const res = await getRequest(`EmployeeOnboarding/Certificates/${row.submissionId}`);
      setCertView({ row, items: res.data || [] });
    } catch {
      ToastError("Could not load the certificates");
    } finally {
      setLoading(false);
    }
  };

  const getCertificateBlob = async (c) => {
    const res = await getRequest(`EmployeeOnboarding/Certificate/${c.certificateId}`, null, true);
    return new Blob([res.data], { type: res.headers["content-type"] || c.contentType || "application/octet-stream" });
  };

  const viewCertificate = async (c) => {
    try {
      setLoading(true);
      window.open(window.URL.createObjectURL(await getCertificateBlob(c)), "_blank");
    } catch { ToastError("Could not open the file"); } finally { setLoading(false); }
  };

  const downloadCertificate = async (c) => {
    try {
      setLoading(true);
      saveBlob(await getCertificateBlob(c), c.fileName);
    } catch { ToastError("Download failed"); } finally { setLoading(false); }
  };

  const copyFormLink = async () => {
    const link = `${window.location.origin}/employee-details`;
    try {
      await navigator.clipboard.writeText(link);
      ToastSuccess("Form link copied");
    } catch {
      window.prompt("Copy the form link:", link);
    }
  };

  /* ── selection (kept by record id, so it survives sorting / filtering) ── */
  const toggleOne = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allSelected = list.length > 0 && selectedIds.length === list.length;
  const toggleAll = () => setSelectedIds(allSelected ? [] : list.map((r) => r.submissionId));

  const linkBtn = { background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--primary)", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 };

  const allColumns = [
    {
      field: "select", width: 44,
      label: <Checkbox  checked={allSelected} onCheckedChange={toggleAll} className="cursor-pointer"  title="Select all" />,
      renderCell: (row) => (
        <Checkbox  checked={selectedIds.includes(row.submissionId)} onCheckedChange={() => toggleOne(row.submissionId)} className="cursor-pointer"  />
      ),
    },
    { field: "fullName", label: "Name" },
    { field: "dobText", label: "Date of Birth" },
    { field: "mobileNumber", label: "Mobile" },
    { field: "passportNo", label: "Passport No." },
    { field: "salCode", label: "SAL Code", filterable: true },
    { field: "employeeStatus", label: "Employee Status", filterable: true },
    { field: "workStatus", label: "Work Status", filterable: true },
    { field: "workPmName", label: "PM Name" },
    { field: "workStartText", label: "Work Start Date" },
    { field: "workEndText", label: "Work End Date" },
    { field: "city", label: "City", filterable: true },
    { field: "country", label: "Country", filterable: true },
    { field: "nConsEmail", label: "N-Cons Email" },
    { field: "nConsEmailStatus", label: "N-Cons Status", filterable: true },
    { field: "personalEmail", label: "Personal Email" },
    { field: "visaType", label: "Visa / Permit" },
    { field: "visaExpiryText", label: "Visa Expiry" },
    { field: "hasSiemensIdCard", label: "ID Card Status", filterable: true },
    { field: "certificateCount", label: "Certificates" },
    { field: "siemensMonthText", label: "Siemens ID Received" },
    { field: "whatsAppNumber", label: "WhatsApp" },
    { field: "consentText", label: "Consent" },
    { field: "submittedText", label: "Submitted" },
    {
      field: "documents", label: "Documents",
      renderCell: (row) => (
        <div className="flex gap-[12px]" >
          <Button variant="ghost" type="button" style={linkBtn} onClick={() => openFile(row, "PassportCopy")} title={row.passportCopyFileName || ""}><FileText size={13} /> Passport</Button>
          <Button variant="ghost" type="button" style={linkBtn} onClick={() => openFile(row, "PassportPhoto")} title={row.passportPhotoFileName || ""}><ImageIcon size={13} /> Photo</Button>
          {row.certificateCount > 0 && (
            <Button variant="ghost" type="button" style={linkBtn} onClick={() => openCertificates(row)} title="View the uploaded certificates"><Award size={13} /> Certificates ({row.certificateCount})</Button>
          )}
        </div>
      ),
    },
    {
      field: "actions", label: "Actions",
      renderCell: (row) => (
        <div className="flex gap-[4px]" >
          {canEdit && <Button variant="ghost" type="button" className="icon-btn" title="View / Edit" onClick={() => navigate(`/onboarding/edit/${row.submissionId}`)}><Pencil size={15} /></Button>}
          <Button variant="ghost" type="button" className="icon-btn" title="Download details + files" onClick={() => downloadOne(row)}><Download size={15} /></Button>
          {role !== "Employee" && (
            <Button variant="ghost" type="button" className="icon-btn" title="Work status" onClick={() => navigate(`/work-status?employee=${row.submissionId}`)}><Briefcase size={15} /></Button>
          )}
          {canEdit && <Button variant="ghost" type="button" className="icon-btn" title="Delete" onClick={() => setDeleteTarget([row])}><Trash2 size={15} /></Button>}
        </div>
      ),
    },
  ];

  // work period filter: keeps employees whose latest work period overlaps the chosen dates (no end date = still running)
  const day = (v) => (v ? String(v).split("T")[0] : "");
  const visibleRows = list.filter((r) => {
    if (!dateFilter.from && !dateFilter.to) return true;
    const start = day(r.workStartDate);
    if (!start) return false;
    const end = day(r.workEndDate);
    if (dateFilter.to && start > dateFilter.to) return false;
    if (dateFilter.from && end && end < dateFilter.from) return false;
    return true;
  });
  const dateFilterFields = (
    <>
      <FormDate label="Work Date From" value={dateDraft.from} onChange={(e) => setDateDraft((d) => ({ ...d, from: e.target.value }))} />
      <FormDate label="Work Date To" value={dateDraft.to} min={dateDraft.from || undefined} onChange={(e) => setDateDraft((d) => ({ ...d, to: e.target.value }))} />
    </>
  );
  const dateChip = dateFilter.from || dateFilter.to
    ? `${dateFilter.from ? fmtDate(dateFilter.from) : "…"} to ${dateFilter.to ? fmtDate(dateFilter.to) : "…"}` : "";

  const columns = allColumns.filter((c) => ALWAYS_VISIBLE.includes(c.field) || !hiddenCols.includes(c.field));
  const toggleableColumns = allColumns.filter((c) => !ALWAYS_VISIBLE.includes(c.field));

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<UserCheck size={13} />} items={[{ label: "Onboarding" }]} />
          <h1 className="page-title">Employee Onboarding</h1>
          <p className="page-subtitle">Details and documents submitted through the employee details form</p>
        </div>
        <div className="flex gap-[12px] flex-wrap" >
          {isAdminOrManager && (
            <Button variant="outline" type="button" className="btn btn-outline" onClick={() => setColDraft([...hiddenCols])}><SlidersHorizontal size={15} /> Columns</Button>
          )}
          <Button variant="outline" type="button" className="btn btn-outline" onClick={copyFormLink}><Link2 size={15} /> Copy form link</Button>
          <Button variant="default" type="button" className="btn btn-primary" onClick={downloadAll} disabled={list.length === 0}><Download size={15} /> Download all</Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-[12px] p-[12px_16px] mb-[12px] bg-[var(--primary-ghost)]" style={{borderRadius: "var(--radius)", border: "1px solid var(--border-strong)"}}>
          <span className="text-[13px] font-semibold text-primary" >{selectedIds.length} selected</span>
          <Button variant="default" type="button" className={cn("btn btn-primary", "p-[8px_16px]")}  onClick={downloadSelected}><Download size={14} /> Download selected</Button>
          {canEdit && <Button variant="outline" type="button" className={cn("btn btn-ghost", "p-[8px_16px] text-error")}  onClick={() => setDeleteTarget(list.filter((r) => selectedIds.includes(r.submissionId)))}><Trash2 size={14} /> Delete selected</Button>}
          <Button variant="outline" type="button" className={cn("btn btn-ghost", "p-[8px_12px]")}  onClick={() => setSelectedIds([])}><X size={14} /> Clear</Button>
        </div>
      )}

      <ProTable
        title="Employee Details" columns={columns} data={visibleRows} multiSelect={false}
        filterComponents={dateFilterFields}
        onApplyFilters={() => {
          if (dateDraft.from && dateDraft.to && dateDraft.to < dateDraft.from) { ToastError("'Work Date To' cannot be before 'Work Date From'"); return; }
          setDateFilter(dateDraft);
        }}
        onResetFilters={() => { setDateDraft({ from: "", to: "" }); setDateFilter({ from: "", to: "" }); }}
        externalFilters={[{ label: "Work Date", value: dateChip }]}
      />

      {/* ── Columns popup (Admin / Manager) ── */}
      {colDraft && <WorkflowDialog title="Columns" onClose={() => setColDraft(null)} busy={loading} width="460px" dismissible={true}>
<div className="bg-card w-[100%] max-w-[460px] max-h-[85vh] overflow-hidden flex flex-col" style={{borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)"}}
            onClick={(e) => e.stopPropagation()}>
            <div className="h-[4px] bg-primary"  />
            <div className="p-[20px_24px_8px] flex justify-between items-start" >
              <div>
                <div className="text-[18px] font-semibold text-[var(--text-primary)]" style={{fontFamily: "var(--ui-font-heading)"}}>Columns</div>
                <div className="text-[13px] text-muted-foreground mt-[4px]" >Choose the columns shown to everyone. Name and Actions are always visible. The employee data is not changed.</div>
              </div>
              <Button variant="ghost" type="button" onClick={() => setColDraft(null)} className="w-[36px] h-[36px] bg-muted cursor-pointer flex items-center justify-center text-muted-foreground shrink-[0]" style={{borderRadius: "var(--radius)", border: "none"}}><X size={16} /></Button>
            </div>
            <div className="p-[4px_24px_8px] flex gap-[8px]" >
              <Button variant="outline" type="button" className={cn("btn btn-ghost", "p-[4px_12px] text-[12px]")}  onClick={() => setColDraft([])}>Show all</Button>
              <Button variant="outline" type="button" className={cn("btn btn-ghost", "p-[4px_12px] text-[12px]")}  onClick={() => setColDraft(toggleableColumns.map((c) => c.field))}>Hide all</Button>
            </div>
            <div className="p-[4px_24px_8px] overflow-y-auto" >
              {[{ field: "fullName", label: "Name" }, ...toggleableColumns, { field: "actions", label: "Actions" }].map((c) => {
                const locked = ALWAYS_VISIBLE.includes(c.field);
                const visible = locked || !colDraft.includes(c.field);
                return (
                  <label key={c.field} className="flex items-center gap-[12px] p-[8px_4px] text-[14px]" style={{color: locked ? "var(--muted-foreground)" : "var(--text-primary)", cursor: locked ? "not-allowed" : "pointer"}}>
                    <Checkbox  checked={visible} disabled={locked} style={{ cursor: "inherit" }}
                      onCheckedChange={() => setColDraft((d) => (d.includes(c.field) ? d.filter((x) => x !== c.field) : [...d, c.field]))} />
                    {c.label}{locked ? " (always visible)" : ""}
                  </label>
                );
              })}
            </div>
            <div className="p-[12px_24px_20px] flex gap-[12px] justify-end" style={{borderTop: "1px solid var(--border)"}}>
              <Button variant="outline" type="button" className="btn btn-outline" onClick={() => setColDraft(null)}>Cancel</Button>
              <Button variant="default" type="button" className="btn btn-primary" onClick={saveColumns}>Save for all users</Button>
            </div>
          </div>
</WorkflowDialog>}

      {/* ── Certificates popup ── */}
      {certView && <WorkflowDialog title="Certificates" onClose={() => setCertView(null)} busy={loading} width="520px" dismissible={true}>
<div className="bg-card w-[100%] max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col" style={{borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", animation: "slideUp 0.25s ease"}}
            onClick={(e) => e.stopPropagation()}>
            <div className="h-[4px] bg-primary"  />
            <div className="p-[20px_24px_12px] flex justify-between items-start" >
              <div>
                <div className="text-[18px] font-semibold text-[var(--text-primary)]" style={{fontFamily: "var(--ui-font-heading)"}}>Certificates</div>
                <div className="text-[13px] text-muted-foreground mt-[4px]" >{certView.row.firstName} {certView.row.lastName} · {certView.items.length} file{certView.items.length === 1 ? "" : "s"}</div>
              </div>
              <Button variant="ghost" type="button" onClick={() => setCertView(null)} className="w-[36px] h-[36px] bg-muted cursor-pointer flex items-center justify-center text-muted-foreground" style={{borderRadius: "var(--radius)", border: "none"}}>
                <X size={16} />
              </Button>
            </div>
            <div className="p-[0_24px_24px] overflow-y-auto" >
              {certView.items.length === 0 ? (
                <div className="text-[13px] text-muted-foreground p-[12px_0]" >No certificates were uploaded.</div>
              ) : certView.items.map((c) => (
                <div key={c.certificateId} className="flex items-center gap-[12px] p-[12px_12px] bg-[var(--bg)] mb-[8px] flex-wrap" style={{border: "1px solid var(--border)", borderRadius: "var(--radius)"}}>
                  <FileText size={18} color="var(--primary)" />
                  <div className="min-w-[140px]" style={{flex: 1}}>
                    <div className="text-[13px] font-semibold text-[var(--text-primary)]" style={{wordBreak: "break-all"}}>{c.fileName}</div>
                    <div className="text-[12px] text-[var(--text-muted)]" >{(c.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <Button variant="outline" type="button" className={cn("btn btn-outline", "p-[4px_12px]")}  onClick={() => viewCertificate(c)}><Eye size={13} /> View</Button>
                  <Button variant="outline" type="button" className={cn("btn btn-outline", "p-[4px_12px]")}  onClick={() => downloadCertificate(c)}><Download size={13} /> Download</Button>
                </div>
              ))}
            </div>
          </div>
</WorkflowDialog>}

      {/* ── Delete confirmation ── */}
      {deleteTarget && <WorkflowDialog title="Confirm Delete" onClose={() => setDeleteTarget(null)} busy={loading} width="420px" dismissible={false}>
<div className="bg-card w-[100%] max-w-[420px] overflow-hidden" style={{borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", animation: "slideUp 0.25s ease"}}>
            <div className="h-[4px] bg-destructive"  />
            <div className="p-[24px_24px_0]" >
              <div className="flex justify-between items-start mb-[16px]" >
                <div className="flex items-center gap-[16px]" >
                  <div className="w-[48px] h-[48px] bg-error-subtle flex items-center justify-center shrink-[0]" style={{borderRadius: "var(--radius)"}}>
                    <AlertTriangle size={24} color="var(--coral)" />
                  </div>
                  <div>
                    <div className="text-[18px] font-semibold text-[var(--text-primary)]" style={{fontFamily: "var(--ui-font-heading)"}}>Confirm Delete</div>
                    <div className="text-[13px] text-muted-foreground mt-[4px]" >
                      {deleteTarget.length === 1
                        ? `${deleteTarget[0].firstName} ${deleteTarget[0].lastName} will be removed`
                        : `${deleteTarget.length} submissions will be removed`}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" type="button" onClick={() => setDeleteTarget(null)} className="w-[36px] h-[36px] bg-muted cursor-pointer flex items-center justify-center text-muted-foreground" style={{borderRadius: "var(--radius)", border: "none"}}>
                  <X size={16} />
                </Button>
              </div>
              <p className="text-[14px] text-muted-foreground leading-[1.7] mb-[24px] pl-[64px]" >
                The submission will be removed from this list. It is not erased from the database.
              </p>
            </div>
            <div className="p-[0_24px_24px] flex gap-[12px] justify-end" >
              <Button variant="ghost" type="button" onClick={() => setDeleteTarget(null)} className="p-[8px_20px] bg-card text-muted-foreground text-[13px] font-semibold cursor-pointer" style={{borderRadius: "var(--radius)", border: "1px solid var(--border)", fontFamily: "var(--ui-font-sans)"}}>
                Cancel
              </Button>
              <Button variant="ghost" type="button" onClick={executeDelete} className="p-[8px_20px] bg-destructive text-primary-foreground text-[13px] font-semibold cursor-pointer flex items-center gap-[8px]" style={{borderRadius: "var(--radius)", border: "none", fontFamily: "var(--ui-font-sans)", boxShadow: "none"}}>
                <Trash2 size={15} /> Yes, Delete
              </Button>
            </div>
          </div>
</WorkflowDialog>}
    </div>
  );
}
