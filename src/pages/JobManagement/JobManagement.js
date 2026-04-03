import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Breadcrumb from "../../services/Breadcrumb";
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
        style={{
          display:      "flex",
          gap:          4,
          background:   "var(--bg-card)",
          padding:      4,
          borderRadius: 12,
          border:       "1px solid var(--border)",
          width:        "fit-content",
          marginBottom: 20,
          boxShadow:    "var(--shadow-sm)",
        }}
      >
        {TABS.map(t => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding:     "8px 22px",
                borderRadius: 9,
                border:      "none",
                cursor:      "pointer",
                fontFamily:  "'DM Sans', sans-serif",
                fontSize:    13,
                fontWeight:  600,
                background:  isActive
                  ? "linear-gradient(135deg, var(--primary), var(--primary-light))"
                  : "transparent",
                color:       isActive ? "white" : "var(--text-secondary)",
                boxShadow:   isActive ? "0 2px 8px var(--primary-glow)" : "none",
                transition:  "all 0.2s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "posted" ? <JobPosted /> : <JobApplied />}
    </div>
  );
}