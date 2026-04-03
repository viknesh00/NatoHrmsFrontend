import React, { useEffect, useState } from "react";
import { Pencil, Plus, Download, Trash2, File, AlertTriangle, X, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { getCookie } from "../../services/Cookies";
import { ToastSuccess, ToastError } from "../../services/ToastMsg";
import ProTable, { StatusChip } from "../../components/ProTable";
import * as XLSX from "xlsx";
import { createPortal } from "react-dom";

const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "—");

export default function CompanyDocument() {
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(false);
  const [list, setList]               = useState([]);
  const [selected, setSelected]       = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // single row or array of rows
  const isAdminOrManager = ["Admin", "Manager"].includes(getCookie("role"));

  useEffect(() => {
    fetchDocuments();
  }, []);

  // ─── API ────────────────────────────────────────────────

  const fetchDocuments = () => {
    setLoading(true);
    getRequest("CompanyDocument/GetAll")
      .then((res) => {
        if (res.data) setList(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const downloadSingle = async (row) => {
    try {
      setLoading(true);
      const res = await getRequest(`CompanyDocument/Download/${row.id}`, null, true);
      const contentType = res.headers["content-type"] || "application/octet-stream";
      const blob = new Blob([res.data], { type: contentType });
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = row.fileName || "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      ToastSuccess("Downloaded");
    } catch {
      ToastError("Download failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadMultiple = async (rows) => {
    try {
      setLoading(true);
      const ids = rows.map((r) => r.id);
      const res = await postRequest("CompanyDocument/DownloadMultiple", ids, true);
      const blob = new Blob([res.data], { type: "application/zip" });
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `CompanyDocuments_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      ToastSuccess("Downloaded");
      setSelected([]);
    } catch {
      ToastError("Download failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (row) => downloadSingle(row);

  const handleBulkDownload = () => {
    const rows = selected.map((i) => list[i]).filter(Boolean);
    if (!rows.length) return;
    if (rows.length === 1) {
      downloadSingle(rows[0]);
    } else {
      downloadMultiple(rows);
    }
  };

  // Triggers confirmation modal
  const confirmDelete = (rowOrRows) => setDeleteTarget(rowOrRows);

  const executeDelete = () => {
    if (!deleteTarget) return;
    const ids = Array.isArray(deleteTarget)
      ? deleteTarget.map((r) => r.id)
      : [deleteTarget.id];

    setLoading(true);
    postRequest("CompanyDocument/Delete", ids)
      .then(() => {
        ToastSuccess("Deleted successfully");
        setList((l) => l.filter((d) => !ids.includes(d.id)));
        setSelected([]);
        setDeleteTarget(null);
      })
      .catch(() => ToastError("Delete failed"))
      .finally(() => setLoading(false));
  };

  const handleExportExcel = (data) => {
    const ws = XLSX.utils.json_to_sheet(
      data.map((r) => ({
        "Document Name": r.documentName,
        Tags:            r.tags,
        "# Assigned":    r.assignedCount,
        "# Read":        r.readCount,
        "Last Updated":  r.lastUpdated ? fmt(r.lastUpdated) : "—",
        "Review Date":   r.reviewDate  ? fmt(r.reviewDate)  : "—",
        Current:         r.isCurrent ? "Yes" : "No",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Documents");
    XLSX.writeFile(wb, "Company_Documents.xlsx");
  };

  // ─── COLUMNS ────────────────────────────────────────────

  const columns = [
    { field: "documentName", label: "Name" },
    {
      field: "lastUpdated",
      label: "Last Updated",
      renderCell: (row) => (row.lastUpdated ? fmt(row.lastUpdated) : "—"),
    },
    {
      field: "tags",
      label: "Tags",
      renderCell: (row) => row.tags || "—",
    },
    { field: "assignedCount", label: "# Assigned" },
    { field: "readCount",     label: "# Read" },
    {
      field: "reviewDate",
      label: "Review Date",
      renderCell: (row) => (row.reviewDate ? fmt(row.reviewDate) : "—"),
    },
    {
      field: "isCurrent",
      label: "Current",
      renderCell: (row) => (
        <StatusChip label={row.isCurrent ? "Yes" : "No"} />
      ),
    },
    {
      field: "actions",
      label: "Actions",
      renderCell: (row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className="icon-btn"
            title="Download"
            onClick={() => handleDownload(row)}
            style={{ color: "var(--teal)" }}
          >
            <Download size={14} />
          </button>
          {isAdminOrManager && (
            <>
              <button
                className="icon-btn"
                title="Edit"
                onClick={() =>
                  navigate("/company-documents/edit", { state: { editData: row } })
                }
              >
                <Pencil size={14} />
              </button>
              <button
                className="icon-btn"
                title="Delete"
                onClick={() => confirmDelete(row)}
                style={{ color: "var(--coral)" }}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // ─── BULK ACTIONS BAR ───────────────────────────────────

  const tableActions = (
    <>
      {selected.length > 0 && (
        <>
          <button
            className="btn btn-teal btn-sm"
            onClick={handleBulkDownload}
          >
            <Download size={14} /> Download ({selected.length})
          </button>
          {isAdminOrManager && (
            <button
              className="btn btn-sm"
              style={{ background: "var(--coral)", color: "#fff" }}
              onClick={() => confirmDelete(selected.map((i) => list[i]).filter(Boolean))}
            >
              <Trash2 size={14} /> Delete ({selected.length})
            </button>
          )}
        </>
      )}
    </>
  );

  // ─── RENDER ─────────────────────────────────────────────

  return (
    <div>
      <LoadingMask loading={loading} />

      <div className="page-header">
        <div>
          <Breadcrumb icon={<File size={13} />} items={[{ label: "Company Documents" }]} />
          <h1 className="page-title">Company Documents</h1>
          <p className="page-subtitle">Shared documents and resources</p>
        </div>
        {isAdminOrManager && (
          <button
            className="btn btn-primary"
            onClick={() => navigate("/company-documents/upload")}
          >
            <Plus size={14} /> Upload
          </button>
        )}
      </div>

      <ProTable
        title="Documents"
        columns={columns}
        data={list}
        actions={tableActions}
        onExport={handleExportExcel}
        multiSelect={true}
        onSelectionChange={setSelected}
      />

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && createPortal(
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(20,0,50,0.55)",
            backdropFilter: "blur(5px)",
            zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "white", borderRadius: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              width: "100%", maxWidth: 400,
              overflow: "hidden",
              animation: "slideUp 0.25s ease",
            }}
          >
            {/* top accent bar */}
            <div style={{ height: 4, background: "linear-gradient(90deg,#f43f5e,#f97316)" }} />

            <div style={{ padding: "24px 24px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: "#fff1f2",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle size={24} color="#f43f5e" />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 900, color: "#1e1143" }}>
                      Confirm Delete
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                      {Array.isArray(deleteTarget)
                        ? `${deleteTarget.length} document${deleteTarget.length > 1 ? "s" : ""} will be removed`
                        : `"${deleteTarget.documentName}" will be removed`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: "#f1f5f9", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#64748b",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.7, marginBottom: 22, paddingLeft: 62 }}>
                This action cannot be undone. The document
                {Array.isArray(deleteTarget) && deleteTarget.length > 1 ? "s" : ""} will
                be permanently deleted from the system.
              </p>
            </div>

            <div style={{ padding: "0 24px 22px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: "9px 20px", borderRadius: 10,
                  border: "1.5px solid #e2e8f0", background: "white",
                  color: "#475569", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                style={{
                  padding: "9px 20px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg,#f43f5e,#f97316)",
                  color: "white", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  gap: 7, fontFamily: "'Plus Jakarta Sans',sans-serif",
                  boxShadow: "0 3px 12px rgba(244,63,94,0.3)",
                }}
              >
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