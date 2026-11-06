import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, LogOut, ChevronLeft, ChevronRight, MessageCircleMore,
  Megaphone, File, CalendarCheck2, UserMinus, ClipboardList, Calendar, Receipt,
  AlertTriangle, Briefcase, UserCheck, FileBarChart2,
} from "lucide-react";
import { cookieKeys, getCookie } from "../../services/Cookies";
import { cookieObj } from "../../models/cookieObj";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTitle } from "../../components/ui/sheet";

export const menuItems = [
  { to:"/dashboard",         label:"Dashboard",      icon:<LayoutDashboard size={18}/>, roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["onboarding"] },
  { to:"/chat",              label:"HR Assistant",   icon:<MessageCircleMore size={18}/>, roles:["Admin","Manager","TeamLead","Employee"] },
  { to:"/employees",         label:"Employees",      icon:<Users size={18}/>,           roles:["Admin","Manager","TeamLead"] },
  { to:"/onboarding",       label:"Onboarding",     icon:<UserCheck size={18}/>,       roles:["Admin","Manager","TeamLead","Employee"], departments:["onboarding"] },
  { to:"/work-status",        label:"Work Status",    icon:<Briefcase size={18}/>,       roles:["Manager","TeamLead","Employee"], departments:["onboarding"] },
  { to:"/work-status-report", label:"Work Status Report", icon:<FileBarChart2 size={18}/>, roles:["Manager","TeamLead"], departments:["onboarding"] },
  { to:"/timesheet",         label:"Timesheet",      icon:<ClipboardList size={18}/>,   roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["onboarding"] },
  //{ to:"/job-management",    label:"Job Management", icon:<Briefcase size={18}/>,       roles:["Admin","Manager","Employee"], departments:["hr-offshore"] },
  { to:"/attendance", label:"Attendance", icon:<CalendarCheck2 size={18}/>, roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["deizeisau", "onboarding"] },
  //{ to:"/payslip",           label:"Payslip",        icon:<Receipt size={18}/>,         roles:["Admin"] },
  { to:"/company-documents", label:"Documents",      icon:<File size={18}/>,            roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["onboarding"] },
  { to:"/announcement",      label:"Announcements",  icon:<Megaphone size={18}/>,       roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["onboarding"] },
  { to:"/leave",             label:"Leave",          icon:<UserMinus size={18}/>,       roles:["Admin","Manager","TeamLead","Employee"], hiddenDepartments:["deizeisau", "onboarding"] },
  { to:"/Calendar",          label:"Calendar",       icon:<Calendar size={18}/>,        roles:["Admin","Manager","TeamLead","Employee"] },
];

export function getVisibleMenuItems(userRole = "Employee", department = "") {
  const userDepartment = department.trim().toLowerCase();
  return menuItems.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    // Admin sees every navigation item regardless of department.
    if (userRole === "Admin") return true;
    if (item.hiddenDepartments?.includes(userDepartment)) return false;
    if (item.departments?.length) return item.departments.includes(userDepartment);
    return true;
  });
}

const MENU_SECTIONS = [
  { label: "OVERVIEW", paths: ["/dashboard", "/chat"] },
  { label: "PEOPLE", paths: ["/employees", "/onboarding", "/work-status", "/work-status-report"] },
  { label: "TIME & ATTENDANCE", paths: ["/timesheet", "/attendance", "/leave", "/Calendar"] },
  { label: "COMPANY", paths: ["/company-documents", "/announcement"] },
];

// Portal tooltip — renders outside sidebar DOM to avoid overflow:hidden clipping
function Tooltip({ label, targetRef, visible }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (visible && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 11,
      });
    }
  }, [visible, targetRef]);

  if (!visible) return null;

  return createPortal(
    <>
      {/* Arrow */}
      <div style={{
        position: "fixed",
        top: pos.top,
        left: pos.left - 5,
        transform: "translateY(-50%)",
        width: 0,
        height: 0,
        borderTop: "5px solid transparent",
        borderBottom: "5px solid transparent",
        borderRight: "5px solid var(--text-primary)",
        pointerEvents: "none",
        zIndex: 99999,
      }} />
      {/* Bubble */}
      <div style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        transform: "translateY(-50%)",
        background: "var(--text-primary)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--ui-font-heading)",
        whiteSpace: "nowrap",
        padding: "6px 12px",
        borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        pointerEvents: "none",
        zIndex: 99999,
      }}>
        {label}
      </div>
    </>,
    document.body
  );
}

