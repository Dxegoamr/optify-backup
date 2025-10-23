import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock do contexto de autenticação
const mockAuthContext = {
  user: null,
  loading: false,
  isAdmin: false,
  customClaims: null,
  signIn: vi.fn(),
  signUp: vi.fn(),
  logout: vi.fn(),
  refreshClaims: vi.fn(),
};

// Mock do contexto de limitações de plano
const mockPlanLimitations = {
  canAccess: vi.fn(() => true),
  hasFeature: vi.fn(() => true),
  currentPlan: 'ultimate',
  planLimits: {
    maxEmployees: 50,
    maxTransactions: 1000,
  },
};

// Mock do hook useMobile
const mockUseMobile = vi.fn(() => false);

// Mock do hook usePreload
const mockUsePreload = {
  preloadRoute: vi.fn(),
  preloadOnHover: vi.fn(),
  preloadOnIdle: vi.fn(),
};

// Mock do hook useFirebaseAuth
vi.mock('@/contexts/FirebaseAuthContext', () => ({
  useFirebaseAuth: () => mockAuthContext,
  FirebaseAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock do hook usePlanLimitations
vi.mock('@/hooks/usePlanLimitations', () => ({
  usePlanLimitations: () => mockPlanLimitations,
}));

// Mock do hook useMobile
vi.mock('@/hooks/useMobile', () => ({
  useMobile: () => mockUseMobile(),
}));

// Mock do hook usePreload
vi.mock('@/hooks/usePreload', () => ({
  usePreload: () => mockUsePreload,
}));

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Funções de teste utilitárias
export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  ...overrides,
});

export const createMockEmployee = (overrides = {}) => ({
  id: 'test-employee-id',
  name: 'Test Employee',
  email: 'employee@example.com',
  position: 'Developer',
  salary: 5000,
  hireDate: new Date('2024-01-01'),
  ...overrides,
});

export const createMockTransaction = (overrides = {}) => ({
  id: 'test-transaction-id',
  amount: 100,
  description: 'Test Transaction',
  date: new Date('2024-01-01'),
  type: 'income',
  ...overrides,
});

// Mock de dados para testes
export const mockAdminStats = {
  totalUsers: 100,
  activeUsers: 80,
  totalRevenue: 50000,
  revenueToday: 1000,
  revenueWeek: 5000,
  revenueMonth: 20000,
  bestDay: { date: '01/01', revenue: 2000 },
  growthRate: 15,
  planDistribution: {
    free: 50,
    standard: 30,
    medium: 15,
    ultimate: 5,
  },
  recentActivity: [
    {
      action: 'User signed up',
      time: '2024-01-01T10:00:00Z',
      userEmail: 'newuser@example.com',
    },
  ],
};

export const mockUsers = [
  createMockUser({ uid: 'user1', email: 'user1@example.com' }),
  createMockUser({ uid: 'user2', email: 'user2@example.com' }),
];

export const mockEmployees = [
  createMockEmployee({ id: 'emp1', name: 'Employee 1' }),
  createMockEmployee({ id: 'emp2', name: 'Employee 2' }),
];

export const mockTransactions = [
  createMockTransaction({ id: 'tx1', amount: 1000 }),
  createMockTransaction({ id: 'tx2', amount: 2000 }),
];
