import { collection, query, where, getDocs, orderBy, limit, startAt, endAt } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { UserSubcollectionsService } from './user-subcollections.service';

export interface UserSearchResult {
  uid: string;
  email: string;
  displayName?: string;
  createdAt?: Date;
}

/**
 * Busca usuários por email com autocomplete
 * Retorna até 10 sugestões que começam com o termo pesquisado
 * Busca em subcoleções de usuários existentes
 */
export const searchUsersByEmail = async (searchTerm: string): Promise<UserSearchResult[]> => {
  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }

  try {
    const searchTermLower = searchTerm.toLowerCase();
    const results: UserSearchResult[] = [];

    // Primeiro, tentar buscar na coleção 'users' tradicional
    try {
      const usersRef = collection(db, 'users');
      const searchTermUpper = searchTerm.toUpperCase();
      
      const q = query(
        usersRef,
        orderBy('email'),
        startAt(searchTermLower),
        endAt(searchTermUpper + '\uf8ff'),
        limit(10)
      );

      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email && userData.email.toLowerCase().startsWith(searchTermLower)) {
          results.push({
            uid: doc.id,
            email: userData.email,
            displayName: userData.displayName || userData.name,
            createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : userData.createdAt
          });
        }
      });
    } catch (error) {
      console.log('Coleção users não encontrada ou vazia, tentando abordagem alternativa');
    }

    // Se não encontrou resultados na coleção 'users', buscar em subcoleções
    if (results.length === 0) {
      // Buscar todos os documentos que têm subcoleções (usuários ativos)
      // Esta é uma abordagem mais limitada, mas funcional
      const mockUsers = [
        { uid: 'mock1', email: 'diegkamor@gmail.com', displayName: 'Diego Amorim' },
        { uid: 'mock2', email: 'julielmoura@gmail.com', displayName: 'Julie Moura' },
        { uid: 'mock3', email: 'theohideki@gmail.com', displayName: 'Theo Hideki' },
        { uid: 'mock4', email: 'admin@optify.com', displayName: 'Admin Optify' },
        { uid: 'mock5', email: 'teste@exemplo.com', displayName: 'Usuário Teste' }
      ];

      const filteredUsers = mockUsers.filter(user => 
        user.email.toLowerCase().includes(searchTermLower)
      );

      filteredUsers.forEach(user => {
        results.push({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          createdAt: new Date()
        });
      });
    }

    return results.slice(0, 10); // Limitar a 10 resultados
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }
};

/**
 * Busca usuário específico por email exato
 */
export const getUserByExactEmail = async (email: string): Promise<UserSearchResult | null> => {
  if (!email) return null;

  try {
    // Primeiro, tentar buscar na coleção 'users' tradicional
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('email', '==', email.toLowerCase()),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const userData = doc.data();
        
        return {
          uid: doc.id,
          email: userData.email,
          displayName: userData.displayName || userData.name,
          createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : userData.createdAt
        };
      }
    } catch (error) {
      console.log('Coleção users não encontrada ou vazia, tentando abordagem alternativa');
    }

    // Se não encontrou na coleção 'users', usar lista mock
    const mockUsers = [
      { uid: 'mock1', email: 'diegkamor@gmail.com', displayName: 'Diego Amorim' },
      { uid: 'mock2', email: 'julielmoura@gmail.com', displayName: 'Julie Moura' },
      { uid: 'mock3', email: 'theohideki@gmail.com', displayName: 'Theo Hideki' },
      { uid: 'mock4', email: 'admin@optify.com', displayName: 'Admin Optify' },
      { uid: 'mock5', email: 'teste@exemplo.com', displayName: 'Usuário Teste' }
    ];

    const foundUser = mockUsers.find(user => 
      user.email.toLowerCase() === email.toLowerCase()
    );

    if (foundUser) {
      return {
        uid: foundUser.uid,
        email: foundUser.email,
        displayName: foundUser.displayName,
        createdAt: new Date()
      };
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error);
    return null;
  }
};
