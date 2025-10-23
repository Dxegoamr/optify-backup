import { doc, setDoc, serverTimestamp, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

export interface UserNotification {
  id: string;
  userId: string;
  type: 'plan_change' | 'admin_promotion' | 'admin_demotion' | 'system' | 'payment' | 'warning';
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  metadata?: {
    oldPlan?: string;
    newPlan?: string;
    changedBy?: string;
    reason?: string;
  };
}

/**
 * Envia uma notificação para um usuário específico
 */
export const sendNotificationToUser = async (
  userId: string,
  notification: Omit<UserNotification, 'id' | 'userId' | 'read' | 'createdAt'>
): Promise<void> => {
  try {
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
    
    console.log(`Notificação enviada para usuário ${userId}:`, notification.title);
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    throw error;
  }
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
