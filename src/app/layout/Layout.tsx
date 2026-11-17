import ChatWidget from "../../features/Chat/ChatWidget";
import { useAppStore } from "../../store/useAppStore";
import React, { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getRequest } from "../../shared/services/Apiservice";
import { getCookie, setCookie } from "../../auth/Cookies";
import LoadingMask from "../../shared/services/LoadingMask";

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
  const mobileNavOpen = useAppStore(state => state.mobileNavOpen);
  const setMobileNavOpen = useAppStore(state => state.setMobileNavOpen);

  useEffect(() => {
    const syncRolePalette = () => {
      const role = getCookie("role").toLowerCase().replace(/[^a-z]/g, "");
      const rolePalette: Record<string, string> = { admin: "admin", manager: "manager", teamlead: "teamlead", employee: "employee" };
      document.documentElement.dataset.role = rolePalette[role] || "employee";
    };
    const token = getCookie("token");
    if (!token) { document.documentElement.removeAttribute("data-role"); setUserReady(true); return; }

    refreshUserCookies().finally(() => { syncRolePalette(); setUserReady(true); });
  }, []);

  if (!userReady) return <div className="app-wrapper app-bootstrap-loading"><LoadingMask loading layout label="Preparing your workspace" /></div>;

  return (
    <div className="app-wrapper">
      <Header
        navOpen={mobileNavOpen}
        onMenuClick={() => setMobileNavOpen(!mobileNavOpen)}
      />
      <div className="app-body">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <main className="main-content">
          <div className="page-wrap">
            <Suspense fallback={<LoadingMask loading layout label="Loading this page" />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      <ChatWidget />
    </div>
  );
};

export default Layout;
