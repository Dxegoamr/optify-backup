import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  bestDay: string;
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  lastUpdated: admin.firestore.Timestamp;
}

interface DailySummary {
  date: string;
  totalRevenue: number;
  totalTransactions: number;
  activeUsers: number;
  newUsers: number;
  churnUsers: number;
}

/**
 * Calcula estatísticas globais do sistema
 */
async function calculateGlobalStats(): Promise<AdminStats> {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Buscar usuários
    const usersSnap = await db.collection('users').get();
    const totalUsers = usersSnap.size;
    const activeUsers = usersSnap.docs.filter(doc => {
      const data = doc.data();
      return data.isActive === true || data.subscription?.active === true;
    }).length;

    // Buscar transações
    const transactionsSnap = await db.collection('transactions_plans').get();
    const totalTransactions = transactionsSnap.size;
    
    const completedTransactions = transactionsSnap.docs.filter(doc => 
      doc.data().status === 'completed'
    ).length;
    
    const pendingTransactions = transactionsSnap.docs.filter(doc => 
      doc.data().status === 'pending'
    ).length;
    
    const failedTransactions = transactionsSnap.docs.filter(doc => 
      doc.data().status === 'failed' || doc.data().status === 'cancelled'
    ).length;

    // Calcular receitas
    const allTransactions = transactionsSnap.docs.map(doc => ({
      amount: doc.data().amount || 0,
      createdAt: doc.data().createdAt,
      status: doc.data().status,
    }));

    const totalRevenue = allTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const revenueToday = allTransactions
      .filter(t => {
        if (t.status !== 'completed' || !t.createdAt) return false;
        const transactionDate = t.createdAt.toDate();
        return transactionDate >= startOfDay;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const revenueWeek = allTransactions
      .filter(t => {
        if (t.status !== 'completed' || !t.createdAt) return false;
        const transactionDate = t.createdAt.toDate();
        return transactionDate >= startOfWeek;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const revenueMonth = allTransactions
      .filter(t => {
        if (t.status !== 'completed' || !t.createdAt) return false;
        const transactionDate = t.createdAt.toDate();
        return transactionDate >= startOfMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Encontrar melhor dia (maior receita em um único dia)
    const dailyRevenue: Record<string, number> = {};
    allTransactions
      .filter(t => t.status === 'completed' && t.createdAt)
      .forEach(t => {
        const date = t.createdAt.toDate().toISOString().split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + t.amount;
      });

    const bestDay = Object.entries(dailyRevenue)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    const stats: AdminStats = {
      totalUsers,
      activeUsers,
      totalRevenue,
      revenueToday,
      revenueWeek,
      revenueMonth,
      bestDay,
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      failedTransactions,
      lastUpdated: admin.firestore.Timestamp.now(),
    };

    logger.info('Estatísticas globais calculadas', stats);
    return stats;
  } catch (error) {
    logger.error('Erro ao calcular estatísticas globais:', error);
    throw error;
  }
}

/**
 * Calcula resumo diário
 */
async function calculateDailySummary(date: string): Promise<DailySummary> {
  try {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Buscar transações do dia
    const transactionsSnap = await db.collection('transactions_plans')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<', endOfDay)
      .get();

    const totalRevenue = transactionsSnap.docs
      .filter(doc => doc.data().status === 'completed')
      .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

    const totalTransactions = transactionsSnap.size;

    // Buscar usuários ativos no dia
    const usersSnap = await db.collection('users')
      .where('subscriptionEndDate', '>=', startOfDay)
      .get();

    const activeUsers = usersSnap.docs.filter(doc => {
      const data = doc.data();
      return data.isActive === true || data.subscription?.active === true;
    }).length;

    // Usuários novos no dia
    const newUsersSnap = await db.collection('users')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<', endOfDay)
      .get();

    const newUsers = newUsersSnap.size;

    // Usuários que churnaram (assinatura expirou)
    const churnUsersSnap = await db.collection('users')
      .where('subscriptionEndDate', '>=', startOfDay)
      .where('subscriptionEndDate', '<', endOfDay)
      .where('isActive', '==', false)
      .get();

    const churnUsers = churnUsersSnap.size;

    const summary: DailySummary = {
      date,
      totalRevenue,
      totalTransactions,
      activeUsers,
      newUsers,
      churnUsers,
    };

    logger.info('Resumo diário calculado', summary);
    return summary;
  } catch (error) {
    logger.error('Erro ao calcular resumo diário:', error);
    throw error;
  }
}

/**
 * Atualiza estatísticas quando uma transação é criada
 */
export const onTransactionCreated = onDocumentCreated(
  {
    document: 'transactions_plans/{transactionId}',
    memory: '256MiB',
  },
  async (event) => {
    try {
      const transactionData = event.data?.data();
      if (!transactionData) return;

      logger.info('Nova transação criada, atualizando estatísticas', {
        transactionId: event.params.transactionId,
        amount: transactionData.amount,
        status: transactionData.status,
      });

      // Recalcular estatísticas globais
      const stats = await calculateGlobalStats();
      await db.collection('admin_stats').doc('global').set(stats);

      // Se for transação aprovada, atualizar resumo diário
      if (transactionData.status === 'completed' && transactionData.createdAt) {
        const date = transactionData.createdAt.toDate().toISOString().split('T')[0];
        const dailySummary = await calculateDailySummary(date);
        await db.collection('daily_summaries').doc(date).set(dailySummary);
      }
    } catch (error) {
      logger.error('Erro ao processar nova transação:', error);
    }
  }
);

/**
 * Atualiza estatísticas quando uma transação é atualizada
 */
export const onTransactionUpdated = onDocumentUpdated(
  {
    document: 'transactions_plans/{transactionId}',
    memory: '256MiB',
  },
  async (event) => {
    try {
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

      if (!beforeData || !afterData) return;

      // Só recalcular se o status mudou
      if (beforeData.status === afterData.status) return;

      logger.info('Transação atualizada, recalculando estatísticas', {
        transactionId: event.params.transactionId,
        oldStatus: beforeData.status,
        newStatus: afterData.status,
      });

      // Recalcular estatísticas globais
      const stats = await calculateGlobalStats();
      await db.collection('admin_stats').doc('global').set(stats);

      // Atualizar resumo diário se necessário
      if (afterData.createdAt) {
        const date = afterData.createdAt.toDate().toISOString().split('T')[0];
        const dailySummary = await calculateDailySummary(date);
        await db.collection('daily_summaries').doc(date).set(dailySummary);
      }
    } catch (error) {
      logger.error('Erro ao processar atualização de transação:', error);
    }
  }
);

/**
 * Atualiza estatísticas quando um usuário é criado ou atualizado
 */
export const onUserUpdated = onDocumentUpdated(
  {
    document: 'users/{userId}',
    memory: '256MiB',
  },
  async (event) => {
    try {
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

      if (!beforeData || !afterData) return;

      // Só recalcular se status ativo mudou
      if (beforeData.isActive === afterData.isActive) return;

      logger.info('Usuário atualizado, recalculando estatísticas', {
        userId: event.params.userId,
        oldActive: beforeData.isActive,
        newActive: afterData.isActive,
      });

      // Recalcular estatísticas globais
      const stats = await calculateGlobalStats();
      await db.collection('admin_stats').doc('global').set(stats);
    } catch (error) {
      logger.error('Erro ao processar atualização de usuário:', error);
    }
  }
);

/**
 * Recalcula todas as estatísticas diariamente
 */
export const recalculateStatsDaily = onSchedule(
  {
    schedule: '0 1 * * *', // Todo dia às 1h da manhã
    timeZone: 'America/Sao_Paulo',
    memory: '1GiB',
  },
  async () => {
    try {
      logger.info('Iniciando recálculo diário de estatísticas');

      // Recalcular estatísticas globais
      const stats = await calculateGlobalStats();
      await db.collection('admin_stats').doc('global').set(stats);

      // Recalcular resumo dos últimos 30 dias
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dailySummary = await calculateDailySummary(dateStr);
        await db.collection('daily_summaries').doc(dateStr).set(dailySummary);
      }

      logger.info('Recálculo diário de estatísticas concluído');
    } catch (error) {
      logger.error('Erro no recálculo diário de estatísticas:', error);
    }
  }
);

/**
 * Recalcula estatísticas semanais
 */
export const recalculateStatsWeekly = onSchedule(
  {
    schedule: '0 2 * * 1', // Toda segunda-feira às 2h
    timeZone: 'America/Sao_Paulo',
    memory: '1GiB',
  },
  async () => {
    try {
      logger.info('Iniciando recálculo semanal de estatísticas');

      // Recalcular estatísticas globais
      const stats = await calculateGlobalStats();
      await db.collection('admin_stats').doc('global').set(stats);

      // Calcular métricas semanais
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);

      const weeklyTransactions = await db.collection('transactions_plans')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<', endDate)
        .get();

      const weeklyRevenue = weeklyTransactions.docs
        .filter(doc => doc.data().status === 'completed')
        .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

      await db.collection('weekly_stats').doc('current').set({
        startDate,
        endDate,
        totalRevenue: weeklyRevenue,
        totalTransactions: weeklyTransactions.size,
        lastUpdated: admin.firestore.Timestamp.now(),
      });

      logger.info('Recálculo semanal de estatísticas concluído', {
        weeklyRevenue,
        totalTransactions: weeklyTransactions.size,
      });
    } catch (error) {
      logger.error('Erro no recálculo semanal de estatísticas:', error);
    }
  }
);
