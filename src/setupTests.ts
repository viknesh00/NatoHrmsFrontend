import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
vi.stubGlobal('ResizeObserver', class ResizeObserver { observe() {} unobserve() {} disconnect() {} });
