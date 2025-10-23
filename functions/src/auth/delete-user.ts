import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { DeleteUserRequestSchema, validateData } from '../validation/schemas';

if (!admin.apps.length) admin.initializeApp();
const auth = admin.auth();
const db = admin.firestore();

interface DeleteUserResponse {
  success: boolean;
  message: string;
  deletedData: string[];
  auditLogId?: string;
}

/**
 * Exclui completamente um usuário e todos os seus dados associados
 * Requer permissões de admin e executa via Admin SDK
 */
export const deleteUserCompletely = onCall(
  {
    enforceAppCheck: true,
    memory: '1GiB',
    timeoutSeconds: 300, // 5 minutos para operações complexas
  },
  async (request): Promise<DeleteUserResponse> => {
    // Validar dados de entrada com Zod
    let validatedData;
    try {
      validatedData = validateData(DeleteUserRequestSchema, request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Dados inválidos');
    }

    const { targetUserId, reason } = validatedData;
    const callerUid = request.auth?.uid;
    const callerEmail = request.auth?.token.email;

    // Verificar se o chamador é admin
    const isAdmin = request.auth?.token.admin === true;
    const isSuperAdmin = callerEmail && [
      'diegkamor@gmail.com'
      // Adicionar outros superadmins conforme necessário
    ].includes(callerEmail);

    if (!isAdmin && !isSuperAdmin) {
      logger.warn('Tentativa de exclusão de usuário por não-admin', {
        callerUid,
        callerEmail,
        targetUserId,
      });
      throw new HttpsError('permission-denied', 'Apenas administradores podem excluir usuários');
    }

    // Não permitir auto-exclusão
    if (targetUserId === callerUid) {
      throw new HttpsError('invalid-argument', 'Você não pode excluir sua própria conta');
    }

    if (!targetUserId) {
      throw new HttpsError('invalid-argument', 'ID do usuário é obrigatório');
    }

    try {
      logger.info('Iniciando exclusão completa de usuário', {
        targetUserId,
        callerUid,
        callerEmail,
        reason,
      });

      const deletedData: string[] = [];
      let targetUserEmail = '';

      // 1. Buscar dados do usuário antes da exclusão
      try {
        const targetUser = await auth.getUser(targetUserId);
        targetUserEmail = targetUser.email || 'unknown@email.com';
        
        // Buscar documento do usuário no Firestore
        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (userDoc.exists) {
          deletedData.push('Documento principal do usuário no Firestore');
        }
      } catch (error) {
        logger.warn('Usuário não encontrado no Auth ou Firestore', { targetUserId, error });
      }

      // 2. Excluir subcoleções do usuário
      const subcollections = [
        'employees',
        'transactions',
        'platforms',
        'dailySummaries',
        'notifications',
      ];

      for (const subcollection of subcollections) {
        try {
          const snapshot = await db
            .collection('users')
            .doc(targetUserId)
            .collection(subcollection)
            .get();

          if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            
            deletedData.push(`${snapshot.size} documentos da subcoleção ${subcollection}`);
            logger.info(`Subcoleção ${subcollection} excluída`, { 
              count: snapshot.size, 
              targetUserId 
            });
          }
        } catch (error) {
          logger.error(`Erro ao excluir subcoleção ${subcollection}:`, error);
        }
      }

      // 3. Excluir histórico de alterações de plano
      try {
        const planHistorySnapshot = await db
          .collection('plan_change_history')
          .where('userId', '==', targetUserId)
          .get();

        if (!planHistorySnapshot.empty) {
          const batch = db.batch();
          planHistorySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          
          deletedData.push(`${planHistorySnapshot.size} registros de histórico de planos`);
        }
      } catch (error) {
        logger.error('Erro ao excluir histórico de planos:', error);
      }

      // 4. Excluir transações de planos associadas
      try {
        const transactionsSnapshot = await db
          .collection('transactions_plans')
          .where('userId', '==', targetUserId)
          .get();

        if (!transactionsSnapshot.empty) {
          const batch = db.batch();
          transactionsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          
          deletedData.push(`${transactionsSnapshot.size} transações de planos`);
        }
      } catch (error) {
        logger.error('Erro ao excluir transações de planos:', error);
      }

      // 5. Excluir documento principal do usuário no Firestore
      try {
        await db.collection('users').doc(targetUserId).delete();
        deletedData.push('Documento principal do usuário no Firestore');
      } catch (error) {
        logger.error('Erro ao excluir documento principal:', error);
      }

      // 6. Excluir usuário do Firebase Authentication (Admin SDK)
      try {
        await auth.deleteUser(targetUserId);
        deletedData.push('Usuário do Firebase Authentication');
        logger.info('Usuário excluído do Firebase Auth', { targetUserId });
      } catch (error) {
        logger.error('Erro ao excluir usuário do Firebase Auth:', error);
        // Não falhar a operação se o usuário já foi excluído do Auth
        const err = error as any;
        if (err.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      // 7. Registrar evento de auditoria
      const auditLogRef = await db.collection('audit_logs').add({
        action: 'user_deleted',
        targetUserId,
        targetUserEmail,
        deletedBy: callerUid,
        deletedByEmail: callerEmail,
        reason: reason || 'Exclusão solicitada por administrador',
        deletedData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'admin_panel',
      });

      // 8. Registrar exclusão em histórico de admin (se aplicável)
      if (isAdmin) {
        await db.collection('admin_deletion_history').add({
          targetUserId,
          targetUserEmail,
          deletedBy: callerUid,
          deletedByEmail: callerEmail,
          reason: reason || 'Exclusão solicitada por administrador',
          deletedData,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          auditLogId: auditLogRef.id,
        });
      }

      logger.info('Exclusão completa de usuário finalizada', {
        targetUserId,
        targetUserEmail,
        deletedBy: callerUid,
        deletedByEmail: callerEmail,
        deletedDataCount: deletedData.length,
        auditLogId: auditLogRef.id,
      });

      return {
        success: true,
        message: `Usuário ${targetUserEmail} foi completamente excluído do sistema.`,
        deletedData,
        auditLogId: auditLogRef.id,
      };
    } catch (error) {
      logger.error('Erro na exclusão completa de usuário:', {
        targetUserId,
        callerUid,
        callerEmail,
        error: error instanceof Error ? error.message : String(error),
      });

      // Registrar falha na auditoria
      try {
        await db.collection('audit_logs').add({
          action: 'user_deletion_failed',
          targetUserId,
          deletedBy: callerUid,
          deletedByEmail: callerEmail,
          reason: reason || 'Exclusão solicitada por administrador',
          error: error instanceof Error ? error.message : String(error),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          source: 'admin_panel',
        });
      } catch (auditError) {
        logger.error('Erro ao registrar falha na auditoria:', auditError);
      }

      throw new HttpsError(
        'internal',
        `Erro interno ao excluir usuário: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

/**
 * Verifica se um usuário pode ser excluído (não é superadmin)
 */
export const canDeleteUser = onCall(
  {
    enforceAppCheck: true,
    memory: '128MiB',
  },
  async (request) => {
    const { targetUserId } = request.data;
    const callerUid = request.auth?.uid;
    const callerEmail = request.auth?.token.email;

    // Verificar se o chamador é admin
    const isAdmin = request.auth?.token.admin === true;
    const isSuperAdmin = callerEmail && [
      'diegkamor@gmail.com'
    ].includes(callerEmail);

    if (!isAdmin && !isSuperAdmin) {
      throw new HttpsError('permission-denied', 'Apenas administradores podem verificar exclusão de usuários');
    }

    if (!targetUserId) {
      throw new HttpsError('invalid-argument', 'ID do usuário é obrigatório');
    }

    try {
      // Não pode excluir a si mesmo
      if (targetUserId === callerUid) {
        return { canDelete: false, reason: 'Você não pode excluir sua própria conta' };
      }

      // Buscar dados do usuário
      const targetUser = await auth.getUser(targetUserId);
      const targetEmail = targetUser.email || '';

      // Não pode excluir superadmins
      const superAdmins = ['diegkamor@gmail.com'];
      if (superAdmins.includes(targetEmail)) {
        return { 
          canDelete: false, 
          reason: 'Não é possível excluir contas de superadministradores' 
        };
      }

      // Verificar se é admin
      const isTargetAdmin = targetUser.customClaims?.admin === true;
      if (isTargetAdmin) {
        return { 
          canDelete: true, 
          reason: 'Usuário é administrador - exclusão permitida com confirmação adicional',
          isAdmin: true 
        };
      }

      return { 
        canDelete: true, 
        reason: 'Usuário pode ser excluído',
        isAdmin: false 
      };
    } catch (error) {
      logger.error('Erro ao verificar se usuário pode ser excluído:', error);
      throw new HttpsError(
        'internal',
        `Erro ao verificar usuário: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);
