import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SurebetCalculator } from '@/components/surebet/SurebetCalculator';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { SurebetCalculator as SurebetCalculatorType } from '@/types/surebet';

const Surebet = () => {
  const navigate = useNavigate();

  const handleCalculate = (data: SurebetCalculatorType) => {
    // Mantém a funcionalidade de cálculo se necessário
  };

  const handleSpreadsheet = (data: SurebetCalculatorType) => {
    // A planilha agora é tratada diretamente no componente SurebetCalculator
    // Quando o usuário clicar em "Planilhar", será criado o registro e a transação
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Badge className="rounded-full bg-primary/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary mb-4">
              Surebet
            </Badge>
            <h1 className="text-3xl font-bold mb-2">Surebet</h1>
            <p className="text-muted-foreground">
              Calcule apostas seguras entre diferentes casas de apostas
            </p>
          </div>
          <Button 
            onClick={() => navigate('/surebet/planilha')}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Ver Planilha
          </Button>
        </div>

        {/* Calculadora */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Calculadora</h2>
          <SurebetCalculator
            onCalculate={handleCalculate}
            onSpreadsheet={handleSpreadsheet}
          />
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Surebet;

