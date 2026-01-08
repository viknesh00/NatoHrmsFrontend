import React, { useState, useRef, useEffect } from "react";
import { Button, Menu, MenuItem, ListItemIcon, Box, Typography, Divider } from "@mui/material";
import { UserCircle, User, Key, LogOut } from "lucide-react";
import { makeStyles } from "@material-ui/core/styles";
import { cookieKeys, getCookie, setCookie } from "../../services/Cookies";
import { cookieObj } from "../../models/cookieObj";
import PasswordChange from "../../services/PasswordChange";
import { useNavigate } from "react-router-dom";
import { postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { Avatar } from "@mui/material";
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
  const [clockedIn, setClockedIn] = useState(false);
  const [timer, setTimer] = useState(0);
  const [clockInTime, setClockInTime] = useState(null);
  const intervalRef = useRef(null);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(getCookie("isDefaultPasswordChanged") === "false");
  const [isManualChange, setIsManualChange] = useState(false); // true when user clicks menu

  // Get user details from cookies
  const firstName = getCookie("firstName") || "";
  const lastName = getCookie("lastName") || "";
  const employeeId = getCookie("employeeId") || "";
  const employeeRole = getCookie("role") || "";


  useEffect(() => {
    const cookieClockIn = getCookie("clockInTime");
    if (cookieClockIn) {
      const clockTime = new Date(cookieClockIn);
      setClockedIn(true);
      setClockInTime(clockTime);

      const elapsedSeconds = Math.floor((new Date() - clockTime) / 1000);
      setTimer(elapsedSeconds);

      intervalRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
    }

    return () => clearInterval(intervalRef.current);
  }, []);


  const fetchIpAddress = async () => {
    try {
      const res = await fetch("https://api64.ipify.org?format=json");
      const data = await res.json();
      return data.ip;
    } catch (err) {
      console.error("Error fetching IP:", err);
      return null;
    }
  };

  const fetchLocation = async () => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return { city: "Unknown" };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );

            if (!res.ok) throw new Error("Geocode failed");

            const data = await res.json();

            const city =
              data.city ||
              data.locality ||
              data.principalSubdivision ||
              "Unknown";

            resolve({ city });
          } catch (err) {
            console.error("Reverse geocoding failed:", err);
            resolve({ city: "Unknown" });
          }
        },
        (error) => {
          console.warn("Geolocation error:", error.message);
          resolve({ city: "Unknown" });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };





  // Clock In/Out
  // Clock In/Out
  const handleClock = async () => {   // <-- add async here
    setLoading(true);
    const ip = await fetchIpAddress();
    const now = new Date();
    const location = await fetchLocation(); 
    const tzOffset = now.getTimezoneOffset() * 60000; // offset in ms
    const localISOTime = new Date(now - tzOffset).toISOString().slice(0, -1); // remove 'Z'
    let data = {
      location: location?.city || "Unknown",
      ipAddress: ip,
      timestamp: localISOTime
    };
    if (!clockedIn) {
      const url = `Attendance/clock-in`;
      postRequest(url, data)
        .then((res) => {
          if (res.status === 200) {
            const now = new Date();
            setClockedIn(true);
            setClockInTime(now);
            setTimer(0);
            intervalRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
            ToastSuccess("Clock-In successful!"); 
            setLoading(false);
            setCookie(
              "clockInTime",
              now,
              new Date(new Date().setDate(new Date().getDate() + 1))
            );
          }
        })
        .catch((err) => {
          setLoading(false);
          console.error("Login error:", err);
          ToastError("Clock-In failed!"); 
        });
    } else {
      const url = `Attendance/clock-out`;
      postRequest(url, data)
        .then((res) => {
          if (res.status === 200) {
            setClockedIn(false);
            setClockInTime(null);
            setTimer(0);
            clearInterval(intervalRef.current);
            ToastSuccess("Clock-Out successful!"); 
            setLoading(false);
            setCookie("clockInTime", null, new Date(0));
          }
        })
        .catch((err) => {
          setLoading(false);
          console.error("Login error:", err);
          ToastError("Clock-Out failed!"); 
        });
    }
  };


  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  // Account menu handlers
  const handleAccountClick = (event) => setAnchorEl(event.currentTarget);
  const handleAccountClose = () => setAnchorEl(null);

  // When user clicks "Change Password" in menu
  const handleManualPasswordChange = () => {
    setIsManualChange(true);
    setShowPassword(true);
    handleAccountClose();
  };

  const handleLogout = () => {
    cookieKeys(cookieObj, 0);
    navigate("/login");
  };

  return (
    <header className="header">
      <LoadingMask loading={loading} />
      {/* PasswordChange modal */}
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
        {/* Clock In Button */}
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
