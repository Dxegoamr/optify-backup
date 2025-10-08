import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

export class UserSubcollectionsService {
  private static usersCollection = 'users';

  // Método genérico para salvar dados em subcoleção do usuário
  static async saveToUserSubcollection<T>(
    userId: string, 
    subcollection: string, 
    docId: string, 
    data: Omit<T, 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.usersCollection, userId, subcollection, docId);
      
      const dataWithTimestamps = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(docRef, dataWithTimestamps);
    } catch (error) {
      console.error(`Erro ao salvar em ${subcollection}:`, error);
      throw new Error(`Falha ao salvar dados em ${subcollection}`);
    }
  }

  // Método genérico para buscar documento de subcoleção do usuário
  static async getFromUserSubcollection<T>(
    userId: string, 
    subcollection: string, 
    docId: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, this.usersCollection, userId, subcollection, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as T;
      }

      return null;
    } catch (error) {
      console.error(`Erro ao buscar de ${subcollection}:`, error);
      throw new Error(`Falha ao buscar dados de ${subcollection}`);
    }
  }

  // Método genérico para atualizar documento de subcoleção do usuário
  static async updateUserSubcollection<T>(
    userId: string, 
    subcollection: string, 
    docId: string, 
    data: Partial<T>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.usersCollection, userId, subcollection, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Erro ao atualizar ${subcollection}:`, error);
      throw new Error(`Falha ao atualizar dados de ${subcollection}`);
    }
  }

  // Método genérico para buscar todos os documentos de uma subcoleção
  static async getAllFromUserSubcollection<T>(
    userId: string, 
    subcollection: string,
    constraints: any[] = []
  ): Promise<T[]> {
    try {
      const subcollectionRef = collection(db, this.usersCollection, userId, subcollection);
      const q = query(subcollectionRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as T[];
    } catch (error) {
      console.error(`Erro ao buscar todos de ${subcollection}:`, error);
      throw new Error(`Falha ao buscar dados de ${subcollection}`);
    }
  }

  // Método genérico para adicionar novo documento em subcoleção
  static async addToUserSubcollection<T>(
    userId: string, 
    subcollection: string, 
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const subcollectionRef = collection(db, this.usersCollection, userId, subcollection);
      const docRef = await addDoc(subcollectionRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return docRef.id;
    } catch (error) {
      console.error(`Erro ao adicionar em ${subcollection}:`, error);
      throw new Error(`Falha ao adicionar dados em ${subcollection}`);
    }
  }

  // Método genérico para deletar documento de subcoleção
  static async deleteFromUserSubcollection(
    userId: string, 
    subcollection: string, 
    docId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.usersCollection, userId, subcollection, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Erro ao deletar de ${subcollection}:`, error);
      throw new Error(`Falha ao deletar dados de ${subcollection}`);
    }
  }
}

// Constantes para as subcoleções
export const USER_SUBCOLLECTIONS = {
  PROFILE: 'profile',
  CONFIG: 'config',
  EMPLOYEES: 'employees',
  PLATFORMS: 'platforms',
  TRANSACTIONS: 'transactions',
  DAILY_SUMMARIES: 'dailySummaries',
  ACCOUNTS: 'accounts',
  PAYMENTS: 'payments',
  GOALS: 'goals',
  REPORTS: 'reports'
} as const;

// Remoção completa dos dados de um usuário (todas as subcoleções)
export async function deleteAllUserData(userId: string): Promise<void> {
  const subcollections = Object.values(USER_SUBCOLLECTIONS);

  // Deleta documentos conhecidos e listas
  for (const sub of subcollections) {
    try {
      // Para perfis/configs, removemos documentos fixos se existirem
      if (sub === USER_SUBCOLLECTIONS.PROFILE) {
        await UserSubcollectionsService.deleteFromUserSubcollection(userId, sub, 'basic');
      } else if (sub === USER_SUBCOLLECTIONS.CONFIG) {
        await UserSubcollectionsService.deleteFromUserSubcollection(userId, sub, 'initial');
      }

      // Remover todos os documentos remanescentes da subcoleção
      const docs = await UserSubcollectionsService.getAllFromUserSubcollection<any>(userId, sub);
      await Promise.all(
        docs.map((d: any) =>
          d?.id ? UserSubcollectionsService.deleteFromUserSubcollection(userId, sub, d.id) : Promise.resolve()
        )
      );
    } catch (err) {
      // Ignorar erros por subcoleção para garantir remoção best-effort
      // eslint-disable-next-line no-console
      console.warn(`Falha parcial ao deletar subcoleção ${sub} do usuário ${userId}:`, err);
    }
  }
}
