import { useState } from 'react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/integrations/firebase/config';
import { toast } from 'sonner';

export const usePasswordReset = () => {
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  const verifyResetCode = async (oobCode: string) => {
    try {
      setLoading(true);
      await verifyPasswordResetCode(auth, oobCode);
      setIsValidToken(true);
      return true;
    } catch (error: any) {
      console.error('Erro ao verificar código de redefinição:', error);
      setIsValidToken(false);
      
      if (error?.code === 'auth/invalid-action-code') {
        toast.error('Link de redefinição inválido ou expirado');
      } else if (error?.code === 'auth/expired-action-code') {
        toast.error('Link de redefinição expirado');
      } else {
        toast.error('Erro ao verificar link de redefinição');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (oobCode: string, newPassword: string) => {
    try {
      setLoading(true);
      await confirmPasswordReset(auth, oobCode, newPassword);
      toast.success('Senha redefinida com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      
      if (error?.code === 'auth/invalid-action-code') {
        toast.error('Link de redefinição inválido ou expirado');
      } else if (error?.code === 'auth/expired-action-code') {
        toast.error('Link de redefinição expirado');
      } else if (error?.code === 'auth/weak-password') {
        toast.error('A senha é muito fraca. Tente uma senha mais forte');
      } else if (error?.code === 'auth/invalid-email') {
        toast.error('E-mail inválido');
      } else {
        toast.error('Erro ao redefinir senha. Tente novamente');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password: string): { isValid: boolean; message?: string } => {
    if (password.length < 6) {
      return { isValid: false, message: 'A senha deve ter pelo menos 6 caracteres' };
    }
    
    if (password.length > 128) {
      return { isValid: false, message: 'A senha deve ter no máximo 128 caracteres' };
    }

    // Verificar se tem pelo menos uma letra e um número
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!hasLetter) {
      return { isValid: false, message: 'A senha deve conter pelo menos uma letra' };
    }
    
    if (!hasNumber) {
      return { isValid: false, message: 'A senha deve conter pelo menos um número' };
    }

    return { isValid: true };
  };

  return {
    loading,
    isValidToken,
    verifyResetCode,
    resetPassword,
    validatePassword,
    setIsValidToken
  };
};




