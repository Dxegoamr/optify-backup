import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { usePlanLimitations } from '@/hooks/usePlanLimitations';
import { canAccessPage } from '@/core/services/plan-limitations.service';
import { isAdminEmail } from '@/core/services/admin.service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlanLimitationGuardProps {
  children: React.ReactNode;
  requiredFeature: string;
  pageName: string;
}

const PlanLimitationGuard: React.FC<PlanLimitationGuardProps> = ({
  children,
  requiredFeature,
  pageName
}) => {
  const { user } = useFirebaseAuth();
  const navigate = useNavigate();
  const { currentPlan } = usePlanLimitations();

  // Se não há usuário, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar se tem acesso à página
  let hasAccess = canAccessPage(currentPlan, requiredFeature);
  
  // Se for página de admin e o usuário for admin hardcoded, permitir acesso
  if (requiredFeature === 'advancedPanel' && isAdminEmail(user?.email)) {
    hasAccess = true;
  }

  // TEMPORARIAMENTE PERMITIR ACESSO AO ADMIN PARA DEBUG
  if (requiredFeature === 'advancedPanel') {
    hasAccess = true;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Página bloqueada - mostrar tela de upgrade
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/95 p-4">
      <Card className="w-full max-w-2xl p-8 text-center shadow-2xl">
        <div className="space-y-6">
          {/* Ícone */}
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-gradient-primary/10">
              <Lock className="h-12 w-12 text-primary" />
            </div>
          </div>

          {/* Título */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Funcionalidade Bloqueada
            </h1>
            <p className="text-muted-foreground text-lg">
              {pageName} está disponível apenas em planos superiores
            </p>
          </div>

          {/* Plano Atual */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Plano atual:</span>
            <Badge variant="outline" className="capitalize">
              {currentPlan}
            </Badge>
          </div>

          {/* Benefícios */}
          <div className="bg-muted/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Com planos superiores você terá:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Relatórios avançados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Histórico completo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Controle de saldos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Mais funcionários</span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate('/planos')}
              className="flex items-center gap-2 bg-gradient-primary"
            >
              <Crown className="h-4 w-4" />
              Ver Planos Disponíveis
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </div>

          {/* Informação adicional */}
          <p className="text-xs text-muted-foreground">
            Faça upgrade agora e desbloqueie todas as funcionalidades avançadas
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PlanLimitationGuard;
