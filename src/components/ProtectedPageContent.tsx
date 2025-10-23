import { ReactNode, useState, useEffect } from 'react';
import { usePlanLimitations } from '@/hooks/usePlanLimitations';
import { UpgradeModal } from '@/components/UpgradeModal';
import { PlanLimitations } from '@/core/services/plan-limitations.service';

interface ProtectedPageContentProps {
  children: ReactNode;
  requiredFeature: keyof PlanLimitations['features'];
  featureName: string;
  requiredPlan?: string;
}

export const ProtectedPageContent = ({ 
  children, 
  requiredFeature, 
  featureName,
  requiredPlan = 'Premium'
}: ProtectedPageContentProps) => {
  const { canAccess } = usePlanLimitations();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const hasAccess = canAccess(requiredFeature);

  useEffect(() => {
    // Mostrar modal automaticamente se não tiver acesso
    if (!hasAccess) {
      setShowUpgradeModal(true);
    }
  }, [hasAccess]);

  // Se não tiver acesso, mostrar apenas o modal (o conteúdo fica escondido)
  if (!hasAccess) {
    return (
      <>
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(true)} // Não permitir fechar clicando fora
          featureName={featureName}
          requiredPlan={requiredPlan}
        />
        
        {/* Overlay com blur para mostrar preview do conteúdo */}
        <div className="relative min-h-screen">
          <div className="absolute inset-0 z-10 backdrop-blur-md bg-background/50" />
          <div className="relative opacity-30 pointer-events-none">
            {children}
          </div>
        </div>
      </>
    );
  }

  // Se tiver acesso, mostrar o conteúdo normalmente
  return <>{children}</>;
};

