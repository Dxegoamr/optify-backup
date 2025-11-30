import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/integrations/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { useEffect, useState } from 'react';

/**
 * Interface do estado financeiro global
 */
export interface GlobalFinancialState {
  updatedAt: {
    seconds: number;
    nanoseconds: number;
    toDate: () => Date;
  };
  totals: {
    deposits: number;
    withdraws: number;
    profit: number;
    profitToday: number;
    profitThisWeek: number;
    profitThisMonth: number;
    profitThisYear: number;
  };
  daily: {
    [date: string]: {
      profit: number;
      deposits: number;
      withdraws: number;
    };
  };
  monthly: {
    [month: string]: {
      profit: number;
      deposits: number;
      withdraws: number;
    };
  };
  employees: {
    [employeeId: string]: {
      name: string;
      profit: number;
      deposits: number;
      withdraws: number;
      platforms: {
        [platformId: string]: number;
      };
    };
  };
  platforms: {
    [platformId: string]: {
      name: string;
      profit: number;
      deposits: number;
      withdraws: number;
    };
  };
}

/**
 * Hook para obter o estado financeiro global do usuário
 */
export const useGlobalFinancialState = (userId?: string) => {
  const { user } = useFirebaseAuth();
  const uid = userId || user?.uid;
  const [state, setState] = useState<GlobalFinancialState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const stateRef = doc(db, 'users', uid, 'globalFinancialState', 'main');
    
    const unsubscribe = onSnapshot(
      stateRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setState(snapshot.data() as GlobalFinancialState);
        } else {
          // Se não existe, chamar a função para calcular
          console.log('Estado financeiro não encontrado, calculando...');
          recalculateFinancialState(uid).catch(err => {
            console.error('Erro ao recalcular estado financeiro:', err);
            setError(err as Error);
          });
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Erro ao escutar estado financeiro:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return {
    data: state,
    isLoading,
    error,
    refetch: () => {
      if (uid) {
        return recalculateFinancialState(uid);
      }
      return Promise.resolve();
    },
  };
};

/**
 * Função para recalcular o estado financeiro global
 */
export const recalculateFinancialState = async (userId: string): Promise<GlobalFinancialState> => {
  try {
    const recalculateFunction = httpsCallable<{}, GlobalFinancialState>(
      functions,
      'recalculateFinancialState'
    );
    
    const result = await recalculateFunction({});
    return result.data;
  } catch (error) {
    console.error('Erro ao recalcular estado financeiro:', error);
    throw error;
  }
};

/**
 * Hook mutation para recalcular estado financeiro
 */
export const useRecalculateFinancialState = () => {
  const queryClient = useQueryClient();
  const { user } = useFirebaseAuth();

  return useMutation({
    mutationFn: () => {
      if (!user?.uid) {
        throw new Error('Usuário não autenticado');
      }
      return recalculateFinancialState(user.uid);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['globalFinancialState'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-all-daily-summaries'] });
    },
  });
};

/**
 * Helper para obter lucro de um dia específico
 */
export const getDailyProfit = (state: GlobalFinancialState | null, date: string): number => {
  if (!state) return 0;
  return state.daily[date]?.profit || 0;
};

/**
 * Helper para obter lucro de um mês específico
 */
export const getMonthlyProfit = (state: GlobalFinancialState | null, month: string): number => {
  if (!state) return 0;
  return state.monthly[month]?.profit || 0;
};

/**
 * Helper para obter estado de um funcionário
 */
export const getEmployeeState = (
  state: GlobalFinancialState | null,
  employeeId: string
): GlobalFinancialState['employees'][string] | null => {
  if (!state) return null;
  return state.employees[employeeId] || null;
};

/**
 * Helper para obter estado de uma plataforma
 */
export const getPlatformState = (
  state: GlobalFinancialState | null,
  platformId: string
): GlobalFinancialState['platforms'][string] | null => {
  if (!state) return null;
  return state.platforms[platformId] || null;
};






