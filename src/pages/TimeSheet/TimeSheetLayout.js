import React, { useState } from "react";
import { ClipboardList, CalendarDays } from "lucide-react";
import { getCookie } from "../../services/Cookies";
import TimesheetCalendar from "./TimesheetCalendar";
import TimeSheetOverview from "./TimeSheetOverview";

export default function TimeSheetLayout() {
  const userRole = getCookie("role");
  const isAdminOrManager = userRole === "Admin" || userRole === "Manager";

  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "mytimesheet"

  if (!isAdminOrManager) return <TimesheetCalendar />;

  const tabs = [
    { key: "overview",    label: "Overview",     icon: ClipboardList },
    { key: "mytimesheet", label: "My Timesheet",  icon: CalendarDays },
  ];

  const tabSwitcher = (
    <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", padding: 4, borderRadius: 10, border: "1px solid var(--border)", width: "fit-content", marginTop: 14, boxShadow: "var(--shadow-sm)" }}>
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setActiveTab(key)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600,
            background: activeTab === key ? "linear-gradient(135deg,var(--primary),var(--primary-light))" : "transparent",
            color: activeTab === key ? "white" : "var(--text-secondary)",
            boxShadow: activeTab === key ? "0 2px 8px var(--primary-glow)" : "none",
            transition: "all 0.2s",
          }}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );

  return activeTab === "overview"
    ? <TimeSheetOverview tabSwitcher={tabSwitcher} />
    : <TimesheetCalendar tabSwitcher={tabSwitcher} />;
}