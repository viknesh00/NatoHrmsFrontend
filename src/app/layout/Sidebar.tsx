import { cn } from "cn";
import { useAppStore } from "../../store/useAppStore";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { LogOut, ChevronLeft, ChevronRight, AlertTriangle, Settings, User, Key, Github, ExternalLink, LoaderCircle } from "lucide-react";
import { getCookie } from "../../auth/Cookies";
import { clearSession } from "../../auth/Auth";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, } from "../../components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTitle } from "../../components/ui/sheet";
import PasswordChange from "../../shared/services/PasswordChange";
import ProfileAvatar from "../../components/ProfileAvatar";

import { getVisibleMenuItems } from "../../auth/navigation";
export { getVisibleMenuItems, menuItems } from "../../auth/navigation";

const MENU_SECTIONS = [
  { label: "OVERVIEW", paths: ["/dashboard"] },
  { label: "PEOPLE", paths: ["/employees", "/vcard", "/organization-chart", "/onboarding", "/work-status", "/work-status-report"] },
  { label: "TIME & ATTENDANCE", paths: ["/timesheet", "/attendance", "/leave", "/Calendar"] },
  { label: "COMPANY", paths: ["/company-documents", "/announcement"] },
  { label: "TRUST & POLICIES", paths: ["/privacy-policy", "/terms", "/standards"] },
];

type GitHubContributor = { login: string; avatar_url: string; html_url: string; contributions: number };
let contributorsCache: GitHubContributor[] | null = null;

function GitHubContributors() {
  const [contributors, setContributors] = useState<GitHubContributor[] | null>(() => contributorsCache);
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadContributors = async () => {
    if (contributorsCache) { setContributors(contributorsCache); return; }
    setLoadingContributors(true);
    setLoadFailed(false);
    try {
      const response = await fetch("https://api.github.com/repos/viknesh00/NatoHrmsFrontend/contributors?per_page=5", {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!response.ok) throw new Error("GitHub contributors are unavailable");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Unexpected GitHub response");
      contributorsCache = data.filter((entry) => entry?.login && entry?.html_url).slice(0, 5);
      setContributors(contributorsCache);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoadingContributors(false);
    }
  };

  return (
    <section className="settings-contributors" aria-labelledby="settings-contributors-title">
      <div className="settings-contributors-heading">
        <span className="settings-contributors-icon"><Github size={17} aria-hidden="true" /></span>
        <div>
          <h3 id="settings-contributors-title">Project contributors</h3>
          <p>GitHub repository activity</p>
        </div>
      </div>
      <a className="settings-repository-link" href="https://github.com/viknesh00/NatoHrmsFrontend" target="_blank" rel="noreferrer">
        NatoHRMSFrontend <ExternalLink size={13} aria-hidden="true" />
      </a>
      {contributors ? (
        <ul className="settings-contributor-list" aria-label="Top GitHub contributors">
          {contributors.map((contributor) => (
            <li key={contributor.login}>
              <img src={contributor.avatar_url} alt="" loading="lazy" />
              <a href={contributor.html_url} target="_blank" rel="noreferrer">{contributor.login}</a>
              <span>{contributor.contributions} contributions</span>
            </li>
          ))}
          {!contributors.length && <li className="settings-contributors-empty">No public contributors returned.</li>}
        </ul>
      ) : (
        <div className="settings-contributors-load">
          <p>{loadFailed ? "GitHub contributor data could not be loaded." : "View public contributor highlights from GitHub."}</p>
          <Button variant="outline" size="sm" onClick={loadContributors} disabled={loadingContributors}>
            {loadingContributors ? <LoaderCircle className="animate-spin" size={14} /> : <Github size={14} />}
            {loadingContributors ? "Loading" : loadFailed ? "Try again" : "Load contributors"}
          </Button>
        </div>
      )}
    </section>
  );
}

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const userRole = getCookie("role") || "Employee";

  const userDepartment = getCookie("department") || "";
  const filtered = getVisibleMenuItems(userRole, userDepartment);
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
        <TooltipItem label="Settings" collapsed={collapsed && !mobileOpen} className="mb-[8px]">
          <Button
            variant="ghost"
            type="button"
            data-label="Settings"
            className={cn("nav-item", "w-[100%] bg-[transparent] text-left")}
            style={{ border: 0 }}
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <div className="nav-icon"><Settings size={18} /></div>
            {(!collapsed || mobileOpen) && <span className="text-[inherit]">Settings</span>}
          </Button>
        </TooltipItem>

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

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="sidebar-settings-sheet">
          <SheetTitle>Profile &amp; settings</SheetTitle>
          <div className="sidebar-settings-user">
            <ProfileAvatar
              seed={getCookie("email")}
              initials={`${(getCookie("firstName") || "")[0] || ""}${(getCookie("lastName") || "")[0] || ""}`.toUpperCase()}
              className="sidebar-settings-avatar"
            />
            <div className="min-w-0">
              <div className="font-semibold text-foreground">{getCookie("firstName")} {getCookie("lastName")}</div>
              <div className="truncate text-sm text-muted-foreground">{getCookie("email")}</div>
            </div>
          </div>
          <div className="sidebar-settings-actions">
            <Button variant="outline" className="justify-start" onClick={() => { setSettingsOpen(false); onMobileClose(); navigate("/view-employee"); }}>
              <User size={16} /> View Profile
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => { setSettingsOpen(false); setShowPassword(true); }}>
              <Key size={16} /> Change Password
            </Button>
          </div>
          <GitHubContributors />
        </SheetContent>
      </Sheet>

      {showPassword && (
        <PasswordChange
          isManualChange
          onSuccess={() => setShowPassword(false)}
          onClose={() => setShowPassword(false)}
        />
      )}

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
