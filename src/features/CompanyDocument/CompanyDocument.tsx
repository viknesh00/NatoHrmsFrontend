import WorkflowDialog from "../../components/WorkflowDialog";
import { cn } from "cn";
import { Button } from "../../components/ui/button";
import { useEffect, useState } from "react";
import { Pencil, Plus, Download, Trash2, File, AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { getCookie } from "../../auth/Cookies";
import { ToastSuccess, ToastError } from "../../shared/services/ToastMsg";
import ProTable, { StatusChip } from "../../components/ProTable";


const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "N/A");

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
      const blob = new Blob([res.data], { type: String(contentType) });
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

  const handleExportExcel = async (data) => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(
      data.map((r) => ({
        "Document Name": r.documentName,
        Tags:            r.tags,
        "# Assigned":    r.assignedCount,
        "# Read":        r.readCount,
        "Last Updated":  r.lastUpdated ? fmt(r.lastUpdated) : "N/A",
        "Review Date":   r.reviewDate  ? fmt(r.reviewDate)  : "N/A",
        Current:         r.isCurrent ? "Yes" : "No",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Documents");
    XLSX.writeFile(wb, "Company_Documents.xlsx");
  };

  // ─── FILTERED DATA — handled by ProTable internally ───────

  // ─── COLUMNS ────────────────────────────────────────────

  const columns = [
    { field: "documentName", label: "Name" },
    {
      field: "lastUpdated",
      label: "Last Updated",
      renderCell: (row) => (row.lastUpdated ? fmt(row.lastUpdated) : "N/A"),
    },
    {
      field: "tags",
      label: "Tags",
      renderCell: (row) => row.tags || "N/A",
    },
    { field: "assignedCount", label: "# Assigned" },
    { field: "readCount",     label: "# Read" },
    {
      field: "reviewDate",
      label: "Review Date",
      renderCell: (row) => (row.reviewDate ? fmt(row.reviewDate) : "N/A"),
    },
    {
      field: "isCurrent",
      label: "Current",
      filterable: true,
      options: [
        { value: "true",  label: "Yes" },
        { value: "false", label: "No"  },
      ],
      renderCell: (row) => (
        <StatusChip label={row.isCurrent ? "Yes" : "No"} />
      ),
    },
    {
      field: "actions",
      label: "Actions",
      renderCell: (row) => (
        <div className="flex gap-[4px]" >
          <Button variant="ghost" type="button"
            className={cn("icon-btn", "text-[var(--teal)]")}
            title="Download"
            onClick={() => handleDownload(row)}
            
          >
            <Download size={14} />
          </Button>
          {isAdminOrManager && (
            <>
              <Button variant="ghost" type="button"
                className="icon-btn"
                title="Edit"
                onClick={() =>
                  navigate("/company-documents/edit", { state: { editData: row } })
                }
              >
                <Pencil size={14} />
              </Button>
              <Button variant="ghost" type="button"
                className={cn("icon-btn", "text-[var(--coral)]")}
                title="Delete"
                onClick={() => confirmDelete(row)}
                
              >
                <Trash2 size={14} />
              </Button>
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
          <Button variant="default" type="button"
            className="btn btn-teal btn-sm"
            onClick={handleBulkDownload}
          >
            <Download size={14} /> Download ({selected.length})
          </Button>
          {isAdminOrManager && (
            <Button variant="ghost" type="button"
              className={cn("btn btn-sm", "bg-[var(--coral)] text-primary-foreground")}
              
              onClick={() => confirmDelete(selected.map((i) => list[i]).filter(Boolean))}
            >
              <Trash2 size={14} /> Delete ({selected.length})
            </Button>
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
          <Button variant="default" type="button"
            className="btn btn-primary"
            onClick={() => navigate("/company-documents/upload")}
          >
            <Plus size={14} /> Upload
          </Button>
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
      {deleteTarget && <WorkflowDialog title="Confirm document deletion" onClose={() => setDeleteTarget(null)} busy={loading} width="400px" dismissible={false}>
<div
            className="bg-card w-[100%] max-w-[400px] overflow-hidden" style={{borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", animation: "slideUp 0.25s ease"}}
          >
            {/* top accent bar */}
            <div className="h-[4px] bg-destructive"  />

            <div className="p-[24px_24px_0]" >
              <div className="flex justify-between items-start mb-[16px]" >
                <div className="flex items-center gap-[16px]" >
                  <div
                    className="w-[48px] h-[48px] bg-error-subtle flex items-center justify-center shrink-[0]" style={{borderRadius: "var(--radius)"}}
                  >
                    <AlertTriangle size={24} color="var(--coral)" />
                  </div>
                  <div>
                    <div className="text-[18px] font-semibold text-[var(--text-primary)]" style={{fontFamily: "var(--ui-font-heading)"}}>
                      Confirm Delete
                    </div>
                    <div className="text-[13px] text-muted-foreground mt-[4px]" >
                      {Array.isArray(deleteTarget)
                        ? `${deleteTarget.length} document${deleteTarget.length > 1 ? "s" : ""} will be removed`
                        : `"${deleteTarget.documentName}" will be removed`}
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
                This action cannot be undone. The document
                {Array.isArray(deleteTarget) && deleteTarget.length > 1 ? "s" : ""} will
                be permanently deleted from the system.
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
                className="p-[8px_20px] bg-destructive text-primary-foreground text-[13px] font-semibold cursor-pointer flex items-center gap-[8px]" style={{borderRadius: "var(--radius)", border: "none", fontFamily: "var(--ui-font-heading)", boxShadow: "var(--shadow-sm)"}}
              >
                <Trash2 size={15} /> Yes, Delete
              </Button>
            </div>
          </div>
</WorkflowDialog>}
    </div>
  );
}
