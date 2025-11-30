import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, TrendingUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useTransactions, useAllDailySummaries } from '@/hooks/useFirestore';
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
  const { data: dailySummaries = [] } = useAllDailySummaries(user?.uid || '');

  // CORREÇÃO: Usar a mesma lógica do Dashboard
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Filtrar fechamentos diários do mês atual
  const monthlySummaries = dailySummaries.filter((summary: any) => {
    const summaryDate = new Date(summary.date);
    return summaryDate.getFullYear() === currentYear && summaryDate.getMonth() === currentMonth;
  });

  // Somar lucros dos fechamentos diários
  const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
    return total + (summary.profit || summary.margin || 0);
  }, 0);

  // Filtrar apenas transações que NÃO estão em fechamentos diários
  const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));
  const openTransactions = monthlyTransactions.filter((transaction: any) => {
    const transactionDate = transaction.date;

    // Se o dia está fechado, não processar transações individuais
    if (closedDates.has(transactionDate)) {
      return false;
    }

    // Verificar se é uma transação de FreeBet
    const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');

    // Se é FreeBet e já existe resumo diário para aquela data (que já inclui o FreeBet), excluir
    // O resumo diário já foi somado em monthlyRevenueFromSummaries e inclui o FreeBet
    if (isFreeBet) {
      const summaryForDate = monthlySummaries.find((s: any) => s.date === transactionDate);
      if (summaryForDate) {
        return false; // Excluir transação FreeBet porque já está no resumo diário
      }
    }

    // Verificar se é uma transação de Surebet
    const isSurebet = transaction.description && transaction.description.startsWith('Surebet');

    // Se é Surebet e já existe resumo diário para aquela data (que já inclui o Surebet), excluir
    // O resumo diário já foi somado em monthlyRevenueFromSummaries e inclui o Surebet
    if (isSurebet) {
      const summaryForDate = monthlySummaries.find((s: any) => s.date === transactionDate);
      if (summaryForDate) {
        return false; // Excluir transação Surebet porque já está no resumo diário
      }
    }

    return true;
  });

  const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
    // Verificar se é uma transação de Surebet (sempre contribui positivamente para o lucro)
    const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
    let transactionProfit;
    if (isSurebet) {
      // Surebet sempre adiciona lucro positivo, mesmo sendo tipo 'deposit'
      transactionProfit = transaction.amount;
    } else {
      // Para outras transações, usar lógica normal
      transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
    }
    return total + transactionProfit;
  }, 0);

  const monthlyProfit = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;

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

  return (
    <Card className="p-4 lg:p-6 shadow-card hover:shadow-glow transition-all duration-300 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Meta Mensal
          </p>
          <p className="text-2xl lg:text-3xl font-bold leading-tight flex items-baseline gap-2">
            R$ {monthlyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal text-muted-foreground">objetivo</span>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="p-3 lg:p-4 bg-gradient-primary rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-300 cursor-pointer flex-shrink-0 ml-4 group/btn relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
              <Target className="h-5 w-5 lg:h-6 lg:w-6 text-primary-foreground relative z-10" />
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

      <div className="space-y-3 mb-4 relative z-10">
        <div className="flex justify-between text-sm items-end">
          <span className="text-muted-foreground">Progresso Atual</span>
          <div className="text-right">
            <span className="font-bold text-primary text-lg">{progress.toFixed(1)}%</span>
          </div>
        </div>

        {/* Barra de progresso customizada com brilho */}
        <div className="relative w-full h-4 bg-muted/50 rounded-full overflow-hidden border border-border/50">
          <div
            className="absolute top-0 left-0 h-full gradient-primary transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(255,165,0,0.5)]"
            style={{
              width: `${Math.min(progress, 100)}%`,
              minWidth: progress > 0 ? '2px' : '0px'
            }}
          >
            {/* Efeito de brilho passando (shimmer) */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] -skew-x-12" />
          </div>

          {progress > 100 && (
            <div className="absolute top-0 left-0 h-full gradient-success transition-all duration-1000 ease-out rounded-full w-full opacity-50" />
          )}
        </div>

        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>R$ {monthlyProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} alcançados</span>
          <span>Faltam R$ {Math.max(0, monthlyGoal - monthlyProfit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </Card>
  );
};

export default MonthlyGoalCard;
