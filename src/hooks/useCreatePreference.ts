import { useMutation } from "@tanstack/react-query";
import { env } from "@/config/env";

export function useCreatePreference() {
  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      userEmail: string;
      userName: string;
      planId: 'free' | 'standard' | 'medium' | 'ultimate';
      billingType: 'monthly' | 'annual';
    }) => {
      console.log('🔍 Hook - URL da API:', env.API_URL);
      console.log('🔍 Hook - Payload:', payload);

      try {
        const resp = await fetch(
          `${env.API_URL}/createPaymentPreference`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        
        console.log('🔍 Hook - Status da resposta:', resp.status);
        
        if (!resp.ok) {
          let errorData;
          try {
            errorData = await resp.json();
          } catch {
            errorData = { error: resp.statusText };
          }
          console.error('❌ Hook - Erro da API:', errorData);
          throw new Error(errorData.error || `Erro HTTP ${resp.status}: ${resp.statusText}`);
        }
        
        const result = await resp.json();
        console.log('✅ Hook - Resposta da API:', result);
        return result;
      } catch (error) {
        console.error('❌ Hook - Erro na fetch:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('❌ Hook - Erro na mutation:', error);
    },
    onSuccess: (data) => {
      console.log('✅ Hook - Mutation bem-sucedida:', data);
    }
  });
}
