import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { cookieKeys} from "../../services/Cookies";
import { postRequest } from "../../services/Apiservice";
import { cookieObj } from "../../models/cookieObj";
import PasswordField from "../../Fields/PasswordField";


const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const isToday = (dateStr) => {
    if (!dateStr) return false;

    const clockInDate = new Date(dateStr);
    const today = new Date();

    return clockInDate.toDateString() === today.toDateString();
  };


  const handleLogin = (e) => {
    e.preventDefault();

    if (!email || !password) {
      ToastError("Please fill in both fields!");
      return;
    }

    setLoading(true);

    const data = {
      username: email,
      password: password,
    };
    const url = `Auth/Login`;
    postRequest(url, data)
      .then((res) => {
        if (res.status === 200 && res.data?.token) {
          ToastSuccess("Login successful!");
          console.log("Login Successful")
          localStorage.setItem("isLoggedIn", "true");

          const todayClockInTime = isToday(res.data.clockIn) ? res.data.clockIn : "";

          const userData = {
            token: res.data.token,
            isLoggedIn: true,
            email: res.data.email,
            role: res.data.role,
            isDefaultPasswordChanged: res.data.isDefaultPasswordChanged,
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            employeeId: res.data.employeeId,
            clockInTime:todayClockInTime,
          };
          const mergedCookies = { ...cookieObj, ...userData };
          cookieKeys(mergedCookies, new Date(res.data.expiration));

          const roleDefaultRoute = {
            "Admin": "/employees",
            "Manager": "/employees",
            "Employee": "/timesheet",
          };

          const defaultRoute = roleDefaultRoute[res.data.role] || "/dashboard";

          setTimeout(() => {
            navigate(defaultRoute);
          }, 800);
        } else {
          ToastError("Invalid credentials!");
        }
      })
      .catch((err) => {
        ToastError(err.response.data.message);
      })
      .finally(() => setLoading(false));
  };

  return (
    <Box
      sx={{
        height: "100vh",
        background:
          "linear-gradient(135deg, #1565c0 0%, #f55742ff 50%, #f9d890ff 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: 380,
          p: 4,
          borderRadius: 3,
          textAlign: "center",
          backdropFilter: "blur(10px)",
        }}
      ><Typography
          variant="h5"
          sx={{ mb: 1, fontWeight: "bold", color: "#1a1a1a" }}
        >
         Welcome to
        </Typography>
        <Typography
          variant="h5"
          sx={{ mb: 3, fontWeight: "bold", color: "#1a1a1a" }}
        >
         Natobotics HRMS Portal
        </Typography>

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            type="email"
            label="Email ID"
            variant="outlined"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <PasswordField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2, py: 1.2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
          </Button>
        </form>

        <Typography
          variant="caption"
          display="block"
          sx={{ mt: 3, color: "text.disabled" }}
        >
          © Natobotics {new Date().getFullYear()}. All rights reserved.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;
