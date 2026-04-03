import React, { useState, useRef, useEffect } from "react";
import { User, Key, LogOut, ChevronDown, AlertTriangle, X, Check } from "lucide-react";
import { cookieKeys, getCookie, setCookie } from "../../services/Cookies";
import { cookieObj } from "../../models/cookieObj";
import PasswordChange from "../../services/PasswordChange";
import { useNavigate } from "react-router-dom";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";

const Header = () => {
  const navigate = useNavigate();
  const [clockedIn, setClockedIn]     = useState(false);
  const [timer, setTimer]             = useState(0);
  const [clockInTime, setClockInTime] = useState(null);
  const intervalRef = useRef(null);
  const menuRef     = useRef(null);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(getCookie("isDefaultPasswordChanged") === "false");
  const [isManualChange, setIsManualChange] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const firstName    = getCookie("firstName") || "";
  const lastName     = getCookie("lastName")  || "";
  const employeeId   = getCookie("employeeId") || "";
  const employeeRole = getCookie("role") || "";
  const initials     = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const updateTimer = (clockTime) => setTimer(Math.floor((new Date() - clockTime) / 1000));

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getRequest("Attendance/CheckClock-In");
        if (res.status === 200 && res.data.clockIn) {
          const t = new Date(res.data.clockIn);
          setClockedIn(true); setClockInTime(t); updateTimer(t);
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => updateTimer(t), 1000);
        } else { clearInterval(intervalRef.current); setClockedIn(false); setClockInTime(null); setTimer(0); }
      } catch {}
    };
    fetch();
    const vis = () => { if (!document.hidden) fetch(); };
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    const vis = () => { if (!document.hidden && clockInTime) updateTimer(clockInTime); };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [clockInTime]);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchIp = async () => { try { const r = await fetch("https://api64.ipify.org?format=json"); return (await r.json()).ip; } catch { return null; } };
  const fetchLoc = () => !navigator.geolocation ? { city: "Unknown" } : new Promise(res => navigator.geolocation.getCurrentPosition(async pos => { try { const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`); const d = await r.json(); res({ city: d.city || d.locality || "Unknown" }); } catch { res({ city: "Unknown" }); } }, () => res({ city: "Unknown" }), { enableHighAccuracy: true, timeout: 10000 }));

  const handleClock = async () => {
    setLoading(true);
    try {
      const ip = await fetchIp();
      const loc = await fetchLoc();
      const now = new Date();
      const localISO = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0,-1);
      const res = await postRequest(clockedIn ? "Attendance/clock-out" : "Attendance/clock-in", { location: loc?.city || "Unknown", ipAddress: ip, timestamp: localISO });
      if (res.status === 200) {
        if (!clockedIn) {
          setClockedIn(true); setClockInTime(now); updateTimer(now);
          intervalRef.current = setInterval(() => updateTimer(now), 1000);
          setCookie("clockInTime", now, new Date(new Date().setDate(new Date().getDate()+1)));
          ToastSuccess("Clock-In successful!");
        } else {
          clearInterval(intervalRef.current); setClockedIn(false); setClockInTime(null); setTimer(0);
          setCookie("clockInTime", null, new Date(0));
          ToastSuccess("Clock-Out successful!");
        }
        // 🔔 Notify Dashboard (and any other listener) to re-fetch attendance
        window.dispatchEvent(new CustomEvent("attendance:updated"));
      }
    } catch { ToastError("Attendance action failed!"); }
    finally { setLoading(false); }
  };

  const formatTime = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; };
  const formatDate = (d) => d?.toLocaleDateString("en-GB", { day:"2-digit", month:"short" }) || "";

  const handleLogout = () => { cookieKeys(cookieObj, 0); navigate("/login"); setMenuOpen(false); setShowLogoutConfirm(false); };

  return (
    <header className="header">
      <LoadingMask loading={loading} />
      {showPassword && (
        <PasswordChange isManualChange={isManualChange}
          onSuccess={() => { setShowPassword(false); setIsManualChange(false); }}
          onClose={() => { setShowPassword(false); setIsManualChange(false); }} />
      )}

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(20,0,50,0.5)", backdropFilter:"blur(4px)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"var(--bg-card)", borderRadius:20, boxShadow:"var(--shadow-xl)", width:"100%", maxWidth:380, overflow:"hidden", animation:"slideUp 0.25s ease" }}>
            <div style={{ height:4, background:"linear-gradient(90deg, var(--coral), #f97316)" }} />
            <div style={{ padding:"24px 24px 0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:"#fff1f2", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <AlertTriangle size={22} color="var(--coral)" />
                </div>
                <div>
                  <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:17, fontWeight:800, color:"var(--text-primary)" }}>Confirm Logout</div>
                  <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:2 }}>Are you sure you want to log out?</div>
                </div>
              </div>
              <p style={{ fontSize:13.5, color:"var(--text-secondary)", lineHeight:1.7, marginBottom:20 }}>
                You will be signed out of your Natobotics HRMS account. Any unsaved changes will be lost.
              </p>
            </div>
            <div style={{ padding:"0 24px 20px", display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ padding:"9px 20px", borderRadius:9, border:"1.5px solid var(--border)", background:"var(--bg-card)", color:"var(--text-secondary)", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                Stay Logged In
              </button>
              <button onClick={handleLogout} style={{ padding:"9px 20px", borderRadius:9, border:"none", background:"linear-gradient(135deg, var(--coral), #f97316)", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:7, boxShadow:"0 3px 10px rgba(244,63,94,0.3)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                <LogOut size={15} /> Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand */}
      <div className="header-brand">
        <img src="/assets/images/natobotics-logo.png" alt="Logo" className="header-logo" />
        <span className="header-brand-name">Nato<span>botics</span></span>
      </div>

      <div className="header-right">
        {/* Clock Button */}
        <button className={`clock-btn ${clockedIn ? "clock-btn-active" : "clock-btn-idle"}`} onClick={handleClock}>
          {clockedIn ? (<><span style={{ fontSize:10, opacity:0.85 }}>{formatDate(clockInTime)}</span><span style={{ fontSize:13, letterSpacing:"0.05em" }}>{formatTime(timer)}</span></>) : "Clock In"}
        </button>

        {/* User info */}
        <div className="header-user-info">
          <div className="header-user-name">{firstName} {lastName}</div>
          <div className="header-user-role">{employeeRole}</div>
        </div>

        {/* Avatar + dropdown */}
        <div style={{ position:"relative" }} ref={menuRef}>
          <div style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }} onClick={() => setMenuOpen(o => !o)}>
            <div className="header-avatar">{initials}</div>
            <ChevronDown size={13} color="var(--text-muted)" style={{ transition:"transform 0.2s", transform:menuOpen?"rotate(180deg)":"" }} />
          </div>

          {menuOpen && (
            <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"white", borderRadius:16, border:"1px solid var(--border)", boxShadow:"var(--shadow-lg)", minWidth:210, overflow:"hidden", animation:"slideUp 0.2s ease", zIndex:300 }}>
              {/* User header */}
              <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border)", background:"linear-gradient(135deg, var(--primary-ghost), #f0fdf4)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg, var(--primary), var(--teal))", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, fontWeight:800, color:"white", flexShrink:0 }}>{initials}</div>
                  <div>
                    <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:13.5, color:"var(--text-primary)" }}>{firstName} {lastName}</div>
                    <div style={{ fontSize:11.5, color:"var(--text-muted)", marginTop:1 }}>{employeeId} · {employeeRole}</div>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              {[
                { icon:<User size={15}/>,  label:"View Profile",    action:() => { navigate("/view-employee"); setMenuOpen(false); } },
                { icon:<Key size={15}/>,   label:"Change Password", action:() => { setIsManualChange(true); setShowPassword(true); setMenuOpen(false); } },
              ].map((item, i) => (
                <button key={i} onClick={item.action} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 16px", background:"none", border:"none", cursor:"pointer", fontSize:13.5, fontFamily:"'DM Sans',sans-serif", fontWeight:500, color:"var(--text-primary)", textAlign:"left", transition:"background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background="var(--bg)"}
                  onMouseLeave={e => e.currentTarget.style.background="none"}>
                  <span style={{ color:"var(--text-muted)" }}>{item.icon}</span> {item.label}
                </button>
              ))}

              <div style={{ borderTop:"1px solid var(--border)" }}>
                <button onClick={() => { setMenuOpen(false); setShowLogoutConfirm(true); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 16px", background:"none", border:"none", cursor:"pointer", fontSize:13.5, fontFamily:"'DM Sans',sans-serif", fontWeight:600, color:"var(--coral)", textAlign:"left", transition:"background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background="#fff1f2"}
                  onMouseLeave={e => e.currentTarget.style.background="none"}>
                  <LogOut size={15} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;