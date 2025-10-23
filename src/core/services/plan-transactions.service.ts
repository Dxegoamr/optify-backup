import { collection, doc, addDoc, updateDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { serverTimestamp } from 'firebase/firestore';

export interface PlanTransactionData {
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
  paymentProvider: 'mercadopago' | 'stripe' | 'pix' | 'boleto';
  metadata?: Record<string, any>;
}

export interface PlanTransaction extends PlanTransactionData {
  id: string;
  createdAt: any;
  updatedAt: any;
}

/**
 * Cria uma nova transação de plano
 */
export const createPlanTransaction = async (
  transactionData: PlanTransactionData
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'transactions_plans'), {
      ...transactionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar transação de plano:', error);
    throw error;
  }
};

/**
 * Atualiza o status de uma transação de plano
 */
export const updatePlanTransactionStatus = async (
  transactionId: string,
  status: PlanTransactionData['status'],
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const docRef = doc(db, 'transactions_plans', transactionId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
      ...(metadata && { metadata })
    });
  } catch (error) {
    console.error('Erro ao atualizar transação de plano:', error);
    throw error;
  }
};

/**
 * Busca transações por usuário
 */
export const getPlanTransactionsByUser = async (
  userId: string
): Promise<PlanTransaction[]> => {
  try {
    const q = query(
      collection(db, 'transactions_plans'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PlanTransaction[];
  } catch (error) {
    console.error('Erro ao buscar transações do usuário:', error);
    throw error;
  }
};

/**
 * Busca todas as transações (para admin)
 */
export const getAllPlanTransactions = async (): Promise<PlanTransaction[]> => {
  try {
    const q = query(
      collection(db, 'transactions_plans'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PlanTransaction[];
  } catch (error) {
    console.error('Erro ao buscar todas as transações:', error);
    throw error;
  }
};

/**
 * Busca transações por status
 */
export const getPlanTransactionsByStatus = async (
  status: PlanTransactionData['status']
): Promise<PlanTransaction[]> => {
  try {
    const q = query(
      collection(db, 'transactions_plans'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PlanTransaction[];
  } catch (error) {
    console.error('Erro ao buscar transações por status:', error);
    throw error;
  }
};

/**
 * Busca transações por período
 */
export const getPlanTransactionsByPeriod = async (
  startDate: Date,
  endDate: Date
): Promise<PlanTransaction[]> => {
  try {
    const q = query(
      collection(db, 'transactions_plans'),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PlanTransaction[];
  } catch (error) {
    console.error('Erro ao buscar transações por período:', error);
    throw error;
  }
};

/**
 * Calcula estatísticas de receita
 */
export const getRevenueStats = async (): Promise<{
  totalRevenue: number;
  monthlyRevenue: number;
  completedTransactions: number;
  pendingTransactions: number;
}> => {
  try {
    const allTransactions = await getAllPlanTransactions();
    
    const completedTransactions = allTransactions.filter(t => t.status === 'completed');
    const pendingTransactions = allTransactions.filter(t => t.status === 'pending');
    
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Receita do mês atual
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const monthlyTransactions = completedTransactions.filter(t => 
      t.createdAt.toDate() >= currentMonth
    );
    
    const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalRevenue,
      monthlyRevenue,
      completedTransactions: completedTransactions.length,
      pendingTransactions: pendingTransactions.length
    };
  } catch (error) {
    console.error('Erro ao calcular estatísticas de receita:', error);
    throw error;
  }
};
