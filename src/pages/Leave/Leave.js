import React, { useEffect, useState } from "react";
import { Pencil, Plus, X, Check, AlertCircle, UserMinus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { getCookie } from "../../services/Cookies";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable, { StatusChip } from "../../components/ProTable";

const fmt = (d) => d ? dayjs(d).format("DD-MM-YYYY") : "—";

export default function Leave() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [leaveList, setLeaveList] = useState([]);
  const [selectedRow, setSelectedRow] = useState({});
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
          fromDate: d.fromDate ? fmt(d.fromDate) : "—",
          toDate:   d.toDate   ? fmt(d.toDate)   : "—",
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
            <button className="icon-btn" title="Edit Leave" onClick={() => navigate("/leave/apply-leave", { state: { editData: row } })}>
              <Pencil size={15} />
            </button>
          );
        }
        // For admin/manager: show review button on pending leaves
        if (!row.approvedBy) {
          return (
            <button className="btn btn-ghost btn-sm" style={{ fontSize:11, padding:"4px 10px" }}
              onClick={() => { setSelectedRow(row); setSelectedStatus(row.isApproved??true); setRejectReason(""); setOpenModal(true); }}>
              Review
            </button>
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
        <button className="btn btn-primary" onClick={() => navigate("/leave/apply-leave")}>
          <Plus size={15} /> Apply Leave
        </button>
      </div>
      <ProTable title="Leave Requests" columns={columns} data={leaveList} />

      {/* Approval Modal */}
      {openModal && (
        <div className="modal-backdrop" onClick={() => setOpenModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div className="modal-icon" style={{ background: selectedStatus ? "#f0fdf4" : "#fff1f2" }}>
                  <AlertCircle size={20} color={selectedStatus ? "#22c55e" : "#f43f5e"} />
                </div>
                <div>
                  <div className="modal-title">Leave Approval</div>
                  <div className="modal-subtitle">{selectedRow.employeeName} · {selectedRow.leaveType}</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setOpenModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background:"var(--bg)", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                {[
                  ["From", selectedRow.fromDate],
                  ["To",   selectedRow.toDate],
                  ["Reason", selectedRow.reason],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", gap:10, marginBottom:6 }}>
                    <span style={{ fontSize:12, color:"var(--text-muted)", fontWeight:600, minWidth:60 }}>{k}</span>
                    <span style={{ fontSize:12, color:"var(--text-primary)", fontWeight:500 }}>{v || "—"}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:12.5, fontWeight:700, color:"var(--text-secondary)", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>Decision</p>
              <div className="status-radio-group">
                <label className={`status-radio ${selectedStatus === true ? "selected-approve" : ""}`} onClick={() => setSelectedStatus(true)}>
                  <input type="radio" name="leaveStatus" checked={selectedStatus === true} onChange={() => setSelectedStatus(true)} />
                  <Check size={16} color="#22c55e" />
                  <span className="status-radio-label">Approve</span>
                </label>
                <label className={`status-radio ${selectedStatus === false ? "selected-decline" : ""}`} onClick={() => setSelectedStatus(false)}>
                  <input type="radio" name="leaveStatus" checked={selectedStatus === false} onChange={() => setSelectedStatus(false)} />
                  <X size={16} color="#ef4444" />
                  <span className="status-radio-label">Decline</span>
                </label>
              </div>
              {selectedStatus === false && (
                <div style={{ marginTop:14 }}>
                  <label className="form-label">Rejection Reason *</label>
                  <textarea
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
              <button className="btn btn-ghost" onClick={() => setOpenModal(false)}>Cancel</button>
              <button className={`btn ${selectedStatus ? "btn-teal" : "btn-danger"}`} onClick={handleSaveStatus}>
                {selectedStatus ? <><Check size={14}/> Approve</> : <><X size={14}/> Decline</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
