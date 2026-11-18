import { cn } from "cn";
import { useAppStore } from "../../store/useAppStore";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { getCookie } from "../../auth/Cookies";
import { clearSession } from "../../auth/Auth";
import { Button } from "../../components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, } from "../../components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTitle } from "../../components/ui/sheet";

import { getVisibleMenuItems } from "../../auth/navigation";
export { getVisibleMenuItems, menuItems } from "../../auth/navigation";

const MENU_SECTIONS = [
  { label: "OVERVIEW", paths: ["/dashboard"] },
  { label: "PEOPLE", paths: ["/employees", "/vcard", "/organization-chart", "/onboarding", "/work-status", "/work-status-report"] },
  { label: "TIME & ATTENDANCE", paths: ["/timesheet", "/attendance", "/leave", "/Calendar"] },
  { label: "COMPANY", paths: ["/company-documents", "/announcement"] },
  { label: "TRUST & POLICIES", paths: ["/privacy-policy", "/terms", "/standards"] },
];

// Portal tooltip — renders outside sidebar DOM to avoid overflow:hidden clipping
function Tooltip({ label, targetRef, visible }: Record<string, any>) {
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
      <div className="fixed w-[0px] h-[0px] z-[99999]" style={{top: pos.top, left: pos.left - 5, transform: "translateY(-50%)", borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "5px solid var(--text-primary)", pointerEvents: "none"}} />
      {/* Bubble */}
      <div className="fixed bg-[var(--text-primary)] text-primary-foreground text-[12px] font-semibold whitespace-nowrap p-[8px_12px] z-[99999]" style={{top: pos.top, left: pos.left, transform: "translateY(-50%)", fontFamily: "var(--ui-font-heading)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", pointerEvents: "none"}}>
        {label}
      </div>
    </>,
    document.body
  );
}

// Wrapper that tracks hover and passes ref to Tooltip
function TooltipItem({ label, collapsed, children, className, style = {}, onClick }: Record<string, any>) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  return (
    <div
      ref={ref}
      className={cn("relative", className)} style={{...style}}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
      <Tooltip label={label} targetRef={ref} visible={collapsed && hovered} />
    </div>
  );
}

export default function Sidebar({ mobileOpen = false, onMobileClose = () => {} }: Record<string, any>) {
  const collapsed = useAppStore(state => state.sidebarCollapsed);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const userRole = getCookie("role") || "Employee";

  const userDepartment = getCookie("department") || "";
  const filtered = getVisibleMenuItems(userRole, userDepartment);
  const accountLinks = filtered.filter(item => item.to === "/profile" || item.to === "/settings");
  const visibleSections = MENU_SECTIONS.map((section) => ({
    ...section,
    items: filtered.filter((item) => section.paths.includes(item.to)),
  })).filter((section) => section.items.length > 0);

  const handleLogout = () => {
    clearSession();
    onMobileClose();
    navigate("/login", { replace: true });
    setShowLogout(false);
  };

  const sidebarContent = (
    <>
      <div className="sidebar-toggle sidebar-header" data-sidebar="header">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="sidebar-toggle-btn"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          onClick={() => toggleSidebar()}
        >
          {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </Button>
      </div>

      <ul className="sidebar-nav" data-sidebar="content">
        {visibleSections.map((section) => (
          <li key={section.label} className="sidebar-section" data-sidebar="group">
            {(!collapsed || mobileOpen) && <div className="sidebar-label" data-sidebar="group-label">{section.label}</div>}
            <ul className="sidebar-nav-group" data-sidebar="menu">
              {section.items.map(item => (
                <li key={item.to} style={{ listStyle: "none" }}>
                  <TooltipItem label={item.label} collapsed={collapsed && !mobileOpen}>
                    <NavLink
                      to={item.to}
                      data-label={item.label}
                      data-sidebar="menu-button"
                      aria-label={item.label}
                      className={({ isActive }: Record<string, any>) => `nav-item${isActive ? " active" : ""}`}
                      onClick={onMobileClose}
                    >
                      <div className="nav-icon">{item.icon}</div>
                      {(!collapsed || mobileOpen) && <span className="text-[inherit]" >{item.label}</span>}
                    </NavLink>
                  </TooltipItem>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer" data-sidebar="footer">
        {accountLinks.map(item => (
          <TooltipItem key={item.to} label={item.label} collapsed={collapsed && !mobileOpen} className="mb-[8px]">
            <NavLink
              to={item.to}
              data-label={item.label}
              aria-label={item.label}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              onClick={onMobileClose}
            >
              <div className="nav-icon">{item.icon}</div>
              {(!collapsed || mobileOpen) && <span className="text-[inherit]">{item.label}</span>}
            </NavLink>
          </TooltipItem>
        ))}

        <TooltipItem label="Logout" collapsed={collapsed && !mobileOpen} className="mb-[8px]" >
          <Button variant="ghost"
            type="button"
            data-label="Logout"
            className={cn("nav-item", "w-[100%] bg-[transparent] text-left")}
            style={{border: 0}}
            aria-label="Logout"
            onClick={() => setShowLogout(true)}
          >
            <div className="nav-icon"><LogOut size={18}/></div>
            {(!collapsed || mobileOpen) && <span className="text-[inherit]" >Logout</span>}
          </Button>
        </TooltipItem>

        {(!collapsed || mobileOpen) ? (
          <div
            className={cn("sidebar-footer-text", "cursor-pointer")}
            onClick={() => window.open("http://www.natobotics.com", "_blank")}
            
          >
            Powered by <strong style={{ color: "var(--muted-foreground)" }}>NATOBOTICS</strong>
          </div>
        ) : (
          <TooltipItem label="Powered by Natobotics" collapsed={collapsed}>
            <div
              onClick={() => window.open("http://www.natobotics.com", "_blank")}
              className="w-[36px] h-[36px] flex items-center justify-center cursor-pointer m-[0_auto]" style={{borderRadius: "var(--radius)", background: "color-mix(in srgb, var(--card) 15%, transparent)", transition: "background 0.2s"}}
              onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--card) 25%, transparent)"}
              onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, var(--card) 15%, transparent)"}
            >
              <img
                src="/assets/images/natobotics-logo.png"
                alt="Natobotics"
                className="w-[24px] h-[24px] block" style={{objectFit: "contain"}}
                onError={e => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.innerHTML = `
                    <span style="color:var(--foreground);font-size:16px;font-weight:600;font-family:var(--ui-font-heading);line-height:1;">N</span>
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
