import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar fixed height */}
        <div
          style={{
            height: "calc(100vh - 80px)", // subtract header height
            flexShrink: 0,
            position: "sticky",
            top: 60, // same as header height
            backgroundColor: "#fff",
            borderRight: "1px solid #ddd",
          }}
        >
          <Sidebar />
        </div>

        {/* Main content scrolls with page */}
        <main
          style={{
            flex: 1,
            padding: "24px",
            backgroundColor: "#f8fafc",
            minWidth: 0, // important for flex items to prevent overflow
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
