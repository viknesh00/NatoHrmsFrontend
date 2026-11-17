import { create } from 'zustand';

interface AppState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  chatOpen: boolean;
  chatPresentation: 'widget' | 'sidepanel';
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setChatPresentation: (presentation: 'widget' | 'sidepanel') => void;
  reset: () => void;
}
const initialState = { sidebarCollapsed: false, mobileNavOpen: false, chatOpen: false, chatPresentation: 'sidepanel' as const };
// UI state only: authentication cookies and HR records are never persisted here.
export const useAppStore = create<AppState>()(set => ({
  ...initialState,
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileNavOpen: mobileNavOpen => set({ mobileNavOpen }),
  setChatOpen: chatOpen => set({ chatOpen }),
  setChatPresentation: chatPresentation => set({ chatPresentation }),
  reset: () => set(initialState),
}));
