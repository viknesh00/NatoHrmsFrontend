import { useState, useRef, useEffect, useCallback } from "react";
import { LogOut, AlertTriangle, Menu, Clock, MapPin, Search, ArrowRight, CircleHelp, Bell, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getCookie, setCookie } from "../../auth/Cookies";
import { clearSession } from "../../auth/Auth";
import PasswordChange from "../../shared/services/PasswordChange";
import { useNavigate } from "react-router-dom";
import { refreshUserCookies } from "./Layout";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import LoadingMask from "../../shared/services/LoadingMask";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import { Button } from "../../components/ui/button";
import ProfileAvatar from "../../components/ProfileAvatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../../components/ui/input-group";
import { getVisibleMenuItems } from "../../auth/navigation";
import { fetchHRMSNotifications, getReadNotificationIds, type HRMSNotification } from "../../features/Notifications/notificationService";
import { useTheme } from "../../theme/ThemeProvider";
import { ChatWidgetLauncher } from "../../features/Chat/ChatWidget";

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

/** Approximate cache-only fallback; never used to authorize or submit a clock action. */
const fetchCityFromIp = async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      return data.city || "Unknown";
    }
  } catch {
    // Leave the cached location unknown when IP lookup is unavailable.
  }
  return "Unknown";
};

const MAX_CLOCK_LOCATION_ACCURACY_METERS = 50;

/** Read a fresh high-accuracy fix, then briefly refine coarse readings via watchPosition. */
const getAccurateCoords = () =>
  new Promise<{ lat: number; lon: number; accuracy: number } | null>((resolve) => {
    if (!navigator.geolocation?.getCurrentPosition) return resolve(null);

    let watchId: number | null = null;
    let settled = false;
    let bestFix: { lat: number; lon: number; accuracy: number } | null = null;
    let refinementTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const finish = (fix: typeof bestFix) => {
      if (settled) return;
      settled = true;
      if (refinementTimeoutId) clearTimeout(refinementTimeoutId);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      resolve(fix);
    };
    const acceptFix = ({ coords }: GeolocationPosition) => {
      const fix = { lat: coords.latitude, lon: coords.longitude, accuracy: coords.accuracy };
      if (!Number.isFinite(fix.lat) || !Number.isFinite(fix.lon) || !Number.isFinite(fix.accuracy)) return;
      if (!bestFix || fix.accuracy < bestFix.accuracy) bestFix = fix;
      if (bestFix.accuracy <= MAX_CLOCK_LOCATION_ACCURACY_METERS) {
        finish(bestFix);
        return;
      }
      if (watchId === null && navigator.geolocation.watchPosition) {
        watchId = navigator.geolocation.watchPosition(
          acceptFix,
          () => finish(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
        );
        refinementTimeoutId = setTimeout(() => finish(null), 6000);
      }
    };

    try {
      navigator.geolocation.getCurrentPosition(acceptFix, () => finish(null), {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      });
    } catch {
      finish(null);
    }
  });

/** A short, non-blocking confirmation tone for successful clock actions. */
const playClockConfirmation = () => {
  try {
    const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.17);
    oscillator.onended = () => { void context.close(); };
  } catch {
    // Audio is optional; clock actions must work when audio is unavailable.
  }
};

