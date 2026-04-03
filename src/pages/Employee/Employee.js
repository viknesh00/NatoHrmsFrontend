import React, { useEffect, useState } from "react";
import { Pencil, Plus, Clock, X, Check, Users, Building } from "lucide-react";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { useNavigate } from "react-router-dom";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { getCookie } from "../../services/Cookies";
import dayjs from "dayjs";
import ProTable, { StatusChip } from "../../components/ProTable";

const fmt = (d) => d ? dayjs(d).format("DD-MM-YYYY") : "—";

export default function Employees() {
  const navigate = useNavigate();
  const [employeeList, setEmployeeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const userRole = getCookie("role");
  const isAdmin = userRole === "Admin";

  useEffect(() => { getUsers(); }, []);

  const getUsers = () => {
    setLoading(true);
    getRequest("User/All").then(res => {
      if (res.data) setEmployeeList(res.data.map(d => ({ ...d, lastLoginAt: d.lastLoginAt ? fmt(d.lastLoginAt) : "—" })));
    }).catch(console.error).finally(() => setLoading(false));
  };

  const handleStatusClick = (row) => { setSelectedStatus(row.isActive); setSelectedUserName(row.email); setOpenModal(true); };

  const handleSaveStatus = () => {
    setLoading(true);
    postRequest("User/UpdateUserStaus", { userName: selectedUserName, isActive: selectedStatus })
      .then(res => { if (res.status === 200) { ToastSuccess(res.data.message); getUsers(); } })
      .catch(err => ToastError(err.response?.data?.message || "Failed"))
      .finally(() => { setLoading(false); setOpenModal(false); });
  };

  const columns = [
    { field: "employeeId", label: "Emp ID", width: 90 },
    { field: "firstName",  label: "First Name" },
    { field: "lastName",   label: "Last Name" },
    { field: "email",      label: "Email" },
    { field: "department", label: "Department", filterable: true },
    { field: "accessRole", label: "Role", filterable: true },
    { field: "lastLoginAt",label: "Last Login" },
    {
      field: "isActive", label: "Status",
      renderCell: (row) => (
        <span onClick={() => handleStatusClick(row)} style={{ cursor:"pointer" }}>
          <StatusChip label={row.isActive ? "Active" : "Inactive"} />
        </span>
      ),
    },
    {
      field: "actions", label: "Actions",
      renderCell: (row) => (
        <button className="icon-btn" onClick={() => navigate(`/employees/edit-employee/${row.email}`)}>
          <Pencil size={15} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Users size={13} />} items={[{ label: "Employees" }]} />
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage your workforce</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {isAdmin && (
            <button className="btn btn-outline" onClick={() => navigate("/employees/working-hours")}>
              <Building size={15} /> Departments
            </button>
          )}
          <button className="btn btn-primary" onClick={() => navigate("/employees/add-employee")}>
            <Plus size={15} /> Add Employee
          </button>
        </div>
      </div>
      <ProTable title="Employee List" columns={columns} data={employeeList} />

      {/* Status Modal */}
      {openModal && (
        <div className="modal-backdrop" onClick={() => setOpenModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div className="modal-icon" style={{ background:"var(--primary-ghost)" }}>
                  <Shield size={20} color="var(--primary)" />
                </div>
                <div>
                  <div className="modal-title">Change Status</div>
                  <div className="modal-subtitle">Update employee account status</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setOpenModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="status-radio-group">
                <label className={`status-radio ${selectedStatus === true ? "selected-active" : ""}`} onClick={() => setSelectedStatus(true)}>
                  <input type="radio" name="status" checked={selectedStatus === true} onChange={() => setSelectedStatus(true)} />
                  <Check size={16} color="#22c55e" />
                  <span className="status-radio-label">Active</span>
                </label>
                <label className={`status-radio ${selectedStatus === false ? "selected-inactive" : ""}`} onClick={() => setSelectedStatus(false)}>
                  <input type="radio" name="status" checked={selectedStatus === false} onChange={() => setSelectedStatus(false)} />
                  <X size={16} color="#ef4444" />
                  <span className="status-radio-label">Inactive</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setOpenModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveStatus}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Shield(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke={props.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
