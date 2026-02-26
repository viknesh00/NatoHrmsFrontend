import React, { useEffect, useState } from "react";
import {
    Box,
    Button,
    Typography,
    Paper,
    CircularProgress,
    TextField,
    OutlinedInput,
    LinearProgress,
} from "@mui/material";
import { keyframes } from "@mui/system";
import { useNavigate } from "react-router-dom";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { postRequest } from "../../services/Apiservice";
import PasswordField from "../../Fields/PasswordField";

/* 🔴 Shake animation */
const shake = keyframes`
  0% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
  100% { transform: translateX(0); }
`;

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [otpError, setOtpError] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [strength, setStrength] = useState(0);

    const navigate = useNavigate();

    useEffect(() => {
        let score = 0;
        if (newPassword.length >= 6) score += 1;
        if (/[A-Z]/.test(newPassword)) score += 1;
        if (/[0-9]/.test(newPassword)) score += 1;
        if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
        setStrength(score);
    }, [newPassword]);

    /* ---------- API helper ---------- */

    const callApi = (url, data, successMsg, nextStep) => {
        if (loading) return; // 🚫 prevent multiple calls

        setLoading(true);
        postRequest(url, data)
            .then(() => {
                ToastSuccess(successMsg);
                if (nextStep) setStep(nextStep);
            })
            .catch((err) => {
                ToastError(err?.response?.data?.message || "Something went wrong.");
            })
            .finally(() => setLoading(false));
    };

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

    /* ---------- OTP handlers ---------- */

    const handleOtpChange = (value, index) => {
        if (!/^\d?$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setOtpError(false);

        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }

        if (newOtp.join("").length === 6) {
            handleVerifyOtp(null, newOtp.join(""));
        }
    };

    const handleOtpKeyDown = (e, index) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        const pasted = e.clipboardData.getData("text").slice(0, 6);
        if (!/^\d+$/.test(pasted)) return;

        const newOtp = pasted.split("");
        setOtp([...newOtp, ...Array(6 - newOtp.length).fill("")]);
    };

    /* ---------- Submit handlers ---------- */

    const handleSendOtp = (e) => {
        e.preventDefault();
        if (loading) return;

        if (!email) {
            ToastError("Please enter your registered email address.");
            return;
        }

        callApi("Auth/SendOtp", { email }, "OTP has been sent to your email.", 2);
    };

    const handleVerifyOtp = (e, autoOtp) => {
        if (e) e.preventDefault();
        if (loading) return;

        const finalOtp = autoOtp || otp.join("");
        if (finalOtp.length !== 6) {
            setOtpError(true);
            ToastError("Please enter the 6-digit OTP.");
            return;
        }

        callApi(
            "Auth/VerifyOtp",
            { email, otp: finalOtp },
            "OTP verified successfully.",
            3
        );
    };

    const handleResetPassword = (e) => {
        e.preventDefault();
        if (loading) return;

        if (!newPassword || !confirmPassword) {
            ToastError("Please complete all required fields.");
            return;
        }

        // 🔐 PASSWORD STRENGTH VALIDATION
        if (strength < 4) {
            ToastError(
                "Password must be at least 6 characters and include an uppercase letter, number, and special character."
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            ToastError("Passwords do not match.");
            return;
        }

        callApi(
            "Auth/ResetPassword",
            { email, otp: otp.join(""), newPassword },
            "Your password has been reset successfully."
        );

        setTimeout(() => navigate("/"), 1200);
    };
    /* ---------- UI ---------- */

    const renderOtpInputs = () => (
        <Box
            onPaste={handleOtpPaste}
            sx={{
                display: "flex",
                justifyContent: "center",
                gap: 1.2,
                mt: 2,
                animation: otpError ? `${shake} 0.35s` : "none",
            }}
        >
            {otp.map((digit, index) => (
                <OutlinedInput
                    key={index}
                    id={`otp-${index}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    error={otpError}
                    inputProps={{
                        maxLength: 1,
                        style: {
                            textAlign: "center",
                            fontSize: "18px",
                            padding: "12px 0",
                            width: 44,
                        },
                    }}
                />
            ))}
        </Box>
    );

    const renderContent = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <Typography variant="h5" fontWeight={600}>
                            Forgot Password
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={1}>
                            Enter your registered email address.
                        </Typography>

                        <form onSubmit={handleSendOtp}>
                            <TextField
                                fullWidth
                                type="email"
                                label="Email Address"
                                margin="normal"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            <Button
                                fullWidth
                                type="submit"
                                variant="contained"
                                sx={{ mt: 2 }}
                                disabled={loading}
                            >
                                {loading ? <CircularProgress size={22} /> : "Send OTP"}
                            </Button>
                        </form>
                    </>
                );

            case 2:
                return (
                    <>
                        <Typography variant="h5" fontWeight={600}>
                            Verify OTP
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={1}>
                            Enter the 6-digit code sent to your email.
                        </Typography>

                        <form onSubmit={handleVerifyOtp}>
                            {renderOtpInputs()}

                            <Button
                                fullWidth
                                type="submit"
                                variant="contained"
                                sx={{ mt: 3 }}
                                disabled={loading}
                            >
                                {loading ? <CircularProgress size={22} /> : "Verify OTP"}
                            </Button>
                        </form>
                    </>
                );

            case 3:
                return (
                    <>
                        <Typography variant="h5" fontWeight={600}>
                            Set New Password
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={1}>
                            Create a strong password.
                        </Typography>

                        <form onSubmit={handleResetPassword}>
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
                                label="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />

                            <Button
                                fullWidth
                                type="submit"
                                variant="contained"
                                sx={{ mt: 2 }}
                                disabled={loading}
                            >
                                {loading ? <CircularProgress size={22} /> : "Reset Password"}
                            </Button>
                        </form>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <Box
            sx={{
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background:
                    "linear-gradient(135deg, #1565c0 0%, #f55742 50%, #f9d890 100%)",
            }}
        >
            <Paper sx={{ width: 380, p: 4, borderRadius: 3, textAlign: "center" }}>
                {renderContent()}

                <Typography
                    sx={{
                        mt: 3,
                        cursor: "pointer",
                        fontSize: 14,
                        color: "#1565c0",
                    }}
                    onClick={() => navigate("/")}
                >
                    Back to Login
                </Typography>

                <Typography variant="caption" display="block" mt={3}>
                    © {new Date().getFullYear()} Natobotics. All rights reserved.
                </Typography>
            </Paper>
        </Box>
    );
};

export default ForgotPassword;