/**
 * Resolve a fresh browser GPS fix and reverse geocode its locality.
 * IP location is intentionally excluded from clock actions because it is not a precise fix.
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

  if (!coords) return null;
  const locality = await resolveLocalityFromCoords(coords.lat, coords.lon);

  return {
    location: locality,
    lat: coords.lat,
    lon: coords.lon,
    accuracy: coords.accuracy,
    source: "GPS",
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

const Header = ({ onMenuClick = () => { }, navOpen = false }: Record<string, any>) => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { theme, toggleTheme } = useTheme();
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [notificationItems, setNotificationItems] = useState<HRMSNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Clock state
  const [clockedIn, setClockedIn] = useState(false);
  const [timer, setTimer] = useState(0);
  const [clockInTime, setClockInTime] = useState(null);

  const intervalRef = useRef(null);

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(
    getCookie("isDefaultPasswordChanged") === "false"
  );

  const [
    showLogoutConfirm,
    setShowLogoutConfirm,
  ] = useState(false);

  // User info from cookies
  const firstName =
    getCookie("firstName") || "";

  const lastName =
    getCookie("lastName") || "";

  const employeeRole =
    getCookie("role") || "";
  const userEmail = getCookie("email") || "";

  const isDeizeisau =
    (getCookie("department") || "")
      .trim()
      .toLowerCase() === "deizeisau";

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const searchItems = [
    ...getVisibleMenuItems(employeeRole, getCookie("department") || ""),
    { to: "/help-center", label: "Help Center", icon: <CircleHelp size={18} />, roles: [employeeRole] },
    { to: "/notifications", label: "Notifications", icon: <Bell size={18} />, roles: [employeeRole] },
    { to: "/view-employee", label: "My Profile", icon: <ProfileAvatar seed={getCookie("email")} initials={initials} className="global-search-profile-icon" />, roles: [employeeRole] },
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.to === item.to) === index);
  const matchingSearchItems = searchItems
    .filter((item) => item.label.toLocaleLowerCase().includes(globalSearchQuery.trim().toLocaleLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShowGlobalSearch(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    let active = true;
    const refreshNotifications = () => {
      fetchHRMSNotifications().then((items) => {
        if (!active) return;
        setNotificationItems(items);
        const read = getReadNotificationIds(userEmail);
        setUnreadNotificationCount(items.filter((item) => !read.has(item.id)).length);
      }).catch(() => {});
    };
    refreshNotifications();
    const intervalId = window.setInterval(refreshNotifications, 5 * 60 * 1000);
    window.addEventListener("focus", refreshNotifications);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshNotifications);
    };
  }, [userEmail]);

  useEffect(() => {
    const refreshUnreadCount = () => {
      const read = getReadNotificationIds(userEmail);
      setUnreadNotificationCount(notificationItems.filter((item) => !read.has(item.id)).length);
    };
    window.addEventListener("hrms:notifications-read", refreshUnreadCount);
    return () => window.removeEventListener("hrms:notifications-read", refreshUnreadCount);
  }, [notificationItems, userEmail]);

  const openSearchResult = (path: string) => {
    setShowGlobalSearch(false);
    setGlobalSearchQuery("");
    navigate(path);
  };

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
  // Clock In / Clock Out
  // -------------------------------------------------------------------------

  const handleClock = async () => {
    setLoading(true);

    try {
      // Resolve the device GPS fix before any non-location network request.
      const locationData = await fetchLocation();

      if (
        !locationData ||
        locationData.source !== "GPS" ||
        locationData.accuracy > MAX_CLOCK_LOCATION_ACCURACY_METERS ||
        typeof locationData.lat !== "number" ||
        typeof locationData.lon !== "number"
      ) {
        ToastError(`Allow precise location access (within ${MAX_CLOCK_LOCATION_ACCURACY_METERS} m) to clock in or out.`);
        return;
      }

      const ip = await fetchIp();

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
        now.getTime() -
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
        playClockConfirmation();
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
    clearSession();

    navigate("/login", { replace: true });

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
          isManualChange={false}
          onSuccess={() => {
            setShowPassword(false);
          }}
          onClose={() => {
            setShowPassword(false);
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

      <Dialog open={showGlobalSearch} onOpenChange={(open) => { setShowGlobalSearch(open); if (!open) setGlobalSearchQuery(""); }}>
        <DialogContent className="global-search-dialog" aria-describedby="global-search-description">
          <DialogHeader>
            <DialogTitle>Search Natobotics HRMS</DialogTitle>
            <DialogDescription id="global-search-description">Find a page available to your role. Press Ctrl+K or ⌘K to open search.</DialogDescription>
          </DialogHeader>
          <InputGroup className="global-search-input">
            <InputGroupInput autoFocus aria-label="Search pages" placeholder="Search pages…" value={globalSearchQuery} onChange={(event) => setGlobalSearchQuery(event.target.value)} />
            <InputGroupAddon align="inline-start"><Search size={17} aria-hidden="true" /></InputGroupAddon>
            <InputGroupAddon align="inline-end"><kbd>ESC</kbd></InputGroupAddon>
          </InputGroup>
          <div className="global-search-results" role="group" aria-label="Search results">
            {matchingSearchItems.length ? matchingSearchItems.map((item) => (
              <button key={item.to} type="button" className="global-search-result" onClick={() => openSearchResult(item.to)}>
                <span className="global-search-result-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                <ArrowRight size={14} className="global-search-result-arrow" aria-hidden="true" />
              </button>
            )) : <p className="global-search-empty" role="status">No matching pages found.</p>}
          </div>
          <div className="global-search-footer"><span>Search pages and sections</span><kbd>Ctrl K</kbd></div>
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

        <Button variant="outline" type="button" className="header-search-trigger" onClick={() => setShowGlobalSearch(true)} aria-label="Search pages">
          <Search size={16} aria-hidden="true" /><span>Search pages and sections</span><kbd>⌘K</kbd>
        </Button>
        {/* Clock button */}
        {!isDeizeisau && (
          <Button asChild type="button" variant={clockedIn ? "destructive" : "default"} size="lg">
            <motion.button
              type="button"
              layout
              whileHover={prefersReducedMotion || loading ? undefined : { scale: 1.005 }}
              whileTap={prefersReducedMotion || loading ? undefined : { scale: 0.98 }}
              transition={{ layout: { duration: prefersReducedMotion ? 0 : 0.2 }, scale: { duration: 0.14 } }}
              className={`clock-btn ${clockedIn ? "clock-btn-active" : "clock-btn-idle"}`}
              onClick={handleClock}
              disabled={loading}
              title={clockedIn && clockInTime ? `Clocked in ${formatDate(clockInTime)}` : undefined}
              aria-label={clockedIn ? `Clock out. Elapsed time ${formatTime(timer)}` : "Clock in"}
            >
              <span className="clock-btn-icon" aria-hidden="true">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={clockedIn ? "clock-out-icon" : "clock-in-icon"}
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.7, rotate: -12 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.7, rotate: 12 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
                  >
                    {clockedIn ? <MapPin size={18} strokeWidth={2.2} /> : <MapPin size={18} strokeWidth={2.2} />}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="clock-btn-copy">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={clockedIn ? "clock-out-copy" : "clock-in-copy"}
                    className="clock-btn-content"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
                  >
                    <span className="clock-btn-title">{clockedIn ? "Clock Out" : "Clock In"}</span>
                    {clockedIn && <span className="clock-btn-meta"><Clock size={11} aria-hidden="true" />{formatTime(timer)}</span>}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.button>
          </Button>
        )}

        <ChatWidgetLauncher />
        <Button variant="ghost" size="icon" type="button" className="header-notifications-trigger" aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ""}`} title="Notifications" onClick={() => navigate("/notifications")}>
          <Bell size={18} aria-hidden="true" />
          {unreadNotificationCount > 0 && <span className="header-notifications-count" aria-hidden="true">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>}
        </Button>
        <Button variant="ghost" size="icon" type="button" className="header-help-trigger" aria-label="Open Help Center" title="Help Center" onClick={() => navigate("/help-center")}>
          <CircleHelp size={19} aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" type="button" className="header-theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={toggleTheme}>
          {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </Button>

        {/* User info */}
        <div className="header-user-info">
          <div className="header-user-name">
            {firstName} {lastName}
          </div>

          <div className="header-user-role">
            {employeeRole}
          </div>
        </div>

        {/* Avatar links directly to the current user's profile. */}
        <div className="profile-menu-anchor">
          <Button variant="ghost"
            type="button"
            className="profile-menu-trigger"
            aria-label="View profile"
            onClick={() => navigate("/view-employee")}
          >
            <ProfileAvatar seed={getCookie("email")} initials={initials} className="header-avatar" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
