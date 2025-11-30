import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  paymentsPending: boolean;
  goal50Percent: boolean;
  goal75Percent: boolean;
  goal100Percent: boolean;
  goalReached: boolean;
  newEmployees: boolean;
  weeklyReports: boolean;
  paymentOverdue: boolean;
  lowBalance: boolean;
  highActivity: boolean;
  updatedAt?: any;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  paymentsPending: true,
  goal50Percent: true,
  goal75Percent: true,
  goal100Percent: true,
  goalReached: true,
  newEmployees: false,
  weeklyReports: true,
  paymentOverdue: true,
  lowBalance: false,
  highActivity: false,
};

/**
 * Obtém as preferências de notificação do usuário
 */
export const getNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences> => {
  try {
    if (!userId) {
      console.error('❌ userId não fornecido');
      return DEFAULT_PREFERENCES;
    }

    console.log('🔍 Buscando preferências no Firestore para:', userId);
    const prefsRef = doc(db, 'users', userId, 'preferences', 'notifications');
    const prefsDoc = await getDoc(prefsRef);

    if (prefsDoc.exists()) {
      const data = prefsDoc.data();
      console.log('✅ Preferências encontradas no Firestore:', data);
      
      // Garantir que todos os campos existam, mesclando com padrões
      const mergedPrefs: NotificationPreferences = {
        email: data.email ?? DEFAULT_PREFERENCES.email,
        push: data.push ?? DEFAULT_PREFERENCES.push,
        paymentsPending: data.paymentsPending ?? DEFAULT_PREFERENCES.paymentsPending,
        goal50Percent: data.goal50Percent ?? DEFAULT_PREFERENCES.goal50Percent,
        goal75Percent: data.goal75Percent ?? DEFAULT_PREFERENCES.goal75Percent,
        goal100Percent: data.goal100Percent ?? DEFAULT_PREFERENCES.goal100Percent,
        goalReached: data.goalReached ?? DEFAULT_PREFERENCES.goalReached,
        newEmployees: data.newEmployees ?? DEFAULT_PREFERENCES.newEmployees,
        weeklyReports: data.weeklyReports ?? DEFAULT_PREFERENCES.weeklyReports,
        paymentOverdue: data.paymentOverdue ?? DEFAULT_PREFERENCES.paymentOverdue,
        lowBalance: data.lowBalance ?? DEFAULT_PREFERENCES.lowBalance,
        highActivity: data.highActivity ?? DEFAULT_PREFERENCES.highActivity,
      };
      
      console.log('✅ Preferências mescladas:', mergedPrefs);
      return mergedPrefs;
    }

    console.log('📝 Preferências não encontradas, retornando valores padrão');
    // NÃO criar automaticamente - deixar para o usuário salvar quando quiser
    // Isso evita operações desnecessárias e possíveis loops
    return DEFAULT_PREFERENCES;
  } catch (error: any) {
    console.error('❌ Erro ao buscar preferências de notificação:', error);
    console.error('Erro detalhado:', {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
    });
    // Retornar padrões mesmo em caso de erro para não travar a UI
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Salva as preferências de notificação do usuário
 */
export const setNotificationPreferences = async (
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> => {
  try {
    const prefsRef = doc(db, 'users', userId, 'preferences', 'notifications');
    
    // Buscar preferências atuais sem criar novas se não existir
    let currentPrefs = DEFAULT_PREFERENCES;
    try {
      const prefsDoc = await getDoc(prefsRef);
      if (prefsDoc.exists()) {
        const data = prefsDoc.data();
        currentPrefs = {
          ...DEFAULT_PREFERENCES,
          ...data,
        } as NotificationPreferences;
      }
    } catch (error) {
      console.warn('Erro ao buscar preferências atuais, usando padrões:', error);
    }

    await setDoc(
      prefsRef,
      {
        ...currentPrefs,
        ...preferences,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ Preferências de notificação atualizadas para usuário ${userId}`);
  } catch (error) {
    console.error('❌ Erro ao salvar preferências de notificação:', error);
    throw error;
  }
};

/**
 * Verifica se uma notificação específica está habilitada
 */
export const isNotificationEnabled = async (
  userId: string,
  notificationType: keyof NotificationPreferences
): Promise<boolean> => {
  try {
    const prefs = await getNotificationPreferences(userId);
    return prefs[notificationType] ?? DEFAULT_PREFERENCES[notificationType];
  } catch (error) {
    console.error('Erro ao verificar preferência de notificação:', error);
    return DEFAULT_PREFERENCES[notificationType];
  }
};

