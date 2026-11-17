import { Button } from "../../components/ui/button";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import Breadcrumb from "../../shared/services/Breadcrumb";
import JobPosted from "./JobPosted";
import JobApplied from "./JobApplied";
import { Briefcase } from "lucide-react";

export default function JobManagement() {
  const location = useLocation();

  // Support both old key ("jobApplied") and new key ("applied") coming from navigate state
  const rawTab = location.state?.tab || "posted";
  const normalise = (t) => {
    if (t === "jobPosted")  return "posted";
    if (t === "jobApplied") return "applied";
    return t;
  };

  const [tab, setTab] = useState(normalise(rawTab));

  const TABS = [
    { key: "posted",  label: "Job Postings"  },
    { key: "applied", label: "Applications"  },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <Breadcrumb
            icon={<Briefcase size={13} />}
            items={[{ label: "Job Management" }]}
          />
          <h1 className="page-title">Job Management</h1>
          <p className="page-subtitle">Post jobs and manage applications</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div
        className="flex gap-[4px] bg-[var(--bg-card)] p-[4px] w-[fit-content] mb-[20px]" style={{borderRadius: "var(--radius)", border:       "1px solid var(--border)", boxShadow:    "var(--shadow-sm)"}}
      >
        {TABS.map(t => {
          const isActive = tab === t.key;
          return (
            <Button variant="ghost" type="button"
              key={t.key}
              onClick={() => setTab(t.key)}
              className="p-[8px_24px] cursor-pointer text-[13px] font-semibold" style={{borderRadius: "var(--radius)", border:      "none", fontFamily:  "var(--ui-font-sans)", background:  isActive
                  ? "var(--primary)"
                  : "transparent", color:       isActive ? "var(--card)" : "var(--text-secondary)", boxShadow:   isActive ? "0 2px 8px var(--primary-glow)" : "none", transition:  "all 0.2s"}}
            >
              {t.label}
            </Button>
          );
        })}
      </div>

      {tab === "posted" ? <JobPosted /> : <JobApplied />}
    </div>
  );
}
