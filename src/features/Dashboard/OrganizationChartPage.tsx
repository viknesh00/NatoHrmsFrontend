import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Network } from "lucide-react";
import { getCookie } from "../../auth/Cookies";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { getRequest } from "../../shared/services/Apiservice";
import OrganizationDendrogram from "./OrganizationDendrogram";

export default function OrganizationChartPage() {
  const role = getCookie("role") || "Employee";
  const canView = ["Admin", "Manager", "TeamLead"].includes(role);
  const [employees, setEmployees] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(canView);

  useEffect(() => {
    if (!canView) return;
    getRequest("User/All")
      .then((response) => setEmployees(Array.isArray(response.data) ? response.data : []))
      .catch((error) => console.error("Failed to load organization hierarchy:", error))
      .finally(() => setLoading(false));
  }, [canView]);

  if (!canView) return <Navigate to="/dashboard" replace />;

  return (
    <main>
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Network size={13} />} items={[{ label: "Organization" }]} />
          <h1 className="page-title">Organization</h1>
          <p className="page-subtitle">Explore reporting relationships. Select a person to expand or collapse their team.</p>
        </div>
      </div>
      <section className="card dashboard-organization-card" aria-labelledby="organization-chart-heading">
        <div className="card-header">
          <div>
            <h2 id="organization-chart-heading" className="card-title">Reporting structure</h2>
            <p className="text-sm text-muted-foreground">Showing employees available to your role</p>
          </div>
        </div>
        <OrganizationDendrogram employees={employees} loading={loading} />
      </section>
    </main>
  );
}
