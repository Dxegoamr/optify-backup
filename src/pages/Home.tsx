import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { TrendingUp, Shield, Zap, Users, CheckCircle, ArrowRight, Star, Crown, Rocket, Building2, Wallet, BarChart3, Calendar, ClipboardList, Lock, Instagram } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { usePlans } from '@/hooks/usePlans';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Hook para efeito de scroll
  useEffect(() => {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    // Observar todos os elementos com classe de animação
    const animatedElements = document.querySelectorAll('.animate-fade-in-scroll');
    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: TrendingUp,
      title: 'Gestão de Operações Completa',
      description: 'Controle total sobre receitas, despesas e lucros em tempo real'
    },
    {
      icon: Users,
      title: 'Gestão de Funcionários',
      description: 'Cadastre, acompanhe e gerencie sua equipe de forma eficiente'
    },
    {
      icon: Shield,
      title: 'Seguro e Confiável',
      description: 'Seus dados protegidos com a melhor tecnologia de segurança'
    },
    {
      icon: Zap,
      title: 'Relatórios Inteligentes',
      description: 'Insights poderosos para tomar decisões estratégicas'
    }
  ];

  const testimonials = [
    {
      name: "Carlos Silva",
      company: "Empresa ABC",
      text: "O Optify revolucionou nossa gestão. Agora temos controle total sobre nossas operações.",
      rating: 5
    },
    {
      name: "Maria Santos",
      company: "Tech Solutions",
      text: "Interface intuitiva e relatórios detalhados. Recomendo para qualquer empresa.",
      rating: 5
    },
    {
      name: "João Oliveira",
      company: "StartupXYZ",
      text: "Economizamos horas de trabalho por semana com a automação do Optify.",
      rating: 5
    }
  ];

  const benefits = [
    "Sem custos ocultos",
    "Suporte 24/7",
    "Interface intuitiva",
    "Relatórios em tempo real",
    "Integração completa",
    "Dados seguros"
  ];

  const allFeatures = [
    { label: 'Gestão de Funcionários', icon: Users },
    { label: 'Transações em Tempo Real', icon: Wallet },
    { label: 'Relatórios e Exportações', icon: BarChart3 },
    { label: 'Calendário de Pagamentos', icon: Calendar },
    { label: 'Fechamento Diário Automático', icon: ClipboardList },
    { label: 'Segurança e Privacidade', icon: Lock },
    { label: 'Plataformas Personalizadas', icon: Rocket },
    { label: 'Painéis Analíticos', icon: TrendingUp }
  ];

  const { data: dbPlans, isLoading: plansLoading } = usePlans();

  // Planos padrão caso não haja dados no banco
  const defaultPlans = [
    {
      name: 'Free',
      price: 0,
      period: 'Grátis',
      badge: 'Comece grátis',
      icon: Rocket,
      highlight: false,
      features: [
        'Até 1 funcionário',
        'Dashboard básico',
        'Resumo do dia',
        'Visualização de transações',
        'Funcionalidades básicas'
      ]
    },
    {
      name: 'Standard',
      price: 34.90,
      period: '/mês',
      badge: undefined,
      icon: Shield,
      highlight: false,
      features: [
        'Até 5 funcionários',
        'Dashboard básico',
        'Resumo do dia',
        'Relatórios básicos',
        'Suporte por email'
      ]
    },
    {
      name: 'Medium',
      price: 49.90,
      period: '/mês',
      badge: 'Recomendado',
      icon: Zap,
      highlight: true,
      features: [
        'Até 10 funcionários',
        'Pagamentos',
        'Saldos de contas',
        'Histórico completo',
        'Relatórios avançados',
        'Calendário anterior'
      ]
    },
    {
      name: 'Ultimate',
      price: 74.90,
      period: '/mês',
      badge: 'Em breve',
      icon: Crown,
      highlight: false,
      features: [
        'Funcionários ilimitados',
        'Todas as funcionalidades',
        'Prioridade no suporte',
        'Recursos exclusivos',
        'Integrações avançadas',
        'API personalizada',
        'Painel avançado',
        'Suporte dedicado'
      ]
    }
  ];

  const dynamicPlans = (dbPlans && dbPlans.length > 0 ? dbPlans : defaultPlans).map((p) => ({
    ...p,
    period: p.period || '/mês',
    icon: p.icon || (p.highlight || p.popular || /pro|medium/i.test(p.name) ? Crown : /enterprise|ultimate|business/i.test(p.name) ? Building2 : Rocket),
    highlight: Boolean(p.highlight || p.popular),
    badge: p.badge || (p.popular ? 'Mais popular' : undefined),
  }));

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fundo laranja pulsando (como antes), cobrindo a página inteira */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Glows principais (pulsando) */}
        <div className="absolute w-[36rem] h-[36rem] bg-primary/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-[36rem] h-[36rem] bg-secondary/20 rounded-full blur-3xl top-1/2 right-0 animate-pulse" />
        <div className="absolute w-[36rem] h-[36rem] bg-primary/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" />

        {/* Orbs e feixes adicionais */}
        <div className="orange-orb absolute w-96 h-96 left-[8%] top-[30%] animate-float-slow" />
        <div className="orange-orb absolute w-[28rem] h-[28rem] left-[55%] top-[10%] animate-float-reverse" />
        <div className="orange-orb absolute w-80 h-80 left-[72%] top-[70%] animate-float-center" />
        <div className="orange-orb absolute w-72 h-72 left-[22%] top-[75%] animate-float-reverse" />
        <div className="orange-beam absolute w-[140%] h-24 left-[-20%] top-[40%] animate-beam" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/50 backdrop-blur-sm/60 bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg 
              className="w-10 h-10 text-primary" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M6 3h12l4 6-10 13L2 9l4-6z"/>
              <path d="M11 3 8 9l4 13 4-13-3-6"/>
              <path d="M2 9h20"/>
            </svg>
            <h1 className="text-2xl font-black text-foreground">
              Optify
            </h1>
          </div>
          <nav className="hidden md:flex items-center justify-center gap-6 text-sm ml-24">
            <button className="hover:text-primary transition-colors" onClick={() => scrollToId('features')}>Funcionalidades</button>
            <button className="hover:text-primary transition-colors" onClick={() => scrollToId('plans')}>Planos</button>
            <button className="hover:text-primary transition-colors" onClick={() => scrollToId('faq')}>FAQ</button>
            <button className="hover:text-primary transition-colors" onClick={() => scrollToId('contact')}>Contato</button>
          </nav>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Entrar
            </Button>
            <Button onClick={() => navigate('/signup')}>
              Começar Agora
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative z-10 container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex flex-col items-center gap-4">
            <svg 
              className="w-16 h-16 text-primary" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M6 3h12l4 6-10 13L2 9l4-6z"/>
              <path d="M11 3 8 9l4 13 4-13-3-6"/>
              <path d="M2 9h20"/>
            </svg>
            <h2 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="gradient-primary bg-clip-text text-transparent">
                Optify
              </span>
            </h2>
          </div>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Transforme a gestão das suas operações. Gerencie funcionários, pagamentos e relatórios em um só lugar.
          </p>

          {/* Teste gratuito */}
          <div className="glass rounded-xl p-4 max-w-lg mx-auto border border-primary/20">
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-muted-foreground">
                <span className="text-primary font-semibold">7 dias grátis</span> com o plano Medium
              </span>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-xl px-12 py-6" onClick={() => navigate('/signup')}>
              Começar Teste Gratuito
            </Button>
            <Button size="lg" variant="outline" className="text-xl px-12 py-6" onClick={() => scrollToId('plans')}>
              Ver Planos
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto pt-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="glass p-6 rounded-xl hover:shadow-glow transition-all animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Animated Features Marquee */}
      <section className="relative z-10 container mx-auto px-4 py-8">
        <div className="overflow-hidden rounded-xl border border-border/50">
          <div className="marquee flex gap-6 py-6">
            {[...Array(2)].flatMap(() => allFeatures).map((item, idx) => (
              <div key={idx} className="glass px-4 py-3 rounded-lg flex items-center gap-2 card-hover whitespace-nowrap">
                <item.icon className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teste Gratuito */}
      <section className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto animate-fade-in-scroll">
          <div className="glass rounded-2xl p-8 md:p-12 text-center border border-primary/20">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              <span className="text-primary">7 dias grátis</span> com o plano Medium
            </h3>
            
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Experimente todas as funcionalidades premium sem compromisso. Acesse recursos ilimitados, suporte prioritário e muito mais.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span>Funcionários ilimitados</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span>Suporte prioritário 24h</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span>Recursos exclusivos</span>
              </div>
            </div>
            
            <Button size="lg" className="text-xl px-12 py-6" onClick={() => navigate('/signup')}>
              Começar Teste Gratuito
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">
              Sem cartão de crédito • Cancele quando quiser
            </p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-12 animate-fade-in-scroll">
          <h3 className="text-3xl md:text-4xl font-bold mb-3">Planos para cada estágio</h3>
          <p className="text-muted-foreground text-lg">Escolha o plano ideal e comece agora mesmo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto animate-fade-in-scroll">
          {dynamicPlans.map((plan: any, index: number) => (
            <div
              key={index}
              className="relative rounded-2xl overflow-hidden border border-border hover:shadow-glow transition-all"
            >
              {/* Badge removido dos planos Free e Medium */}
              
              <div className={`glass p-6 ${plan.badge ? 'pt-12' : ''} h-full flex flex-col`}>
                {/* Ícone e nome */}
                <div className="text-center mb-6">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
                    plan.name === 'Free' ? 'bg-gray-500/20' :
                    plan.name === 'Standard' ? 'bg-blue-500/20' :
                    plan.name === 'Medium' ? 'bg-green-500/20' :
                    'bg-purple-500/20'
                  }`}>
                    <plan.icon className={`h-6 w-6 ${
                      plan.name === 'Free' ? 'text-gray-400' :
                      plan.name === 'Standard' ? 'text-blue-400' :
                      plan.name === 'Medium' ? 'text-green-400' :
                      'text-purple-400'
                    }`} />
                  </div>
                  <h4 className="text-xl font-bold mb-1">{plan.name}</h4>
                  {plan.name === 'Free' && (
                    <div className="text-2xl font-bold text-green-400">Grátis</div>
                  )}
                </div>

                {/* Preço */}
                {plan.name !== 'Free' && (
                  <div className="text-center mb-6">
                    <div className="text-3xl font-extrabold">
                      R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-muted-foreground">{plan.period}</div>
                  </div>
                )}

                {/* Funcionalidades */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {(plan.features || []).map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

              </div>
            </div>
          ))}
        </div>

        {/* Botão de teste gratuito */}
        <div className="text-center mt-16 mb-8">
          <Button 
            size="lg" 
            className="text-xl px-12 py-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" 
            onClick={() => navigate('/signup')}
          >
            Começar 7 dias grátis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Metrics */}
      <section id="metrics" className="relative z-10 container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto animate-fade-in-scroll">
          {[
            { label: 'Usuários ativos', value: '250+' },
            { label: 'Transações/mês', value: '120K+' },
            { label: 'Tempo economizado', value: '80h+' },
            { label: 'Satisfação', value: '98%+' },
          ].map((m, i) => (
            <div key={i} className="glass rounded-xl p-6 text-center card-hover">
              <div className="text-3xl font-extrabold mb-1">{m.value}</div>
              <div className="text-sm text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials removido */}

      {/* FAQ */}
      <section id="faq" className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-10 animate-fade-in-scroll">
          <h3 className="text-3xl md:text-4xl font-bold mb-3">Perguntas frequentes</h3>
          <p className="text-muted-foreground">Tudo o que você precisa saber para começar</p>
        </div>
        <div className="max-w-4xl mx-auto animate-fade-in-scroll">
          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="item-1" className="glass rounded-xl px-4">
              <AccordionTrigger>Posso começar grátis e mudar depois?</AccordionTrigger>
              <AccordionContent>Sim. Você pode começar no plano gratuito e migrar para outro quando quiser. Não há taxas de cancelamento ou multas.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="glass rounded-xl px-4">
              <AccordionTrigger>Como funciona o fechamento diário?</AccordionTrigger>
              <AccordionContent>Todos os dias às 00:00 salvamos automaticamente um resumo das transações no seu histórico. Você também pode fazer fechamentos manuais quando necessário.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="glass rounded-xl px-4">
              <AccordionTrigger>Quais são os planos disponíveis?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <p><strong>Free:</strong> Até 1 funcionário, dashboard básico, resumo do dia e visualização de transações.</p>
                  <p><strong>Standard:</strong> Até 5 funcionários, relatórios básicos e suporte por email.</p>
                  <p><strong>Medium:</strong> Até 10 funcionários, pagamentos, saldos, histórico completo e relatórios avançados.</p>
                  <p><strong>Ultimate:</strong> Funcionários ilimitados, todas as funcionalidades, suporte prioritário e recursos exclusivos.</p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="glass rounded-xl px-4">
              <AccordionTrigger>Como faço para cancelar minha assinatura?</AccordionTrigger>
              <AccordionContent>Você pode cancelar sua assinatura a qualquer momento através do seu painel de controle. Não há taxas de cancelamento e você continuará tendo acesso até o final do período pago.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5" className="glass rounded-xl px-4">
              <AccordionTrigger>Posso importar dados de outros sistemas?</AccordionTrigger>
              <AccordionContent>Sim! Oferecemos importação em CSV/Excel para funcionários e transações. Nossa equipe também pode ajudar com migrações de dados mais complexas nos planos pagos.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-6" className="glass rounded-xl px-4">
              <AccordionTrigger>Há limite de transações por mês?</AccordionTrigger>
              <AccordionContent>O plano Free tem limite de 50 transações por mês. Os planos pagos têm limites mais altos ou ilimitados, dependendo do plano escolhido.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-7" className="glass rounded-xl px-4">
              <AccordionTrigger>Como funciona o suporte técnico?</AccordionTrigger>
              <AccordionContent>Oferecemos suporte via WhatsApp para todos os planos. Planos pagos têm suporte prioritário e resposta mais rápida. O plano Ultimate inclui suporte dedicado.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-8" className="glass rounded-xl px-4">
              <AccordionTrigger>Meus dados estão seguros?</AccordionTrigger>
              <AccordionContent>Sim. Utilizamos criptografia de ponta a ponta e seguimos as melhores práticas de segurança da indústria para proteger seus dados e informações financeiras.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-10 animate-fade-in-scroll">
          <h3 className="text-3xl md:text-4xl font-bold mb-3">Fale com a gente</h3>
          <p className="text-muted-foreground">Entre em contato pelos nossos canais oficiais</p>
        </div>
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in-scroll">
          <a
            href="https://wa.me/556295536121"
            target="_blank"
            rel="noreferrer"
            className="glass rounded-xl p-6 flex items-center gap-3 hover:shadow-glow transition-all"
          >
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
            <div>
              <div className="font-semibold">WhatsApp</div>
              <div className="text-sm text-muted-foreground">Atendimento rápido</div>
            </div>
          </a>

          <a
            href="https://instagram.com/optify"
            target="_blank"
            rel="noreferrer"
            className="glass rounded-xl p-6 flex items-center gap-3 hover:shadow-glow transition-all"
          >
            <Instagram className="h-6 w-6 text-white" />
            <div>
              <div className="font-semibold">Instagram</div>
              <div className="text-sm text-muted-foreground">Acompanhe as novidades</div>
            </div>
          </a>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-4 py-20">
        <div className="glass rounded-2xl p-8 md:p-12 text-center border border-primary/20 max-w-4xl mx-auto space-y-6 animate-fade-in-scroll">
            {/* Diamond icon */}
            <div className="flex justify-center mb-4">
              <svg 
                className="w-16 h-16 text-primary animate-pulse" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5"
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M6 3h12l4 6-10 13L2 9l4-6z"/>
                <path d="M11 3 8 9l4 13 4-13-3-6"/>
                <path d="M2 9h20"/>
              </svg>
            </div>
            
            <h3 className="text-4xl md:text-5xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Pronto para transformar
              </span>
              <br />
              <span className="text-foreground">
                a gestão das suas operações?
              </span>
            </h3>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Junte-se a centenas de usuários que já usam o Optify para revolucionar sua gestão
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 py-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">250+</div>
                <div className="text-sm text-muted-foreground">Usuários ativos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">98%</div>
                <div className="text-sm text-muted-foreground">Satisfação</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">24h</div>
                <div className="text-sm text-muted-foreground">Suporte</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-10 py-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" 
              onClick={() => navigate('/signup')}
            >
              Começar Teste Gratuito
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-10 py-6 border-primary/50 hover:border-primary hover:bg-primary/10 transition-all duration-300" 
                onClick={() => navigate('/login')}
              >
                Já tenho conta
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground pt-4">
              Sem compromisso • Comece grátis • Cancele quando quiser
            </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Optify. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="/termos" className="hover:text-primary transition-colors">Termos</a>
              <a href="/privacidade" className="hover:text-primary transition-colors">Privacidade</a>
              <a href="/suporte" className="hover:text-primary transition-colors">Suporte</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
