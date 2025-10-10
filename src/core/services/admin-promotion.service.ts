import { doc, setDoc, getDocs, query, where, collection, addDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { findUserByEmail } from './admin-plan-management.service';
import { toast } from 'sonner';

export interface AdminPromotion {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  promotedBy: string; // Email do admin que promoveu
  reason?: string;
  createdAt: any;
}

export interface AdminDemotion {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  demotedBy: string; // Email do admin que removeu
  reason?: string;
  createdAt: any;
}

/**
 * Promove um usuário a admin por email
 */
export const promoteUserToAdmin = async (
  userEmail: string,
  adminEmail: string,
  reason?: string
): Promise<void> => {
  try {
    // Buscar o usuário
    const user = await findUserByEmail(userEmail);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se o usuário já é admin
    const isAlreadyAdmin = await checkUserIsAdmin(user.id, user.email);
    if (isAlreadyAdmin) {
      throw new Error('Este usuário já possui privilégios de admin');
    }

    // Adicionar como admin no Firestore
    const adminRef = doc(db, 'admins', user.id);
    await setDoc(adminRef, {
      email: user.email,
      isAdmin: true,
      addedAt: new Date(),
      promotedBy: adminEmail,
      reason: reason || 'Promoção administrativa'
    });

    // Registrar no histórico de promoções
    await createAdminPromotionHistory({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      promotedBy: adminEmail,
      reason: reason
    });

    toast.success(`Usuário ${user.email} promovido a admin com sucesso!`);
  } catch (error) {
    console.error('Erro ao promover usuário:', error);
    toast.error(`Erro ao promover usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    throw error;
  }
};

/**
 * Remove privilégios de admin de um usuário
 */
export const demoteUserFromAdmin = async (
  userEmail: string,
  adminEmail: string,
  reason?: string
): Promise<void> => {
  try {
    // Buscar o usuário
    const user = await findUserByEmail(userEmail);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se o usuário é admin
    const isAdmin = await checkUserIsAdmin(user.id, user.email);
    if (!isAdmin) {
      throw new Error('Este usuário não possui privilégios de admin');
    }

    // Não permitir auto-demotion (o admin não pode se remover)
    if (user.email === adminEmail) {
      throw new Error('Você não pode remover seus próprios privilégios de admin');
    }

    // Remover privilégios de admin
    const adminRef = doc(db, 'admins', user.id);
    await setDoc(adminRef, {
      email: user.email,
      isAdmin: false,
      removedAt: new Date(),
      demotedBy: adminEmail,
      reason: reason || 'Remoção administrativa'
    }, { merge: true });

    // Registrar no histórico de demotions
    await createAdminDemotionHistory({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      demotedBy: adminEmail,
      reason: reason
    });

    toast.success(`Privilégios de admin removidos do usuário ${user.email}`);
  } catch (error) {
    console.error('Erro ao remover privilégios de admin:', error);
    toast.error(`Erro ao remover privilégios: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    throw error;
  }
};

/**
 * Verifica se um usuário é admin
 */
const checkUserIsAdmin = async (userId: string, email: string): Promise<boolean> => {
  try {
    // Verificar na lista hardcoded primeiro
    const hardcodedAdmins = ['diegkamor@gmail.com'];
    if (hardcodedAdmins.includes(email.toLowerCase())) {
      return true;
    }

    // Verificar no Firestore
    const adminRef = doc(db, 'admins', userId);
    const adminDoc = await getDocs(query(collection(db, 'admins'), where('__name__', '==', userId)));
    
    if (!adminDoc.empty) {
      const adminData = adminDoc.docs[0].data();
      return adminData?.isAdmin === true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar status de admin:', error);
    return false;
  }
};

/**
 * Lista todos os administradores
 */
export const getAllAdmins = async (): Promise<Array<{
  userId: string;
  email: string;
  isAdmin: boolean;
  addedAt?: any;
  promotedBy?: string;
}>> => {
  try {
    const adminsSnapshot = await getDocs(collection(db, 'admins'));
    const admins: Array<any> = [];

    adminsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.isAdmin === true) {
        admins.push({
          userId: doc.id,
          email: data.email,
          isAdmin: data.isAdmin,
          addedAt: data.addedAt,
          promotedBy: data.promotedBy
        });
      }
    });

    // Adicionar admins hardcoded
    const hardcodedAdmins = ['diegkamor@gmail.com'];
    hardcodedAdmins.forEach(email => {
      if (!admins.find(admin => admin.email === email)) {
        admins.push({
          userId: 'hardcoded',
          email: email,
          isAdmin: true,
          addedAt: '2024-01-01T00:00:00.000Z',
          promotedBy: 'Sistema'
        });
      }
    });

    return admins.sort((a, b) => {
      if (a.addedAt && b.addedAt) {
        const dateA = a.addedAt.toDate ? a.addedAt.toDate() : new Date(a.addedAt);
        const dateB = b.addedAt.toDate ? b.addedAt.toDate() : new Date(b.addedAt);
        return dateB.getTime() - dateA.getTime();
      }
      return 0;
    });
  } catch (error) {
    console.error('Erro ao buscar administradores:', error);
    throw error;
  }
};

/**
 * Cria entrada no histórico de promoções
 */
const createAdminPromotionHistory = async (data: Omit<AdminPromotion, 'id' | 'createdAt'>) => {
  try {
    const historyRef = collection(db, 'admin_promotion_history');
    await addDoc(historyRef, {
      ...data,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Erro ao criar histórico de promoção:', error);
  }
};

/**
 * Cria entrada no histórico de demotions
 */
const createAdminDemotionHistory = async (data: Omit<AdminDemotion, 'id' | 'createdAt'>) => {
  try {
    const historyRef = collection(db, 'admin_demotion_history');
    await addDoc(historyRef, {
      ...data,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Erro ao criar histórico de demotion:', error);
  }
};

/**
 * Busca histórico de promoções
 */
export const getAdminPromotionHistory = async (): Promise<AdminPromotion[]> => {
  try {
    const historyRef = collection(db, 'admin_promotion_history');
    const querySnapshot = await getDocs(historyRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AdminPromotion[];
  } catch (error) {
    console.error('Erro ao buscar histórico de promoções:', error);
    throw error;
  }
};

/**
 * Busca histórico de demotions
 */
export const getAdminDemotionHistory = async (): Promise<AdminDemotion[]> => {
  try {
    const historyRef = collection(db, 'admin_demotion_history');
    const querySnapshot = await getDocs(historyRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AdminDemotion[];
  } catch (error) {
    console.error('Erro ao buscar histórico de demotions:', error);
    throw error;
  }
};
