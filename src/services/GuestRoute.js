import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getLoginRedirect, isAuthenticated } from "./Auth";

export default function GuestRoute({ children }) {
  const location = useLocation();
  return isAuthenticated()
    ? <Navigate to={getLoginRedirect(location.state?.from)} replace />
    : children;
}
