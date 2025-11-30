import { doc, setDoc, serverTimestamp, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { isNotificationEnabled } from './notification-preferences.service';
import { toast } from 'sonner';

export interface UserNotification {
  id: string;
  userId: string;
  type: 
    | 'plan_change' 
    | 'admin_promotion' 
    | 'admin_demotion' 
    | 'system' 
    | 'payment' 
    | 'warning'
    | 'goal_50'
    | 'goal_75'
    | 'goal_100'
    | 'goal_reached'
    | 'payment_pending'
    | 'payment_overdue'
    | 'new_employee'
    | 'low_balance'
    | 'high_activity'
    | 'weekly_report';
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  metadata?: {
    oldPlan?: string;
    newPlan?: string;
    changedBy?: string;
    reason?: string;
    goalValue?: number;
    currentValue?: number;
    percentage?: number;
    employeeId?: string;
    employeeName?: string;
    paymentId?: string;
    amount?: number;
    platformId?: string;
    balance?: number;
  };
}

/**
 * Envia uma notificação para um usuário específico
 */
export const sendNotificationToUser = async (
  userId: string,
  notification: Omit<UserNotification, 'id' | 'userId' | 'read' | 'createdAt'>,
  checkPreferences: boolean = true
): Promise<void> => {
  try {
    // Verificar se a notificação está habilitada nas preferências do usuário
    if (checkPreferences) {
      const preferenceKey = getPreferenceKeyForType(notification.type);
      if (preferenceKey) {
        const isEnabled = await isNotificationEnabled(userId, preferenceKey);
        if (!isEnabled) {
          console.log(`Notificação ${notification.type} desabilitada para usuário ${userId}`);
          return;
        }
      }
    }

    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const notificationId = doc(notificationsRef).id;
    
    // Filtrar valores undefined para evitar erros do Firestore
    const cleanNotification = Object.fromEntries(
      Object.entries(notification).filter(([_, value]) => value !== undefined)
    );
    
    await setDoc(doc(notificationsRef, notificationId), {
      ...cleanNotification,
      id: notificationId,
      userId,
      read: false,
      createdAt: serverTimestamp()
    });
    
    console.log(`✅ Notificação enviada para usuário ${userId}:`, notification.title);
    
    // Mostrar toast visual também
    toast.info(notification.title, {
      description: notification.message,
      duration: 5000,
    });
  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error);
    throw error;
  }
};

/**
 * Mapeia o tipo de notificação para a chave de preferência
 */
const getPreferenceKeyForType = (type: UserNotification['type']): keyof import('./notification-preferences.service').NotificationPreferences | null => {
  const mapping: Record<string, keyof import('./notification-preferences.service').NotificationPreferences> = {
    'goal_50': 'goal50Percent',
    'goal_75': 'goal75Percent',
    'goal_100': 'goal100Percent',
    'goal_reached': 'goalReached',
    'payment_pending': 'paymentsPending',
    'payment_overdue': 'paymentOverdue',
    'new_employee': 'newEmployees',
    'low_balance': 'lowBalance',
    'high_activity': 'highActivity',
  };
  return mapping[type] || null;
};

/**
 * Envia notificação de alteração de plano
 */
export const sendPlanChangeNotification = async (
  userId: string,
  userEmail: string,
  oldPlan: string,
  newPlan: string,
  changedBy: string,
  reason?: string
): Promise<void> => {
  const planDisplayNames: Record<string, string> = {
    'free': 'Free',
    'standard': 'Standard',
    'medium': 'Medium',
    'ultimate': 'Ultimate'
  };

  const oldPlanName = planDisplayNames[oldPlan] || oldPlan;
  const newPlanName = planDisplayNames[newPlan] || newPlan;

  const notification: Omit<UserNotification, 'id' | 'userId' | 'read' | 'createdAt'> = {
    type: 'plan_change',
    title: 'Plano Alterado',
    message: `Seu plano foi alterado de ${oldPlanName} para ${newPlanName}${reason ? `. Motivo: ${reason}` : ''}.`,
    metadata: {
      oldPlan,
      newPlan,
      changedBy,
      ...(reason && { reason })
    }
  };

  await sendNotificationToUser(userId, notification);
};

/**
 * Envia notificação de promoção a admin
 */
export const sendAdminPromotionNotification = async (
  userId: string,
  promotedBy: string,
  reason?: string
): Promise<void> => {
  const notification: Omit<UserNotification, 'id' | 'userId' | 'read' | 'createdAt'> = {
    type: 'admin_promotion',
    title: 'Privilégios de Admin Concedidos',
    message: `Você foi promovido a administrador${reason ? `. Motivo: ${reason}` : ''}.`,
    metadata: {
      changedBy: promotedBy,
      ...(reason && { reason })
    }
  };

  await sendNotificationToUser(userId, notification);
};

/**
 * Envia notificação de remoção de admin
 */
export const sendAdminDemotionNotification = async (
  userId: string,
  demotedBy: string,
  reason?: string
): Promise<void> => {
  const notification: Omit<UserNotification, 'id' | 'userId' | 'read' | 'createdAt'> = {
    type: 'admin_demotion',
    title: 'Privilégios de Admin Removidos',
    message: `Seus privilégios de administrador foram removidos${reason ? `. Motivo: ${reason}` : ''}.`,
    metadata: {
      changedBy: demotedBy,
      ...(reason && { reason })
    }
  };

  await sendNotificationToUser(userId, notification);
};

/**
 * Busca notificações de um usuário
 */
