import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mercadoPagoClient } from '@/integrations/mercadopago/client';
import { CreatePaymentRequest, MercadoPagoPayment } from '@/integrations/mercadopago/types';
import { toast } from 'sonner';

// Hook para criar pagamento
export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (paymentData: CreatePaymentRequest) => 
      mercadoPagoClient.createPayment(paymentData),
    onSuccess: (data) => {
      toast.success('Pagamento criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['mercado-pago-payments'] });
    },
    onError: (error) => {
      console.error('Erro ao criar pagamento:', error);
      toast.error('Erro ao criar pagamento. Tente novamente.');
    }
  });
};

// Hook para buscar pagamento por ID
export const usePayment = (paymentId: string) => {
  return useQuery({
    queryKey: ['mercado-pago-payment', paymentId],
    queryFn: () => mercadoPagoClient.getPayment(paymentId),
    enabled: !!paymentId,
  });
};

// Hook para buscar pagamentos por referência externa
export const usePaymentsByReference = (externalReference: string) => {
  return useQuery({
    queryKey: ['mercado-pago-payments', externalReference],
    queryFn: () => mercadoPagoClient.getPaymentsByExternalReference(externalReference),
    enabled: !!externalReference,
  });
};

// Hook para cancelar pagamento
export const useCancelPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (paymentId: string) => 
      mercadoPagoClient.cancelPayment(paymentId),
    onSuccess: () => {
      toast.success('Pagamento cancelado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['mercado-pago-payments'] });
    },
    onError: (error) => {
      console.error('Erro ao cancelar pagamento:', error);
      toast.error('Erro ao cancelar pagamento. Tente novamente.');
    }
  });
};

// Hook para reembolsar pagamento
export const useRefundPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ paymentId, amount }: { paymentId: string; amount?: number }) => 
      mercadoPagoClient.refundPayment(paymentId, amount),
    onSuccess: () => {
      toast.success('Reembolso processado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['mercado-pago-payments'] });
    },
    onError: (error) => {
      console.error('Erro ao processar reembolso:', error);
      toast.error('Erro ao processar reembolso. Tente novamente.');
    }
  });
};

// Hook para criar preferência de pagamento
export const useCreatePreference = () => {
  return useMutation({
    mutationFn: (preferenceData: any) => 
      mercadoPagoClient.createPreference(preferenceData),
    onSuccess: (data) => {
      toast.success('Preferência criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar preferência:', error);
      toast.error('Erro ao criar preferência. Tente novamente.');
    }
  });
};

