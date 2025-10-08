import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Target, Check } from 'lucide-react';
import { UserConfigService } from '@/core/services/user-config.service';
import { UserPlatformService } from '@/core/services/user-specific.service';

const InitialSetup = () => {
  const [monthlyGoal, setMonthlyGoal] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();

  const mainPlatforms = [
    { name: 'Pixbet', color: 'rgb(173, 216, 230)' },
    { name: 'Betano', color: 'rgb(255, 102, 0)' },
    { name: 'Mcgames', color: 'rgb(220, 20, 60)' },
    { name: 'Kto', color: 'rgb(200, 0, 0)' },
    { name: 'Realsbet', color: 'rgb(0, 255, 200)' },
    { name: 'Vaidebet', color: 'rgb(255, 215, 0)' },
    { name: 'Sportingbet', color: 'rgb(70, 130, 180)' },
    { name: 'Superbet', color: 'rgb(255, 51, 102)' },
    { name: 'Betao', color: 'rgb(255, 165, 80)' },
    { name: 'Bet365', color: 'rgb(0, 128, 64)' },
    { name: 'Esportivabet', color: 'rgb(255, 140, 0)' },
    { name: 'Hiperbet', color: 'rgb(220, 0, 0)' },
    { name: 'Luvabet', color: 'rgb(173, 255, 47)' },
    { name: 'Cassinopix', color: 'rgb(135, 206, 235)' },
    { name: 'Multibet', color: 'rgb(72, 61, 139)' }
  ];

  const handlePlatformToggle = (platformName: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformName)
        ? prev.filter(p => p !== platformName)
        : [...prev, platformName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!monthlyGoal || selectedPlatforms.length === 0) {
      toast.error('Por favor, defina sua meta mensal e selecione pelo menos uma plataforma');
      return;
    }

    setLoading(true);

    try {
      if (!user?.uid) {
        toast.error('Usuário não autenticado');
        return;
      }

      // 1) Salvar configuração inicial (meta e lista de selecionadas)
      await UserConfigService.saveInitialSetup(user.uid, {
        monthlyGoal: Number(monthlyGoal),
        selectedPlatforms,
        setupCompleted: true
      });

      // 2) Criar/ativar plataformas escolhidas na subcoleção users/{uid}/platforms
      const existing = await UserPlatformService.getPlatforms(user.uid);
      const nameToPlatform: Record<string, any> = {};
      (existing || []).forEach((p: any) => {
        nameToPlatform[(p.name || '').toLowerCase()] = p;
      });

      const creationPromises = selectedPlatforms.map(async (name) => {
        const selected = mainPlatforms.find(p => p.name === name);
        const color = selected?.color || '#FF5C00';
        const key = name.toLowerCase();
        const already = nameToPlatform[key];
        if (already?.id) {
          // já existe: garantir que está ativa e com a cor correta
          return UserPlatformService.updatePlatform(user.uid, already.id, { isActive: true, color });
        }
        // criar nova plataforma ativa
        return UserPlatformService.createPlatform(user.uid, { name, color, isActive: true } as any);
      });
      await Promise.all(creationPromises);

      toast.success('Configuração inicial concluída!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erro ao salvar configurações. Tente novamente.');
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

      <div className="w-full max-w-2xl p-8 relative z-10">
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
          
          <p className="text-muted-foreground text-lg">Configure suas preferências</p>
          
          {/* Decorative Line */}
          <div className="w-16 h-0.5 bg-gradient-primary mx-auto mt-4 rounded-full" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Meta Mensal */}
          <Card className="p-6 border border-primary/20 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Meta Mensal</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyGoal" className="text-sm font-medium text-foreground">
                Defina sua meta de lucro mensal (R$)
              </Label>
              <Input
                id="monthlyGoal"
                type="number"
                placeholder="Ex: 5000"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(e.target.value)}
                className="h-12 border-border/50 focus:border-primary transition-colors"
                required
                min="1"
              />
            </div>
          </Card>

          {/* Seleção de Plataformas */}
          <Card className="p-6 border border-primary/20 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Plataformas Principais</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Selecione as plataformas que você mais utiliza. Elas aparecerão na aba Saldos.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {mainPlatforms.map((platform) => (
                <button
                  key={platform.name}
                  type="button"
                  onClick={() => handlePlatformToggle(platform.name)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${
                    selectedPlatforms.includes(platform.name)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 bg-background/50 text-foreground hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: platform.color }}
                    />
                    {platform.name}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground">
              {selectedPlatforms.length} plataforma(s) selecionada(s)
            </div>
          </Card>

          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-primary hover:bg-gradient-accent text-primary-foreground font-semibold shadow-glow transition-all duration-300" 
            disabled={loading}
          >
            {loading ? 'Configurando...' : 'Finalizar Configuração'}
          </Button>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Passo 2 de 2 - Configurações avançadas</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InitialSetup;
