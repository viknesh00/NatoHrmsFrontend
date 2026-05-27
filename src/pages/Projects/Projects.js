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

  const [projectList, setProjectList] = useState([]);
  const [loading, setLoading] = useState(false);

  const userRole = getCookie("role");
  const isAdmin = userRole === "Admin";

  useEffect(() => {
    getProjects();
  }, []);

  const getProjects = () => {
    setLoading(true);
    getRequest("Project/All")
      .then((res) => {
        if (res.data)
          setProjectList(
            res.data.map((d) => ({
              ...d,
              startDate: fmt(d.startDate),
              endDate: fmt(d.endDate),
            }))
          );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const columnsProjects = [
    { field: "projectId", label: "#", width: 60 },
    { field: "projectName", label: "Project Name", filterable: true },
    { field: "description", label: "Description" },
    { field: "clientName", label: "Client" },
    { field: "startDate", label: "Start Date" },
    { field: "endDate", label: "End Date" },
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

  return (
    <div>
      <LoadingMask loading={loading} />

      <div className="page-header">
        <div>
          <Breadcrumb
            icon={<Briefcase size={13} />}
            items={[{ label: "Employees", link: "/employees" }, { label: "Projects" }]}
          />
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage projects and team assignments</p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => navigate("/employees/projects/create")}
          >
            <Plus size={15} /> Create Project
          </button>
        )}
      </div>

      <ProTable
        title="Project List"
        columns={columnsProjects}
        data={projectList}
      />
    </div>
  );
}