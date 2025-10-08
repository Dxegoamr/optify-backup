import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';

const Planos = () => {
  const { user } = useFirebaseAuth();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'Free',
      value: 'free',
      price: 0,
      period: 'Grátis',
      features: [
        '1 funcionário',
        'Dashboard básico',
        'Resumo do dia',
        'Visualização de transações',
        'Funcionalidades básicas'
      ],
      current: user?.plan === 'free',
      popular: false
    },
    {
      name: 'Standard',
      value: 'standard',
      price: isAnnual ? 0.85 : 1,
      period: 'mês',
      features: [
        'Até 5 funcionários',
        'Dashboard básico',
        'Resumo do dia',
        'Relatórios básicos',
        'Suporte por e-mail'
      ],
      current: user?.plan === 'standard',
      popular: false
    },
    {
      name: 'Medium',
      value: 'medium',
      price: isAnnual ? 42.42 : 49.90,
      period: 'mês',
      features: [
        'Até 10 funcionários',
        'Pagamentos',
        'Saldos de contas',
        'Histórico completo',
        'Relatórios avançados',
        'Calendário anterior'
      ],
      current: user?.plan === 'medium',
      popular: true
    },
    {
      name: 'Ultimate',
      value: 'ultimate',
      price: isAnnual ? 84.92 : 99.90,
      period: 'mês',
      features: [
        'Funcionários ilimitados',
        'Todas as funcionalidades',
        'Prioridade no suporte',
        'Recursos exclusivos',
        'Integrações avançadas',
        'API personalizada',
        'Painel avançado',
        'Suporte dedicado'
      ],
      current: user?.plan === 'ultimate',
      popular: false
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
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
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
