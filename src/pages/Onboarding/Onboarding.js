import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Pencil, Download, Link2, UserCheck, FileText, Image as ImageIcon, X, Trash2, AlertTriangle, Award, Eye, SlidersHorizontal, Briefcase } from "lucide-react";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../services/Apiservice";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable from "../../components/ProTable";
import { usePermissions } from "../../services/Permissions";

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
  const perms = usePermissions();                          // Read / Write / Edit rights of this user
  const canEdit = !!perms?.onboarding?.edit;
  const [hiddenCols, setHiddenCols] = useState([]);        // column keys hidden for everybody (set by Admin / Manager)
  const [colDraft, setColDraft] = useState(null);          // hidden list being edited in the Columns popup

  useEffect(() => {
    getRequest("EmployeeOnboarding/ColumnSettings")
      .then((res) => setHiddenCols(res.data?.hiddenColumns || []))
      .catch(() => {});
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/octet-stream" });
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

  const linkBtn = { background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--primary)", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 };

  const allColumns = [
    {
      field: "select", width: 44,
      label: <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer" }} title="Select all" />,
      renderCell: (row) => (
        <input type="checkbox" checked={selectedIds.includes(row.submissionId)} onChange={() => toggleOne(row.submissionId)} style={{ cursor: "pointer" }} />
      ),
    },
    { field: "fullName", label: "Name" },
    { field: "dobText", label: "Date of Birth" },
    { field: "mobileNumber", label: "Mobile" },
    { field: "passportNo", label: "Passport No." },
    { field: "salCode", label: "SAL Code", filterable: true },
    { field: "employeeStatus", label: "Status", filterable: true },
    { field: "workStatus", label: "Work Status", filterable: true },
    { field: "workPmName", label: "PM Name" },
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
        <div style={{ display: "flex", gap: 12 }}>
          <button style={linkBtn} onClick={() => openFile(row, "PassportCopy")} title={row.passportCopyFileName || ""}><FileText size={13} /> Passport</button>
          <button style={linkBtn} onClick={() => openFile(row, "PassportPhoto")} title={row.passportPhotoFileName || ""}><ImageIcon size={13} /> Photo</button>
          {row.certificateCount > 0 && (
            <button style={linkBtn} onClick={() => openCertificates(row)} title="View the uploaded certificates"><Award size={13} /> Certificates ({row.certificateCount})</button>
          )}
        </div>
      ),
    },
    {
      field: "actions", label: "Actions",
      renderCell: (row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button className="icon-btn" title="View / Edit" onClick={() => navigate(`/onboarding/edit/${row.submissionId}`)}><Pencil size={15} /></button>
          <button className="icon-btn" title="Download details + files" onClick={() => downloadOne(row)}><Download size={15} /></button>
          {perms?.workStatus?.read && (
            <button className="icon-btn" title="Work status" onClick={() => navigate(`/work-status?employee=${row.submissionId}`)}><Briefcase size={15} /></button>
          )}
          {canEdit && <button className="icon-btn" title="Delete" onClick={() => setDeleteTarget([row])}><Trash2 size={15} /></button>}
        </div>
      ),
    },
  ];

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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {perms?.isAdminOrManager && (
            <button className="btn btn-outline" onClick={() => setColDraft([...hiddenCols])}><SlidersHorizontal size={15} /> Columns</button>
          )}
          <button className="btn btn-outline" onClick={copyFormLink}><Link2 size={15} /> Copy form link</button>
          <button className="btn btn-primary" onClick={downloadAll} disabled={list.length === 0}><Download size={15} /> Download all</button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", marginBottom: 12, borderRadius: 12, background: "var(--primary-ghost)", border: "1px solid var(--border-strong)" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{selectedIds.length} selected</span>
          <button className="btn btn-primary" style={{ padding: "6px 14px" }} onClick={downloadSelected}><Download size={14} /> Download selected</button>
          {canEdit && <button className="btn btn-ghost" style={{ padding: "6px 14px", color: "#e11d48" }} onClick={() => setDeleteTarget(list.filter((r) => selectedIds.includes(r.submissionId)))}><Trash2 size={14} /> Delete selected</button>}
          <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={() => setSelectedIds([])}><X size={14} /> Clear</button>
        </div>
      )}

      <ProTable title="Employee Details" columns={columns} data={list} multiSelect={false} />

      {/* ── Columns popup (Admin / Manager) ── */}
      {colDraft && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,0,50,0.55)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setColDraft(null)}>
          <div style={{ background: "white", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "100%", maxWidth: 460, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 4, background: "linear-gradient(90deg,#6c3fc5,#0d9488)" }} />
            <div style={{ padding: "20px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 900, color: "#1e1143" }}>Columns</div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>Choose the columns shown to everyone. Name and Actions are always visible. The employee data is not changed.</div>
              </div>
              <button onClick={() => setColDraft(null)} style={{ width: 30, height: 30, borderRadius: 8, background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}><X size={16} /></button>
            </div>
            <div style={{ padding: "4px 24px 8px", display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setColDraft([])}>Show all</button>
              <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setColDraft(toggleableColumns.map((c) => c.field))}>Hide all</button>
            </div>
            <div style={{ padding: "4px 24px 8px", overflowY: "auto" }}>
              {[{ field: "fullName", label: "Name" }, ...toggleableColumns, { field: "actions", label: "Actions" }].map((c) => {
                const locked = ALWAYS_VISIBLE.includes(c.field);
                const visible = locked || !colDraft.includes(c.field);
                return (
                  <label key={c.field} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", fontSize: 13.5, color: locked ? "#94a3b8" : "var(--text-primary)", cursor: locked ? "not-allowed" : "pointer" }}>
                    <input type="checkbox" checked={visible} disabled={locked} style={{ cursor: "inherit" }}
                      onChange={() => setColDraft((d) => (d.includes(c.field) ? d.filter((x) => x !== c.field) : [...d, c.field]))} />
                    {c.label}{locked ? " (always visible)" : ""}
                  </label>
                );
              })}
            </div>
            <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-outline" onClick={() => setColDraft(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveColumns}>Save for all users</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Certificates popup ── */}
      {certView && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,0,50,0.55)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setCertView(null)}>
          <div style={{ background: "white", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "slideUp 0.25s ease" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 4, background: "linear-gradient(90deg,#6c3fc5,#0d9488)" }} />
            <div style={{ padding: "20px 24px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 900, color: "#1e1143" }}>Certificates</div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>{certView.row.firstName} {certView.row.lastName} · {certView.items.length} file{certView.items.length === 1 ? "" : "s"}</div>
              </div>
              <button onClick={() => setCertView(null)} style={{ width: 30, height: 30, borderRadius: 8, background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: "0 24px 22px", overflowY: "auto" }}>
              {certView.items.length === 0 ? (
                <div style={{ fontSize: 13, color: "#64748b", padding: "10px 0" }}>No certificates were uploaded.</div>
              ) : certView.items.map((c) => (
                <div key={c.certificateId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)", marginBottom: 8, flexWrap: "wrap" }}>
                  <FileText size={18} color="var(--primary)" />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", wordBreak: "break-all" }}>{c.fileName}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{(c.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <button className="btn btn-outline" style={{ padding: "5px 10px" }} onClick={() => viewCertificate(c)}><Eye size={13} /> View</button>
                  <button className="btn btn-outline" style={{ padding: "5px 10px" }} onClick={() => downloadCertificate(c)}><Download size={13} /> Download</button>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete confirmation ── */}
      {deleteTarget && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,0,50,0.55)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "100%", maxWidth: 420, overflow: "hidden", animation: "slideUp 0.25s ease" }}>
            <div style={{ height: 4, background: "linear-gradient(90deg,#f43f5e,#f97316)" }} />
            <div style={{ padding: "24px 24px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <AlertTriangle size={24} color="#f43f5e" />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 900, color: "#1e1143" }}>Confirm Delete</div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                      {deleteTarget.length === 1
                        ? `${deleteTarget[0].firstName} ${deleteTarget[0].lastName} will be removed`
                        : `${deleteTarget.length} submissions will be removed`}
                    </div>
                  </div>
                </div>
                <button onClick={() => setDeleteTarget(null)} style={{ width: 30, height: 30, borderRadius: 8, background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                  <X size={16} />
                </button>
              </div>
              <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.7, marginBottom: 22, paddingLeft: 62 }}>
                The submission will be removed from this list. It is not erased from the database.
              </p>
            </div>
            <div style={{ padding: "0 24px 22px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: "9px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Cancel
              </button>
              <button onClick={executeDelete} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f43f5e,#f97316)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: "0 3px 12px rgba(244,63,94,0.3)" }}>
                <Trash2 size={15} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
