import { useEffect, useRef } from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useQuery } from '@tanstack/react-query';
import { UserConfigService } from '@/core/services/user-config.service';
import { useTransactions, useEmployees, usePlatforms, useAllDailySummaries } from '@/hooks/useFirestore';
import { 
  sendGoalProgressNotification, 
  sendGoalReachedNotification,
  sendPaymentPendingNotification,
  sendPaymentOverdueNotification,
  sendNewEmployeeNotification,
  sendLowBalanceNotification,
  sendHighActivityNotification
} from '@/core/services/user-notifications.service';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

/**
 * Hook para monitorar eventos e disparar notificações automaticamente
 */
export const useNotificationMonitor = () => {
  const { user } = useFirebaseAuth();
  const lastNotifiedPercentages = useRef<Set<number>>(new Set());
  const notifiedEmployeeIds = useRef<Set<string>>(new Set());
  const lastTransactionCheck = useRef<number>(Date.now());
  const lastGoalCheck = useRef<{ month: number; year: number; percentages: Set<number> } | null>(null);

  // Buscar configurações do usuário
  const { data: userConfig } = useQuery({
    queryKey: ['user-config', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      return UserConfigService.getUserConfig(user.uid);
    },
    enabled: !!user?.uid,
  });

  // Buscar dados necessários
  const { data: transactions = [] } = useTransactions(user?.uid || '');
  const { data: employees = [] } = useEmployees(user?.uid || '');
  const { data: platforms = [] } = usePlatforms(user?.uid || '');
  const { data: dailySummaries = [] } = useAllDailySummaries(user?.uid || '');

  // Monitorar progresso da meta mensal
  useEffect(() => {
    if (!user?.uid || !userConfig?.monthlyGoal) return;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Carregar marcos notificados do localStorage
    const storageKey = `goal-notifications-${user.uid}-${currentYear}-${currentMonth}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.month === currentMonth && parsed.year === currentYear) {
          lastNotifiedPercentages.current = new Set(parsed.percentages);
          lastGoalCheck.current = {
            month: parsed.month,
            year: parsed.year,
            percentages: new Set(parsed.percentages)
          };
        } else {
          // Novo mês, limpar localStorage antigo
          localStorage.removeItem(storageKey);
          lastNotifiedPercentages.current.clear();
          lastGoalCheck.current = null;
        }
      } catch (e) {
        console.error('Erro ao carregar notificações do localStorage:', e);
        lastNotifiedPercentages.current.clear();
        lastGoalCheck.current = null;
      }
    } else {
      // Primeira vez neste mês
      lastNotifiedPercentages.current.clear();
      lastGoalCheck.current = null;
    }

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    // Calcular lucro mensal
    const monthlySummaries = dailySummaries.filter((summary: any) => {
      const summaryDate = summary.date?.toDate?.() || new Date(summary.date);
      return summaryDate >= firstDay && summaryDate <= lastDay;
    });

    const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
      return total + (summary.profit || summary.margin || 0);
    }, 0);

    const openTransactions = transactions.filter((t: any) => {
      const transactionDate = t.createdAt?.toDate?.() || new Date(t.createdAt);
      return transactionDate >= firstDay && transactionDate <= lastDay && t.status !== 'closed';
    });

    // Verificar se é uma transação de Surebet (sempre contribui positivamente para o lucro)
    const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
      const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
      if (isSurebet) {
        return total + transaction.amount;
      }
      return transaction.type === 'withdraw' ? total + transaction.amount : total - transaction.amount;
    }, 0);

    const monthlyProfit = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
    const goalValue = userConfig.monthlyGoal;
    const percentage = goalValue > 0 ? Math.min((monthlyProfit / goalValue) * 100, 100) : 0;

    // Verificar marcos de porcentagem (50%, 75%, 100%)
    const milestones = [50, 75, 100];
    let hasNewNotification = false;
    
    milestones.forEach(milestone => {
      if (percentage >= milestone && !lastNotifiedPercentages.current.has(milestone)) {
        // Enviar notificação apenas uma vez por marco
        lastNotifiedPercentages.current.add(milestone);
        hasNewNotification = true;
        
        if (milestone === 100 && monthlyProfit > goalValue) {
          sendGoalReachedNotification(user.uid, monthlyProfit, goalValue).catch(console.error);
        } else {
          sendGoalProgressNotification(user.uid, percentage, monthlyProfit, goalValue).catch(console.error);
        }
      }
    });

    // Salvar estado atual do mês no localStorage
    if (hasNewNotification || !lastGoalCheck.current) {
      lastGoalCheck.current = {
        month: currentMonth,
        year: currentYear,
        percentages: new Set(lastNotifiedPercentages.current)
      };
      
      // Persistir no localStorage (storageKey já foi definido acima)
      const saveStorageKey = `goal-notifications-${user.uid}-${currentYear}-${currentMonth}`;
      try {
        localStorage.setItem(saveStorageKey, JSON.stringify({
          month: currentMonth,
          year: currentYear,
          percentages: Array.from(lastNotifiedPercentages.current)
        }));
      } catch (e) {
        console.error('Erro ao salvar notificações no localStorage:', e);
      }
    }
  }, [user?.uid, userConfig?.monthlyGoal, dailySummaries, transactions]);

  // Monitorar pagamentos pendentes e atrasados
  useEffect(() => {
    if (!user?.uid || !employees.length) return;

    const today = new Date();
    employees.forEach((employee: any) => {
      if (employee.paymentStatus === 'pending' && employee.salary) {
        // Pagamento pendente
        sendPaymentPendingNotification(
          user.uid,
          employee.name,
          employee.salary
        ).catch(console.error);
      }

      // Verificar se há pagamento atrasado (baseado no dia de pagamento)
      if (employee.payDay && employee.salary && employee.paymentStatus === 'pending') {
        const payDay = parseInt(employee.payDay);
        const currentDay = today.getDate();
        
        if (currentDay > payDay) {
          const daysOverdue = currentDay - payDay;
          if (daysOverdue > 0) {
            sendPaymentOverdueNotification(
              user.uid,
              employee.name,
              employee.salary,
              daysOverdue
            ).catch(console.error);
          }
        }
      }
    });
  }, [user?.uid, employees]);

  // Monitorar novos funcionários (a notificação já é enviada no momento da criação)
  // Este hook apenas monitora eventos em tempo real, a criação já dispara notificação
  useEffect(() => {
    if (!user?.uid || !employees.length) return;
    
    // Registrar IDs de funcionários para evitar processamentos desnecessários
    employees.forEach((employee: any) => {
      if (employee.id) {
        notifiedEmployeeIds.current.add(employee.id);
      }
    });
  }, [user?.uid, employees]);

  // Monitorar saldos baixos
  useEffect(() => {
    if (!user?.uid || !platforms.length) return;

    platforms.forEach((platform: any) => {
      // Considerar saldo baixo se for menor que R$ 100
      if (platform.balance && platform.balance < 100) {
        sendLowBalanceNotification(
          user.uid,
          platform.name,
          platform.balance,
          platform.id
        ).catch(console.error);
      }
    });
  }, [user?.uid, platforms]);

  // Monitorar alta atividade
  useEffect(() => {
    if (!user?.uid) return;

    const now = Date.now();
    const timeSinceLastCheck = now - lastTransactionCheck.current;
    
    // Verificar a cada 30 minutos
    if (timeSinceLastCheck < 30 * 60 * 1000) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = transactions.filter((t: any) => {
      const transactionDate = t.createdAt?.toDate?.() || new Date(t.createdAt);
      return transactionDate >= today;
    });

    // Alta atividade: mais de 20 transações no dia
    if (todayTransactions.length > 20) {
      sendHighActivityNotification(user.uid, todayTransactions.length, 'hoje').catch(console.error);
    }

    lastTransactionCheck.current = now;
  }, [user?.uid, transactions]);

  return null; // Este hook não retorna nada, apenas monitora
};

