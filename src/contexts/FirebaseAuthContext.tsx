import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { auth } from '@/integrations/firebase/config';
import { UserPlatformService } from '@/core/services/user-specific.service';
import { checkUserIsAdmin } from '@/core/services/admin.service';
import { UserProfileService } from '@/core/services/user-profile.service';

interface FirebaseAuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
};

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Verificar se o usuário é admin e criar/atualizar perfil se necessário
      if (user) {
        try {
          // Verificar se o usuário tem documento no Firestore
          const existingProfile = await UserProfileService.getUserProfile(user.uid);
          
          if (!existingProfile) {
            // Criar documento para usuário existente que não tem perfil
            await UserProfileService.createOrUpdateUserProfile(user.uid, {
              email: user.email || '',
              name: user.displayName || user.email?.split('@')[0] || 'Usuário',
              displayName: user.displayName,
              plano: 'free'
            });
            console.log(`✅ Perfil criado para usuário existente: ${user.email}`);
          }
          
          const adminStatus = await checkUserIsAdmin(user.uid, user.email);
          
          // FORÇAR ADMIN PARA diegkamor@gmail.com TEMPORARIAMENTE
          if (user.email === 'diegkamor@gmail.com') {
            setIsAdmin(true);
          } else {
            setIsAdmin(adminStatus);
          }
        } catch (error) {
          console.error('Erro ao verificar/criar perfil do usuário:', error);
          
          // FORÇAR ADMIN PARA diegkamor@gmail.com MESMO EM CASO DE ERRO
          if (user.email === 'diegkamor@gmail.com') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(user, { displayName: name });
      }
      
      // Criar documento do usuário na coleção users do Firestore
      await UserProfileService.createOrUpdateUserProfile(user.uid, {
        email: user.email || email,
        name: name,
        displayName: name,
        plano: 'free' // Plano padrão
      });
      
      console.log(`✅ Usuário ${email} criado com sucesso no Firestore`);
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAdmin,
    signIn,
    signUp,
    logout
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

