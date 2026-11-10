import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { clearSession, getLoginRedirect, isAuthenticated } from "./Auth";
import { getCookie, setCookie } from "./Cookies";
import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";

const signIn = (department = "Engineering") => {
  setCookie("isLoggedIn", true);
  setCookie("token", "test-token");
  setCookie("role", "Employee");
  setCookie("department", department);
};

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  clearSession();
});

afterEach(() => {
  clearSession();
  jest.restoreAllMocks();
});

test.each([
  ["", ""],
  ["false", "test-token"],
  ["true", ""],
  ["true", "   "],
])("rejects incomplete sessions (%s, %s)", (flag, token) => {
  setCookie("isLoggedIn", flag);
  setCookie("token", token);
  expect(isAuthenticated()).toBe(false);
});

test("accepts a signed-in session and removes it on logout", () => {
  signIn();
  expect(isAuthenticated()).toBe(true);
  clearSession();
  expect(isAuthenticated()).toBe(false);
  expect(getCookie("token")).toBe("");
  expect(getCookie("role")).toBe("");
});

function LoginDestination() {
  const location = useLocation();
  return <div>{getLoginRedirect(location.state?.from)}</div>;
}

test("preserves a protected deep link including its query and hash", async () => {
  render(
    <MemoryRouter initialEntries={["/employees/edit-employee/person?tab=details#contact"]}>
      <Routes>
        <Route path="/employees/edit-employee/:email" element={<ProtectedRoute><div>Private</div></ProtectedRoute>} />
        <Route path="/login" element={<LoginDestination />} />
      </Routes>
    </MemoryRouter>
  );
  expect(await screen.findByText("/employees/edit-employee/person?tab=details#contact")).toBeInTheDocument();
  expect(screen.queryByText("Private")).not.toBeInTheDocument();
});

test("renders protected content when signed in", () => {
  signIn();
  render(<MemoryRouter><ProtectedRoute><div>Private</div></ProtectedRoute></MemoryRouter>);
  expect(screen.getByText("Private")).toBeInTheDocument();
});

test.each(["/", "/login", "/sign-in", "/forgot-password"])("sends signed-in onboarding users from %s to their home", async (path) => {
  signIn("Onboarding");
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<GuestRoute><div>Sign in</div></GuestRoute>} />
        <Route path="/onboarding" element={<div>Onboarding home</div>} />
      </Routes>
    </MemoryRouter>
  );
  expect(await screen.findByText("Onboarding home")).toBeInTheDocument();
});

test.each(["https://other.example", "//other.example", "/\\other.example", "/login", "/sign-in/", "/forgot-password", "/"])("uses the role home instead of unsafe or auth destination %s", (pathname) => {
  signIn();
  expect(getLoginRedirect({ pathname })).toBe("/dashboard");
});

test("admins in onboarding retain the dashboard home", () => {
  signIn("onboarding");
  setCookie("role", "Admin");
  expect(getLoginRedirect()).toBe("/dashboard");
});
