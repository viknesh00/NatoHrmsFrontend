import React from "react";
import { Navigate } from "react-router-dom";
import { getCookie } from "./Cookies";

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = getCookie("isLoggedIn")

    return isAuthenticated ? children : <Navigate to="/" />;
};

export default ProtectedRoute;
