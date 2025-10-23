import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  photoURL?: string;
  plano: 'free' | 'standard' | 'medium' | 'ultimate';
  funcionariosPermitidos: number;
  permissoes: { [key: string]: any };
  isSubscriber: boolean;
  isActive: boolean;
  isAdmin: boolean;
  subscriptionStartDate?: Date | null;
  subscriptionEndDate?: Date | null;
  subscriptionMonths?: number | null;
  createdAt: any;
  updatedAt: any;
}

const PLAN_DEFAULTS = {
  'free': { 
    funcionarios: 1, 
    permissoes: {},
    isSubscriber: false,
    isActive: false
  },
  'standard': { 
    funcionarios: 5, 
    permissoes: {},
    isSubscriber: true,
    isActive: true
  },
  'medium': { 
    funcionarios: 10, 
    permissoes: {},
    isSubscriber: true,
    isActive: true
  },
  'ultimate': { 
    funcionarios: 50, 
    permissoes: {},
    isSubscriber: true,
    isActive: true
  }
};

export class UserProfileService {
  /**
   * Remove campos undefined do objeto antes de salvar no Firestore
   */
  private static cleanData(data: any): any {
    return Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
  }

  /**
   * Cria ou atualiza o perfil do usuário na coleção users
   */
  static async createOrUpdateUserProfile(
    userId: string, 
    userData: {
      email: string;
      name?: string;
      displayName?: string;
      photoURL?: string;
      plano?: 'free' | 'standard' | 'medium' | 'ultimate';
    }
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      const defaults = PLAN_DEFAULTS[userData.plano || 'free'];
      
      if (userSnap.exists()) {
        // Atualizar perfil existente
        const updateData = this.cleanData({
          email: userData.email,
          name: userData.name || userData.displayName,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          plano: userData.plano || 'free',
          funcionariosPermitidos: defaults.funcionarios,
          permissoes: defaults.permissoes,
          isSubscriber: defaults.isSubscriber,
          isActive: defaults.isActive,
          updatedAt: serverTimestamp()
        });
        await updateDoc(userRef, updateData);
      } else {
        // Criar novo perfil
        const newData = this.cleanData({
          id: userId,
          email: userData.email,
          name: userData.name || userData.displayName,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          plano: userData.plano || 'free',
          funcionariosPermitidos: defaults.funcionarios,
          permissoes: defaults.permissoes,
          isSubscriber: defaults.isSubscriber,
          isActive: defaults.isActive,
          isAdmin: false,
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          subscriptionMonths: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await setDoc(userRef, newData);
      }
      
      console.log(`✅ Perfil do usuário ${userData.email} criado/atualizado no Firestore`);
    } catch (error) {
      console.error('❌ Erro ao criar/atualizar perfil do usuário:', error);
      throw error;
    }
  }

  /**
   * Busca o perfil do usuário
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          id: userId,
          email: data.email,
          name: data.name,
          displayName: data.displayName,
          photoURL: data.photoURL,
          plano: data.plano || 'free',
          funcionariosPermitidos: data.funcionariosPermitidos || 1,
          permissoes: data.permissoes || {},
          isSubscriber: data.isSubscriber || false,
          isActive: data.isActive || false,
          isAdmin: data.isAdmin || false,
          subscriptionStartDate: data.subscriptionStartDate,
          subscriptionEndDate: data.subscriptionEndDate,
          subscriptionMonths: data.subscriptionMonths,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar perfil do usuário:', error);
      throw error;
    }
  }

  /**
   * Atualiza o plano do usuário
   */
  static async updateUserPlan(
    userId: string, 
    newPlan: 'free' | 'standard' | 'medium' | 'ultimate',
    subscriptionMonths?: number
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const defaults = PLAN_DEFAULTS[newPlan];
      
      const updateData: any = {
        plano: newPlan,
        funcionariosPermitidos: defaults.funcionarios,
        permissoes: defaults.permissoes,
        isSubscriber: defaults.isSubscriber,
        isActive: defaults.isActive,
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

      const cleanUpdateData = this.cleanData(updateData);
      await updateDoc(userRef, cleanUpdateData);
      console.log(`✅ Plano do usuário atualizado para ${newPlan} no Firestore`);
    } catch (error) {
      console.error('❌ Erro ao atualizar plano do usuário:', error);
      throw error;
    }
  }
}
