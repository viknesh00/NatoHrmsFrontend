import WorkflowDialog from "../../components/WorkflowDialog";
import { cn } from "cn";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { useEffect, useState } from "react";
import { Pencil, Plus, X, Check, AlertCircle, UserMinus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import LoadingMask from "../../shared/services/LoadingMask";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import { getCookie } from "../../auth/Cookies";
import Breadcrumb from "../../shared/services/Breadcrumb";
import ProTable, { StatusChip } from "../../components/ProTable";

const fmt = (d) => d ? dayjs(d).format("DD-MM-YYYY") : "N/A";

export default function Leave() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [leaveList, setLeaveList] = useState([]);
  const [selectedRow, setSelectedRow] = useState<Record<string, any>>({});
  const [openModal, setOpenModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const userRole = getCookie("role");
  const isAdminOrManager = userRole === "Admin" || userRole === "Manager";

  useEffect(() => { getLeave(); }, []);

  const getLeave = () => {
    setLoading(true);
    getRequest("User/GetEmployeeLeave").then(res => {
      if (res.data) {
        setLeaveList(res.data.leaves.map(d => ({
          ...d,
          fromDate: d.fromDate ? fmt(d.fromDate) : "N/A",
          toDate:   d.toDate   ? fmt(d.toDate)   : "N/A",
        })));
      }
    }).catch(console.error).finally(() => setLoading(false));
  };

  const openApprovalModal = (row) => {
    setSelectedRow(row);
    setSelectedStatus(row.isApproved ?? true);
    setRejectReason("");
    setOpenModal(true);
  };

  const handleSaveStatus = () => {
    if (!selectedStatus && !rejectReason.trim()) { ToastError("Please enter a rejection reason"); return; }
    setLoading(true);
    postRequest("User/ApproveRejectLeave", {
      leaveId: selectedRow.leaveId,
      isApproved: selectedStatus,
      approverReason: !selectedStatus ? rejectReason : null,
    }).then(res => { if (res.status === 200) { ToastSuccess("Status updated"); getLeave(); } })
      .catch(err => ToastError(err.response?.data?.message || "Failed"))
      .finally(() => { setLoading(false); setOpenModal(false); });
  };

  const getStatus = (row) => {
    if (!row.approvedBy) return "Pending";
    return row.isApproved ? "Approved" : "Declined";
  };

  const columns = [
    { field: "employeeName", label: "Employee" },
    { field: "userName",     label: "Email" },
    { field: "fromDate",     label: "From" },
    { field: "toDate",       label: "To" },
    { field: "leaveType",    label: "Type", filterable: true },
    { field: "reason",       label: "Reason" },
    {
      field: "isApproved", label: "Status",
      renderCell: (row) => (
        <StatusChip label={getStatus(row)} />
      ),
    },
    {
      field: "actions", label: "Actions",
      renderCell: (row) => {
        const loggedInEmail = getCookie("email");
        // Admin/Manager can always click status chip to review
        // Employee can edit their own pending leave
        if (!isAdminOrManager) {
          if (row.approvedBy !== null || row.userName !== loggedInEmail) return null;
          return (
            <Button variant="ghost" type="button" className="icon-btn" title="Edit Leave" onClick={() => navigate("/leave/apply-leave", { state: { editData: row } })}>
              <Pencil size={15} />
            </Button>
          );
        }
        // For admin/manager: show review button on pending leaves
        if (!row.approvedBy) {
          return (
            <Button variant="outline" type="button" className={cn("btn btn-ghost btn-sm", "text-[12px] p-[4px_12px]")} 
              onClick={() => { setSelectedRow(row); setSelectedStatus(row.isApproved??true); setRejectReason(""); setOpenModal(true); }}>
              Review
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<UserMinus size={13} />} items={[{ label: "Leave" }]} />
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Track and manage leave requests</p>
        </div>
        <Button variant="default" type="button" className="btn btn-primary" onClick={() => navigate("/leave/apply-leave")}>
          <Plus size={15} /> Apply Leave
        </Button>
      </div>
      <ProTable title="Leave Requests" columns={columns} data={leaveList} />

      {/* Approval Modal */}
      {openModal && (
        <WorkflowDialog title="Leave Approval" onClose={() => setOpenModal(false)} busy={loading}>
<div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-[12px]" >
                <div className="modal-icon" style={{ background: selectedStatus ? "var(--success-subtle)" : "var(--error-subtle)" }}>
                  <AlertCircle size={20} color={selectedStatus ? "var(--success)" : "var(--coral)"} />
                </div>
                <div>
                  <div className="modal-title">Leave Approval</div>
                  <div className="modal-subtitle">{selectedRow.employeeName} · {selectedRow.leaveType}</div>
                </div>
              </div>
              <Button variant="ghost" type="button" className="modal-close" onClick={() => setOpenModal(false)}><X size={16} /></Button>
            </div>
            <div className="modal-body">
              <div className="bg-[var(--bg)] p-[12px_16px] mb-[16px]" style={{borderRadius:"var(--radius)"}}>
                {[
                  ["From", selectedRow.fromDate],
                  ["To",   selectedRow.toDate],
                  ["Reason", selectedRow.reason],
                ].map(([k,v]) => (
                  <div key={k} className="flex gap-[12px] mb-[8px]" >
                    <span className="text-[12px] text-[var(--text-muted)] font-semibold min-w-[60px]" >{k}</span>
                    <span className="text-[12px] text-[var(--text-primary)] font-medium" >{v || "N/A"}</span>
                  </div>
                ))}
              </div>
              <p className="text-[13px] font-semibold text-[var(--text-secondary)] mb-[12px] uppercase tracking-[0.05em]" >Decision</p>
              <div className="status-radio-group">
                <label className={`status-radio ${selectedStatus === true ? "selected-approve" : ""}`} onClick={() => setSelectedStatus(true)}>
                  <input type="radio" name="leaveStatus" checked={selectedStatus === true} onChange={() => setSelectedStatus(true)} />
                  <Check size={16} color="var(--success)" />
                  <span className="status-radio-label">Approve</span>
                </label>
                <label className={`status-radio ${selectedStatus === false ? "selected-decline" : ""}`} onClick={() => setSelectedStatus(false)}>
                  <input type="radio" name="leaveStatus" checked={selectedStatus === false} onChange={() => setSelectedStatus(false)} />
                  <X size={16} color="var(--error)" />
                  <span className="status-radio-label">Decline</span>
                </label>
              </div>
              {selectedStatus === false && (
                <div className="mt-[16px]" >
                  <label className="form-label">Rejection Reason *</label>
                  <Textarea
                    className="form-input"
                    placeholder="Please provide a reason for declining..."
                    rows={3}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <Button variant="outline" type="button" className="btn btn-ghost" onClick={() => setOpenModal(false)}>Cancel</Button>
              <Button variant="ghost" type="button" className={`btn ${selectedStatus ? "btn-teal" : "btn-danger"}`} onClick={handleSaveStatus}>
                {selectedStatus ? <><Check size={14}/> Approve</> : <><X size={14}/> Decline</>}
              </Button>
            </div>
          </div>
</WorkflowDialog>
      )}
    </div>
  );
}
