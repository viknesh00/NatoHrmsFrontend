import { FileCheck2, LockKeyhole, Scale, ShieldCheck } from "lucide-react";
import Breadcrumb from "../../shared/services/Breadcrumb";
import PrivacyPolicy from "./content/privacy.mdx";
import TermsOfUse from "./content/terms.mdx";
import StandardsAndIntegrations from "./content/standards.mdx";

const documents = {
  privacy: { title: "Privacy Policy", subtitle: "How employee and HR data is used in this workspace", icon: LockKeyhole, content: PrivacyPolicy },
  terms: { title: "Terms of Use", subtitle: "Guidelines for using the HRMS workspace", icon: Scale, content: TermsOfUse },
  standards: { title: "Standards & Integrations", subtitle: "Security, privacy, responsible design, and integration references", icon: ShieldCheck, content: StandardsAndIntegrations },
} as const;

export default function PolicyPage({ document: documentKey }: { document: keyof typeof documents }) {
  const document = documents[documentKey];
  const Icon = document.icon;
  const Content = document.content;

  return (
    <main className="policy-page">
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Icon size={14} aria-hidden="true" />} items={[{ label: "Trust & Policies" }, { label: document.title }]} />
          <h1 className="page-title">{document.title}</h1>
          <p className="page-subtitle">{document.subtitle}</p>
        </div>
      </div>

      <section className="policy-document-card" aria-labelledby="policy-title">
        <div className="policy-document-banner">
          <span className="policy-document-icon"><FileCheck2 size={18} aria-hidden="true" /></span>
          <div>
            <h2 id="policy-title">Workspace document</h2>
            <p>Review this information with your organization administrator</p>
          </div>
        </div>
        <article className="help-mdx-content policy-mdx-content"><Content /></article>
      </section>
    </main>
  );
}
