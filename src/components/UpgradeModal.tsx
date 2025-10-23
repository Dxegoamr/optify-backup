import { useNavigate } from 'react-router-dom';
import { Crown, Zap, Shield, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  requiredPlan?: string;
}

export const UpgradeModal = ({ 
  isOpen, 
  onClose, 
  featureName = 'esta funcionalidade',
  requiredPlan = 'Premium'
}: UpgradeModalProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/planos');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center">
      {/* Overlay com blur apenas na área de conteúdo */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal posicionado apenas na área de conteúdo */}
      <div className="relative z-40 w-full max-w-[600px] mx-4 ml-20">
        <div className="bg-background border rounded-lg shadow-lg overflow-hidden">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background p-8 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-background/50 transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative bg-gradient-to-br from-primary to-primary/60 p-4 rounded-full">
                  <Crown className="h-12 w-12 text-primary-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  Funcionalidade Premium
                </h2>
                <p className="text-base text-muted-foreground">
                  Faça upgrade para desbloquear {featureName}
                </p>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-8 space-y-6">
            {/* Recursos Premium */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Por que fazer upgrade?
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Acesso completo</p>
                    <p className="text-sm text-muted-foreground">
                      Desbloqueie todas as funcionalidades avançadas
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Mais produtividade</p>
                    <p className="text-sm text-muted-foreground">
                      Gerencie seu negócio com ferramentas profissionais
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Crown className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Recursos avançados</p>
                    <p className="text-sm text-muted-foreground">
                      Acesse funcionalidades exclusivas do sistema
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Badge do plano necessário */}
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <Crown className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">
                Necessário: <span className="text-primary font-bold">{requiredPlan}</span> ou superior
              </p>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleUpgrade}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Crown className="h-4 w-4 mr-2" />
                Ver Planos
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};