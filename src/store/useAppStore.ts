import { create } from 'zustand';

interface AppState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  chatOpen: boolean;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  reset: () => void;
}
const initialState = { sidebarCollapsed: false, mobileNavOpen: false, chatOpen: false };
// UI state only: authentication cookies and HR records are never persisted here.
export const useAppStore = create<AppState>()(set => ({
  ...initialState,
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileNavOpen: mobileNavOpen => set({ mobileNavOpen }),
  setChatOpen: chatOpen => set({ chatOpen }),
  reset: () => set(initialState),
}));
