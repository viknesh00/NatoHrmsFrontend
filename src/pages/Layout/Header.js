import React, { useState, useRef, useEffect } from "react";
import { Button, Menu, MenuItem, ListItemIcon, Box, Typography, Divider, Avatar } from "@mui/material";
import { User, Key, LogOut } from "lucide-react";
import { makeStyles } from "@material-ui/core/styles";
import { cookieKeys, getCookie, setCookie } from "../../services/Cookies";
import { cookieObj } from "../../models/cookieObj";
import PasswordChange from "../../services/PasswordChange";
import { useNavigate } from "react-router-dom";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";

const useStyles = makeStyles({
  button: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    width: "100%",
    padding: "6px 10px",
  },
  dateText: {
    fontSize: "12px",
    fontWeight: "bold",
  },
  timerText: {
    fontSize: "14px",
    fontWeight: "bold",
  },
});

const Header = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const [clockedIn, setClockedIn] = useState(false);
  const [timer, setTimer] = useState(0);
  const [clockInTime, setClockInTime] = useState(null);
  const intervalRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(getCookie("isDefaultPasswordChanged") === "false");
  const [isManualChange, setIsManualChange] = useState(false);

  const firstName = getCookie("firstName") || "";
  const lastName = getCookie("lastName") || "";
  const employeeId = getCookie("employeeId") || "";
  const employeeRole = getCookie("role") || "";

  /* ================= TIMER CORE LOGIC ================= */

  const updateTimer = (clockTime) => {
    const elapsedSeconds = Math.floor((new Date() - clockTime) / 1000);
    setTimer(elapsedSeconds);
  };

  useEffect(() => {
    const fetchClockStatus = async () => {
      const url = "Attendance/CheckClock-In";
      const res = await getRequest(url);

      if (res.status === 200 && res.data.clockIn) {
        const serverClockTime = new Date(res.data.clockIn);

        setClockedIn(true);
        setClockInTime(serverClockTime);
        updateTimer(serverClockTime);

        clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
          updateTimer(serverClockTime);
        }, 1000);
      } else {
        clearInterval(intervalRef.current);
        setClockedIn(false);
        setClockInTime(null);
        setTimer(0);
      }
    };

    fetchClockStatus();

    return () => clearInterval(intervalRef.current);
  }, []);

  /* Sync timer immediately when user returns to tab */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && clockInTime) {
        updateTimer(clockInTime);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [clockInTime]);

  /* ================= GEO + IP ================= */

  const fetchIpAddress = async () => {
    try {
      const res = await fetch("https://api64.ipify.org?format=json");
      const data = await res.json();
      return data.ip;
    } catch (err) {
      console.error("IP fetch error:", err);
      return null;
    }
  };

  const fetchLocation = async () => {
    if (!navigator.geolocation) return { city: "Unknown" };

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await res.json();
            resolve({ city: data.city || data.locality || "Unknown" });
          } catch {
            resolve({ city: "Unknown" });
          }
        },
        () => resolve({ city: "Unknown" }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  /* ================= CLOCK IN / OUT ================= */

  const handleClock = async () => {
    setLoading(true);

    try {
      const ip = await fetchIpAddress();
      const location = await fetchLocation();
      const now = new Date();

      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now - tzOffset).toISOString().slice(0, -1);

      const payload = {
        location: location?.city || "Unknown",
        ipAddress: ip,
        timestamp: localISOTime
      };

      const url = clockedIn ? "Attendance/clock-out" : "Attendance/clock-in";

      const res = await postRequest(url, payload);

      if (res.status === 200) {
        if (!clockedIn) {
          setClockedIn(true);
          setClockInTime(now);
          updateTimer(now);

          intervalRef.current = setInterval(() => {
            updateTimer(now);
          }, 1000);

          setCookie("clockInTime", now, new Date(new Date().setDate(new Date().getDate() + 1)));
          ToastSuccess("Clock-In successful!");
        } else {
          clearInterval(intervalRef.current);
          setClockedIn(false);
          setClockInTime(null);
          setTimer(0);

          setCookie("clockInTime", null, new Date(0));
          ToastSuccess("Clock-Out successful!");
        }
      }
    } catch (err) {
      console.error("Clock error:", err);
      ToastError("Attendance action failed!");
    } finally {
      setLoading(false);
    }
  };

  /* ================= HELPERS ================= */

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date) => {
    return date?.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) || "";
  };

  /* ================= ACCOUNT ================= */

  const handleAccountClick = (e) => setAnchorEl(e.currentTarget);
  const handleAccountClose = () => setAnchorEl(null);

  const handleManualPasswordChange = () => {
    setIsManualChange(true);
    setShowPassword(true);
    handleAccountClose();
  };

  const handleLogout = () => {
    cookieKeys(cookieObj, 0);
    navigate("/login");
  };

  /* ================= UI ================= */

  return (
    <header className="header">
      <LoadingMask loading={loading} />

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

      <div className="header-left">
        <img src="/assets/images/natobotics-logo.png" alt="Logo" className="header-logo" />
        <div className="header-text">
          Nato<span>botics</span>
        </div>
      </div>

      <div className="header-right">
        <Button
          variant="contained"
          color={clockedIn ? "success" : "primary"}
          onClick={handleClock}
          className={classes.button}
        >
          {clockedIn ? (
            <>
              <span className={classes.dateText}>{formatDate(clockInTime)}</span>
              <span className={classes.timerText}>{formatTime(timer)}</span>
            </>
          ) : (
            "Clock In"
          )}
        </Button>

         <Box sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <Typography sx={{ fontSize: "0.9rem", color: "#111" }}>
            {firstName} {lastName}
          </Typography>
          <Typography sx={{ fontWeight: "500", fontSize: "0.9rem", color: "#555" }}>
            {employeeRole}
          </Typography>
        </Box>

        {/* Account icon replaced with Avatar */}
        <div onClick={handleAccountClick} style={{ cursor: "pointer", marginLeft: 10 }}>
          <Avatar
            sx={{
              background: "linear-gradient(135deg, #1565c0 0%, #f55742 50%, #f9d890 100%)",
              width: 40,
              height: 40,
              fontSize: "1rem",
              color: "#fff" // optional: ensures text is visible
            }}
          >
            {firstName.charAt(0).toUpperCase()}
          </Avatar>
        </div>

        {/* Account Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleAccountClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" color="textSecondary">
              Hi,
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {firstName} {lastName}
            </Typography>
            <Typography variant="body3" color="textSecondary">
              {employeeId}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { handleAccountClose(); navigate("/view-employee") }}>
            <ListItemIcon>
              <User size={18} />
            </ListItemIcon>
            View Profile
          </MenuItem>
          <MenuItem onClick={handleManualPasswordChange}>
            <ListItemIcon>
              <Key size={18} />
            </ListItemIcon>
            Change Password
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogOut size={18} />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
};

export default Header;
