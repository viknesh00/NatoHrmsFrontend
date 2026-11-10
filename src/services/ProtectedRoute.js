import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "./Auth";

const ProtectedRoute = ({ children }) => {
    const location = useLocation();

    return isAuthenticated()
      ? children
      : <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
