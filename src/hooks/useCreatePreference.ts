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

      const resp = await fetch(
        `${env.API_URL}/createPaymentPreference`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      
      console.log('🔍 Hook - Status da resposta:', resp.status);
      console.log('🔍 Hook - Headers da resposta:', Object.fromEntries(resp.headers.entries()));
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        console.error('🔍 Hook - Erro da API:', errorData);
        throw new Error(errorData.error || "Erro ao criar preferência");
      }
      
      const result = await resp.json();
      console.log('🔍 Hook - Resposta da API:', result);
      return result;
    },
    onError: (error) => {
      console.error('❌ Hook - Erro na mutation:', error);
    }
  });
}