export const getUserNotifications = async (userId: string, limitCount: number = 50): Promise<UserNotification[]> => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const notifications: UserNotification[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        read: data.read || false,
        createdAt: data.createdAt,
        metadata: data.metadata
      });
    });

    return notifications;
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return [];
  }
};

/**
 * Marca uma notificação como lida
 */
export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await setDoc(notificationRef, { read: true }, { merge: true });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    throw error;
  }
};

/**
 * Marca todas as notificações como lidas
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const notifications = await getUserNotifications(userId);
    const unreadNotifications = notifications.filter(n => !n.read);
    
    const promises = unreadNotifications.map(notification => 
      markNotificationAsRead(userId, notification.id)
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    throw error;
  }
};

/**
 * Envia notificação de progresso da meta (50%, 75%, 100%)
 */
export const sendGoalProgressNotification = async (
  userId: string,
  percentage: number,
  currentValue: number,
  goalValue: number
): Promise<void> => {
  let type: 'goal_50' | 'goal_75' | 'goal_100';
  let title: string;
  let message: string;

  if (percentage >= 100) {
    type = 'goal_100';
    title = '🎯 Meta Mensal Atingida!';
    message = `Parabéns! Você atingiu 100% da sua meta mensal de R$ ${goalValue.toLocaleString('pt-BR')}. Valor atual: R$ ${currentValue.toLocaleString('pt-BR')}`;
  } else if (percentage >= 75) {
    type = 'goal_75';
    title = '🚀 75% da Meta Atingida!';
    message = `Ótimo progresso! Você já atingiu 75% da sua meta mensal. Restam apenas 25% para alcançar R$ ${goalValue.toLocaleString('pt-BR')}. Valor atual: R$ ${currentValue.toLocaleString('pt-BR')}`;
  } else if (percentage >= 50) {
    type = 'goal_50';
    title = '📈 50% da Meta Atingida!';
    message = `Parabéns! Você já atingiu metade da sua meta mensal. Continue assim! Valor atual: R$ ${currentValue.toLocaleString('pt-BR')} de R$ ${goalValue.toLocaleString('pt-BR')}`;
  } else {
    return; // Não envia notificação abaixo de 50%
  }

  await sendNotificationToUser(userId, {
    type,
    title,
    message,
    metadata: {
      goalValue,
      currentValue,
      percentage,
    },
  });
};

/**
 * Envia notificação de meta completamente atingida
 */
export const sendGoalReachedNotification = async (
  userId: string,
  currentValue: number,
  goalValue: number
): Promise<void> => {
  await sendNotificationToUser(userId, {
    type: 'goal_reached',
    title: '🎉 Meta Mensal Superada!',
    message: `Incrível! Você não apenas atingiu, mas superou sua meta mensal! Valor atual: R$ ${currentValue.toLocaleString('pt-BR')} (meta: R$ ${goalValue.toLocaleString('pt-BR')})`,
    metadata: {
      goalValue,
      currentValue,
      percentage: 100,
    },
  });
};

/**
 * Envia notificação de pagamento pendente
 */
export const sendPaymentPendingNotification = async (
  userId: string,
  employeeName: string,
  amount: number,
  paymentId?: string
): Promise<void> => {
  await sendNotificationToUser(userId, {
    type: 'payment_pending',
    title: '💰 Pagamento Pendente',
    message: `O pagamento de ${employeeName} no valor de R$ ${amount.toLocaleString('pt-BR')} está pendente.`,
    metadata: {
      paymentId,
      amount,
      employeeName,
    },
  });
};

/**
 * Envia notificação de pagamento atrasado
 */
export const sendPaymentOverdueNotification = async (
  userId: string,
  employeeName: string,
  amount: number,
  daysOverdue: number,
  paymentId?: string
): Promise<void> => {
  await sendNotificationToUser(userId, {
    type: 'payment_overdue',
    title: '⚠️ Pagamento Atrasado',
    message: `Atenção! O pagamento de ${employeeName} no valor de R$ ${amount.toLocaleString('pt-BR')} está atrasado há ${daysOverdue} dia(s).`,
    metadata: {
      paymentId,
      amount,
      employeeName,
    },
  });
};

/**
 * Envia notificação de novo funcionário cadastrado
 */
export const sendNewEmployeeNotification = async (
  userId: string,
  employeeName: string,
  employeeId: string
): Promise<void> => {
  await sendNotificationToUser(userId, {
    type: 'new_employee',
    title: '👤 Novo Funcionário Cadastrado',
    message: `${employeeName} foi adicionado(a) à sua equipe.`,
    metadata: {
      employeeId,
      employeeName,
    },
  });
};

/**
 * Envia notificação de saldo baixo
 */
export const sendLowBalanceNotification = async (
  userId: string,
  platformName: string,
  currentBalance: number,
  platformId?: string
): Promise<void> => {
  await sendNotificationToUser(userId, {
    type: 'low_balance',
    title: '⚠️ Saldo Baixo',
    message: `O saldo da plataforma ${platformName} está baixo: R$ ${currentBalance.toLocaleString('pt-BR')}. Considere fazer um depósito.`,
    metadata: {
      platformId,
      balance: currentBalance,
    },
  });
};

/**
 * Envia notificação de alta atividade
 */
export const sendHighActivityNotification = async (
  userId: string,
  transactionCount: number,
  period: string = 'hoje'
): Promise<void> => {
  await sendNotificationToUser(userId, {
    type: 'high_activity',
    title: '📊 Alta Atividade Detectada',
    message: `Você teve ${transactionCount} transações ${period}. Ótimo movimento!`,
    metadata: {
      transactionCount: transactionCount,
    },
  });
};
