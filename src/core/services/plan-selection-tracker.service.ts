import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

export interface PlanSelectionLog {
  userId: string;
  userEmail: string;
  selectedPlan: string;
  billingType: 'monthly' | 'annual';
  timestamp: Timestamp | Date;
  status: 'pending' | 'completed' | 'cancelled';
  paymentId?: string;
  ownerId: string;
}

/**
 * Registra a seleção de um plano pelo usuário
 */
export async function logPlanSelection(
  userId: string,
  userEmail: string,
  selectedPlan: string,
  billingType: 'monthly' | 'annual'
): Promise<string | null> {
  try {
    const logData = {
      userId,
      userEmail: userEmail.toLowerCase(),
      selectedPlan: selectedPlan.toLowerCase(),
      billingType,
      timestamp: serverTimestamp(),
      status: 'pending',
      ownerId: userId // Required by firestore rules
    };

    const docRef = await addDoc(collection(db, 'plan_selections'), logData);
    console.log('✅ Log de seleção de plano criado:', docRef.id, {
      userId,
      userEmail,
      selectedPlan,
      billingType
    });
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Erro ao criar log de seleção de plano:', error);
    return null;
  }
}

/**
 * Atualiza o status da seleção de plano quando pagamento é aprovado
 */
export async function updatePlanSelectionStatus(
  logId: string,
  status: 'completed' | 'cancelled',
  paymentId?: string
): Promise<void> {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const logRef = doc(db, 'plan_selections', logId);
    
    await updateDoc(logRef, {
      status,
      paymentId: paymentId || null,
      completedAt: status === 'completed' ? new Date() : null
    });
    
    console.log('✅ Status da seleção de plano atualizado:', logId, status);
  } catch (error) {
    console.error('❌ Erro ao atualizar status da seleção de plano:', error);
  }
}

