import { fireEvent, render, screen } from "@testing-library/react";
import { FormDate, FormCheckbox, FormInput } from "./FormComponents";

test("date picker respects limits and emits the existing ISO change event", () => {
  const onChange = vi.fn();
  render(<FormDate label="Start date" value="2026-11-12" min="2026-11-10" max="2026-11-15" onChange={onChange}/>);
  fireEvent.click(screen.getByRole("button", { name: "Start date" }));
  const day = date => document.querySelector(`button[data-day="${new Date(2026, 10, date).toLocaleDateString()}"]`);
  expect(day(9)).toBeDisabled();
  expect(day(16)).toBeDisabled();
  fireEvent.click(day(13));
  expect(onChange).toHaveBeenCalledWith({ target: { value: "2026-11-13" } });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("shared checkbox can be toggled from its label", () => {
  const onChange = vi.fn();
  render(<FormCheckbox label="Receive updates" checked={false} onChange={onChange}/>);
  fireEvent.click(screen.getByText("Receive updates"));
  expect(onChange).toHaveBeenCalledWith(true);
});

test("shared input associates its label and validation message", () => {
  render(<FormInput label="Project name" error="Enter a name"/>);
  expect(screen.getByLabelText("Project name")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Project name")).toHaveAccessibleDescription("Enter a name");
});
