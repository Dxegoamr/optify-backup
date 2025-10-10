import { doc, updateDoc, getDocs, query, where, collection, addDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { UserSubcollectionsService } from './user-subcollections.service';
import { createPlanTransaction } from './plan-transactions.service';
import { toast } from 'sonner';

export interface UserPlanUpdate {
  userId: string;
  userEmail: string;
  userName: string;
  currentPlan: string;
  newPlan: string;
  updatedBy: string; // Email do admin que fez a alteração
  reason?: string;
}

export interface PlanChangeHistory {
  id: string;
  userId: string;
  userEmail: string;
  previousPlan: string;
  newPlan: string;
  updatedBy: string;
  reason?: string;
  createdAt: any;
}

/**
 * Busca usuário por email
 */
export const findUserByEmail = async (email: string) => {
  try {
    // Buscar na coleção users pelo email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('Usuário não encontrado com este email');
    }

    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;

    // Buscar informações básicas do usuário
    const basicInfo = await UserSubcollectionsService.getDocument(
      userId, 
      'profile', 
      'basic'
    );

    // Buscar configuração atual do plano
    const config = await UserSubcollectionsService.getDocument(
      userId, 
      'config', 
      'initial'
    );

    return {
      id: userId,
      email: email,
      name: basicInfo?.name || 'Nome não informado',
      currentPlan: config?.currentPlan || 'free'
    };
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    throw error;
  }
};

/**
 * Atualiza o plano de um usuário
 */
export const updateUserPlan = async (
  userEmail: string,
  newPlan: string,
  adminEmail: string,
  reason?: string
): Promise<void> => {
  try {
    // Buscar o usuário
    const user = await findUserByEmail(userEmail);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Atualizar a configuração do usuário
    await UserSubcollectionsService.updateDocument(
      user.id,
      'config',
      'initial',
      { currentPlan: newPlan }
    );

    // Criar uma transação de plano (gratuita, já que é alteração administrativa)
    await createPlanTransaction({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      planId: newPlan,
      planName: getPlanDisplayName(newPlan),
      amount: 0, // Alteração administrativa é gratuita
      currency: 'BRL',
      status: 'completed',
      paymentMethod: 'admin_change',
      transactionId: `admin_${Date.now()}`,
      paymentProvider: 'admin',
      metadata: {
        reason: reason || 'Alteração administrativa',
        updatedBy: adminEmail,
        previousPlan: user.currentPlan
      }
    });

    // Registrar no histórico de alterações
    await createPlanChangeHistory({
      userId: user.id,
      userEmail: user.email,
      previousPlan: user.currentPlan,
      newPlan: newPlan,
      updatedBy: adminEmail,
      reason: reason
    });

    toast.success(`Plano do usuário ${user.email} alterado para ${getPlanDisplayName(newPlan)}`);
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    toast.error(`Erro ao atualizar plano: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    throw error;
  }
};

/**
 * Cria entrada no histórico de alterações de plano
 */
const createPlanChangeHistory = async (data: Omit<PlanChangeHistory, 'id' | 'createdAt'>) => {
  try {
    const historyRef = collection(db, 'plan_change_history');
    await addDoc(historyRef, {
      ...data,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Erro ao criar histórico:', error);
    // Não falhar a operação principal por causa do histórico
  }
};

/**
 * Busca histórico de alterações de planos
 */
export const getPlanChangeHistory = async (): Promise<PlanChangeHistory[]> => {
  try {
    const historyRef = collection(db, 'plan_change_history');
    const querySnapshot = await getDocs(historyRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PlanChangeHistory[];
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    throw error;
  }
};

/**
 * Retorna o nome de exibição do plano
 */
const getPlanDisplayName = (planId: string): string => {
  const planNames: Record<string, string> = {
    free: 'Free',
    standard: 'Standard',
    medium: 'Medium',
    ultimate: 'Ultimate'
  };
  
  return planNames[planId] || planId;
};

/**
 * Valida se o plano é válido
 */
export const isValidPlan = (plan: string): boolean => {
  const validPlans = ['free', 'standard', 'medium', 'ultimate'];
  return validPlans.includes(plan);
};

/**
 * Retorna informações dos planos disponíveis
 */
export const getAvailablePlans = () => {
  return [
    { 
      id: 'free', 
      name: 'Free', 
      description: 'Plano gratuito com funcionalidades básicas',
      price: 0,
      features: ['Funcionalidades básicas', 'Suporte por email']
    },
    { 
      id: 'standard', 
      name: 'Standard', 
      description: 'Plano intermediário com mais recursos',
      price: 29.90,
      features: ['Todas as funcionalidades Free', 'Relatórios avançados', 'Suporte prioritário']
    },
    { 
      id: 'medium', 
      name: 'Medium', 
      description: 'Plano avançado para empresas em crescimento',
      price: 59.90,
      features: ['Todas as funcionalidades Standard', 'API access', 'Integrações avançadas']
    },
    { 
      id: 'ultimate', 
      name: 'Ultimate', 
      description: 'Plano premium com todos os recursos',
      price: 99.90,
      features: ['Todas as funcionalidades', 'Suporte 24/7', 'Consultoria personalizada']
    }
  ];
};
