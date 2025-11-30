import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp, user } = useFirebaseAuth();

  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obrigatórios
    if (!phone.trim()) {
      toast.error('O número de celular é obrigatório');
      return;
    }

    // Validar formato do telefone (mínimo 10 caracteres para DDD + número)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      toast.error('Por favor, insira um número de celular válido (DDD + número)');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, '', phone.trim());
      toast.success('Cadastro realizado com sucesso!');
      navigate('/basic-info');
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está em uso. Faça login ou use outro e-mail.');
        setTimeout(() => navigate('/login'), 300);
      } else if (code === 'auth/invalid-email') {
        toast.error('E-mail inválido. Verifique e tente novamente.');
      } else if (code === 'auth/weak-password') {
        toast.error('Senha fraca. Use pelo menos 6 caracteres.');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* BG animado igual à landing */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[36rem] h-[36rem] bg-primary/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-[36rem] h-[36rem] bg-secondary/20 rounded-full blur-3xl top-1/2 right-0 animate-pulse" />
        <div className="absolute w-[36rem] h-[36rem] bg-primary/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" />
        <div className="orange-orb absolute w-96 h-96 left-[8%] top-[30%] animate-float-slow" />
        <div className="orange-orb absolute w-[28rem] h-[28rem] left-[55%] top-[10%] animate-float-reverse" />
        <div className="orange-orb absolute w-80 h-80 left-[72%] top-[70%] animate-float-center" />
        <div className="orange-orb absolute w-72 h-72 left-[22%] top-[75%] animate-float-reverse" />
        <div className="orange-beam absolute w-[140%] h-24 left-[-20%] top-[40%] animate-beam" />
      </div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          {/* Logo com Diamante */}
          <div className="flex flex-col items-center justify-center mb-6 relative">
            <div className="flex items-center justify-center mb-4">
              <button 
                onClick={() => navigate('/')}
                className="cursor-pointer hover:scale-105 transition-transform duration-200"
              >
                <svg 
                  className="w-16 h-16 text-primary mb-4" 
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
              </button>
              {/* Brilho ao lado da logo */}
              <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-primary/30 rounded-full blur-xl animate-pulse"></div>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="cursor-pointer hover:scale-105 transition-transform duration-200"
            >
              <h1 className="text-5xl font-black text-foreground tracking-tight mb-2">
                Optify
              </h1>
            </button>
          </div>
          <p className="text-muted-foreground text-sm">Crie sua conta e gerencie suas operações</p>
          
          {/* Decorative Line */}
          <div className="w-16 h-0.5 bg-gradient-primary mx-auto mt-4 rounded-full" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 border-border/50 focus:border-primary transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 border-border/50 focus:border-primary transition-colors"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 border-border/50 focus:border-primary transition-colors"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-foreground">
              Celular <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 border-border/50 focus:border-primary transition-colors"
              required
            />
            <p className="text-xs text-muted-foreground">O número de celular é obrigatório</p>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-primary hover:bg-gradient-accent text-primary-foreground font-semibold shadow-glow transition-all duration-300" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando conta...
              </>
            ) : (
              'Criar conta'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Já tem uma conta? </span>
          <button
            onClick={() => navigate('/login')}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Faça login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
