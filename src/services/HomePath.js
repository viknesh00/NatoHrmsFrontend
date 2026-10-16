import React from "react";
import { Navigate } from "react-router-dom";
import { getCookie } from "./Cookies";

// Landing page after login / for unknown URLs.
// Onboarding department users (non-admin) have no Dashboard menu, so they land on Onboarding.
export const getHomePath = () => {
  const role = getCookie("role");
  const dept = (getCookie("department") || "").trim().toLowerCase();
  return role !== "Admin" && dept === "onboarding" ? "/onboarding" : "/dashboard";
};

// Wrap the Dashboard route so Onboarding users typing /dashboard are sent to their own landing page.
export const DashboardGuard = ({ children }) => {
  const home = getHomePath();
  return home === "/dashboard" ? children : <Navigate to={home} replace />;
};
