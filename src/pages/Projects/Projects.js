import React, { useState, useEffect } from "react";
import { Briefcase, Plus, Pencil } from "lucide-react";
import dayjs from "dayjs";
import { getRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { getCookie } from "../../services/Cookies";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable, { StatusChip } from "../../components/ProTable";
import { useNavigate } from "react-router-dom";

const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "—");

export default function Projects() {
  const navigate = useNavigate();

  const [activeTab,    setActiveTab]    = useState("projects");
  const [projectList,  setProjectList]  = useState([]);
  const [assignedList, setAssignedList] = useState([]);
  const [loading,      setLoading]      = useState(false);

  const userRole = getCookie("role");
  const isAdmin  = userRole === "Admin";

  useEffect(() => {
    getProjects();
  }, []);

  useEffect(() => {
    if (activeTab === "assigned") getAssignedEmployees();
  }, [activeTab]);

  /* ── API calls ── */
  const getProjects = () => {
    setLoading(true);
    getRequest("Project/All")
      .then((res) => {
        if (res.data)
          setProjectList(
            res.data.map((d) => ({
              ...d,
              startDate: fmt(d.startDate),
              endDate:   fmt(d.endDate),
            }))
          );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const getAssignedEmployees = () => {
  setLoading(true);
  getRequest("Project/AssignedEmployees")
    .then((res) => {
      if (res.data)
        setAssignedList(res.data); // ← no mapping needed, date is already "DD-MM-YYYY"
    })
    .catch(console.error)
    .finally(() => setLoading(false));
};

  /* ── Columns ── */
  const columnsProjects = [
    { field: "projectId",   label: "#",            width: 60 },
    { field: "projectName", label: "Project Name", filterable: true },
    { field: "description", label: "Description" },
    { field: "clientName",  label: "Client" },
    { field: "startDate",   label: "Start Date" },
    { field: "endDate",     label: "End Date" },
    {
      field: "status",
      label: "Status",
      filterable: true,
      renderCell: (row) => <StatusChip label={row.status} />,
    },
    {
      field: "actions",
      label: "Actions",
      renderCell: (row) => (
        <button
          className="icon-btn"
          onClick={() =>
            navigate("/employees/projects/create", { state: { editData: row } })
          }
        >
          <Pencil size={15} />
        </button>
      ),
    },
  ];

  const columnsAssigned = [
  { field: "employeeId",   label: "Emp ID",      width: 80 },
  { field: "employeeName", label: "Employee",    filterable: true },
  { field: "email",        label: "Email" },
  { field: "designation",  label: "Designation", filterable: true },
  { field: "department",   label: "Department",  filterable: true },
  { field: "projectName",  label: "Project",     filterable: true },
  { field: "assignedDate", label: "Assigned On" },
  {
    field: "status",
    label: "Status",
    filterable: true,
    renderCell: (row) => (
      <StatusChip label={row.status || row.employmentStatus || "—"} />
    ),
  },
];

  return (
    <div>
      <LoadingMask loading={loading} />

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Briefcase size={13} />} items={[{ label: "Employees", link: "/employees" }, { label: "Projects" }]} />
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage projects and team assignments</p>
        </div>
        {isAdmin && activeTab === "projects" && (
          <button
            className="btn btn-primary"
            onClick={() => navigate("/employees/projects/create")}
          >
            <Plus size={15} /> Create Project
          </button>
        )}
      </div>

      {/* ── Tab Switcher ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "var(--bg-card)",
          padding: 4,
          borderRadius: 10,
          border: "1px solid var(--border)",
          width: "fit-content",
          marginBottom: 20,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {[
          { key: "projects", label: "Project List" },
          { key: "assigned", label: "Assigned Employees" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "7px 20px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 13,
              fontWeight: 600,
              background:
                activeTab === t.key
                  ? "linear-gradient(135deg,var(--primary),var(--primary-light))"
                  : "transparent",
              color:     activeTab === t.key ? "white" : "var(--text-secondary)",
              boxShadow: activeTab === t.key ? "0 2px 8px var(--primary-glow)" : "none",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tables ── */}
      {activeTab === "projects" ? (
        <ProTable
          title="Project List"
          columns={columnsProjects}
          data={projectList}
        />
      ) : (
        <ProTable
          title="Assigned Employees"
          columns={columnsAssigned}
          data={assignedList}
        />
      )}
    </div>
  );
}