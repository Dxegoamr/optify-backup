import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import {
  UserEmployeeService,
  UserPlatformService,
  UserTransactionService,
  UserAccountService,
} from '@/core/services/user-specific.service';
import { where } from 'firebase/firestore';

// Todos os hooks abaixo utilizam a nova estrutura: users/{uid}/subcolecao

// Hook para funcionários
export const useEmployees = (userId: string) => {
  return useQuery({
    queryKey: ['firebase-employees', userId],
    queryFn: () => UserEmployeeService.getEmployees(userId),
    enabled: !!userId
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      UserEmployeeService.createEmployee(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-employees'] });
    }
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, id, data }: { userId: string; id: string; data: any }) => 
      UserEmployeeService.updateEmployee(userId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-employees'] });
    }
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, id }: { userId: string; id: string }) =>
      UserEmployeeService.deleteEmployee(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-employees'] });
    }
  });
};

// Hook para plataformas
export const usePlatforms = (userId: string) => {
  return useQuery({
    queryKey: ['firebase-platforms', userId],
    queryFn: () => UserPlatformService.getPlatforms(userId),
    enabled: !!userId
  });
};

export const useCreatePlatform = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, name, color }: { userId: string; name: string; color: string }) =>
      UserPlatformService.createPlatform(userId, { name, color, isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-platforms'] });
    }
  });
};

export const useUpdatePlatform = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, id, data }: { userId: string; id: string; data: any }) => 
      UserPlatformService.updatePlatform(userId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-platforms'] });
    }
  });
};

export const useDeletePlatform = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, id }: { userId: string; id: string }) =>
      UserPlatformService.deletePlatform(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-platforms'] });
    }
  });
};

// Hook para transações
export const useTransactions = (userId: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['firebase-transactions', userId, startDate, endDate],
    queryFn: () => {
      if (startDate && endDate) {
        return UserTransactionService.getTransactionsByDateRange(userId, startDate, endDate);
      }
      return UserTransactionService.getTransactions(userId);
    },
    enabled: !!userId
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => {
      const { userId, ...payload } = data || {};
      return UserTransactionService.createTransaction(userId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-transactions'] });
    }
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useFirebaseAuth();
  
  return useMutation({
    mutationFn: (id: string) => UserTransactionService.deleteTransaction(user?.uid || '', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-transactions'] });
    }
  });
};

// Hook para contas
export const useAccounts = (userId: string) => {
  return useQuery({
    queryKey: ['firebase-accounts', userId],
    queryFn: () => UserAccountService.getAccounts(userId),
    enabled: !!userId
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) => UserAccountService.createAccount(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-accounts'] });
    }
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, id, data }: { userId: string; id: string; data: any }) => 
      UserAccountService.updateAccount(userId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-accounts'] });
    }
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, id }: { userId: string; id: string }) => UserAccountService.deleteAccount(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-accounts'] });
    }
  });
};

// Hook para inicializar plataformas padrão
export const useInitializeDefaultPlatforms = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      // Verificar se já existem plataformas
      const existingPlatforms = await UserPlatformService.getPlatforms(userId);
      if (existingPlatforms.length > 0) {
        return; // Já tem plataformas, não precisa criar
      }

      // Plataformas padrão com cores exatas da imagem fornecida
      const defaultPlatforms = [
        { name: 'Pixbet', color: '#ADD8E6' },        // rgb(173, 216, 230) - Light blue
        { name: 'Betano', color: '#FF6600' },        // rgb(255, 102, 0) - Vibrant orange
        { name: 'Mcgames', color: '#DC143C' },       // rgb(220, 20, 60) - Deep red
        { name: 'Kto', color: '#C80000' },           // rgb(200, 0, 0) - Bright red
        { name: 'Realsbet', color: '#00FFC8' },      // rgb(0, 255, 200) - Bright teal
        { name: 'Vaidebet', color: '#FFD700' },      // rgb(255, 215, 0) - Pure yellow
        { name: 'Sportingbet', color: '#4682B4' },   // rgb(70, 130, 180) - Steel blue
        { name: 'Superbet', color: '#FF3366' },      // rgb(255, 51, 102) - Hot pink
        { name: 'Betao', color: '#FFA550' },         // rgb(255, 165, 80) - Light orange
        { name: 'Bet365', color: '#008040' },        // rgb(0, 128, 64) - Forest green
        { name: 'Esportivabet', color: '#FF8C00' },  // rgb(255, 140, 0) - Dark orange
        { name: 'Hiperbet', color: '#DC0000' },      // rgb(220, 0, 0) - Bright red
        { name: 'Luvabet', color: '#ADFF2F' },       // rgb(173, 255, 47) - Lime green
        { name: 'Cassinopix', color: '#87CEEB' },    // rgb(135, 206, 235) - Sky blue
        { name: 'Multibet', color: '#483D8B' }       // rgb(72, 61, 139) - Dark slate blue
      ];

      // Criar todas as plataformas padrão em uma única operação
      const createPromises = defaultPlatforms.map(platform => 
        UserPlatformService.createPlatform(userId, {
          name: platform.name,
          color: platform.color,
          isActive: true,
        })
      );

      await Promise.all(createPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-platforms'] });
    }
  });
};

