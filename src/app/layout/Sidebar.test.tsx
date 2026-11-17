import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Sidebar from "./Sidebar";
import ProtectedRoute from "../../auth/ProtectedRoute";
import { clearSession, isAuthenticated } from "../../auth/Auth";
import { setCookie } from "../../auth/Cookies";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  setCookie("isLoggedIn", true);
  setCookie("token", "test-token");
  setCookie("role", "Employee");
});

afterEach(() => {
  clearSession();
  vi.restoreAllMocks();
});

function openLogout() {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<ProtectedRoute><Sidebar /></ProtectedRoute>} />
        <Route path="/login" element={<h1>Sign in</h1>} />
      </Routes>
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole("button", { name: "Logout" }));
}

test("opens a portalled logout confirmation and focuses cancel", () => {
  openLogout();
  const dialog = screen.getByRole("alertdialog", { name: "Confirm Logout" });
  expect(dialog).toBeVisible();
  expect(dialog.closest("aside")).toBeNull();
  expect(screen.getByRole("button", { name: "Stay Logged In" })).toHaveFocus();
});

test("cancel closes logout and keeps the session", async () => {
  openLogout();
  fireEvent.click(screen.getByRole("button", { name: "Stay Logged In" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(isAuthenticated()).toBe(true);
});

test("confirm clears the session and opens sign in", async () => {
  openLogout();
  fireEvent.click(screen.getByRole("button", { name: "Yes, Logout" }));
  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  expect(isAuthenticated()).toBe(false);
});

test("settings drawer exposes profile and password actions", async () => {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<Sidebar />} />
        <Route path="/view-employee" element={<h1>My Profile</h1>} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(await screen.findByRole("heading", { name: "Profile & settings" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Change Password" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "View Profile" }));
  expect(await screen.findByRole("heading", { name: "My Profile" })).toBeVisible();
});
