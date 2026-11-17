import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import dayjs from "dayjs";
import TimesheetCalendar from "./TimesheetCalendar";
import { getRequest } from "../../shared/services/Apiservice";

vi.mock("../../shared/services/LoadingMask", () => ({ default: () => null }));
vi.mock("../../shared/services/Apiservice", () => ({ getRequest: vi.fn(), postRequest: vi.fn() }));
vi.mock("../../auth/Cookies", () => ({ getCookie: () => "" }));
vi.mock("../../shared/services/ToastMsg", () => ({ ToastSuccess: vi.fn(), ToastError: vi.fn() }));

beforeEach(() => {
  vi.mocked(getRequest).mockImplementation(url => Promise.resolve({ status: 200, statusText: "OK", headers: {}, config: { headers: {} as never }, data: url.includes("Leave") ? { leaves: [], holidays: [] } : [] }));
});

async function openCalendar() {
  render(<MemoryRouter><TimesheetCalendar /></MemoryRouter>);
  await waitFor(() => expect(getRequest).toHaveBeenCalled());
}

test("switches between month, week, and agenda while preserving date restrictions", async () => {
  await openCalendar();
  const monthRows = screen.getAllByRole("row").length;
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Week" }), { button: 0, ctrlKey: false });
  expect(screen.getByRole("tab", { name: "Week" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getAllByRole("row")).toHaveLength(2);
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Agenda" }), { button: 0, ctrlKey: false });
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(document.querySelectorAll(".calendar-agenda-row")).toHaveLength(dayjs().daysInMonth());
  expect(screen.queryByRole("button", { name: `Log hours for ${dayjs().add(1, "day").format("DD MMMM YYYY")}` })).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Month" }), { button: 0, ctrlKey: false });
  expect(screen.getAllByRole("row")).toHaveLength(monthRows);
});

test("returns to the current month and disables forward navigation", async () => {
  await openCalendar();
  expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
  expect(screen.getByRole("button", { name: "Next month" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Today" }));
  expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
});
