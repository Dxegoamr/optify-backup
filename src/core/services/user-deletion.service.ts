import { httpsCallable } from 'firebase/functions';
import { functions } from '@/integrations/firebase/config';
import { toast } from 'sonner';

export interface UserDeletionResult {
  success: boolean;
  message: string;
  deletedData: string[];
  auditLogId?: string;
}

export interface CanDeleteUserResult {
  canDelete: boolean;
  reason: string;
  isAdmin?: boolean;
}

/**
 * Exclui completamente um usuário e todos os seus dados via Cloud Function
 * @param targetUserId - ID do usuário a ser excluído
 * @param reason - Motivo da exclusão (opcional)
 * @returns Resultado da exclusão
 */
export const deleteUserCompletely = async (
  targetUserId: string,
  reason?: string
): Promise<UserDeletionResult> => {
  try {
    console.log(`🗑️ Iniciando exclusão completa do usuário: ${targetUserId}`);
    
    const deleteUserFunction = httpsCallable(functions, 'deleteUserCompletely');
    
    const result = await deleteUserFunction({
      targetUserId,
      reason,
    });

    const data = result.data as DeleteUserResponse;
    
    if (data.success) {
      toast.success(data.message);
      console.log(`✅ Exclusão concluída:`, data.deletedData);
    } else {
      toast.error(data.message);
    }

    return {
      success: data.success,
      message: data.message,
      deletedData: data.deletedData,
      auditLogId: data.auditLogId,
    };
  } catch (error: any) {
    console.error('❌ Erro ao excluir usuário:', error);
    
    const errorMessage = error.message || 'Erro desconhecido ao excluir usuário';
    toast.error(errorMessage);
    
    return {
      success: false,
      message: errorMessage,
      deletedData: [],
    };
  }
};

/**
 * Verifica se um usuário pode ser excluído via Cloud Function
 * @param targetUserId - ID do usuário a ser verificado
 * @returns Resultado da verificação
 */
export const canDeleteUser = async (targetUserId: string): Promise<CanDeleteUserResult> => {
  try {
    const canDeleteFunction = httpsCallable(functions, 'canDeleteUser');
    
    const result = await canDeleteFunction({
      targetUserId,
    });

    return result.data as CanDeleteUserResult;
  } catch (error: any) {
    console.error('❌ Erro ao verificar se usuário pode ser excluído:', error);
    
    return {
      canDelete: false,
      reason: error.message || 'Erro ao verificar permissões de exclusão',
    };
  }
};

// Tipos para compatibilidade com a Function
interface DeleteUserResponse {
  success: boolean;
  message: string;
  deletedData: string[];
  auditLogId?: string;
}
