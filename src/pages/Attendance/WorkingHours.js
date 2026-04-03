import React, { useEffect, useState } from "react";
import { Pencil, Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import ProTable from "../../components/ProTable";

const formatTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
};

const calcWorkHours = (start, end) => {
  if (!start || !end) return "—";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return "—";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export default function WorkingHours() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);

  useEffect(() => {
    setLoading(true);
    getRequest("Attendance/GetAllDepartments")
      .then((res) => {
        if (res.data) {
          setList(
            res.data.map((d) => ({
              ...d,
              department: d.departmentName,
              formattedStart: formatTime(d.startTime),
              formattedEnd: formatTime(d.endTime),
              workHours: calcWorkHours(d.startTime, d.endTime),
              workingDays: [
                "Mon–Fri",
                d.includeSaturday ? "Sat" : null,
                d.includeSunday ? "Sun" : null,
              ]
                .filter(Boolean)
                .join(", "),
            }))
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { field: "department",    label: "Department",   filterable: true },
    { field: "formattedStart", label: "Start Time" },
    { field: "formattedEnd",   label: "End Time" },
    { field: "workHours",      label: "Work Hours" },
    { field: "workingDays",    label: "Working Days" },
    {
      field: "actions",
      label: "",
      renderCell: (row) => (
        <button
          className="icon-btn"
          onClick={() =>
            navigate("/employees/edit-working-hours", { state: { editData: row } })
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
            icon={<Users size={13} />}
            items={[
              { label: "Employees", link: "/employees" },
              { label: "Departments" },
            ]}
          />
          <h1 className="page-title">Department Timings</h1>
          <p className="page-subtitle">Configure working hours per department</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/employees/add-working-hours")}
        >
          <Plus size={15} /> Add Timing
        </button>
      </div>
      <ProTable title="Department Timings" columns={columns} data={list} />
    </div>
  );
}