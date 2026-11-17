import { BookOpenText, CalendarCheck2, CircleHelp, Network, Sparkles } from "lucide-react";
import { getCookie } from "../../auth/Cookies";
import Breadcrumb from "../../shared/services/Breadcrumb";
import AdminFaq from "./content/admin.mdx";
import ManagerFaq from "./content/manager.mdx";
import TeamLeadFaq from "./content/teamlead.mdx";
import EmployeeFaq from "./content/employee.mdx";
import OnboardingFaq from "./content/onboarding.mdx";

const FAQ_CONTENT = {
  Admin: { component: AdminFaq, roleLabel: "Administrator" },
  Manager: { component: ManagerFaq, roleLabel: "Manager" },
  TeamLead: { component: TeamLeadFaq, roleLabel: "Team Lead" },
  Employee: { component: EmployeeFaq, roleLabel: "Employee" },
};

export default function HelpCenter() {
  const role = getCookie("role") || "Employee";
  const department = (getCookie("department") || "").trim().toLowerCase();
  const content = department === "onboarding" && role !== "Admin"
    ? { component: OnboardingFaq, roleLabel: "Onboarding" }
    : FAQ_CONTENT[role as keyof typeof FAQ_CONTENT] || FAQ_CONTENT.Employee;
  const FaqContent = content.component;

  return (
    <main className="help-center-page">
      <div className="page-header help-center-header">
        <div>
          <Breadcrumb icon={<CircleHelp size={13} />} items={[{ label: "Help Center" }]} />
          <h1 className="page-title">Help Center</h1>
          <p className="page-subtitle">Answers for your {content.roleLabel.toLowerCase()} workspace</p>
        </div>
      </div>

      <section className="help-center-hero" aria-labelledby="help-center-title">
        <div className="help-center-hero-copy">
          <span className="help-center-eyebrow"><Sparkles size={14} aria-hidden="true" /> Quick help</span>
          <h2 id="help-center-title">How can we help?</h2>
          <p>Browse common questions about the tools and workflows available to your role.</p>
        </div>
        <div className="help-center-vector" aria-hidden="true">
          <svg className="help-center-vector-lines" viewBox="0 0 220 130" fill="none">
            <path d="M27 84C54 84 59 35 88 35S122 92 151 92 175 52 202 52" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" />
            <circle cx="27" cy="84" r="5" fill="var(--primary)" />
            <circle cx="88" cy="35" r="5" fill="var(--success)" />
            <circle cx="151" cy="92" r="5" fill="var(--information)" />
            <circle cx="202" cy="52" r="5" fill="var(--warning)" />
          </svg>
          <span className="help-center-vector-icon help-center-vector-book"><BookOpenText size={22} /></span>
          <span className="help-center-vector-icon help-center-vector-calendar"><CalendarCheck2 size={20} /></span>
          <span className="help-center-vector-icon help-center-vector-network"><Network size={22} /></span>
        </div>
      </section>

      <section className="card help-faq-card" aria-labelledby="faq-heading">
        <div className="card-header">
          <div>
            <h2 id="faq-heading" className="card-title">Frequently asked questions</h2>
            <p className="text-sm text-muted-foreground">Guidance tailored to {content.roleLabel.toLowerCase()} access</p>
          </div>
        </div>
        <article className="help-mdx-content"><FaqContent /></article>
      </section>
    </main>
  );
}
