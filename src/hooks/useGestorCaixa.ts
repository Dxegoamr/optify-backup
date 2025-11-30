import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GestorCaixaService } from '@/core/services/gestor-caixa.service';
import { GestorTransacaoPessoal, GestorCategoria, GestorConfiguracoes } from '@/types/gestorCaixa';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';

export const useGestorResumo = () => {
  const { user } = useFirebaseAuth();

  return useQuery({
    queryKey: ['gestor-caixa', 'resumo', user?.uid],
    queryFn: () => GestorCaixaService.getResumo(),
    enabled: !!user?.uid,
    staleTime: 60_000,
  });
};

export const useGestorTransacoes = () => {
  const { user } = useFirebaseAuth();

  return useQuery({
    queryKey: ['gestor-caixa', 'transacoes', user?.uid],
    queryFn: () => GestorCaixaService.getTransacoes(),
    enabled: !!user?.uid,
  });
};

export const useCreateGestorTransacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<GestorTransacaoPessoal>) => GestorCaixaService.createTransacao(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'resumo'] });
    },
  });
};

export const useUpdateGestorTransacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GestorTransacaoPessoal> }) =>
      GestorCaixaService.updateTransacao(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'resumo'] });
    },
  });
};

export const useDeleteGestorTransacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => GestorCaixaService.deleteTransacao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'resumo'] });
    },
  });
};

export const useGestorCategorias = () => {
  const { user } = useFirebaseAuth();

  return useQuery({
    queryKey: ['gestor-caixa', 'categorias', user?.uid],
    queryFn: () => GestorCaixaService.getCategorias(),
    enabled: !!user?.uid,
  });
};

export const useCreateGestorCategoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<GestorCategoria>) => GestorCaixaService.createCategoria(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'categorias'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'resumo'] });
    },
  });
};

export const useUpdateGestorCategoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GestorCategoria> }) =>
      GestorCaixaService.updateCategoria(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'categorias'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'resumo'] });
    },
  });
};

export const useDeleteGestorCategoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => GestorCaixaService.deleteCategoria(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'categorias'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'resumo'] });
    },
  });
};

export const useGestorConfiguracoes = () => {
  const { user } = useFirebaseAuth();

  return useQuery({
    queryKey: ['gestor-caixa', 'configuracoes', user?.uid],
    queryFn: () => GestorCaixaService.getConfiguracoes(),
    enabled: !!user?.uid,
  });
};

export const useUpdateGestorConfiguracoes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<GestorConfiguracoes>) => GestorCaixaService.updateConfiguracoes(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestor-caixa', 'configuracoes'] });
    },
  });
};












