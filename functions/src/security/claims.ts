import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import { SetClaimRequestSchema, validateData } from '../validation/schemas';

// Lista de superadmins (em produção, usar env vars)
const SUPER_ADMINS = [
  'diegkamor@gmail.com',
  // Adicionar outros superadmins aqui
];

/**
 * Function para definir claims de admin - apenas para superadmins
 */
export const setAdminClaim = onCall(
  {
    enforceAppCheck: true,
    memory: '256MiB',
  },
  async (request) => {
    // Validar dados de entrada com Zod
    let validatedData;
    try {
      validatedData = validateData(SetClaimRequestSchema, request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Dados inválidos');
    }

    const { uid, isAdmin } = validatedData;
    const callerEmail = request.auth?.token.email;

    // Verificar se o chamador é superadmin
    if (!callerEmail || !SUPER_ADMINS.includes(callerEmail)) {
      logger.warn('Tentativa de setAdminClaim por usuário não autorizado', {
        callerEmail,
        uid: request.auth?.uid,
      });
      throw new HttpsError('permission-denied', 'Apenas superadmins podem definir claims de admin');
    }

    if (!uid || typeof isAdmin !== 'boolean') {
      throw new HttpsError('invalid-argument', 'uid e isAdmin são obrigatórios');
    }

    try {
      const auth = getAuth();
      const user = await auth.getUser(uid);
      
      // Definir custom claims
      await auth.setCustomUserClaims(uid, {
        admin: isAdmin,
        updatedBy: request.auth?.uid,
        updatedAt: new Date().toISOString(),
      });

      logger.info('Custom claim admin definido com sucesso', {
        targetUid: uid,
        targetEmail: user.email,
        isAdmin,
        setBy: request.auth?.uid,
        setByEmail: callerEmail,
      });

      return {
        success: true,
        message: `Usuário ${user.email} agora é ${isAdmin ? 'admin' : 'usuário normal'}`,
        uid,
        email: user.email,
        isAdmin,
      };
    } catch (error) {
      logger.error('Erro ao definir custom claim', {
        uid,
        isAdmin,
        error: error instanceof Error ? error.message : String(error),
        callerEmail,
      });
      throw new HttpsError('internal', 'Erro interno ao definir claim de admin');
    }
  }
);

/**
 * Function para verificar se o usuário atual é admin
 */
export const verifyAdminStatus = onCall(
  {
    enforceAppCheck: true,
    memory: '128MiB',
  },
  async (request) => {
    const uid = request.auth?.uid;
    const email = request.auth?.token.email;

    if (!uid) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    try {
      const auth = getAuth();
      const user = await auth.getUser(uid);
      const customClaims = user.customClaims || {};

      const isAdmin = customClaims.admin === true;
      const isSuperAdmin = SUPER_ADMINS.includes(email || '');

      logger.info('Verificação de status admin', {
        uid,
        email,
        isAdmin,
        isSuperAdmin,
        claims: customClaims,
      });

      return {
        uid,
        email,
        isAdmin,
        isSuperAdmin,
        claims: customClaims,
      };
    } catch (error) {
      logger.error('Erro ao verificar status admin', {
        uid,
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new HttpsError('internal', 'Erro interno ao verificar status de admin');
    }
  }
);

/**
 * Function para listar todos os usuários com claims de admin
 */
export const listAdmins = onCall(
  {
    enforceAppCheck: true,
    memory: '512MiB',
  },
  async (request) => {
    const callerEmail = request.auth?.token.email;

    // Verificar se o chamador é superadmin
    if (!callerEmail || !SUPER_ADMINS.includes(callerEmail)) {
      logger.warn('Tentativa de listAdmins por usuário não autorizado', {
        callerEmail,
        uid: request.auth?.uid,
      });
      throw new HttpsError('permission-denied', 'Apenas superadmins podem listar admins');
    }

    try {
      const auth = getAuth();
      const listUsersResult = await auth.listUsers(1000); // Limite do Firebase
      
      const admins = listUsersResult.users
        .filter(user => {
          const claims = user.customClaims || {};
          return claims.admin === true;
        })
        .map(user => ({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          isSuperAdmin: SUPER_ADMINS.includes(user.email || ''),
          claims: user.customClaims || {},
          createdAt: user.metadata.creationTime,
          lastSignIn: user.metadata.lastSignInTime,
        }));

      logger.info('Lista de admins solicitada', {
        totalAdmins: admins.length,
        requestedBy: callerEmail,
      });

      return {
        admins,
        totalCount: admins.length,
        superAdmins: SUPER_ADMINS,
      };
    } catch (error) {
      logger.error('Erro ao listar admins', {
        error: error instanceof Error ? error.message : String(error),
        callerEmail,
      });
      throw new HttpsError('internal', 'Erro interno ao listar admins');
    }
  }
);
