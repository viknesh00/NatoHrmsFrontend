import React, { useState, useRef, useEffect, useCallback } from "react";
import { User, Key, LogOut, ChevronDown, AlertTriangle } from "lucide-react";
import { cookieKeys, getCookie, setCookie } from "../../services/Cookies";
import { cookieObj } from "../../models/cookieObj";
import PasswordChange from "../../services/PasswordChange";
import { useNavigate } from "react-router-dom";
import { refreshUserCookies } from "./Layout";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch public IP with retry. Returns IP string or "Unknown". */
const fetchIp = async (retries = 2) => {
  const endpoints = [
    "https://api64.ipify.org?format=json",
    "https://api.ipify.org?format=json",
  ];
  for (const url of endpoints) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const r = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (r.ok) {
          const data = await r.json();
          if (data?.ip) return data.ip;
        }
      } catch {
        // try next attempt / endpoint
      }
    }
  }
  return "Unknown";
};

/** Reverse-geocode from browser geolocation. Returns city string or "Unknown". */
const fetchCityFromCoords = async (lat, lon) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (r.ok) {
      const d = await r.json();
      return d.city || d.locality || d.principalSubdivision || "Unknown";
    }
  } catch {}
  return "Unknown";
};

/** Get browser geolocation (lower accuracy = faster, less battery). */
const getBrowserLocation = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve("Unknown");

    const geoTimeout = setTimeout(() => resolve("Unknown"), 8000);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        clearTimeout(geoTimeout);
        const city = await fetchCityFromCoords(
          coords.latitude,
          coords.longitude
        );
        resolve(city);
      },
      () => {
        clearTimeout(geoTimeout);
        resolve("Unknown");
      },
      {
        enableHighAccuracy: false, // faster; WiFi/cell-tower based
        timeout: 7000,
        maximumAge: 5 * 60 * 1000, // reuse cached position for 5 min
      }
    );
  });

/** Fetch city via IP-geolocation as fallback (no permission needed). */
const fetchCityFromIp = async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const r = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (r.ok) {
      const d = await r.json();
      return d.city || "Unknown";
    }
  } catch {}
  return "Unknown";
};

/**
 * Best-effort location: tries browser geolocation first, falls back to IP
 * geolocation. Both run in a race so we always finish within ~8 s.
 */
const fetchLocation = async () => {
  // Run both in parallel; take whichever gives a real city first
  const [browserCity, ipCity] = await Promise.all([
    getBrowserLocation(),
    fetchCityFromIp(),
  ]);
  // Prefer browser (more accurate), fall back to IP-based
  return browserCity !== "Unknown" ? browserCity : ipCity;
};

/** Format seconds → HH:MM:SS */
const formatTime = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

