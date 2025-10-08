import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { TrendingUp, Shield, Zap, Users } from 'lucide-react';
import { useEffect } from 'react';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: TrendingUp,
      title: 'Gestão Financeira Completa',
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

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-secondary/20 rounded-full blur-3xl top-1/2 right-0 animate-pulse" />
        <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 backdrop-blur-sm">
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
      <section className="relative z-10 container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="gradient-primary bg-clip-text text-transparent">
              Optify
            </span>
            <br />
            <span className="text-foreground">
              Simplificada
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Controle completo do seu negócio. Gerencie funcionários, pagamentos e relatórios em um só lugar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8" onClick={() => navigate('/signup')}>
              Começar Gratuitamente
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => navigate('/planos')}>
              Ver Planos
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
              <span>Grátis para começar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
              <span>Sem cartão de crédito</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 container mx-auto px-4 py-20">
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

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-4 py-20">
        <div className="glass rounded-2xl p-12 text-center space-y-6 max-w-3xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold">
            Pronto para transformar sua gestão financeira?
          </h3>
          <p className="text-xl text-muted-foreground">
            Junte-se a centenas de empresas que já usam o Optify
          </p>
          <Button size="lg" className="text-lg px-8" onClick={() => navigate('/signup')}>
            Começar Agora
          </Button>
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
              <a href="#" className="hover:text-primary transition-colors">Termos</a>
              <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
              <a href="#" className="hover:text-primary transition-colors">Suporte</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
