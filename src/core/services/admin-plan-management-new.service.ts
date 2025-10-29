import { doc, updateDoc, getDocs, query, where, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { createPlanTransaction } from './plan-transactions.service';
import { sendPlanChangeNotification } from './user-notifications.service';
import { toast } from 'sonner';

// Definição dos planos e suas hierarquias
const PLAN_HIERARCHY = {
  'free': 0,
  'standard': 1,
  'medium': 2,
  'ultimate': 3
};

const PLAN_LIMITS = {
  'free': { funcionarios: 1, permissoes: {} },
  'standard': { funcionarios: 5, permissoes: {} },
  'medium': { funcionarios: 10, permissoes: {} },
  'ultimate': { funcionarios: 50, permissoes: {} }
};

const getPlanDisplayName = (plan: string) => {
  const names = {
    'free': 'Free',
    'standard': 'Standard',
    'medium': 'Medium',
    'ultimate': 'Ultimate'
  };
  return names[plan as keyof typeof names] || plan;
};

export interface UserPlanUpdate {
  userId: string;
  userEmail: string;
  userName: string;
  previousPlan: string;
  newPlan: string;
  changedBy: string;
  reason?: string;
  subscriptionMonths?: number;
}

export interface PlanChangeHistory {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  previousPlan: string;
  newPlan: string;
  changedBy: string;
  reason?: string;
  createdAt: Date;
}

/**
 * Busca usuário por email na estrutura correta do Firestore
 */
export const findUserByEmail = async (email: string) => {
  try {
    console.log(`🔍 Buscando usuário com email: ${email}`);
    
    // Normalizar email
    const normalizedEmail = email.toLowerCase().trim();
    
    try {
      // Buscar usuário diretamente na coleção users pelo email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', normalizedEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        console.log(`✅ Usuário encontrado: ${userId} - ${normalizedEmail}`);
        console.log(`📋 Dados do usuário:`, userData);

        const result = {
          id: userId,
          email: userData.email || normalizedEmail,
          name: userData.name || userData.displayName || 'Nome não informado',
          currentPlan: userData.plano || 'free',
          permissoes: userData.permissoes || {},
          funcionariosPermitidos: userData.funcionariosPermitidos || 1,
          isSubscriber: userData.isSubscriber || false,
          isActive: userData.isActive || false,
          isAdmin: userData.isAdmin || false
        };

        console.log(`📤 Retornando usuário:`, result);
        return result;
      }
      
      console.log(`❌ Nenhum usuário encontrado com email: ${normalizedEmail}`);
    } catch (error) {
      console.log('❌ Erro ao buscar usuário real:', error);
    }

    // Se não encontrou usuário real, usar dados mock
    console.log(`🔄 Usando dados mock para ${email}`);
    const mockUsers = [
      { 
        id: 'mock1', 
        email: 'diegkamor@gmail.com', 
        name: 'Diego Amorim', 
        currentPlan: 'ultimate',
        permissoes: {},
        funcionariosPermitidos: 50,
        isSubscriber: true,
        isActive: true,
        isAdmin: true
      },
      { 
        id: 'mock2', 
        email: 'julielmoura@gmail.com', 
        name: 'Julie Moura', 
        currentPlan: 'medium',
        permissoes: {},
        funcionariosPermitidos: 10,
        isSubscriber: true,
        isActive: true,
        isAdmin: false
      },
      { 
        id: 'mock3', 
        email: 'theohideki@gmail.com', 
        name: 'Theo Hideki', 
        currentPlan: 'standard',
        permissoes: {},
        funcionariosPermitidos: 5,
        isSubscriber: true,
        isActive: true,
        isAdmin: false
      },
      { 
        id: 'mock4', 
        email: 'admin@optify.com', 
        name: 'Admin Optify', 
        currentPlan: 'ultimate',
        permissoes: {},
        funcionariosPermitidos: 50,
        isSubscriber: true,
        isActive: true,
        isAdmin: true
      },
      { 
        id: 'mock5', 
        email: 'teste@exemplo.com', 
        name: 'Usuário Teste', 
        currentPlan: 'free',
        permissoes: {},
        funcionariosPermitidos: 1,
        isSubscriber: false,
        isActive: false,
        isAdmin: false
      }
    ];

    const foundUser = mockUsers.find(user => 
      user.email.toLowerCase() === normalizedEmail
    );

    if (foundUser) {
      console.log(`✅ Usuário mock encontrado:`, foundUser);
      return foundUser;
    }

    console.log(`❌ Nenhum usuário encontrado (real ou mock) com email: ${normalizedEmail}`);
    return null;
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    return null;
  }
};

/**
 * Valida se é possível fazer a mudança de plano (não permite downgrade)
 */
