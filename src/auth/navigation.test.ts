import { getVisibleMenuItems } from './navigation';
const paths = (role: string, department: string) => getVisibleMenuItems(role, department).map(item => item.to);
test('retains administrator access regardless of department', () => {
  expect(paths('Admin', 'Onboarding')).toContain('/dashboard');
  expect(paths('Admin', 'Onboarding')).toContain('/employees');
});
test('retains employee department restrictions', () => {
  const onboarding = paths('Employee', 'Onboarding');
  expect(onboarding).toContain('/dashboard');
  expect(onboarding).toContain('/onboarding');
  expect(onboarding).not.toContain('/attendance');
  expect(onboarding).not.toContain('/employees');
  expect(paths('Employee', 'deizeisau')).not.toContain('/attendance');
  expect(paths('Employee', 'Engineering')).not.toContain('/employees');
});
test('keeps the assistant in the floating widget instead of sidebar navigation', () => {
  expect(paths('Employee', 'Engineering')).not.toContain('/chat');
});
