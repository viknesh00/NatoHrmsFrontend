import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getRequest } from "../../services/Apiservice";
import { getCookie, setCookie } from "../../services/Cookies";

export const refreshUserCookies = () => {
  const email = getCookie("email");
  if (!email) return Promise.resolve();
  return getRequest(`User/GetUser/${email}`)
    .then(res => {
      if (!res?.data) return;
      const d = Array.isArray(res.data) ? res.data[0] : res.data;
      if (!d) return;
      if (d.accessRole)  setCookie("role",       d.accessRole);
      if (d.department)  setCookie("department", d.department);
      if (d.firstName)   setCookie("firstName",  d.firstName);
      if (d.lastName)    setCookie("lastName",   d.lastName);
      if (d.email)       setCookie("email",      d.email);
      if (d.employeeId)  setCookie("employeeId", d.employeeId);
      if (d.isDefaultPasswordChanged !== undefined)
        setCookie("isDefaultPasswordChanged", d.isDefaultPasswordChanged);
    })
    .catch(() => {});
};

const Layout = () => {
  // Block render until cookies are fresh so Sidebar reads correct values
  const [userReady, setUserReady] = useState(false);

  useEffect(() => {
    const token = getCookie("token");
    if (!token) { setUserReady(true); return; }

    refreshUserCookies().finally(() => setUserReady(true));
  }, []);

  if (!userReady) return null;

  return (
    <div className="app-wrapper">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="main-content">
          <div className="page-wrap">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;