import { fireEvent, render, screen } from "@testing-library/react";
import ProTable from "./ProTable";

const rows = [
  { employee: { name: "Asha Rao" }, status: { value: "approved", label: "Approved" }, metrics: [{ score: 7 }] },
  { employee: { name: "Dev Patel" }, status: { value: "pending", label: "Pending" }, metrics: [{ score: 4 }] },
];

const columns = [
  { field: "employee.name", label: "Employee" },
  {
    field: "status",
    label: "Status",
    filterable: true,
    renderCell: (row) => <span>{row.status.label}</span>,
  },
  { id: "score", accessorFn: (row) => row.metrics[0].score, label: "Score" },
];

test("maps nested fields, accessor functions, and object values into cells", () => {
  render(<ProTable columns={columns} data={rows} multiSelect={false} />);

  expect(screen.getByText("Asha Rao")).toBeVisible();
  expect(screen.getByText("Dev Patel")).toBeVisible();
  expect(screen.getByText("Approved")).toBeVisible();
  expect(screen.getByText("Pending")).toBeVisible();
  expect(screen.getByText("7")).toBeVisible();
  expect(screen.getByText("4")).toBeVisible();
});

test("search and generated filters use the mapped raw value for rendered columns", () => {
  render(<ProTable columns={columns} data={rows} multiSelect={false} />);

  fireEvent.change(screen.getByRole("textbox", { name: "Search records" }), { target: { value: "Approved" } });
  expect(screen.getByText("Asha Rao")).toBeVisible();
  expect(screen.queryByText("Dev Patel")).not.toBeInTheDocument();

  fireEvent.change(screen.getByRole("textbox", { name: "Search records" }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "approved" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply Filters" }));

  expect(screen.getByText("Asha Rao")).toBeVisible();
  expect(screen.queryByText("Dev Patel")).not.toBeInTheDocument();
});
