import { Button } from "../../components/ui/button";
import { useState } from "react";
import { ClipboardList, CalendarDays } from "lucide-react";
import { getCookie } from "../../auth/Cookies";
import TimesheetCalendar from "./TimesheetCalendar";
import TimeSheetOverview from "./TimeSheetOverview";

export default function TimeSheetLayout() {
  const userRole = getCookie("role");
  const canViewTimesheetOverview = userRole === "Admin" || userRole === "Manager" || userRole === "TeamLead";

  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "mytimesheet"

  if (!canViewTimesheetOverview) return <TimesheetCalendar />;

  const tabs = [
    { key: "overview",    label: "Overview",     icon: ClipboardList },
    { key: "mytimesheet", label: "My Timesheet",  icon: CalendarDays },
  ];

  const tabSwitcher = (
    <div className="flex gap-[4px] bg-[var(--bg-card)] p-[4px] w-[fit-content] mt-[16px]" style={{borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)"}}>
      {tabs.map(({ key, label, icon: Icon }: Record<string, any>) => (
        <Button variant="ghost" type="button"
          key={key}
          onClick={() => setActiveTab(key)}
          className="flex items-center gap-[8px] p-[8px_20px] cursor-pointer text-[13px] font-semibold" style={{borderRadius: "var(--radius)", border: "none", fontFamily: "var(--ui-font-sans)", background: activeTab === key ? "var(--primary)" : "transparent", color: activeTab === key ? "var(--card)" : "var(--text-secondary)", boxShadow: activeTab === key ? "0 2px 8px var(--primary-glow)" : "none", transition: "all 0.2s"}}
        >
          <Icon size={14} />
          {label}
        </Button>
      ))}
    </div>
  );

  return activeTab === "overview"
    ? <TimeSheetOverview tabSwitcher={tabSwitcher} />
    : <TimesheetCalendar tabSwitcher={tabSwitcher} />;
}
