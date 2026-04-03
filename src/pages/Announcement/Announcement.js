import React, { useEffect, useState } from "react";
import { Megaphone, Pencil, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { getRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { getCookie } from "../../services/Cookies";
import ProTable, { StatusChip } from "../../components/ProTable";

const fmt = (d) => d ? dayjs(d).format("DD-MM-YYYY") : "—";

export default function Announcement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const userRole = getCookie("role");
  const isAdminOrManager = userRole === "Admin" || userRole === "Manager";

  useEffect(() => { getAnnouncement(); }, []);

  const getAnnouncement = () => {
    setLoading(true);
    getRequest("Announcement/GetAnnouncement").then(res => {
      if (res.data) {
        const mapped = res.data.map(d => ({
          ...d,
          announcementDate: d.announcementDate ? fmt(d.announcementDate) : "—",
          createdDate:      d.createdDate      ? fmt(d.createdDate)      : "—",
        }));
        setList(isAdminOrManager ? mapped : mapped.filter(d => d.isActive));
      }
    }).catch(console.error).finally(() => setLoading(false));
  };

  const columns = [
    { field: "announcementDate", label: "Date", width: 110 },
    {
      field: "description", label: "Announcement",
      renderCell: (row) => {
        const isNew = dayjs().diff(dayjs(row.announcementDate, "DD-MM-YYYY"), "day") <= 7;
        return (
          <span style={{ display:"flex", alignItems:"center", gap:8 }}>
            {row.description}
            {isNew && <span className="badge badge-purple" style={{ fontSize:10, padding:"1px 7px" }}>NEW</span>}
          </span>
        );
      },
    },
    { field: "department",       label: "Department", filterable: true },
    { field: "createdDate",      label: "Created" },
    ...(isAdminOrManager ? [
      {
        field: "isActive", label: "Status",
        renderCell: (row) => <StatusChip label={row.isActive ? "Active" : "Inactive"} />,
      },
      {
        field: "actions", label: "Actions",
        renderCell: (row) => (
          <button className="icon-btn" onClick={() => navigate("/announcement/announcement-form", { state: { editData: row } })}>
            <Pencil size={15} />
          </button>
        ),
      },
    ] : []),
  ];

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Megaphone size={13} />} items={[{ label: "Announcements" }]} />
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Company-wide notices and updates</p>
        </div>
        {isAdminOrManager && (
          <button className="btn btn-primary" onClick={() => navigate("/announcement/announcement-form")}>
            <Plus size={15} /> Create
          </button>
        )}
      </div>
      <ProTable title="Announcement List" columns={columns} data={list} />
    </div>
  );
}
