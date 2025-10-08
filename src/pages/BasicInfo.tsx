import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import { UserBasicInfoService } from '@/core/services/user-basic-info.service';

const BasicInfo = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !phone.trim()) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      if (!user?.uid) {
        toast.error('Usuário não autenticado');
        return;
      }

      await UserBasicInfoService.saveBasicInfo(user.uid, { name, phone });
      
      toast.success('Informações básicas salvas!');
      navigate('/initial-setup');
    } catch (error) {
      toast.error('Erro ao salvar informações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl -top-48 -left-48 animate-float-slow" />
        <div className="absolute w-96 h-96 bg-secondary/20 rounded-full blur-3xl -bottom-48 -right-48 animate-float-reverse" />
        <div className="absolute w-64 h-64 bg-primary/10 rounded-full blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float-center" />
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-primary rounded-full animate-bounce delay-300" />
      <div className="absolute top-40 right-32 w-1 h-1 bg-secondary rounded-full animate-bounce delay-700" />
      <div className="absolute bottom-32 left-40 w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-1000" />
      <div className="absolute bottom-20 right-20 w-2 h-2 bg-secondary rounded-full animate-bounce delay-500" />

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
          
          <p className="text-muted-foreground text-lg">Complete suas informações básicas</p>
          
          {/* Decorative Line */}
          <div className="w-16 h-0.5 bg-gradient-primary mx-auto mt-4 rounded-full" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Nome completo
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Digite seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 border-border/50 focus:border-primary transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-foreground">
              Telefone
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
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-primary hover:bg-gradient-accent text-primary-foreground font-semibold shadow-glow transition-all duration-300" 
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Continuar'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Passo 1 de 2 - Informações básicas</p>
        </div>
      </div>
    </div>
  );
};

export default BasicInfo;
