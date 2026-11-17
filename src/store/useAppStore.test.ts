import { useAppStore } from './useAppStore';
afterEach(() => useAppStore.getState().reset());
test('shares navigation and widget state without persisting private data', () => {
  useAppStore.getState().toggleSidebar();
  useAppStore.getState().setChatOpen(true);
  expect(useAppStore.getState()).toMatchObject({ sidebarCollapsed: true, chatOpen: true });
  expect(localStorage.length).toBe(0);
  useAppStore.getState().reset();
  expect(useAppStore.getState()).toMatchObject({ sidebarCollapsed: false, chatOpen: false, mobileNavOpen: false });
});
