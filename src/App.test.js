import { render, screen } from '@testing-library/react';
import App from './App';

// Keep the worker-backed assistant out of the router smoke tests.
jest.mock('./pages/Chat/Chat', () => () => <div>HR Assistant</div>);
jest.mock('./services/Apiservice', () => ({
  getRequest: jest.fn().mockResolvedValue({ data: [] }),
  postRequest: jest.fn(),
  postPublicRequest: jest.fn(),
  putRequest: jest.fn(),
  deleteRequest: jest.fn(),
}));

test('renders sign in for a visitor', () => {
  window.history.replaceState({}, '', '/');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
});

test('redirects a visitor opening a protected URL to sign in', async () => {
  window.history.replaceState({}, '', '/employees/edit-employee/test@example.com');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/login');
});

test('keeps the employee details form public', () => {
  window.history.replaceState({}, '', '/employee-details');
  render(<App />);
  expect(window.location.pathname).toBe('/employee-details');
  expect(screen.queryByRole('heading', { name: 'Welcome back' })).not.toBeInTheDocument();
});
