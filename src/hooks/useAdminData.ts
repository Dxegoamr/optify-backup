import { useState, useEffect } from 'react';
import { getAdminStats, AdminStats } from '@/core/services/admin-data.service';

export const useAdminData = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const adminStats = await getAdminStats();
      setStats(adminStats);
    } catch (err) {
      console.error('Erro ao buscar dados admin:', err);
      setError('Erro ao carregar dados do painel administrativo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};
