import { httpsCallable } from 'firebase/functions';
import { functions } from '@/integrations/firebase/config';
import { toast } from 'sonner';

export interface ExportDataRequest {
  format?: 'json' | 'csv';
}

export interface ExportDataResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  expiresAt?: string;
  exportId?: string;
}

/**
 * Solicita exportação de todos os dados do usuário
 */
export const requestDataExport = async (format: 'json' | 'csv' = 'json'): Promise<ExportDataResponse> => {
  try {
    console.log('🗂️ Solicitando exportação de dados:', format);
    
    const exportUserData = httpsCallable<ExportDataRequest, ExportDataResponse>(
      functions,
      'exportUserData'
    );
    
    const result = await exportUserData({ format });
    const data = result.data;
    
    if (data.success) {
      toast.success('Exportação concluída!', {
        description: 'Seus dados estão prontos para download.',
        duration: 10000,
      });
      console.log('✅ Exportação concluída:', data.exportId);
    } else {
      toast.error('Erro na exportação', {
        description: data.message,
      });
    }

    return data;
  } catch (error: any) {
    console.error('❌ Erro ao exportar dados:', error);
    
    const errorMessage = error.message || 'Erro desconhecido ao exportar dados';
    toast.error('Erro na exportação', {
      description: errorMessage,
    });
    
    return {
      success: false,
      message: errorMessage,
    };
  }
};

/**
 * Registra download de exportação
 */
export const registerDownload = async (exportId: string): Promise<void> => {
  try {
    console.log('📥 Registrando download:', exportId);
    
    // Adicionar breadcrumb no Sentry
    const { captureBusinessEvent } = await import('@/observability/sentry');
    captureBusinessEvent('data_export_downloaded', { exportId });
  } catch (error) {
    console.error('Erro ao registrar download:', error);
  }
};
