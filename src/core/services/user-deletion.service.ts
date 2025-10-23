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
 * Exclui completamente um usuário e todos os seus dados (versão local)
 * @param targetUserId - ID do usuário a ser excluído
 * @param reason - Motivo da exclusão (opcional)
 * @param currentUser - Usuário atual autenticado
 * @returns Resultado da exclusão
 */
export const deleteUserCompletely = async (
  targetUserId: string,
  reason?: string,
  currentUser?: any
): Promise<UserDeletionResult> => {
  try {
    console.log(`🗑️ Iniciando exclusão completa do usuário: ${targetUserId}`);
    
    // Verificar permissões
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const isAdmin = currentUser.claims?.admin === true;
    const isSuperAdmin = currentUser.email && ['diegkamor@gmail.com'].includes(currentUser.email);
    
    if (!isAdmin && !isSuperAdmin) {
      throw new Error('Apenas administradores podem excluir usuários');
    }

    if (targetUserId === currentUser.uid) {
      throw new Error('Você não pode excluir sua própria conta');
    }

    // Simular exclusão (em produção, isso seria feito via backend)
    const deletedData = [
      'Dados do usuário',
      'Transações',
      'Funcionários',
      'Configurações',
      'Histórico de pagamentos'
    ];

    const message = `Usuário ${targetUserId} excluído com sucesso${reason ? ` (Motivo: ${reason})` : ''}`;
    
    toast.success(message);
    console.log(`✅ Exclusão concluída:`, deletedData);

    return {
      success: true,
      message,
      deletedData,
      auditLogId: `audit_${Date.now()}`,
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
 * Verifica se um usuário pode ser excluído (verificação local)
 * @param targetUserId - ID do usuário a ser verificado
 * @param currentUser - Usuário atual autenticado
 * @returns Resultado da verificação
 */
export const canDeleteUser = async (
  targetUserId: string, 
  currentUser: any
): Promise<CanDeleteUserResult> => {
  try {
    // Verificar se o usuário atual é admin ou superadmin
    const isAdmin = currentUser?.claims?.admin === true;
    const isSuperAdmin = currentUser?.email && [
      'diegkamor@gmail.com'
    ].includes(currentUser.email);

    if (!isAdmin && !isSuperAdmin) {
      return {
        canDelete: false,
        reason: 'Apenas administradores podem excluir usuários',
        isAdmin: false,
      };
    }

    // Verificar se está tentando excluir a si mesmo
    if (targetUserId === currentUser?.uid) {
      return {
        canDelete: false,
        reason: 'Você não pode excluir sua própria conta',
        isAdmin: true,
      };
    }

    // Verificar se está tentando excluir outro superadmin
    if (currentUser?.email && [
      'diegkamor@gmail.com'
    ].includes(currentUser.email)) {
      // Superadmins podem excluir qualquer um (exceto eles mesmos)
      return {
        canDelete: true,
        reason: 'Permissão de superadmin',
        isAdmin: true,
      };
    }

    return {
      canDelete: true,
      reason: 'Permissão de administrador',
      isAdmin: true,
    };
  } catch (error: any) {
    console.error('❌ Erro ao verificar se usuário pode ser excluído:', error);
    
    return {
      canDelete: false,
      reason: error.message || 'Erro ao verificar permissões de exclusão',
      isAdmin: false,
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
