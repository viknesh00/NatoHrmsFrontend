import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  User,
  Key,
  LogOut,
  ChevronDown,
  AlertTriangle,
  Menu,
} from "lucide-react";
import { cookieKeys, getCookie, setCookie } from "../../services/Cookies";
import { cookieObj } from "../../models/cookieObj";
import PasswordChange from "../../services/PasswordChange";
import { useNavigate } from "react-router-dom";
import { refreshUserCookies } from "./Layout";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

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

        const r = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (r.ok) {
          const data = await r.json();

          if (data?.ip) {
            return data.ip;
          }
        }
      } catch {
        // Try next endpoint / retry
      }
    }
  }

  return "Unknown";
};

/**
 * Reverse-geocode coordinates to the most specific available
 * locality / area name.
 *
 * Example:
 * Perungudi instead of Chennai
 * Velachery instead of Chennai
 */
const fetchLocalityFromCoords = async (lat, lon) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (r.ok) {
      const d = await r.json();

      const resolved =
        d.locality ||
        d.city ||
        d.localityInfo?.administrative
          ?.sort((a, b) => (b.order || 0) - (a.order || 0))
          ?.find((a) => a.name)?.name ||
        d.principalSubdivision ||
        "Unknown";

      return resolved;
    }

    console.warn(
      "BigDataCloud reverse geocode HTTP error:",
      r.status
    );
  } catch (err) {
    console.warn(
      "BigDataCloud reverse geocode failed:",
      err
    );
  }

  return "Unknown";
};

/**
 * Fallback reverse-geocode using OpenStreetMap Nominatim.
 * Priority is given to smaller locality names.
 */
