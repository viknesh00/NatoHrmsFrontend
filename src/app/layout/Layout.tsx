import ChatWidget from "../../features/Chat/ChatWidget";
import { useAppStore } from "../../store/useAppStore";
import React, { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getRequest } from "../../shared/services/Apiservice";
import { getCookie, setCookie } from "../../auth/Cookies";
import LoadingMask from "../../shared/services/LoadingMask";
import BirthdayCelebration from "./BirthdayCelebration";
import { isBirthday } from "../../theme/dayPeriod";
import { useTheme } from "../../theme/ThemeProvider";

export const refreshUserCookies = () => {
  const email = getCookie("email");
  if (!email) return Promise.resolve(null);
  return getRequest(`User/GetUser/${email}`)
    .then(res => {
      if (!res?.data) return null;
      const d = Array.isArray(res.data) ? res.data[0] : res.data;
      if (!d) return null;
      if (d.accessRole) setCookie("role", d.accessRole);
      if (d.department) setCookie("department", d.department);
      if (d.firstName) setCookie("firstName", d.firstName);
      if (d.lastName) setCookie("lastName", d.lastName);
      if (d.email) setCookie("email", d.email);
      if (d.employeeId) setCookie("employeeId", d.employeeId);
      if (d.isDefaultPasswordChanged !== undefined)
        setCookie("isDefaultPasswordChanged", d.isDefaultPasswordChanged);
      return typeof d.dob === "string" ? d.dob : null;
    })
    .catch(() => null);
};

const Layout = () => {
  // Block render until cookies are fresh so Sidebar reads correct values
  const [userReady, setUserReady] = useState(false);
  const { now } = useTheme();
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [birthdayDismissed, setBirthdayDismissed] = useState("");
  const dateKey = now.toDateString();
  const showBirthday = birthdayDismissed !== dateKey && isBirthday(dateOfBirth, now);
  const mobileNavOpen = useAppStore(state => state.mobileNavOpen);
  const setMobileNavOpen = useAppStore(state => state.setMobileNavOpen);

  useEffect(() => {
    let active = true;
    const root = document.documentElement;
    const syncRolePalette = () => {
      const role = getCookie("role").toLowerCase().replace(/[^a-z]/g, "");
      const rolePalette: Record<string, string> = { admin: "admin", manager: "manager", teamlead: "teamlead", employee: "employee" };
      root.dataset.role = rolePalette[role] || "employee";
    };
    const token = getCookie("token");
    if (!token) { delete root.dataset.role; setUserReady(true); return; }

    void refreshUserCookies().then(dob => {
      if (!active) return;
      syncRolePalette();
      setDateOfBirth(dob);
      setUserReady(true);
    });

    return () => {
      active = false;
      delete root.dataset.role;
    };
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
            {showBirthday && (
              <BirthdayCelebration
                key={dateKey}
                name={getCookie("firstName")}
                profileId={getCookie("employeeId")}
                dateKey={dateKey}
                onDismiss={() => setBirthdayDismissed(dateKey)}
              />
            )}
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
