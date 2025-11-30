import { useNavigate } from 'react-router-dom';
import { Crown, Zap, Shield, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-30 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay com blur apenas na área de conteúdo */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal posicionado apenas na área de conteúdo */}
          <motion.div
            className="relative z-40 mx-4 ml-20 w-full max-w-[600px]"
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <div className="overflow-hidden rounded-lg border bg-background shadow-lg">
              {/* Header com gradiente */}
              <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-background p-8">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-background/50"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>

                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
                    <div className="relative rounded-full bg-gradient-to-br from-primary to-primary/60 p-4">
                      <Crown className="h-12 w-12 text-primary-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Funcionalidade Premium</h2>
                    <p className="text-base text-muted-foreground">
                      Faça upgrade para desbloquear {featureName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="space-y-6 p-8">
                {/* Recursos Premium */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Zap className="h-5 w-5 text-primary" />
                    Por que fazer upgrade?
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                      <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Acesso completo</p>
                        <p className="text-sm text-muted-foreground">
                          Desbloqueie todas as funcionalidades avançadas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                      <TrendingUp className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Mais produtividade</p>
                        <p className="text-sm text-muted-foreground">
                          Gerencie seu negócio com ferramentas profissionais
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                      <Crown className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Recursos avançados</p>
                        <p className="text-sm text-muted-foreground">
                          Acesse funcionalidades exclusivas do sistema
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badge do plano necessário */}
                <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/10 p-4">
                  <Crown className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">
                    Necessário: <span className="font-bold text-primary">{requiredPlan}</span> ou superior
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
                    <Crown className="mr-2 h-4 w-4" />
                    Ver Planos
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};