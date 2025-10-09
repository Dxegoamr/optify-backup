import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
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
import { db } from './config';

// Tipos para as coleções
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  currentPlan: 'free' | 'standard' | 'medium' | 'ultimate';
  monthlyGoal: number;
}

export interface Employee {
  id: string;
  userId: string;
  name: string;
  cpf: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  payDay?: number;
  salary: number;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Platform {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Transaction {
  id: string;
  userId: string;
  employeeId: string;
  platformId?: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  description?: string;
  date: string; // YYYY-MM-DD format
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DailySummary {
  id: string;
  userId: string;
  date: string;
  totalDeposits: number;
  totalWithdraws: number;
  profit: number;
  margin?: number;
  transactionCount: number;
  transactionsSnapshot: any;
  byEmployee: any[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  currentBalance: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Funções utilitárias para Firestore
export const firestoreUtils = {
  // Criar timestamp
  now: () => serverTimestamp(),
  
  // Converter timestamp para data
  timestampToDate: (timestamp: Timestamp) => timestamp.toDate(),
  
  // Converter data para string YYYY-MM-DD (no fuso horário de São Paulo)
  dateToString: (date: Date) => {
    // Usar o fuso horário de São Paulo para garantir consistência
    return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  },
  
  // Gerar ID único
  generateId: () => doc(collection(db, 'temp')).id
};

// Coleções
export const collections = {
  users: 'users',
  employees: 'employees',
  platforms: 'platforms', 
  transactions: 'transactions',
  dailySummaries: 'dailySummaries',
  accounts: 'accounts'
};

// Funções CRUD genéricas
export const createDocument = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar documento:', error);
    throw error;
  }
};

export const getDocument = async (collectionName: string, docId: string) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    throw error;
  }
};

export const updateDocument = async (collectionName: string, docId: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    throw error;
  }
};

export const deleteDocument = async (collectionName: string, docId: string) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    throw error;
  }
};

export const getDocuments = async (collectionName: string, constraints: any[] = []) => {
  try {
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    throw error;
  }
};

// Funções específicas para o domínio
export const employeeService = {
  // Buscar funcionários por usuário
  getByUser: async (userId: string) => {
    return getDocuments(collections.employees, [
      where('userId', '==', userId)
      // orderBy temporariamente removido até os índices serem construídos
    ]);
  },

  // Criar funcionário
  create: async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    return createDocument(collections.employees, employeeData);
  },

  // Atualizar funcionário
  update: async (employeeId: string, data: Partial<Employee>) => {
    return updateDocument(collections.employees, employeeId, data);
  },

  // Deletar funcionário
  delete: async (employeeId: string) => {
    return deleteDocument(collections.employees, employeeId);
  }
};

export const transactionService = {
  // Buscar transações por usuário e período
  getByUserAndPeriod: async (userId: string, startDate: string, endDate: string) => {
    return getDocuments(collections.transactions, [
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
      // orderBy temporariamente removido até os índices serem construídos
    ]);
  },

  // Buscar transações por funcionário
  getByEmployee: async (employeeId: string) => {
    return getDocuments(collections.transactions, [
      where('employeeId', '==', employeeId)
      // orderBy temporariamente removido até os índices serem construídos
    ]);
  },

  // Criar transação
  create: async (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    return createDocument(collections.transactions, transactionData);
  }
};

// platformService removido - usar UserPlatformService das subcoleções

