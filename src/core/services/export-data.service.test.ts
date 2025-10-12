import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestDataExport, registerDownload } from './export-data.service';

// Mock do httpsCallable
const mockHttpsCallable = vi.fn();

vi.mock('firebase/functions', () => ({
  httpsCallable: mockHttpsCallable,
}));

vi.mock('@/integrations/firebase/config', () => ({
  functions: {},
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('export-data.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestDataExport', () => {
    it('should request data export successfully', async () => {
      const mockResult = {
        data: {
          success: true,
          message: 'Exportação concluída',
          downloadUrl: 'https://storage.googleapis.com/export.json',
          expiresAt: '2024-12-31T23:59:59Z',
          exportId: 'export-123',
        },
      };

      const mockFunction = vi.fn().mockResolvedValue(mockResult);
      mockHttpsCallable.mockReturnValue(mockFunction);

      const result = await requestDataExport('json');

      expect(result.success).toBe(true);
      expect(result.downloadUrl).toBeDefined();
      expect(result.exportId).toBe('export-123');
      expect(mockFunction).toHaveBeenCalledWith({ format: 'json' });
    });

    it('should handle export errors', async () => {
      const mockFunction = vi.fn().mockRejectedValue(new Error('Export failed'));
      mockHttpsCallable.mockReturnValue(mockFunction);

      const result = await requestDataExport('json');

      expect(result.success).toBe(false);
      expect(result.downloadUrl).toBeUndefined();
    });

    it('should support CSV format', async () => {
      const mockResult = {
        data: {
          success: true,
          message: 'Exportação concluída',
          downloadUrl: 'https://storage.googleapis.com/export.csv',
          exportId: 'export-456',
        },
      };

      const mockFunction = vi.fn().mockResolvedValue(mockResult);
      mockHttpsCallable.mockReturnValue(mockFunction);

      const result = await requestDataExport('csv');

      expect(result.success).toBe(true);
      expect(mockFunction).toHaveBeenCalledWith({ format: 'csv' });
    });
  });

  describe('registerDownload', () => {
    it('should register download event', async () => {
      await registerDownload('export-123');

      // Verificar que não houve erro
      expect(true).toBe(true);
    });
  });
});
