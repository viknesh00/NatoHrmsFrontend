import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Login from "./Login";
import { postPublicRequest } from "../../services/Apiservice";
import { clearSession, isAuthenticated } from "../../services/Auth";
import { ToastError } from "../../services/ToastMsg";

jest.mock("../../services/Apiservice", () => ({ postPublicRequest: jest.fn() }));
jest.mock("../../services/ToastMsg", () => ({ ToastError: jest.fn(), ToastSuccess: jest.fn() }));

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  clearSession();
});

afterEach(() => {
  clearSession();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

function Destination() {
  const { pathname, search, hash } = useLocation();
  return <div>{pathname}{search}{hash}</div>;
}

function renderLogin() {
  render(
    <MemoryRouter initialEntries={[{
      pathname: "/login",
      state: { from: { pathname: "/leave", search: "?page=2", hash: "#request" } },
    }]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/leave" element={<Destination />} />
      </Routes>
    </MemoryRouter>
  );
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

test("signs in and resumes the requested route", async () => {
  postPublicRequest.mockResolvedValue({
    status: 200,
    data: {
      token: "test-token",
      role: "Employee",
      department: "Engineering",
      expiration: new Date(Date.now() + 3600000).toISOString(),
    },
  });
  renderLogin();
  expect(await screen.findByText("/leave?page=2#request")).toBeInTheDocument();
  expect(isAuthenticated()).toBe(true);
  expect(postPublicRequest).toHaveBeenCalledWith("Auth/Login", { username: "person@example.com", password: "password" });
});

test("keeps failed credentials on the login form with an error", async () => {
  postPublicRequest.mockRejectedValue({ response: { status: 401, data: { message: "Invalid credentials" } } });
  renderLogin();
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeEnabled();
  expect(ToastError).toHaveBeenCalledWith("Invalid credentials");
  expect(isAuthenticated()).toBe(false);
});
