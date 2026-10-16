import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Download, Link2, UserCheck, FileText, Image as ImageIcon, X } from "lucide-react";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../services/Apiservice";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable from "../../components/ProTable";

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

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchList = () => {
    setLoading(true);
    getRequest("EmployeeOnboarding/GetAll")
      .then((res) => {
        setList((res.data || []).map((d) => ({
          ...d,
          fullName: `${d.firstName} ${d.lastName}`,
          dobText: fmtDate(d.dateOfBirth),
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

  const columns = [
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
    { field: "salCode", label: "SAL Code" },
    { field: "city", label: "City" },
    { field: "country", label: "Country", filterable: true },
    { field: "nConsEmail", label: "N-Cons Email" },
    { field: "nConsEmailStatus", label: "N-Cons Status", filterable: true },
    { field: "personalEmail", label: "Personal Email" },
    { field: "submittedText", label: "Submitted" },
    {
      field: "documents", label: "Documents",
      renderCell: (row) => (
        <div style={{ display: "flex", gap: 12 }}>
          <button style={linkBtn} onClick={() => openFile(row, "PassportCopy")} title={row.passportCopyFileName || ""}><FileText size={13} /> Passport</button>
          <button style={linkBtn} onClick={() => openFile(row, "PassportPhoto")} title={row.passportPhotoFileName || ""}><ImageIcon size={13} /> Photo</button>
        </div>
      ),
    },
    {
      field: "actions", label: "Actions",
      renderCell: (row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button className="icon-btn" title="View / Edit" onClick={() => navigate(`/onboarding/edit/${row.submissionId}`)}><Pencil size={15} /></button>
          <button className="icon-btn" title="Download details + files" onClick={() => downloadOne(row)}><Download size={15} /></button>
        </div>
      ),
    },
  ];

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
          <button className="btn btn-outline" onClick={copyFormLink}><Link2 size={15} /> Copy form link</button>
          <button className="btn btn-primary" onClick={downloadAll} disabled={list.length === 0}><Download size={15} /> Download all</button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", marginBottom: 12, borderRadius: 12, background: "var(--primary-ghost)", border: "1px solid var(--border-strong)" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{selectedIds.length} selected</span>
          <button className="btn btn-primary" style={{ padding: "6px 14px" }} onClick={downloadSelected}><Download size={14} /> Download selected</button>
          <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={() => setSelectedIds([])}><X size={14} /> Clear</button>
        </div>
      )}

      <ProTable title="Employee Details" columns={columns} data={list} multiSelect={false} />
    </div>
  );
}
