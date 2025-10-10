import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { UserSubcollectionsService } from './user-subcollections.service';

export interface PlanTransaction {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId: string;
  createdAt: any;
  updatedAt: any;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  growthRate: number;
  planDistribution: {
    free: number;
    standard: number;
    medium: number;
    ultimate: number;
  };
  recentActivity: Array<{
    action: string;
    time: string;
    userEmail?: string;
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  status: 'active' | 'inactive';
  createdAt: any;
  lastLogin?: any;
}

/**
 * Busca todos os usuários do sistema para o painel admin
 */
export const getAllUsers = async (): Promise<AdminUser[]> => {
  try {
    // Buscar todos os documentos da coleção 'users'
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users: AdminUser[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Buscar informações básicas do usuário
      const basicInfo = await UserSubcollectionsService.getDocument(
        userId, 
        'profile', 
        'basic'
      );

      // Buscar configuração do plano
      const config = await UserSubcollectionsService.getDocument(
        userId, 
        'config', 
        'initial'
      );

      users.push({
        id: userId,
        email: userData.email || userDoc.id,
        name: basicInfo?.name || 'Nome não informado',
        plan: config?.currentPlan || 'free',
        status: 'active', // Por padrão, assumimos ativo
        createdAt: userData.createdAt,
        lastLogin: userData.lastLoginAt
      });
    }

    return users.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
      }
      return 0;
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    throw error;
  }
};

/**
 * Busca todas as transações de planos
 */
export const getPlanTransactions = async (): Promise<PlanTransaction[]> => {
  try {
    const transactionsSnapshot = await getDocs(
      query(
        collection(db, 'transactions_plans'),
        orderBy('createdAt', 'desc')
      )
    );

    return transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PlanTransaction[];
  } catch (error) {
    console.error('Erro ao buscar transações de planos:', error);
    throw error;
  }
};

/**
 * Calcula estatísticas do sistema para o painel admin
 */
export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    const users = await getAllUsers();
    const transactions = await getPlanTransactions();

    // Calcular estatísticas
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;

    // Calcular receita total das transações completadas
    const totalRevenue = transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calcular distribuição de planos
    const planDistribution = users.reduce((acc, user) => {
      acc[user.plan as keyof typeof acc] = (acc[user.plan as keyof typeof acc] || 0) + 1;
      return acc;
    }, { free: 0, standard: 0, medium: 0, ultimate: 0 });

    // Calcular taxa de crescimento (usuários novos nos últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = users.filter(user => 
      user.createdAt && user.createdAt.toDate() > thirtyDaysAgo
    ).length;
    
    const growthRate = totalUsers > 0 ? (recentUsers / totalUsers) * 100 : 0;

    // Gerar atividade recente
    const recentActivity = await generateRecentActivity(transactions, users);

    return {
      totalUsers,
      activeUsers,
      totalRevenue,
      growthRate,
      planDistribution,
      recentActivity
    };
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    throw error;
  }
};

/**
 * Gera lista de atividades recentes
 */
const generateRecentActivity = async (
  transactions: PlanTransaction[], 
  users: AdminUser[]
): Promise<AdminStats['recentActivity']> => {
  const activities: AdminStats['recentActivity'] = [];

  // Adicionar transações recentes
  const recentTransactions = transactions
    .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
    .slice(0, 5);

  for (const transaction of recentTransactions) {
    const user = users.find(u => u.id === transaction.userId);
    const timeAgo = getTimeAgo(transaction.createdAt.toDate());
    
    let action = '';
    switch (transaction.status) {
      case 'completed':
        action = `Upgrade para ${transaction.planName}`;
        break;
      case 'pending':
        action = `Pagamento pendente - ${transaction.planName}`;
        break;
      case 'failed':
        action = `Falha no pagamento - ${transaction.planName}`;
        break;
      default:
        action = `Transação ${transaction.status} - ${transaction.planName}`;
    }

    activities.push({
      action: `${action} - ${user?.email || 'Usuário desconhecido'}`,
      time: timeAgo,
      userEmail: user?.email
    });
  }

  // Adicionar novos usuários recentes
  const recentUsers = users
    .filter(u => u.createdAt && u.createdAt.toDate() > new Date(Date.now() - 24 * 60 * 60 * 1000))
    .slice(0, 3);

  for (const user of recentUsers) {
    const timeAgo = getTimeAgo(user.createdAt.toDate());
    activities.push({
      action: `Novo usuário registrado - ${user.email}`,
      time: timeAgo,
      userEmail: user.email
    });
  }

  return activities.sort((a, b) => {
    // Ordenar por tempo (mais recente primeiro)
    return b.time.localeCompare(a.time);
  }).slice(0, 8);
};

/**
 * Calcula tempo relativo (ex: "2 min atrás")
 */
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes} min atrás`;
  } else if (diffHours < 24) {
    return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
  } else {
    return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
  }
};
