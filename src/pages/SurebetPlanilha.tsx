import DashboardLayout from '@/components/layout/DashboardLayout';
import { SurebetSpreadsheet } from '@/components/surebet/SurebetSpreadsheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SurebetPlanilha = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Badge className="rounded-full bg-primary/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary mb-4">
              Surebet
            </Badge>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/surebet')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold">Planilha de Registros</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Visualize e gerencie todas as suas operações de Surebet
            </p>
          </div>
        </div>

        <SurebetSpreadsheet />
      </div>
    </DashboardLayout>
  );
};

export default SurebetPlanilha;

