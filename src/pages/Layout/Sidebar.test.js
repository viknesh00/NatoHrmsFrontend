import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Sidebar from "./Sidebar";
import ProtectedRoute from "../../services/ProtectedRoute";
import { clearSession, isAuthenticated } from "../../services/Auth";
import { setCookie } from "../../services/Cookies";

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  setCookie("isLoggedIn", true);
  setCookie("token", "test-token");
  setCookie("role", "Employee");
});

afterEach(() => {
  clearSession();
  jest.restoreAllMocks();
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
