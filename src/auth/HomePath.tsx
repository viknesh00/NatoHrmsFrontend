import React from "react";
import { Navigate } from "react-router-dom";

// Dashboard is the landing page for every signed-in role; module visibility is
// controlled by the role-aware navigation and dashboard views.
export const getHomePath = () => {
  return "/dashboard";
};

// Keep direct dashboard access consistent with the post-login landing route.
export const DashboardGuard = ({ children }: Record<string, any>) => {
  const home = getHomePath();
  return home === "/dashboard" ? children : <Navigate to={home} replace />;
};
