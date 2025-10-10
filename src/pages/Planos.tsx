import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Crown, Users, TrendingUp, Shield, Bot, Zap } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { getAllPlanInfo } from '@/core/services/plan-limitations.service';

const Planos = () => {
  const { user } = useFirebaseAuth();
  const [isAnnual, setIsAnnual] = useState(false);

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

  const plans = [
    {
      name: 'Free',
      value: 'free',
      price: 0,
      period: 'Grátis',
      annualPrice: 0,
      features: planFeatures.free,
      current: false, // TODO: Buscar plano atual do usuário
      popular: false,
      description: 'Testar o sistema'
    },
    {
      name: 'Standard',
      value: 'standard',
      price: 1.00,
      period: 'mês',
      annualPrice: 10.20,
      features: planFeatures.standard,
      current: false,
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
      current: false,
      popular: true,
      description: 'Médias empresas'
    },
    {
      name: 'Ultimate',
      value: 'ultimate',
      price: 99.90,
      period: 'mês',
      annualPrice: 1018.32,
      features: planFeatures.ultimate,
      current: false,
      popular: false,
      description: 'Grandes empresas'
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
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

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`
                p-6 relative shadow-card card-hover
                ${plan.popular ? 'border-primary border-2' : ''}
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

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      R$ {(isAnnual ? plan.annualPrice : plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">/{isAnnual ? 'ano' : plan.period}</span>
                    )}
                  </div>
                  {isAnnual && plan.price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Economia de R$ {((plan.price * 12) - plan.annualPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
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

                <Button
                  className="w-full"
                  variant={plan.current ? 'outline' : 'default'}
                  disabled={plan.current}
                >
                  {plan.current ? 'Plano Atual' : 'Assinar'}
                </Button>
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