// Wrapper that tracks hover and passes ref to Tooltip
function TooltipItem({ label, collapsed, children, style = {}, onClick }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  return (
    <div
      ref={ref}
      style={{ position: "relative", ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
      <Tooltip label={label} targetRef={ref} visible={collapsed && hovered} />
    </div>
  );
}

export default function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const [collapsed, setCollapsed]   = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const userRole = getCookie("role") || "Employee";

  const userDepartment = getCookie("department") || "";
  const filtered = getVisibleMenuItems(userRole, userDepartment);
  const visibleSections = MENU_SECTIONS.map((section) => ({
    ...section,
    items: filtered.filter((item) => section.paths.includes(item.to)),
  })).filter((section) => section.items.length > 0);

  const handleLogout = () => {
    cookieKeys(cookieObj, 0);
    navigate("/login");
    setShowLogout(false);
  };

  const sidebarContent = (
    <>
      <div className="sidebar-toggle">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="sidebar-toggle-btn"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(c => !c)}
        >
          {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </Button>
      </div>

      <ul className="sidebar-nav">
        {visibleSections.map((section) => (
          <li key={section.label} className="sidebar-section">
            {(!collapsed || mobileOpen) && <div className="sidebar-label">{section.label}</div>}
            <ul className="sidebar-nav-group">
              {section.items.map(item => (
                <li key={item.to} style={{ listStyle: "none" }}>
                  <TooltipItem label={item.label} collapsed={collapsed && !mobileOpen}>
                    <NavLink
                      to={item.to}
                      data-label={item.label}
                      className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                      onClick={onMobileClose}
                    >
                      <div className="nav-icon">{item.icon}</div>
                      {(!collapsed || mobileOpen) && <span style={{ color: "inherit" }}>{item.label}</span>}
                    </NavLink>
                  </TooltipItem>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <TooltipItem label="Logout" collapsed={collapsed && !mobileOpen} style={{ marginBottom: 8 }}>
          <button
            type="button"
            data-label="Logout"
            className="nav-item"
            style={{ width: "100%", border: 0, background: "transparent", textAlign: "left" }}
            aria-label="Logout"
            onClick={() => setShowLogout(true)}
          >
            <div className="nav-icon"><LogOut size={18}/></div>
            {(!collapsed || mobileOpen) && <span style={{ color: "inherit" }}>Logout</span>}
          </button>
        </TooltipItem>

        {(!collapsed || mobileOpen) ? (
          <div
            className="sidebar-footer-text"
            onClick={() => window.open("http://www.natobotics.com", "_blank")}
            style={{ cursor: "pointer" }}
          >
            Powered by <strong style={{ color: "rgba(255,255,255,0.5)" }}>NATOBOTICS</strong>
          </div>
        ) : (
          <TooltipItem label="Powered by Natobotics" collapsed={collapsed}>
            <div
              onClick={() => window.open("http://www.natobotics.com", "_blank")}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", margin: "0 auto", transition: "background 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
            >
              <img
                src="/assets/images/natobotics-logo.png"
                alt="Natobotics"
                style={{ width: 24, height: 24, objectFit: "contain", display: "block" }}
                onError={e => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.innerHTML = `
                    <span style="color:white;font-size:15px;font-weight:900;font-family:var(--ui-font-heading);line-height:1;">N</span>
                  `;
                }}
              />
            </div>
          </TooltipItem>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside
        className={`sidebar sidebar-desktop${collapsed ? " collapsed" : ""}`}
        aria-label="Primary navigation"
      >
        {sidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={open => { if (!open) onMobileClose(); }}>
        <SheetContent side="left" className="mobile-nav-sheet">
          <SheetTitle className="sr-only">Primary navigation</SheetTitle>
          <aside className="sidebar sidebar-sheet mobile-open" aria-label="Primary navigation">
            {sidebarContent}
          </aside>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent className="logout-dialog">
          <AlertDialogHeader className="logout-dialog-header">
            <AlertDialogMedia className="logout-dialog-icon" aria-hidden="true">
              <AlertTriangle size={20} />
            </AlertDialogMedia>
            <span>
              <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
              <AlertDialogDescription>You'll be signed out of HRMS.</AlertDialogDescription>
            </span>
          </AlertDialogHeader>
          <p className="logout-dialog-copy">
            Any unsaved changes will be lost. Are you sure you want to log out?
          </p>
          <AlertDialogFooter className="logout-dialog-actions">
            <AlertDialogCancel onClick={() => setShowLogout(false)}>
              Stay Logged In
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="logout-dialog-confirm" onClick={handleLogout}>
              <LogOut size={15} /> Yes, Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