/** Format date → "12 Apr" */
const formatDate = (d) =>
  d?.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) || "";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Header = () => {
  const navigate = useNavigate();

  // Clock state
  const [clockedIn, setClockedIn]     = useState(false);
  const [timer, setTimer]             = useState(0);
  const [clockInTime, setClockInTime] = useState(null);
  const intervalRef                   = useRef(null);

  // UI state
  const menuRef                                       = useRef(null);
  const [menuOpen, setMenuOpen]                       = useState(false);
  const [loading, setLoading]                         = useState(false);
  const [showPassword, setShowPassword]               = useState(
    getCookie("isDefaultPasswordChanged") === "false"
  );
  const [isManualChange, setIsManualChange]           = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm]     = useState(false);

  // User info from cookies
  const firstName    = getCookie("firstName")  || "";
  const lastName     = getCookie("lastName")   || "";
  const employeeId   = getCookie("employeeId") || "";
  const employeeRole = getCookie("role")       || "";
  const initials     = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  // ── Timer helpers ────────────────────────────────────────────────────────
  const startTimer = useCallback((clockTime) => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(
      () => setTimer(Math.floor((Date.now() - clockTime.getTime()) / 1000)),
      1000
    );
    // Set immediately without waiting 1 s
    setTimer(Math.floor((Date.now() - clockTime.getTime()) / 1000));
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    setClockedIn(false);
    setClockInTime(null);
    setTimer(0);
  }, []);

  // ── Fetch current clock-in status on mount / tab-focus ──────────────────
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await getRequest("Attendance/CheckClock-In");
        if (res.status === 200 && res.data?.clockIn) {
          const t = new Date(res.data.clockIn);
          setClockedIn(true);
          setClockInTime(t);
          startTimer(t);
        } else {
          stopTimer();
        }
      } catch {
        // Network error — keep current UI state, don't crash
      }
    };

    checkStatus();

    const onVisibility = () => {
      if (!document.hidden) {
        checkStatus();
        refreshUserCookies(); // re-sync cookies whenever tab is focused
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(intervalRef.current);
    };
  }, [startTimer, stopTimer]);

  // Sync timer when tab becomes visible and already clocked in
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden && clockInTime) {
        setTimer(Math.floor((Date.now() - clockInTime.getTime()) / 1000));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [clockInTime]);

  // ── Close dropdown on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Clock in / out ───────────────────────────────────────────────────────
  const handleClock = async () => {
    setLoading(true);
    try {
      // Fetch IP and location IN PARALLEL for speed
      const [ip, city] = await Promise.all([fetchIp(), fetchLocation()]);

      const now      = new Date();
      // Local ISO without UTC offset suffix (backend expects local time)
      const localISO = new Date(now - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, -1);

      const endpoint = clockedIn ? "Attendance/clock-out" : "Attendance/clock-in";
      const res = await postRequest(endpoint, {
        location:  city,
        ipAddress: ip,
        timestamp: localISO,
      });

      if (res.status === 200) {
        if (!clockedIn) {
          // Clock IN
          setClockedIn(true);
          setClockInTime(now);
          startTimer(now);
          setCookie(
            "clockInTime",
            now,
            new Date(new Date().setDate(new Date().getDate() + 1))
          );
          ToastSuccess("Clock-In successful!");
        } else {
          // Clock OUT
          stopTimer();
          setCookie("clockInTime", null, new Date(0));
          ToastSuccess("Clock-Out successful!");
        }
        // Notify Dashboard (and any other listener) to re-fetch attendance
        window.dispatchEvent(new CustomEvent("attendance:updated"));
      } else {
        ToastError("Attendance action failed. Please try again.");
      }
    } catch (err) {
      console.error("Clock action error:", err);
      ToastError("Attendance action failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    cookieKeys(cookieObj, 0);
    navigate("/login");
    setMenuOpen(false);
    setShowLogoutConfirm(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <header className="header">
      <LoadingMask loading={loading} />

      {/* Password change modal */}
      {showPassword && (
        <PasswordChange
          isManualChange={isManualChange}
          onSuccess={() => { setShowPassword(false); setIsManualChange(false); }}
          onClose={()   => { setShowPassword(false); setIsManualChange(false); }}
        />
      )}

      {/* Logout confirm modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(20,0,50,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 3000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)", borderRadius: 20,
              boxShadow: "var(--shadow-xl)",
              width: "100%", maxWidth: 380,
              overflow: "hidden", animation: "slideUp 0.25s ease",
            }}
          >
            <div style={{ height: 4, background: "linear-gradient(90deg, var(--coral), #f97316)" }} />
            <div style={{ padding: "24px 24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "#fff1f2",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={22} color="var(--coral)" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 17, fontWeight: 800,
                      color: "var(--text-primary)",
                    }}
                  >
                    Confirm Logout
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                    Are you sure you want to log out?
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20 }}>
                You will be signed out of your Natobotics HRMS account. Any unsaved changes will be lost.
              </p>
            </div>
            <div style={{ padding: "0 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: "9px 20px", borderRadius: 9,
                  border: "1.5px solid var(--border)",
                  background: "var(--bg-card)", color: "var(--text-secondary)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Stay Logged In
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: "9px 20px", borderRadius: 9,
                  border: "none",
                  background: "linear-gradient(135deg, var(--coral), #f97316)",
                  color: "white", fontSize: 13, fontWeight: 700,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                  boxShadow: "0 3px 10px rgba(244,63,94,0.3)",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              >
                <LogOut size={15} /> Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand */}
      <div className="header-brand">
        <img src="/assets/images/natobotics-logo.png" alt="Logo" className="header-logo" />
        <span className="header-brand-name">
          Nato<span>botics</span>
        </span>
      </div>

      <div className="header-right">
        {/* Clock button */}
        <button
          className={`clock-btn ${clockedIn ? "clock-btn-active" : "clock-btn-idle"}`}
          onClick={handleClock}
          disabled={loading}
        >
          {clockedIn ? (
            <>
              <span style={{ fontSize: 10, opacity: 0.85 }}>{formatDate(clockInTime)}</span>
              <span style={{ fontSize: 13, letterSpacing: "0.05em" }}>{formatTime(timer)}</span>
            </>
          ) : (
            "Clock In"
          )}
        </button>

        {/* User info */}
        <div className="header-user-info">
          <div className="header-user-name">{firstName} {lastName}</div>
          <div className="header-user-role">{employeeRole}</div>
        </div>

        {/* Avatar + dropdown */}
        <div style={{ position: "relative" }} ref={menuRef}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <div className="header-avatar">{initials}</div>
            <ChevronDown
              size={13}
              color="var(--text-muted)"
              style={{
                transition: "transform 0.2s",
                transform: menuOpen ? "rotate(180deg)" : "",
              }}
            />
          </div>

          {menuOpen && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 10px)", right: 0,
                background: "white", borderRadius: 16,
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-lg)",
                minWidth: 210, overflow: "hidden",
                animation: "slideUp 0.2s ease",
                zIndex: 300,
              }}
            >
              {/* User header */}
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--border)",
                  background: "linear-gradient(135deg, var(--primary-ghost), #f0fdf4)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--primary), var(--teal))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 13, fontWeight: 800, color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        fontWeight: 800, fontSize: 13.5, color: "var(--text-primary)",
                      }}
                    >
                      {firstName} {lastName}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>
                      {employeeId} · {employeeRole}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              {[
                {
                  icon: <User size={15} />,
                  label: "View Profile",
                  action: () => { navigate("/view-employee"); setMenuOpen(false); },
                },
                {
                  icon: <Key size={15} />,
                  label: "Change Password",
                  action: () => { setIsManualChange(true); setShowPassword(true); setMenuOpen(false); },
                },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 16px",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13.5, fontFamily: "'DM Sans',sans-serif", fontWeight: 500,
                    color: "var(--text-primary)", textAlign: "left",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ color: "var(--text-muted)" }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}

              <div style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => { setMenuOpen(false); setShowLogoutConfirm(true); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 16px",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13.5, fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
                    color: "var(--coral)", textAlign: "left",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fff1f2")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
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