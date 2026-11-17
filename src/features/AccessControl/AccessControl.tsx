import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { useEffect, useState } from "react";
import { ShieldCheck, Save } from "lucide-react";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { usePermissions, invalidatePermissions } from "../../auth/Permissions";

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
    return <div className="p-[24px] text-[var(--text-muted)]" >Only Admin or Manager can manage permissions.</div>;
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
        <Button variant="default" type="button" className="btn btn-primary" onClick={save} disabled={rows.length === 0}><Save size={15} /> Save permissions</Button>
      </div>

      <div className="bg-card overflow-x-auto" style={{border: "1px solid var(--border)", borderRadius: "var(--radius)"}}>
        <table className="w-[100%] text-[14px]" style={{borderCollapse: "collapse"}}>
          <thead>
            <tr className="bg-[var(--bg)] text-left" >
              <th className="p-[12px_16px]" >Role</th>
              <th className="p-[12px_16px]" >Screen</th>
              {COLS.map((c) => (
                <th key={c.key} className="p-[12px_16px] text-center" >{c.label}<div className="text-[12px] font-medium text-[var(--text-muted)]" >{c.hint}</div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.role}-${r.resource}`} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="p-[12px_16px] font-semibold" >{ROLE_LABEL[r.role] || r.role}</td>
                <td className="p-[12px_16px]" >{RESOURCE_LABEL[r.resource] || r.resource}</td>
                {COLS.map((c) => (
                  <td key={c.key} className="p-[12px_16px] text-center" >
                    <Checkbox  checked={!!r[c.key]} onCheckedChange={() => toggle(i, c.key)} className="w-[17px] h-[17px] cursor-pointer"  />
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
