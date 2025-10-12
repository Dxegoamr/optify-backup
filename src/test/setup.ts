import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock do Firebase
vi.mock('@/integrations/firebase/config', () => ({
  db: {},
  auth: {},
  functions: {},
  analytics: null,
  default: {},
}));

// Mock do Sentry
vi.mock('@/observability/sentry', () => ({
  initSentry: vi.fn(),
  SentryProvider: ({ children }: { children: React.ReactNode }) => children,
  useSentry: () => ({
    captureError: vi.fn(),
    captureMessage: vi.fn(),
    setUser: vi.fn(),
    addBreadcrumb: vi.fn(),
    setContext: vi.fn(),
    setTag: vi.fn(),
  }),
  setSentryUser: vi.fn(),
  captureBusinessEvent: vi.fn(),
  capturePerformance: vi.fn(),
}));

// Mock do React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  };
});

// Mock do React Query
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(() => ({
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isLoading: false,
    error: null,
  })),
}));

// Mock do Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock do window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock do IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock do ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock do requestIdleCallback
global.requestIdleCallback = vi.fn((callback) => {
  setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 5 }), 0);
  return 1;
});

global.cancelIdleCallback = vi.fn();