const fetchLocalityFromCoordsNominatim = async (lat, lon) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18`,
      {
        signal: controller.signal,
        headers: {
          "Accept-Language": "en",
        },
      }
    );

    clearTimeout(timeout);

    if (r.ok) {
      const d = await r.json();
      const address = d.address || {};

      return (
        address.suburb ||
        address.neighbourhood ||
        address.quarter ||
        address.city_district ||
        address.town ||
        address.village ||
        address.city ||
        "Unknown"
      );
    }

    console.warn(
      "Nominatim reverse geocode HTTP error:",
      r.status
    );
  } catch (err) {
    console.warn(
      "Nominatim reverse geocode failed:",
      err
    );
  }

  return "Unknown";
};

/**
 * Resolve coordinates to locality name.
 *
 * First:
 * BigDataCloud
 *
 * Fallback:
 * OpenStreetMap Nominatim
 */
const resolveLocalityFromCoords = async (lat, lon) => {
  const locality = await fetchLocalityFromCoords(lat, lon);

  if (locality !== "Unknown") {
    return locality;
  }

  return fetchLocalityFromCoordsNominatim(lat, lon);
};

/**
 * Get high-accuracy GPS coordinates.
 *
 * Returns:
 * {
 *   lat,
 *   lon,
 *   accuracy
 * }
 */
const getAccurateCoords = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      return resolve(null);
    }

    const geoTimeout = setTimeout(() => {
      resolve(null);
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        clearTimeout(geoTimeout);

        resolve({
          lat: coords.latitude,
          lon: coords.longitude,
          accuracy: coords.accuracy,
        });
      },

      () => {
        clearTimeout(geoTimeout);
        resolve(null);
      },

      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 0,
      }
    );
  });

/**
 * Fetch city/location via IP.
 *
 * This is only used as a fallback when GPS is unavailable.
 */
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
  } catch {
    // Ignore fallback error
  }

  return "Unknown";
};

/**
 * Fetch the best available location.
 *
 * GPS is always preferred.
 *
 * Returns:
 * {
 *   location,
 *   lat,
 *   lon,
 *   accuracy,
 *   source
 * }
 */
const fetchLocation = async () => {
  const coords = await getAccurateCoords();

  if (coords) {
    const locality = await resolveLocalityFromCoords(
      coords.lat,
      coords.lon
    );

    return {
      location: locality,
      lat: coords.lat,
      lon: coords.lon,
      accuracy: coords.accuracy,
      source: "GPS",
    };
  }

  // GPS unavailable → IP fallback
  const ipLocation = await fetchCityFromIp();

  return {
    location: ipLocation,
    lat: null,
    lon: null,
    accuracy: null,
    source: "IP",
  };
};

/**
 * Refresh cached GPS-based location.
 *
 * Cache duration: 15 minutes
 */
const refreshGpsLocationCookie = async () => {
  try {
    const lastFetched = getCookie("locationFetchedAt");

    const cacheAgeMs = lastFetched
      ? Date.now() - Number(lastFetched)
      : Infinity;

    if (cacheAgeMs < 15 * 60 * 1000) {
      return;
    }

    const coords = await getAccurateCoords();

    if (!coords) {
      return;
    }

    let locality = await resolveLocalityFromCoords(
      coords.lat,
      coords.lon
    );

    if (locality === "Unknown") {
      locality = await fetchCityFromIp();
    }

    const expiry = new Date(
      new Date().setDate(
        new Date().getDate() + 1
      )
    );

    setCookie(
      "networkLocation",
      locality,
      expiry
    );

    setCookie(
      "locationLat",
      coords.lat,
      expiry
    );

    setCookie(
      "locationLon",
      coords.lon,
      expiry
    );

    setCookie(
      "locationAccuracy",
      coords.accuracy,
      expiry
    );

    setCookie(
      "locationFetchedAt",
      Date.now(),
      expiry
    );
  } catch {
    // Keep existing cached values
  }
};

/** Format seconds → HH:MM:SS */
const formatTime = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return `${String(h).padStart(2, "0")}:${String(
    m
  ).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

/** Format date → "12 Apr" */
const formatDate = (d) =>
  d?.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  }) || "";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Header = ({ onMenuClick = () => {}, navOpen = false }) => {
  const navigate = useNavigate();

  // Clock state
  const [clockedIn, setClockedIn] = useState(false);
  const [timer, setTimer] = useState(0);
  const [clockInTime, setClockInTime] = useState(null);

  const intervalRef = useRef(null);

  // UI state
  const menuRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(
    getCookie("isDefaultPasswordChanged") === "false"
  );

  const [isManualChange, setIsManualChange] =
    useState(false);

  const [
    showLogoutConfirm,
    setShowLogoutConfirm,
  ] = useState(false);

  // User info from cookies
  const firstName =
    getCookie("firstName") || "";

  const lastName =
    getCookie("lastName") || "";

  const employeeId =
    getCookie("employeeId") || "";

  const employeeRole =
    getCookie("role") || "";

  const isDeizeisau =
    (getCookie("department") || "")
      .trim()
      .toLowerCase() === "deizeisau";

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const geoFenceEnabled =
    getCookie("geoFenceEnabled") === "true";

  const workLocationCity =
    (getCookie("workLocationCity") || "").trim();

  // -------------------------------------------------------------------------
  // Timer helpers
  // -------------------------------------------------------------------------

  const startTimer = useCallback((clockTime) => {
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setTimer(
        Math.floor(
          (Date.now() - clockTime.getTime()) / 1000
        )
      );
    }, 1000);

    setTimer(
      Math.floor(
        (Date.now() - clockTime.getTime()) / 1000
      )
    );
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(intervalRef.current);

    setClockedIn(false);
    setClockInTime(null);
    setTimer(0);
  }, []);

  // -------------------------------------------------------------------------
  // Fetch current clock-in status
  // -------------------------------------------------------------------------

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await getRequest(
          "Attendance/CheckClock-In"
        );

        if (
          res.status === 200 &&
          res.data?.clockIn
        ) {
          const t = new Date(
            res.data.clockIn
          );

          setClockedIn(true);
          setClockInTime(t);
          startTimer(t);
        } else {
          stopTimer();
        }
      } catch {
        // Keep current UI state
      }
    };

    checkStatus();

    refreshGpsLocationCookie();

    const onVisibility = () => {
      if (!document.hidden) {
        checkStatus();

        refreshGpsLocationCookie();

        refreshUserCookies();
      }
    };

    document.addEventListener(
      "visibilitychange",
      onVisibility
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );

      clearInterval(intervalRef.current);
    };
  }, [startTimer, stopTimer]);

  // -------------------------------------------------------------------------
  // Sync timer
  // -------------------------------------------------------------------------

  useEffect(() => {
    const onVisibility = () => {
      if (
        !document.hidden &&
        clockInTime
      ) {
        setTimer(
          Math.floor(
            (Date.now() -
              clockInTime.getTime()) /
              1000
          )
        );
      }
    };

    document.addEventListener(
      "visibilitychange",
      onVisibility
    );

    return () =>
      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );
  }, [clockInTime]);

  // -------------------------------------------------------------------------
  // Close dropdown outside click
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handler = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handler
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handler
      );
  }, []);

  // -------------------------------------------------------------------------
  // Clock In / Clock Out
  // -------------------------------------------------------------------------

  const handleClock = async () => {
    setLoading(true);

    try {
      // Fetch public IP and GPS location in parallel
      const [ip, locationData] =
        await Promise.all([
          fetchIp(),
          fetchLocation(),
        ]);

      const location =
        locationData.location;

      // ---------------------------------------------------------------------
      // Geo-fence validation
      //
      // Example:
      // Current GPS locality = Perungudi
      // Assigned location     = Perungudi
      //
      // Allowed
      //
      // Current GPS locality = Velachery
      // Assigned location     = Perungudi
      //
      // Blocked
      // ---------------------------------------------------------------------

      if (
        !clockedIn &&
        geoFenceEnabled &&
        workLocationCity
      ) {
        const currentLocation =
          (location || "")
            .trim()
            .toLowerCase();

        const assignedLocation =
          workLocationCity
            .trim()
            .toLowerCase();

        if (
          currentLocation !== "unknown" &&
          currentLocation !== assignedLocation
        ) {
          ToastError(
            `Clock-In blocked: you're in ${location}, but your assigned location is ${workLocationCity}.`
          );

          setLoading(false);

          return;
        }
      }

      const now = new Date();

      // Local ISO without UTC suffix
      const localISO = new Date(
        now -
          now.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, -1);

      const endpoint = clockedIn
        ? "Attendance/clock-out"
        : "Attendance/clock-in";

      // ---------------------------------------------------------------------
      // Send exact GPS details to backend
      // ---------------------------------------------------------------------

      const res = await postRequest(
        endpoint,
        {
          location,

          latitude:
            locationData.lat,

          longitude:
            locationData.lon,

          accuracy:
            locationData.accuracy,

          locationSource:
            locationData.source,

          ipAddress: ip,

          timestamp: localISO,
        }
      );

      if (res.status === 200) {
        if (!clockedIn) {
          // Clock IN
          setClockedIn(true);

          setClockInTime(now);

          startTimer(now);

          setCookie(
            "clockInTime",
            now,
            new Date(
              new Date().setDate(
                new Date().getDate() + 1
              )
            )
          );

          ToastSuccess(
            `Clock-In successful from ${location}!`
          );
        } else {
          // Clock OUT
          stopTimer();

          setCookie(
            "clockInTime",
            null,
            new Date(0)
          );

          ToastSuccess(
            `Clock-Out successful from ${location}!`
          );
        }

        // Notify Dashboard
        window.dispatchEvent(
          new CustomEvent(
            "attendance:updated"
          )
        );
      } else {
        ToastError(
          "Attendance action failed. Please try again."
        );
      }
    } catch (err) {
      console.error(
        "Clock action error:",
        err
      );

      ToastError(
        "Attendance action failed. Check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  const handleLogout = () => {
    cookieKeys(cookieObj, 0);

    navigate("/login");

    setMenuOpen(false);

    setShowLogoutConfirm(false);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <header className="header">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="header-menu-toggle"
        aria-label="Toggle navigation"
        aria-expanded={navOpen}
        onClick={onMenuClick}
      >
        <Menu size={17} />
      </Button>
      <LoadingMask loading={loading} />

      {/* Password change modal */}
      {showPassword && (
        <PasswordChange
          isManualChange={isManualChange}
          onSuccess={() => {
            setShowPassword(false);
            setIsManualChange(false);
          }}
          onClose={() => {
            setShowPassword(false);
            setIsManualChange(false);
          }}
        />
      )}

      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="logout-dialog">
          <DialogHeader className="logout-dialog-header">
            <span className="logout-dialog-icon" aria-hidden="true">
              <AlertTriangle size={20} />
            </span>
            <span>
              <DialogTitle>Confirm Logout</DialogTitle>
              <DialogDescription>Are you sure you want to log out?</DialogDescription>
            </span>
          </DialogHeader>
          <p className="logout-dialog-copy">
            You will be signed out of your Natobotics HRMS account. Any unsaved changes will be lost.
          </p>
          <DialogFooter className="logout-dialog-actions">
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Stay Logged In
            </Button>
            <Button variant="destructive" className="logout-dialog-confirm" onClick={handleLogout}>
              <LogOut size={15} /> Yes, Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brand */}
      <div className="header-brand">
        <img
          src="/assets/images/natobotics-logo.png"
          alt="Logo"
          className="header-logo"
        />

        <span className="header-brand-name">
          Nato<span>botics</span>
        </span>
      </div>

      <div className="header-right">

        {/* Clock button */}
        {!isDeizeisau && (
          <Button
            type="button"
            variant={clockedIn ? "secondary" : "default"}
            size="lg"
            className={`clock-btn ${
              clockedIn
                ? "clock-btn-active"
                : "clock-btn-idle"
            }`}
            onClick={handleClock}
            disabled={loading}
            aria-label={clockedIn ? "Clock out" : "Clock in"}
          >
            {clockedIn ? (
              <>
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.85,
                  }}
                >
                  {formatDate(
                    clockInTime
                  )}
                </span>

                <span
                  style={{
                    fontSize: 13,
                    letterSpacing:
                      "0.05em",
                  }}
                >
                  {formatTime(timer)}
                </span>
              </>
            ) : (
              "Clock In"
            )}
          </Button>
        )}

        {/* User info */}
        <div className="header-user-info">
          <div className="header-user-name">
            {firstName} {lastName}
          </div>

          <div className="header-user-role">
            {employeeRole}
          </div>
        </div>

        {/* Avatar + dropdown */}
        <div className="profile-menu-anchor" ref={menuRef}>
          <button
            type="button"
            className="profile-menu-trigger"
            aria-label="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            <Avatar className="header-avatar">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <ChevronDown
              size={13}
              color="var(--text-muted)"
              style={{
                transition:
                  "transform 0.2s",
                transform: menuOpen
                  ? "rotate(180deg)"
                  : "",
              }}
            />
          </button>

          {menuOpen && (
            <div className="profile-menu" role="menu">
              {/* User header */}
              <div className="profile-menu-header">
                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 10,
                  }}
                >
                  <div className="profile-menu-avatar" aria-hidden="true">
                    {initials}
                  </div>

                  <div>
                    <div className="profile-menu-name">
                      {firstName} {lastName}
                    </div>

                    <div className="profile-menu-meta">
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
                  action: () => {
                    navigate("/view-employee");
                    setMenuOpen(false);
                  },
                },
                {
                  icon: <Key size={15} />,
                  label: "Change Password",
                  action: () => {
                    setIsManualChange(true);
                    setShowPassword(true);
                    setMenuOpen(false);
                  },
                },
              ].map((item, i) => (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  className="profile-menu-item"
                  onClick={item.action}
                >
                  <span className="profile-menu-item-icon">
                    {item.icon}
                  </span>

                  {item.label}
                </button>
              ))}

              <div
                style={{
                  borderTop:
                    "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="profile-menu-item profile-menu-item-danger"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                >
                  <LogOut size={15} />
                  Logout
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
