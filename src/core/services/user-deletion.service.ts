import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { toast } from 'sonner';

export interface UserDeletionResult {
  success: boolean;
  message: string;
  deletedData: {
    userProfile: boolean;
    transactions: number;
    employees: number;
    platforms: number;
    settings: boolean;
    planHistory: number;
  };
}

/**
 * Exclui completamente um usuário e todos os seus dados
 * @param userId - ID do usuário a ser excluído
 * @param userEmail - Email do usuário (para logs)
 * @param adminEmail - Email do admin que está executando a exclusão
 * @returns Resultado da exclusão
 */
export const deleteUserCompletely = async (
  userId: string,
  userEmail: string,
  adminEmail?: string
): Promise<UserDeletionResult> => {
  try {
    console.log(`🗑️ Iniciando exclusão completa do usuário: ${userEmail} (${userId})`);
    
    const deletedData = {
      userProfile: false,
      transactions: 0,
      employees: 0,
      platforms: 0,
      settings: false,
      planHistory: 0
    };

    // 1. Excluir dados do Firestore
    try {
      // Excluir funcionários
      const employeesRef = collection(db, 'users', userId, 'employees');
      const employeesSnapshot = await getDocs(employeesRef);
      for (const employeeDoc of employeesSnapshot.docs) {
        await deleteDoc(doc(db, 'users', userId, 'employees', employeeDoc.id));
        deletedData.employees++;
      }

      // Excluir transações
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);
      for (const transactionDoc of transactionsSnapshot.docs) {
        await deleteDoc(doc(db, 'users', userId, 'transactions', transactionDoc.id));
        deletedData.transactions++;
      }

      // Excluir plataformas
      const platformsRef = collection(db, 'users', userId, 'platforms');
      const platformsSnapshot = await getDocs(platformsRef);
      for (const platformDoc of platformsSnapshot.docs) {
        await deleteDoc(doc(db, 'users', userId, 'platforms', platformDoc.id));
        deletedData.platforms++;
      }

      // Excluir configurações
      const settingsRef = collection(db, 'users', userId, 'settings');
      const settingsSnapshot = await getDocs(settingsRef);
      for (const settingDoc of settingsSnapshot.docs) {
        await deleteDoc(doc(db, 'users', userId, 'settings', settingDoc.id));
      }
      deletedData.settings = settingsSnapshot.size > 0;

      // Excluir histórico de planos
      const planHistoryRef = collection(db, 'plan_change_history');
      const planHistoryQuery = query(planHistoryRef, where('userId', '==', userId));
      const planHistorySnapshot = await getDocs(planHistoryQuery);
      for (const historyDoc of planHistorySnapshot.docs) {
        await deleteDoc(doc(db, 'users', planHistoryRef.id, historyDoc.id));
        deletedData.planHistory++;
      }

      // Excluir documento principal do usuário
      const userDocRef = doc(db, 'users', userId);
      await deleteDoc(userDocRef);
      deletedData.userProfile = true;

      console.log(`✅ Dados do Firestore excluídos com sucesso:`, deletedData);
    } catch (firestoreError) {
      console.error('❌ Erro ao excluir dados do Firestore:', firestoreError);
      // Continuar mesmo com erro no Firestore
    }

    // 2. Excluir do Authentication (se admin não especificado, assume auto-exclusão)
    if (!adminEmail) {
      try {
        // Para auto-exclusão, usar o usuário atual
        const { auth } = await import('@/integrations/firebase/config');
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === userId) {
          await deleteUser(currentUser);
          console.log(`✅ Usuário excluído do Authentication`);
        }
      } catch (authError) {
        console.error('❌ Erro ao excluir do Authentication:', authError);
        throw new Error('Falha ao excluir conta do sistema de autenticação');
      }
    }

    // 3. Log da exclusão
    if (adminEmail) {
      console.log(`📝 Usuário ${userEmail} excluído pelo admin ${adminEmail}`);
    } else {
      console.log(`📝 Usuário ${userEmail} excluído por auto-exclusão`);
    }

    return {
      success: true,
      message: `Usuário ${userEmail} excluído com sucesso`,
      deletedData
    };

  } catch (error) {
    console.error('❌ Erro ao excluir usuário:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido ao excluir usuário',
      deletedData: {
        userProfile: false,
        transactions: 0,
        employees: 0,
        platforms: 0,
        settings: false,
        planHistory: 0
      }
    };
  }
};

/**
 * Valida se um usuário pode ser excluído
 * @param userId - ID do usuário
 * @param currentUserId - ID do usuário atual (admin)
 * @returns true se pode ser excluído
 */
export const canDeleteUser = (userId: string, currentUserId?: string): boolean => {
  // Não permite excluir a si mesmo
  if (userId === currentUserId) {
    return false;
  }
  
  // Não permite excluir usuários hardcoded
  if (userId === 'hardcoded') {
    return false;
  }
  
  return true;
};
