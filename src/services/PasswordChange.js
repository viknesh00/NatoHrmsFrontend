import React, { useState, useEffect } from "react";
import { Paper, Typography, Button, LinearProgress, Box, CircularProgress } from "@mui/material";
import { setCookie } from "./Cookies";
import PasswordField from "../Fields/PasswordField";
import { ToastError, ToastSuccess } from "./ToastMsg";
import { postRequest } from "./Apiservice";
import LoadingMask from "./LoadingMask";

const PasswordChange = ({ onSuccess, isManualChange = false, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [retypePassword, setRetypePassword] = useState("");
    const [strength, setStrength] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setCurrentPassword("");
        setNewPassword("");
        setRetypePassword("");
    }, [isManualChange]);

    // Password strength calculation
    useEffect(() => {
        let score = 0;
        if (newPassword.length >= 6) score += 1;
        if (/[A-Z]/.test(newPassword)) score += 1;
        if (/[0-9]/.test(newPassword)) score += 1;
        if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
        setStrength(score);
    }, [newPassword]);

    const getStrengthColor = () => {
        switch (strength) {
            case 0:
            case 1:
                return "error";
            case 2:
                return "warning";
            case 3:
                return "info";
            case 4:
                return "success";
            default:
                return "primary";
        }
    };

    const handleUpdate = async () => {
        if (!currentPassword && !newPassword && !retypePassword) {
            ToastError("Please fill in all password fields!");
            return;
        }
        if (!currentPassword) {
            ToastError("Please enter your current password!");
            return;
        }
        if (currentPassword === newPassword) {
            ToastError("New password cannot be the same as the current password!");
            return;
        }
        if (newPassword !== retypePassword) {
            ToastError("Passwords do not match!");
            return;
        }

        let data = { currentPassword, newPassword };
        setLoading(true);
        postRequest("Account/ChangePassword", data)
            .then((res) => {
                if (res.status === 200) {
                    setCookie(
                        "isDefaultPasswordChanged",
                        true,
                        new Date(new Date().setDate(new Date().getDate() + 1))
                    );
                    ToastSuccess("Password updated successfully!");
                    setCurrentPassword("");
                    setNewPassword("");
                    setRetypePassword("");
                    setLoading(false);
                    onSuccess && onSuccess();
                }
            })
            .catch((err) => {
                setLoading(false);
                console.error("Password change error:", err);
                ToastError(err.response?.data?.message || "Error updating password");
            });
    };

    const handleCancel = () => {
        setCurrentPassword("");
        setNewPassword("");
        setRetypePassword("");
        onClose && onClose();
    };

    return (
        <>
            <LoadingMask loading={loading} />

            {/* Full-screen overlay */}
            <Box
                sx={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "rgba(0,0,0,0.3)",
                    zIndex: 1200,
                }}
            />

            <Paper
                elevation={6}
                sx={{
                    width: 400,
                    p: 4,
                    borderRadius: 3,
                    textAlign: "center",
                    backdropFilter: "blur(10px)",
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 1301, // above overlay
                    backgroundColor: "background.paper",
                }}
            >
                <Typography variant="h5" sx={{ mb: 1, fontWeight: "bold" }}>
                    {isManualChange ? "Change Your Password" : "Reset Your Password"}
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
                    {isManualChange
                        ? "You can update your password here."
                        : "Please reset your password upon your first login."}
                </Typography>

                <PasswordField
                    label="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <PasswordField
                    label="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />
                <Box>
                    <LinearProgress
                        variant="determinate"
                        value={(strength / 4) * 100}
                        color={getStrengthColor()}
                        sx={{ height: 5, borderRadius: 2, mt: 1 }}
                    />
                </Box>
                <PasswordField
                    label="Retype New Password"
                    value={retypePassword}
                    onChange={(e) => setRetypePassword(e.target.value)}
                />

                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
                    {isManualChange && (
                        <Button variant="outlined" onClick={handleCancel} disabled={loading}>
                            Cancel
                        </Button>
                    )}
                    <Button variant="contained" color="primary" onClick={handleUpdate} disabled={loading}>
                        {loading ? <CircularProgress size={24} color="inherit" /> : "Update"}
                    </Button>
                </Box>
            </Paper>
        </>
    );
};

export default PasswordChange;
