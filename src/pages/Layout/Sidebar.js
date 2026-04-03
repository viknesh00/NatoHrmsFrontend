import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, LogOut, ChevronLeft, ChevronRight,
  Megaphone, File, CalendarCheck2, UserMinus, ClipboardList, Calendar, Receipt,
  AlertTriangle, X, Briefcase,
} from "lucide-react";
import { cookieKeys, getCookie } from "../../services/Cookies";
import { cookieObj } from "../../models/cookieObj";
import { useNavigate } from "react-router-dom";

const menuItems = [
  { to:"/dashboard",         label:"Dashboard",      icon:<LayoutDashboard size={18}/>, roles:["Admin","Manager","Employee"] },
  { to:"/employees",         label:"Employees",      icon:<Users size={18}/>,           roles:["Admin","Manager"] },
  { to:"/timesheet",         label:"Timesheet",      icon:<ClipboardList size={18}/>,   roles:["Admin","Manager","Employee"] },
  //{ to:"/job-management",    label:"Job Management", icon:<Briefcase size={18}/>,       roles:["Admin","Manager","Employee"] },
  { to:"/attendance",        label:"Attendance",     icon:<CalendarCheck2 size={18}/>,  roles:["Admin","Manager","Employee"] },
  //{ to:"/payslip",           label:"Payslip",        icon:<Receipt size={18}/>,         roles:["Admin"] },
  { to:"/company-documents", label:"Documents",      icon:<File size={18}/>,            roles:["Admin","Manager","Employee"] },
  { to:"/announcement",      label:"Announcements",  icon:<Megaphone size={18}/>,       roles:["Admin","Manager","Employee"] },
  { to:"/leave",             label:"Leave",          icon:<UserMinus size={18}/>,       roles:["Admin","Manager","Employee"] },
  { to:"/Calendar",          label:"Calendar",       icon:<Calendar size={18}/>,        roles:["Admin","Manager","Employee"] },
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
        borderRight: "5px solid #1e1143",
        pointerEvents: "none",
        zIndex: 99999,
      }} />
      {/* Bubble */}
      <div style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        transform: "translateY(-50%)",
        background: "#1e1143",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
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

export default function Sidebar() {
  const [collapsed, setCollapsed]   = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const userRole = getCookie("role") || "Employee";
  const filtered = menuItems.filter(m => m.roles.includes(userRole));

  const handleLogout = () => {
    cookieKeys(cookieObj, 0);
    navigate("/login");
    setShowLogout(false);
  };

  return (
    <>
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="sidebar-toggle">
          <button className="sidebar-toggle-btn" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>
        </div>

        <ul className="sidebar-nav">
          {!collapsed && <li className="sidebar-label">Navigation</li>}
          {filtered.map(item => (
            <li key={item.to} style={{ listStyle: "none" }}>
              <TooltipItem label={item.label} collapsed={collapsed}>
                <NavLink
                  to={item.to}
                  data-label={item.label}
                  className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                >
                  <div className="nav-icon">{item.icon}</div>
                  {!collapsed && <span style={{ color: "inherit" }}>{item.label}</span>}
                </NavLink>
              </TooltipItem>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          {/* Logout with tooltip */}
          <TooltipItem label="Logout" collapsed={collapsed} style={{ marginBottom: 8 }}>
            <div
              data-label="Logout"
              className="nav-item"
              style={{ cursor: "pointer" }}
              onClick={() => setShowLogout(true)}
            >
              <div className="nav-icon"><LogOut size={18}/></div>
              {!collapsed && <span style={{ color: "inherit" }}>Logout</span>}
            </div>
          </TooltipItem>

          {/* Natobotics branding */}
          {!collapsed ? (
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
                      <span style="color:white;font-size:15px;font-weight:900;font-family:'Plus Jakarta Sans',sans-serif;line-height:1;">N</span>
                    `;
                  }}
                />
              </div>
            </TooltipItem>
          )}
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogout && (
        <div style={{ position:"fixed", inset:0, background:"rgba(20,0,50,0.55)", backdropFilter:"blur(5px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"white", borderRadius:20, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", width:"100%", maxWidth:380, overflow:"hidden", animation:"slideUp 0.25s ease" }}>

            <div style={{ height:4, background:"linear-gradient(90deg,#f43f5e,#f97316)" }} />

            <div style={{ padding:"24px 24px 0" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:48, height:48, borderRadius:14, background:"#fff1f2", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <AlertTriangle size={24} color="#f43f5e"/>
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:18, fontWeight:900, color:"#1e1143" }}>
                      Confirm Logout
                    </div>
                    <div style={{ fontSize:12.5, color:"#64748b", marginTop:2 }}>
                      You'll be signed out of HRMS
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogout(false)}
                  style={{ width:30, height:30, borderRadius:8, background:"#f1f5f9", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b" }}
                >
                  <X size={16}/>
                </button>
              </div>
              <p style={{ fontSize:13.5, color:"#475569", lineHeight:1.7, marginBottom:22, paddingLeft:62 }}>
                Any unsaved changes will be lost. Are you sure you want to log out?
              </p>
            </div>

            <div style={{ padding:"0 24px 22px", display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button
                onClick={() => setShowLogout(false)}
                style={{ padding:"9px 20px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"white", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}
              >
                Stay Logged In
              </button>
              <button
                onClick={handleLogout}
                style={{ padding:"9px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#f43f5e,#f97316)", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:7, fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:"0 3px 12px rgba(244,63,94,0.3)" }}
              >
                <LogOut size={15}/> Yes, Logout
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}