import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Attendance from "./Attendance";
import { postRequest } from "../../shared/services/Apiservice";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";

vi.mock("../../shared/services/Apiservice", () => ({ postRequest: vi.fn() }));
vi.mock("../../shared/services/ToastMsg", () => ({ ToastError: vi.fn(), ToastSuccess: vi.fn() }));
vi.mock("../../auth/Cookies", () => ({ getCookie: () => "Admin" }));
vi.mock("../../shared/services/LoadingMask", () => ({ default: ({ loading }) => loading ? <div role="status">Loading attendance</div> : null }));
vi.mock("../../components/FormComponents", async importOriginal => ({
  ...await importOriginal<typeof import("../../components/FormComponents")>(),
  FormDate: ({ label, value, onChange }) => <label>{label}<input type="date" value={value} onChange={onChange} /></label>,
}));

const daily = { slNo: 1, userName: "Asha", type: "Clock In", time: "09:00 AM", department: "Engineering" };
const monthly = { userEmail: "asha@example.test", status: "Present", attendanceDate: "2026-10-15", firstClockIn: "2026-10-15T09:00:00", department: "Engineering" };
const response = (data: unknown) => ({ data, status: 200, statusText: "OK", headers: {}, config: { headers: {} as never } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(postRequest).mockImplementation(endpoint => Promise.resolve(response(endpoint.includes("Monthly") ? [monthly] : [daily])));
});

async function openAttendance() {
  render(<MemoryRouter><Attendance /></MemoryRouter>);
  await screen.findByText("Asha");
}

function filters() {
  fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
}

function apply() {
  fireEvent.click(screen.getByRole("button", { name: "Apply Filters" }));
}

test("keeps the applied daily and monthly dates when switching views", async () => {
  await openAttendance();
  filters();
  fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: "2026-10-15" } });
  apply();
  await waitFor(() => expect(postRequest).toHaveBeenLastCalledWith("Attendance/GetDailyAttendance", { date: "2026-10-15" }));
  fireEvent.click(screen.getByRole("button", { name: "Monthly Log" }));
  await screen.findByText("asha@example.test");
  filters();
  fireEvent.change(screen.getByLabelText("From Date"), { target: { value: "2026-10-01" } });
  fireEvent.change(screen.getByLabelText("To Date"), { target: { value: "2026-10-31" } });
  apply();
  await waitFor(() => expect(postRequest).toHaveBeenLastCalledWith("Attendance/GetMonthlyAttendance", { fromDate: "2026-10-01", toDate: "2026-10-31" }));
  fireEvent.click(screen.getByRole("button", { name: "Daily Log" }));
  await waitFor(() => expect(postRequest).toHaveBeenLastCalledWith("Attendance/GetDailyAttendance", { date: "2026-10-15" }));
  fireEvent.click(screen.getByRole("button", { name: "Monthly Log" }));
  await waitFor(() => expect(postRequest).toHaveBeenLastCalledWith("Attendance/GetMonthlyAttendance", { fromDate: "2026-10-01", toDate: "2026-10-31" }));
});

test("does not carry a daily-only type filter into the monthly table", async () => {
  await openAttendance();
  filters();
  fireEvent.change(screen.getByLabelText("Type"), { target: { value: "Clock In" } });
  apply();
  await screen.findByText("Asha");
  fireEvent.click(screen.getByRole("button", { name: "Monthly Log" }));
  expect(await screen.findByText("asha@example.test")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Remove Type filter" })).not.toBeInTheDocument();
});

test("ignores a late daily response after the monthly view has loaded", async () => {
  let resolveDaily: (value: ReturnType<typeof response>) => void;
  vi.mocked(postRequest).mockImplementation(endpoint => endpoint.includes("Monthly")
    ? Promise.resolve(response([monthly]))
    : new Promise(resolve => { resolveDaily = resolve; }));
  render(<MemoryRouter><Attendance /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Monthly Log" }));
  await screen.findByText("asha@example.test");
  await act(async () => { resolveDaily(response([daily])); });
  expect(screen.getByText("asha@example.test")).toBeInTheDocument();
  expect(screen.queryByText("Asha")).not.toBeInTheDocument();
});

test("refreshes the selected attendance date after a clock action", async () => {
  await openAttendance();
  filters();
  fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: "2026-10-15" } });
  apply();
  await waitFor(() => expect(postRequest).toHaveBeenLastCalledWith("Attendance/GetDailyAttendance", { date: "2026-10-15" }));
  vi.mocked(postRequest).mockResolvedValueOnce(response([{ ...daily, time: "06:00 PM", type: "Clock Out" }]));
  act(() => { window.dispatchEvent(new CustomEvent("attendance:updated")); });
  expect(await screen.findByText("Clock Out")).toBeVisible();
  expect(postRequest).toHaveBeenLastCalledWith("Attendance/GetDailyAttendance", { date: "2026-10-15" });
});

test("shows a recoverable error without reporting a failed filter as successful", async () => {
  await openAttendance();
  vi.mocked(postRequest).mockRejectedValueOnce(new Error("Network unavailable"));
  filters();
  fireEvent.change(screen.getByLabelText("Select Date"), { target: { value: "2026-10-15" } });
  apply();
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load attendance records");
  expect(ToastSuccess).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Asha")).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("rejects invalid monthly ranges without requesting records", async () => {
  await openAttendance();
  fireEvent.click(screen.getByRole("button", { name: "Monthly Log" }));
  await screen.findByText("asha@example.test");
  filters();
  fireEvent.change(screen.getByLabelText("From Date"), { target: { value: "2026-10-31" } });
  fireEvent.change(screen.getByLabelText("To Date"), { target: { value: "2026-10-01" } });
  const count = vi.mocked(postRequest).mock.calls.length;
  apply();
  expect(postRequest).toHaveBeenCalledTimes(count);
  expect(ToastError).toHaveBeenCalledWith("To date must be on or after From date");
});
