import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, user, resetPassword } = useFirebaseAuth();

  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast.error('Digite seu e-mail para recuperar a senha');
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(email);
      toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        toast.error('E-mail não encontrado. Verifique se o e-mail está correto.');
      } else if (error?.code === 'auth/invalid-email') {
        toast.error('E-mail inválido. Verifique o formato do e-mail.');
      } else {
        toast.error('Erro ao enviar e-mail de recuperação. Tente novamente.');
      }
    } finally {
      setResetLoading(false);
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
          
          <p className="text-muted-foreground text-sm">Entre na sua conta e gerencie suas operações</p>
          
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
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-primary hover:bg-gradient-accent text-primary-foreground font-semibold shadow-glow transition-all duration-300" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleResetPassword}
              disabled={resetLoading || !email.trim()}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {resetLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Esqueci minha senha'
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Não tem uma conta? </span>
          <button
            onClick={() => navigate('/signup')}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Cadastre-se
          </button>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <p className="font-semibold mb-1">Teste com:</p>
          <p>Email: admin@optify.com</p>
          <p>Senha: qualquer senha</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
