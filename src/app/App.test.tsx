import { render, screen } from '@testing-library/react';
import App from "./App";

// Keep the worker-backed assistant out of the router smoke tests.
vi.mock("../features/Chat/Chat", () => ({ default: () => <div>HR Assistant</div> }));
vi.mock("../shared/services/Apiservice", () => ({
  getRequest: vi.fn().mockResolvedValue({ data: [] }),
  postRequest: vi.fn(),
  postPublicRequest: vi.fn(),
  putRequest: vi.fn(),
  deleteRequest: vi.fn(),
}));

test('renders sign in for a visitor', async () => {
  window.history.replaceState({}, '', '/');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
});

test('redirects a visitor opening a protected URL to sign in', async () => {
  window.history.replaceState({}, '', '/employees/edit-employee/test@example.com');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/login');
});

test('keeps the employee details form public', async () => {
  window.history.replaceState({}, '', '/employee-details');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Submit' }, { timeout: 10000 })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/employee-details');
  expect(screen.queryByRole('heading', { name: 'Welcome back' })).not.toBeInTheDocument();
});
