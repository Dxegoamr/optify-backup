import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const auth = admin.auth();
const db = admin.firestore();
const storage = admin.storage();

interface ExportDataRequest {
  format?: 'json' | 'csv';
}

interface ExportDataResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  expiresAt?: string;
  exportId?: string;
}

/**
 * Exporta todos os dados do usuário em formato JSON ou CSV
 * Gera arquivo temporário no Storage com URL assinada válida por 24h
 */
export const exportUserData = onCall(
  {
    enforceAppCheck: true,
    memory: '1GiB',
    timeoutSeconds: 300, // 5 minutos
  },
  async (request): Promise<ExportDataResponse> => {
    const uid = request.auth?.uid;
    const email = request.auth?.token?.email;
    const { format = 'json' } = request.data as ExportDataRequest;

    if (!uid) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    try {
      logger.info('Iniciando exportação de dados do usuário', { uid, email, format });

      // 1. Buscar dados do usuário no Authentication
      let authData: any = {};
      try {
        const userRecord = await auth.getUser(uid);
        authData = {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL,
          emailVerified: userRecord.emailVerified,
          disabled: userRecord.disabled,
          metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          },
          customClaims: userRecord.customClaims || {},
        };
      } catch (error) {
        logger.warn('Erro ao buscar dados do Auth:', error);
      }

      // 2. Buscar documento principal do usuário
      let userData: any = {};
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          userData = userDoc.data();
        }
      } catch (error) {
        logger.warn('Erro ao buscar dados do usuário:', error);
      }

      // 3. Buscar subcoleções
      const subcollections = [
        'employees',
        'transactions',
        'platforms',
        'dailySummaries',
        'accounts',
        'payments',
        'goals',
        'reports',
        'notifications',
        'settings',
      ];

      const subcollectionsData: Record<string, any[]> = {};

      for (const subcollection of subcollections) {
        try {
          const snapshot = await db
            .collection('users')
            .doc(uid)
            .collection(subcollection)
            .get();

          if (!snapshot.empty) {
            subcollectionsData[subcollection] = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));
          }
        } catch (error) {
          logger.warn(`Erro ao buscar subcoleção ${subcollection}:`, error);
          subcollectionsData[subcollection] = [];
        }
      }

      // 4. Buscar transações de planos
      let planTransactions: any[] = [];
      try {
        const txSnapshot = await db.collection('transactions_plans')
          .where('userId', '==', uid)
          .get();

        planTransactions = txSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        logger.warn('Erro ao buscar transações de planos:', error);
      }

      // 5. Buscar histórico de alterações de plano
      let planHistory: any[] = [];
      try {
        const historySnapshot = await db.collection('plan_change_history')
          .where('userId', '==', uid)
          .get();

        planHistory = historySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        logger.warn('Erro ao buscar histórico de planos:', error);
      }

      // 6. Montar objeto completo com todos os dados
      const exportData = {
        exportInfo: {
          exportId: admin.firestore.FieldValue.serverTimestamp(),
          requestedBy: uid,
          requestedAt: new Date().toISOString(),
          format,
        },
        authentication: authData,
        profile: userData,
        subcollections: subcollectionsData,
        planTransactions,
        planHistory,
      };

      // 7. Gerar arquivo e fazer upload para Storage
      const exportId = `export-${uid}-${Date.now()}`;
      const fileName = `exports/${uid}/${exportId}.${format}`;
      const bucket = storage.bucket();
      const file = bucket.file(fileName);

      // Converter para string baseado no formato
      let content: string;
      if (format === 'json') {
        content = JSON.stringify(exportData, null, 2);
      } else {
        // CSV simplificado (apenas dados principais)
        content = convertToCSV(exportData);
      }

      // Fazer upload
      await file.save(content, {
        contentType: format === 'json' ? 'application/json' : 'text/csv',
        metadata: {
          userId: uid,
          exportId,
          createdAt: new Date().toISOString(),
        },
      });

      // 8. Gerar URL assinada válida por 24h
      const [downloadUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
      });

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // 9. Registrar auditoria
      await db.collection('audit_logs').add({
        action: 'user_data_exported',
        userId: uid,
        userEmail: email,
        exportId,
        format,
        fileName,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'user_request',
      });

      // 10. Registrar solicitação de exportação
      await db.collection('data_exports').add({
        userId: uid,
        userEmail: email,
        exportId,
        fileName,
        format,
        downloadUrl,
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(expiresAt)),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        downloaded: false,
      });

      logger.info('Exportação de dados concluída', {
        uid,
        email,
        exportId,
        format,
        fileSize: content.length,
      });

      return {
        success: true,
        message: 'Dados exportados com sucesso. O link de download é válido por 24 horas.',
        downloadUrl,
        expiresAt,
        exportId,
      };
    } catch (error) {
      logger.error('Erro ao exportar dados do usuário:', {
        uid,
        email,
        error: error instanceof Error ? error.message : String(error),
      });

      // Registrar falha na auditoria
      try {
        await db.collection('audit_logs').add({
          action: 'user_data_export_failed',
          userId: uid,
          userEmail: email,
          error: error instanceof Error ? error.message : String(error),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          source: 'user_request',
        });
      } catch (auditError) {
        logger.error('Erro ao registrar falha na auditoria:', auditError);
      }

      throw new HttpsError(
        'internal',
        `Erro ao exportar dados: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

/**
 * Converte dados para formato CSV
 */
function convertToCSV(data: any): string {
  const lines: string[] = [];
  
  // Header
  lines.push('# EXPORTAÇÃO DE DADOS DO USUÁRIO - OPTIFY\n');
  lines.push(`# Gerado em: ${new Date().toISOString()}\n\n`);

  // Dados de autenticação
  lines.push('## DADOS DE AUTENTICAÇÃO\n');
  lines.push(`UID,Email,Nome,Verificado,Criado Em,Último Login`);
  lines.push(`${data.authentication.uid},${data.authentication.email},${data.authentication.displayName},${data.authentication.emailVerified},${data.authentication.metadata.creationTime},${data.authentication.metadata.lastSignInTime}\n\n`);

  // Dados de perfil
  lines.push('## DADOS DE PERFIL\n');
  lines.push(`Plano,Ativo,Período,Data de Expiração`);
  lines.push(`${data.profile.plano},${data.profile.isActive},${data.profile.periodo},${data.profile.subscriptionEndDate}\n\n`);

  // Funcionários
  if (data.subcollections.employees && data.subcollections.employees.length > 0) {
    lines.push('## FUNCIONÁRIOS\n');
    lines.push(`ID,Nome,Cargo,Salário,Data de Contratação`);
    data.subcollections.employees.forEach((emp: any) => {
      lines.push(`${emp.id},${emp.name},${emp.position},${emp.salary},${emp.hireDate}`);
    });
    lines.push('\n');
  }

  // Transações
  if (data.planTransactions && data.planTransactions.length > 0) {
    lines.push('## TRANSAÇÕES\n');
    lines.push(`ID,Plano,Valor,Status,Data`);
    data.planTransactions.forEach((tx: any) => {
      lines.push(`${tx.id},${tx.planId},${tx.amount},${tx.status},${tx.createdAt}`);
    });
    lines.push('\n');
  }

  return lines.join('\n');
}

/**
 * Limpa exports antigos (executar semanalmente)
 */
export const cleanupOldExports = onCall(
  {
    enforceAppCheck: true,
    memory: '512MiB',
  },
  async () => {
    try {
      logger.info('Iniciando limpeza de exports antigos');

      // Buscar exports com mais de 30 dias
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

      const snapshot = await db.collection('data_exports')
        .where('createdAt', '<', cutoffTimestamp)
        .limit(100)
        .get();

      if (snapshot.empty) {
        logger.info('Nenhum export antigo para limpar');
        return { deleted: 0 };
      }

      const bucket = storage.bucket();
      let deletedFiles = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Deletar arquivo do Storage
        try {
          await bucket.file(data.fileName).delete();
          deletedFiles++;
        } catch (error) {
          logger.warn(`Arquivo ${data.fileName} não encontrado no Storage`);
        }

        // Deletar registro do Firestore
        await doc.ref.delete();
      }

      logger.info(`Limpeza de exports: ${deletedFiles} arquivos e ${snapshot.size} registros removidos`);

      return {
        deleted: snapshot.size,
        filesDeleted: deletedFiles,
      };
    } catch (error) {
      logger.error('Erro na limpeza de exports:', error);
      throw new HttpsError('internal', 'Erro ao limpar exports antigos');
    }
  }
);
