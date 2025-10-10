import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

// Lista de emails de administradores
const ADMIN_EMAILS = [
  'diegkamor@gmail.com',
  // Adicione mais emails de admin aqui conforme necessário
];

export interface AdminData {
  email: string;
  isAdmin: boolean;
  addedAt: Date;
}

/**
 * Verifica se um email pertence a um administrador
 */
export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

/**
 * Verifica se o usuário tem privilégios de admin no Firestore
 * Primeiro verifica a lista hardcoded, depois a coleção no Firestore
 */
export const checkUserIsAdmin = async (
  userId: string, 
  email: string | null
): Promise<boolean> => {
  try {
    // Primeiro verifica a lista hardcoded
    if (isAdminEmail(email)) {
      return true;
    }

    // Depois verifica no Firestore (para admins adicionados dinamicamente)
    const adminRef = doc(db, 'admins', userId);
    const adminDoc = await getDoc(adminRef);
    
    if (adminDoc.exists()) {
      return adminDoc.data()?.isAdmin === true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar status de admin:', error);
    return false;
  }
};

/**
 * Adiciona um usuário como admin no Firestore
 */
export const addAdmin = async (
  userId: string, 
  email: string
): Promise<void> => {
  try {
    const adminRef = doc(db, 'admins', userId);
    await setDoc(adminRef, {
      email,
      isAdmin: true,
      addedAt: new Date()
    });
  } catch (error) {
    console.error('Erro ao adicionar admin:', error);
    throw error;
  }
};

/**
 * Remove um usuário como admin no Firestore
 */
export const removeAdmin = async (userId: string): Promise<void> => {
  try {
    const adminRef = doc(db, 'admins', userId);
    await setDoc(adminRef, {
      isAdmin: false,
      removedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Erro ao remover admin:', error);
    throw error;
  }
};

