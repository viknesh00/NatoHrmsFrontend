import React from "react";
import { Navigate } from "react-router-dom";
import { getCookie } from "./Cookies";


const RoleBasedRedirect = () => {
    const role = getCookie("role"); // or get from localStorage if you store it there

    const roleDefaultRoute = {
        "Admin": "/employees",
        "Manager": "/timesheet",
        "Employee": "/timesheet",
    };

    const defaultRoute = roleDefaultRoute[role] || "/dashboard";

    return <Navigate to={defaultRoute} replace />;
};

export default RoleBasedRedirect;
