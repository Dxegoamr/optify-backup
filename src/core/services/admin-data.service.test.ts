import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAdminStats, getAllUsers, getPlanTransactions } from './admin-data.service';

// Mock do Firestore
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();

vi.mock('@/integrations/firebase/config', () => ({
  db: {
    collection: mockCollection,
  },
}));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  collection: mockCollection,
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

describe('admin-data.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdminStats', () => {
    it('should return stats from server aggregations when available', async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 80,
        totalRevenue: 50000,
        revenueToday: 1000,
        revenueWeek: 5000,
        revenueMonth: 20000,
        bestDay: '2024-01-15',
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockStats,
      });

      mockGetDocs.mockResolvedValue({
        docs: [],
        size: 0,
      });

      const stats = await getAdminStats();

      expect(stats).toBeDefined();
      expect(stats.totalUsers).toBe(100);
      expect(stats.activeUsers).toBe(80);
      expect(stats.totalRevenue).toBe(50000);
    });

    it('should fallback to local calculation if aggregations not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      mockGetDocs.mockResolvedValue({
        docs: [],
        size: 0,
      });

      const stats = await getAdminStats();

      expect(stats).toBeDefined();
      expect(stats.totalUsers).toBe(0);
      expect(stats.activeUsers).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore error'));

      mockGetDocs.mockResolvedValue({
        docs: [],
        size: 0,
      });

      const stats = await getAdminStats();

      expect(stats).toBeDefined();
    });
  });

  describe('getAllUsers', () => {
    it('should return all users from Firestore', async () => {
      const mockUsers = [
        {
          id: 'user1',
          data: () => ({
            email: 'user1@example.com',
            name: 'User 1',
            plano: 'free',
            isActive: true,
          }),
        },
        {
          id: 'user2',
          data: () => ({
            email: 'user2@example.com',
            name: 'User 2',
            plano: 'ultimate',
            isActive: true,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockUsers,
        size: mockUsers.length,
      });

      const users = await getAllUsers();

      expect(users).toHaveLength(2);
      expect(users[0].email).toBe('user1@example.com');
      expect(users[1].plano).toBe('ultimate');
    });

    it('should return empty array if no users found', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        size: 0,
      });

      const users = await getAllUsers();

      expect(users).toHaveLength(0);
    });
  });

  describe('getPlanTransactions', () => {
    it('should return all plan transactions', async () => {
      const mockTransactions = [
        {
          id: 'tx1',
          data: () => ({
            userId: 'user1',
            amount: 100,
            status: 'completed',
            planId: 'standard',
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockTransactions,
        size: mockTransactions.length,
      });

      const transactions = await getPlanTransactions();

      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(100);
      expect(transactions[0].status).toBe('completed');
    });

    it('should filter transactions by status', async () => {
      const mockTransactions = [
        {
          id: 'tx1',
          data: () => ({ status: 'completed', amount: 100 }),
        },
        {
          id: 'tx2',
          data: () => ({ status: 'pending', amount: 200 }),
        },
        {
          id: 'tx3',
          data: () => ({ status: 'completed', amount: 300 }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockTransactions,
        size: mockTransactions.length,
      });

      const transactions = await getPlanTransactions();
      const completedTransactions = transactions.filter(tx => tx.status === 'completed');

      expect(completedTransactions).toHaveLength(2);
    });
  });
});
