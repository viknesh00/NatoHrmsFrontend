import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = () => {
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
