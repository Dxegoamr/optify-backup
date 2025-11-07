import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Crown, Users, TrendingUp, Shield, Bot, Zap, Loader2 } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { getAllPlanInfo } from '@/core/services/plan-limitations.service';
import { useCreatePreference } from '@/hooks/useCreatePreference';
import { usePlanLimitations } from '@/hooks/usePlanLimitations';
import { logPlanSelection } from '@/core/services/plan-selection-tracker.service';
import { toast } from 'sonner';
import { env } from '@/config/env';
import AdBlockerWarning from '@/components/AdBlockerWarning';

const Planos = () => {
  const { user } = useFirebaseAuth();
  const { currentPlan } = usePlanLimitations();
  const [isAnnual, setIsAnnual] = useState(false);
  const createPreferenceMutation = useCreatePreference();

  // Hierarquia dos planos (maior número = plano superior)
  const planHierarchy = {
    free: 0,
    standard: 1,
    medium: 2,
    ultimate: 3
  };

  // Função para verificar se um plano é menor que o atual
  const isPlanLower = (planValue: string) => {
    const currentLevel = planHierarchy[currentPlan as keyof typeof planHierarchy] || 0;
    const planLevel = planHierarchy[planValue as keyof typeof planHierarchy] || 0;
    const isLower = planLevel < currentLevel;
    
    // Debug log
    console.log('🔍 Debug Botão - isPlanLower:', {
      planValue,
      currentPlan,
      currentLevel,
      planLevel,
      isLower
    });
    
    return isLower;
  };

  const planFeatures = {
    free: [
      { text: 'Dashboard básico', icon: Check },
      { text: 'Resumo do dia', icon: Check },
      { text: 'Cadastro de 1 funcionário', icon: Users },
      { text: 'Registro de transações do dia atual', icon: Check },
      { text: 'Depósitos e saques básicos', icon: Check },
      { text: 'Visualização do calendário (mês atual)', icon: Check },
      { text: 'Calendário Anterior', icon: Check, blocked: true },
      { text: 'Pagamentos', icon: Check, blocked: true },
      { text: 'Relatórios', icon: Check, blocked: true },
      { text: 'Saldo de Contas', icon: Check, blocked: true },
      { text: 'Histórico', icon: Check, blocked: true }
    ],
    standard: [
      { text: 'Dashboard básico', icon: Check },
      { text: 'Resumo do dia', icon: Check },
      { text: 'Cadastro de até 5 funcionários', icon: Users },
      { text: 'Registro de transações do dia atual', icon: Check },
      { text: 'Depósitos e saques', icon: Check },
      { text: 'Relatórios básicos', icon: TrendingUp },
      { text: 'Visualização do calendário (mês atual)', icon: Check },
      { text: 'Suporte por email', icon: Check },
      { text: 'Calendário Anterior', icon: Check, blocked: true },
      { text: 'Pagamentos', icon: Check, blocked: true },
      { text: 'Saldo de Contas', icon: Check, blocked: true },
      { text: 'Histórico', icon: Check, blocked: true }
    ],
    medium: [
      { text: 'Dashboard completo', icon: Check },
      { text: 'Resumo do dia', icon: Check },
      { text: 'Cadastro de até 10 funcionários', icon: Users },
      { text: 'Registro de transações', icon: Check },
      { text: 'Depósitos e saques', icon: Check },
      { text: 'Calendário Anterior', icon: Check },
      { text: 'Pagamentos', icon: Check },
      { text: 'Relatórios avançados', icon: TrendingUp },
      { text: 'Saldo de Contas', icon: Check },
      { text: 'Histórico completo', icon: Check }
    ],
    ultimate: [
      { text: 'Dashboard completo e avançado', icon: Check },
      { text: 'Resumo do dia', icon: Check },
      { text: 'Cadastro de até 50 funcionários', icon: Users },
      { text: 'Registro de transações ilimitadas', icon: Check },
      { text: 'Depósitos e saques', icon: Check },
      { text: 'Calendário Anterior', icon: Check },
      { text: 'Pagamentos', icon: Check },
      { text: 'Relatórios avançados', icon: TrendingUp },
      { text: 'Saldo de Contas', icon: Check },
      { text: 'Histórico completo', icon: Check },
      { text: 'CPA Chinesa', icon: Crown, exclusive: true },
      { text: 'Painel Avançado', icon: Shield, exclusive: true },
      { text: 'Dutchuing Bot', icon: Bot, exclusive: true },
      { text: 'Integrações avançadas', icon: Zap, exclusive: true },
      { text: 'API personalizada', icon: Zap, exclusive: true },
      { text: 'Suporte prioritário', icon: Check, exclusive: true },
      { text: 'Suporte dedicado', icon: Check, exclusive: true }
    ]
  };

  const handleAssinar = async (planId: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para assinar um plano');
      return;
    }

    if (planId === 'free') {
      toast.error('O plano Free já está ativo');
      return;
    }

    try {
      console.log('🔍 Debug - Variáveis de ambiente:', {
        API_URL: env.API_URL,
        PUBLIC_KEY: env.MERCADO_PAGO_PUBLIC_KEY
      });

      console.log('🔍 Debug - Dados do payload:', {
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email?.split('@')[0] || 'Usuário',
        planId: planId,
        billingType: isAnnual ? 'annual' : 'monthly'
      });

      // Registrar seleção de plano no log
      const logId = await logPlanSelection(
        user.uid,
        user.email || '',
        planId,
        isAnnual ? 'annual' : 'monthly'
      );
      console.log('📝 Log de seleção criado:', logId);

      const preference = await createPreferenceMutation.mutateAsync({
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email?.split('@')[0] || 'Usuário',
        planId: planId as 'standard' | 'medium' | 'ultimate',
        billingType: isAnnual ? 'annual' : 'monthly'
      });

      console.log('✅ Preferência criada:', preference);

      // Redirecionar para o Mercado Pago - tentar todas as URLs possíveis
      const checkoutUrl = preference.checkout_url || preference.init_point || preference.sandbox_init_point;
      
      if (!checkoutUrl) {
        console.error('❌ Nenhuma URL de checkout disponível:', preference);
        createPreferenceMutation.reset();
        throw new Error('URL de checkout não retornada pelo Mercado Pago');
      }

      console.log('🔗 Redirecionando para:', checkoutUrl);
      
      // Limpar estado da mutation antes de redirecionar
      createPreferenceMutation.reset();
      
      // Pequeno delay para garantir que o estado foi resetado
      setTimeout(() => {
        window.location.href = checkoutUrl;
      }, 100);
    } catch (error) {
      console.error('❌ Erro ao criar preferência:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Extrair mensagem de erro mais detalhada
      let detailedMessage = errorMessage;
      if (error instanceof Error && 'response' in error) {
        const response = (error as any).response;
        if (response?.data?.message) {
          detailedMessage = response.data.message;
        } else if (response?.data?.error?.message) {
          detailedMessage = response.data.error.message;
        }
      }
      
      toast.error(`Erro ao processar pagamento: ${detailedMessage}`);
      
      // Sempre resetar estado da mutation para habilitar o botão novamente
      setTimeout(() => {
        createPreferenceMutation.reset();
      }, 100);
    }
  };

  const plans = [
    {
      name: 'Free',
      value: 'free',
      price: 0,
      period: 'Grátis',
      annualPrice: 0,
      features: planFeatures.free,
      current: currentPlan === 'free',
      popular: false,
      description: 'Testar o sistema'
    },
    {
      name: 'Standard',
      value: 'standard',
      price: 34.90,
      period: 'mês',
      annualPrice: 356.76,
      features: planFeatures.standard,
      current: currentPlan === 'standard',
      popular: false,
      description: 'Pequenos negócios'
    },
    {
      name: 'Medium',
      value: 'medium',
      price: 49.90,
      period: 'mês',
      annualPrice: 509.16,
      features: planFeatures.medium,
      current: currentPlan === 'medium',
      popular: true,
      description: 'Médias empresas'
    },
    {
      name: 'Ultimate',
      value: 'ultimate',
      price: 74.90,
      period: 'mês',
      annualPrice: 764.76,
      features: planFeatures.ultimate,
      current: currentPlan === 'ultimate',
      popular: false,
      description: 'Grandes empresas'
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <AdBlockerWarning />
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Escolha seu Plano</h1>
          <p className="text-muted-foreground text-lg">
            Selecione o plano ideal para o seu negócio
          </p>

          <div className="flex items-center justify-center gap-3">
            <span className={!isAnnual ? 'font-semibold' : 'text-muted-foreground'}>Mensal</span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
            <span className={isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
              Anual
              <Badge variant="default" className="ml-2">15% OFF</Badge>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`
                p-6 relative shadow-card card-hover flex flex-col h-full
                ${plan.popular ? 'border-primary border-2' : ''}
                ${isPlanLower(plan.value) ? 'opacity-60' : ''}
              `}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Mais Popular
                </Badge>
              )}
              {plan.current && (
                <Badge variant="outline" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Plano Atual
                </Badge>
              )}

              <div className="flex flex-col h-full space-y-6">
                <div className="flex-shrink-0">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      R$ {(isAnnual ? (plan.annualPrice / 12) : plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                  {isAnnual && plan.price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Valor anual: R$ {plan.annualPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      <br />
                      Economia de R$ {((plan.price * 12) - plan.annualPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                <div className="flex-grow space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {feature.blocked ? (
                        <div className="h-5 w-5 shrink-0 mt-0.5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
                        </div>
                      ) : (
                        <feature.icon className={`h-5 w-5 shrink-0 mt-0.5 ${feature.exclusive ? 'text-primary' : 'text-success'}`} />
                      )}
                      <span className={`text-sm ${feature.blocked ? 'text-muted-foreground/60' : ''} ${feature.exclusive ? 'text-primary font-medium' : ''}`}>
                        {feature.text}
                        {feature.exclusive && <span className="ml-1 text-xs">(exclusivo)</span>}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex-shrink-0">
                  {(() => {
                    // NÃO incluir isError como condição de disabled - permite clicar para tentar novamente
                    const isDisabled = plan.current || createPreferenceMutation.isPending || isPlanLower(plan.value);
                    const disabledReasons = {
                      isCurrent: plan.current,
                      isPending: createPreferenceMutation.isPending,
                      isError: createPreferenceMutation.isError,
                      isLower: isPlanLower(plan.value)
                    };
                    
                    // Log apenas uma vez por plano
                    if (plan.name === 'Standard') {
                      console.log(`🔍 Debug Botão [${plan.name}]:`, {
                        disabled: isDisabled,
                        reasons: disabledReasons,
                        currentPlan,
                        planValue: plan.value,
                        mutationState: {
                          isPending: createPreferenceMutation.isPending,
                          isError: createPreferenceMutation.isError,
                          error: createPreferenceMutation.error
                        }
                      });
                    }
                    
                    return (
                      <Button
                        className="w-full"
                        variant={plan.current ? 'outline' : 'default'}
                        disabled={isDisabled}
                        onClick={() => {
                          if (!plan.current && !isPlanLower(plan.value) && !createPreferenceMutation.isPending) {
                            // Resetar mutation se estiver em erro antes de tentar novamente
                            if (createPreferenceMutation.isError) {
                              console.log('🔄 Resetando mutation após erro');
                              createPreferenceMutation.reset();
                              // Aguardar um pouco antes de chamar handleAssinar
                              setTimeout(() => {
                                handleAssinar(plan.value);
                              }, 100);
                            } else {
                              handleAssinar(plan.value);
                            }
                          }
                        }}
                      >
                        {createPreferenceMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Redirecionando...
                          </>
                        ) : plan.current ? (
                          'Plano Atual'
                        ) : isPlanLower(plan.value) ? (
                          'Plano Menor'
                        ) : createPreferenceMutation.isError ? (
                          'Tentar Novamente'
                        ) : (
                          'Assinar'
                        )}
                      </Button>
                    );
                  })()}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Todos os planos incluem 7 dias de teste grátis</p>
          <p>Cancele a qualquer momento, sem taxas adicionais</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Planos;
