import React, { useEffect, useState } from "react";
import { ShieldCheck, Save } from "lucide-react";
import { getRequest, postRequest } from "../../services/Apiservice";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { usePermissions, invalidatePermissions } from "../../services/Permissions";

const RESOURCE_LABEL = { Onboarding: "Onboarding (Employee Details)", WorkStatus: "Work Status" };
const ROLE_LABEL = { TeamLead: "Team Lead", Employee: "Employee" };
const COLS = [
  { key: "canRead", label: "Read", hint: "View" },
  { key: "canWrite", label: "Write", hint: "Add new" },
  { key: "canEdit", label: "Edit", hint: "Modify / delete" },
];

export default function AccessControl() {
  const perms = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!perms?.isAdminOrManager) return;
    setLoading(true);
    getRequest("Permissions/All")
      .then((res) => setRows(res.data || []))
      .catch((err) => ToastError(err.response?.data?.message || "Failed to load the permissions"))
      .finally(() => setLoading(false));
  }, [perms?.isAdminOrManager]);

  if (perms && !perms.isAdminOrManager) {
    return <div style={{ padding: 24, color: "var(--text-muted)" }}>Only Admin or Manager can manage permissions.</div>;
  }

  const toggle = (idx, key) => setRows((prev) => prev.map((r, i) => {
    if (i !== idx) return r;
    const next = { ...r, [key]: !r[key] };
    if (key === "canRead" && !next.canRead) { next.canWrite = false; next.canEdit = false; }   // no Read = nothing else
    if ((key === "canWrite" || key === "canEdit") && next[key]) next.canRead = true;           // Write / Edit include Read
    return next;
  }));

  const save = () => {
    setLoading(true);
    postRequest("Permissions/Save", rows)
      .then(() => { invalidatePermissions(); ToastSuccess("Permissions saved. Users get them on their next page load."); })
      .catch((err) => ToastError(err.response?.data?.message || "Failed to save the permissions"))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<ShieldCheck size={13} />} items={[{ label: "Access Control" }]} />
          <h1 className="page-title">Access Control</h1>
          <p className="page-subtitle">Admin and Manager always have full access. Set what Team Lead and Employee can do.</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={rows.length === 0}><Save size={15} /> Save permissions</button>
      </div>

      <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--bg)", textAlign: "left" }}>
              <th style={{ padding: "12px 16px" }}>Role</th>
              <th style={{ padding: "12px 16px" }}>Screen</th>
              {COLS.map((c) => (
                <th key={c.key} style={{ padding: "12px 16px", textAlign: "center" }}>{c.label}<div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }}>{c.hint}</div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.role}-${r.resource}`} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 700 }}>{ROLE_LABEL[r.role] || r.role}</td>
                <td style={{ padding: "12px 16px" }}>{RESOURCE_LABEL[r.resource] || r.resource}</td>
                {COLS.map((c) => (
                  <td key={c.key} style={{ padding: "12px 16px", textAlign: "center" }}>
                    <input type="checkbox" checked={!!r[c.key]} onChange={() => toggle(i, c.key)} style={{ width: 17, height: 17, cursor: "pointer" }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
