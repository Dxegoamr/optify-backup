import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlanLimitations } from '@/hooks/usePlanLimitations';

interface EmployeeLimitWarningProps {
  currentCount: number;
  showUpgrade?: boolean;
}

const EmployeeLimitWarning: React.FC<EmployeeLimitWarningProps> = ({
  currentCount,
  showUpgrade = true
}) => {
  const navigate = useNavigate();
  const { getEmployeeLimitForPlan, currentPlan, planInfo } = usePlanLimitations();
  
  const limit = getEmployeeLimitForPlan();
  const isAtLimit = currentCount >= limit;
  const remaining = limit - currentCount;

  if (!isAtLimit && remaining > 1) {
    return null; // Não mostrar se não está próximo do limite
  }

  return (
    <Alert variant={isAtLimit ? "destructive" : "default"} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            {isAtLimit ? (
              <>
                <p className="font-semibold">Limite de funcionários atingido!</p>
                <p className="text-sm">
                  Você atingiu o limite de {limit} funcionário{limit > 1 ? 's' : ''} do plano{' '}
                  <Badge variant="outline" className="capitalize ml-1">{currentPlan}</Badge>
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">Limite de funcionários quase atingido</p>
                <p className="text-sm">
                  Você pode adicionar apenas mais {remaining} funcionário{remaining > 1 ? 's' : ''}
                </p>
              </>
            )}
          </div>
        </div>
        
        {showUpgrade && (
          <Button
            size="sm"
            onClick={() => navigate('/planos')}
            className="flex items-center gap-2"
            variant={isAtLimit ? "default" : "outline"}
          >
            <Crown className="h-4 w-4" />
            {isAtLimit ? 'Fazer Upgrade' : 'Ver Planos'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default EmployeeLimitWarning;

