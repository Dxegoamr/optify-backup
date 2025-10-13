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
import { getIdTokenResult } from 'firebase/auth';
import { setSentryUser } from '@/observability/sentry';

interface FirebaseAuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  customClaims: Record<string, any> | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshClaims: () => Promise<void>;
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
  const [customClaims, setCustomClaims] = useState<Record<string, any> | null>(null);

  // Função para obter custom claims do usuário
  const getCustomClaims = async (user: User) => {
    try {
      const tokenResult = await getIdTokenResult(user, true); // force refresh
      const claims = tokenResult.claims || {};
      setCustomClaims(claims);
      setIsAdmin(claims.admin === true || user.email === 'diegkamor@gmail.com');
      return claims;
    } catch (error) {
      console.error('Erro ao obter custom claims:', error);
      setCustomClaims(null);
      setIsAdmin(user.email === 'diegkamor@gmail.com'); // fallback para superadmin
      return null;
    }
  };

  // Função para refresh dos claims
  const refreshClaims = async () => {
    if (user) {
      await getCustomClaims(user);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Configurar usuário no Sentry
      setSentryUser(user);
      
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
          
          // Obter custom claims para verificar status de admin
          await getCustomClaims(user);
          
        } catch (error) {
          console.error('Erro ao verificar/criar perfil do usuário:', error);
          
          // Fallback para superadmin em caso de erro
          setCustomClaims(null);
          setIsAdmin(user.email === 'diegkamor@gmail.com');
        }
      } else {
        setIsAdmin(false);
        setCustomClaims(null);
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
    customClaims,
    signIn,
    signUp,
    logout,
    refreshClaims
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

