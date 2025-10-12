import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlanLimitations } from './usePlanLimitations';

// Mock do contexto de autenticação
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockUseFirebaseAuth = vi.fn(() => ({
  user: mockUser,
  isAdmin: false,
  loading: false,
}));

vi.mock('@/contexts/FirebaseAuthContext', () => ({
  useFirebaseAuth: () => mockUseFirebaseAuth(),
}));

// Mock do serviço de perfil
const mockGetUserProfile = vi.fn();
vi.mock('@/core/services/user-profile.service', () => ({
  UserProfileService: {
    getUserProfile: mockGetUserProfile,
  },
}));

describe('usePlanLimitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default limitations for free plan', async () => {
    mockGetUserProfile.mockResolvedValue({
      plano: 'free',
    });

    const { result } = renderHook(() => usePlanLimitations());

    expect(result.current.currentPlan).toBe('free');
    expect(result.current.planLimits.maxEmployees).toBe(1);
    expect(result.current.hasFeature('dashboard')).toBe(true);
    expect(result.current.hasFeature('payments')).toBe(false);
  });

  it('returns limitations for standard plan', async () => {
    mockGetUserProfile.mockResolvedValue({
      plano: 'standard',
    });

    const { result } = renderHook(() => usePlanLimitations());

    expect(result.current.currentPlan).toBe('standard');
    expect(result.current.planLimits.maxEmployees).toBe(5);
    expect(result.current.hasFeature('payments')).toBe(true);
    expect(result.current.hasFeature('reports')).toBe(false);
  });

  it('returns limitations for medium plan', async () => {
    mockGetUserProfile.mockResolvedValue({
      plano: 'medium',
    });

    const { result } = renderHook(() => usePlanLimitations());

    expect(result.current.currentPlan).toBe('medium');
    expect(result.current.planLimits.maxEmployees).toBe(10);
    expect(result.current.hasFeature('reports')).toBe(true);
    expect(result.current.hasFeature('advancedPanel')).toBe(false);
  });

  it('returns limitations for ultimate plan', async () => {
    mockGetUserProfile.mockResolvedValue({
      plano: 'ultimate',
    });

    const { result } = renderHook(() => usePlanLimitations());

    expect(result.current.currentPlan).toBe('ultimate');
    expect(result.current.planLimits.maxEmployees).toBe(50);
    expect(result.current.hasFeature('advancedPanel')).toBe(true);
  });

  it('allows admin users to access all features', async () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: mockUser,
      isAdmin: true,
      loading: false,
    });

    mockGetUserProfile.mockResolvedValue({
      plano: 'free',
    });

    const { result } = renderHook(() => usePlanLimitations());

    expect(result.current.hasFeature('advancedPanel')).toBe(true);
    expect(result.current.hasFeature('payments')).toBe(true);
    expect(result.current.hasFeature('reports')).toBe(true);
  });

  it('handles loading state', async () => {
    mockGetUserProfile.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => usePlanLimitations());

    expect(result.current.loading).toBe(true);
  });

  it('handles error state', async () => {
    mockGetUserProfile.mockRejectedValue(new Error('Failed to fetch profile'));

    const { result } = renderHook(() => usePlanLimitations());

    // Should fallback to free plan
    expect(result.current.currentPlan).toBe('free');
    expect(result.current.planLimits.maxEmployees).toBe(1);
  });
});