const validatePlanChange = (currentPlan: string, newPlan: string): boolean => {
  const currentLevel = PLAN_HIERARCHY[currentPlan as keyof typeof PLAN_HIERARCHY] || 0;
  const newLevel = PLAN_HIERARCHY[newPlan as keyof typeof PLAN_HIERARCHY] || 0;
  
  // Não permite downgrade (novo plano menor que o atual)
  if (newLevel < currentLevel) {
    throw new Error(`Não é possível fazer downgrade de ${getPlanDisplayName(currentPlan)} para ${getPlanDisplayName(newPlan)}. Apenas upgrades são permitidos.`);
  }
  
  return true;
};

/**
 * Cria entrada no histórico de alterações de plano
 */
const createPlanChangeHistory = async (data: Omit<PlanChangeHistory, 'id' | 'createdAt'>) => {
  try {
    const historyRef = collection(db, 'plan_change_history');
    
    // Filtrar valores undefined para evitar erros do Firestore
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    
    await addDoc(historyRef, {
      ...cleanData,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Erro ao criar histórico:', error);
    // Não falhar a operação principal por causa do histórico
  }
};

/**
 * Atualiza o plano de um usuário
 */
export const updateUserPlan = async (
  userEmail: string,
  newPlan: string,
  adminEmail: string,
  reason?: string,
  subscriptionMonths?: number
): Promise<void> => {
  try {
    console.log(`🔄 Iniciando atualização de plano para ${userEmail} -> ${newPlan}`);
    
    // Buscar o usuário
    const user = await findUserByEmail(userEmail);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    console.log(`📋 Usuário encontrado:`, user);

    // Validar se é possível fazer a mudança (não permite downgrade)
    validatePlanChange(user.currentPlan, newPlan);

    // Preparar dados para atualização
    const updateData: any = {
      plano: newPlan,
      funcionariosPermitidos: PLAN_LIMITS[newPlan as keyof typeof PLAN_LIMITS].funcionarios,
      permissoes: PLAN_LIMITS[newPlan as keyof typeof PLAN_LIMITS].permissoes,
      updatedAt: serverTimestamp()
    };

    // Se o novo plano for diferente de "free", configurar como assinante
    if (newPlan !== 'free') {
      updateData.isSubscriber = true;
      updateData.isActive = true;
      
      // Se foram fornecidos meses de assinatura, calcular datas
      if (subscriptionMonths && subscriptionMonths > 0) {
        const now = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + subscriptionMonths);
        
        updateData.subscriptionStartDate = now;
        updateData.subscriptionEndDate = endDate;
        updateData.subscriptionMonths = subscriptionMonths;
      }
    } else {
      // Para plano free, limpar dados de assinatura
      updateData.isSubscriber = false;
      updateData.isActive = false;
      updateData.subscriptionStartDate = null;
      updateData.subscriptionEndDate = null;
      updateData.subscriptionMonths = null;
    }

    console.log(`📝 Dados para atualização:`, updateData);

    // Atualizar o documento do usuário
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, updateData);
      console.log(`✅ Plano do usuário ${user.email} atualizado para ${newPlan} no Firestore`);
    } catch (error) {
      console.error('❌ Erro ao atualizar plano:', error);
      
      // Para usuários mock, simular a atualização
      if (user.id.startsWith('mock')) {
        console.log(`📝 Plano do usuário mock ${user.email} simulado como alterado para ${newPlan}`);
      } else {
        throw new Error(`Falha ao atualizar plano do usuário ${user.email}: ${error}`);
      }
    }

    // Criar uma transação de plano (gratuita, já que é alteração administrativa)
    try {
      await createPlanTransaction({
        userId: user.id,
        userEmail: user.email,
        planName: newPlan,
        amount: 0,
        status: 'completed',
        paymentMethod: 'admin_change',
        transactionId: `admin_${Date.now()}`,
        adminEmail: adminEmail,
        reason: reason || 'Alteração administrativa'
      });
    } catch (error) {
      console.log('Transação de plano não foi criada (usuário mock):', error);
    }

    // Registrar no histórico de alterações
    try {
      await createPlanChangeHistory({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        previousPlan: user.currentPlan,
        newPlan: newPlan,
        changedBy: adminEmail,
        reason: reason
      });
    } catch (error) {
      console.log('Histórico de alterações não foi criado (usuário mock):', error);
    }

    // Enviar notificação para o usuário
    try {
      await sendPlanChangeNotification(user.id, user.email, user.currentPlan, newPlan, adminEmail, reason);
    } catch (notificationError) {
      console.log('Notificação não foi enviada (usuário mock):', notificationError);
    }

    toast.success(`✅ Plano do usuário ${user.email} alterado de ${getPlanDisplayName(user.currentPlan)} para ${getPlanDisplayName(newPlan)}`);
  } catch (error) {
    console.error('❌ Erro ao atualizar plano:', error);
    
    // Se for erro de validação, mostrar mensagem específica
    if (error instanceof Error && error.message.includes('downgrade')) {
      toast.error(error.message);
    } else {
      toast.error(`Erro ao atualizar plano: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
    
    throw error;
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
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as PlanChangeHistory)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Erro ao buscar histórico de planos:', error);
    return [];
  }
};

/**
 * Lista todos os usuários (para estatísticas)
 */
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }
};












