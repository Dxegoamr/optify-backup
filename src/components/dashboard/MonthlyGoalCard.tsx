import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useTransactions } from '@/hooks/useFirestore';
import { UserConfigService } from '@/core/services/user-config.service';
import { toast } from 'sonner';

const MonthlyGoalCard = () => {
  const queryClient = useQueryClient();
  const { user } = useFirebaseAuth();
  const [newGoal, setNewGoal] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  // Buscar meta do usuário
  const { data: userConfig } = useQuery({
    queryKey: ['user-config', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      return UserConfigService.getUserConfig(user.uid);
    },
    enabled: !!user?.uid
  });

  const [monthlyGoal, setMonthlyGoal] = useState(userConfig?.monthlyGoal || 10000);

  // Atualizar meta quando dados do usuário carregarem
  React.useEffect(() => {
    if (userConfig?.monthlyGoal) {
      setMonthlyGoal(userConfig.monthlyGoal);
    }
  }, [userConfig]);

  // Buscar transações do mês atual
  const currentDate = new Date();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = firstDay.toISOString().split('T')[0];
  const endDate = lastDay.toISOString().split('T')[0];
  
  const { data: monthlyTransactions = [] } = useTransactions(user?.uid || '', startDate, endDate);
  
  // Calcular lucro mensal
  const monthlyProfit = monthlyTransactions.reduce((total, transaction) => {
    if (transaction.type === 'deposit') {
      return total - transaction.amount; // Depósito é saída de dinheiro (negativo)
    } else {
      return total + transaction.amount; // Saque é entrada de dinheiro (positivo)
    }
  }, 0);

  const handleUpdateGoal = async () => {
    const goalValue = Number(newGoal);
    if (goalValue <= 0) {
      toast.error('A meta deve ser maior que zero');
      return;
    }
    
    try {
      // Atualizar meta com o novo serviço por usuário
      if (user?.uid) {
        await UserConfigService.updateMonthlyGoal(user.uid, goalValue);
      }
      
      setMonthlyGoal(goalValue);
      toast.success('Meta atualizada!');
      setDialogOpen(false);
      setNewGoal('');
      
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['user-config', user?.uid] });
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      toast.error('Erro ao atualizar meta. Tente novamente.');
    }
  };

  const progress = monthlyGoal > 0 ? Math.min((monthlyProfit / monthlyGoal) * 100, 100) : 0;
  
  // Debug temporário
  console.log('MonthlyGoalCard Debug:', { monthlyProfit, monthlyGoal, progress });

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Meta Mensal</p>
          <p className="text-3xl font-bold">R$ {monthlyGoal.toLocaleString('pt-BR')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="p-3 bg-gradient-primary rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-300 cursor-pointer">
              <Target className="h-6 w-6 text-primary-foreground" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Meta Mensal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Nova Meta (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleUpdateGoal}
              >
                Salvar Meta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-semibold text-primary">{progress.toFixed(1)}%</span>
        </div>
        
        {/* Barra de progresso customizada */}
        <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full gradient-primary transition-all duration-1000 ease-out rounded-full"
            style={{ 
              width: `${Math.min(progress, 100)}%`,
              minWidth: progress > 0 ? '2px' : '0px'
            }}
          />
          {progress > 100 && (
            <div className="absolute top-0 left-0 h-full gradient-success transition-all duration-1000 ease-out rounded-full w-full" />
          )}
        </div>
        
        <p className="text-sm text-muted-foreground">
          R$ {monthlyProfit.toLocaleString('pt-BR')} de R$ {monthlyGoal.toLocaleString('pt-BR')}
        </p>
      </div>

    </Card>
  );
};

export default MonthlyGoalCard;
