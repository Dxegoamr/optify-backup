import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileJson, FileText, Loader2, ExternalLink } from 'lucide-react';
import { requestDataExport, registerDownload } from '@/core/services/export-data.service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export const DataExport = () => {
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    downloadUrl?: string;
    expiresAt?: string;
    exportId?: string;
    format?: string;
  } | null>(null);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setExporting(true);
      setExportResult(null);

      const result = await requestDataExport(format);
      
      if (result.success && result.downloadUrl) {
        setExportResult({
          downloadUrl: result.downloadUrl,
          expiresAt: result.expiresAt,
          exportId: result.exportId,
          format,
        });
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = (url: string, exportId: string) => {
    // Registrar download
    registerDownload(exportId);
    
    // Abrir URL em nova aba
    window.open(url, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Exportar Meus Dados (LGPD)
        </CardTitle>
        <CardDescription>
          Baixe uma cópia completa de todos os seus dados armazenados no sistema.
          De acordo com a LGPD, você tem direito de acessar todos os dados pessoais que mantemos sobre você.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informações sobre a exportação */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">O que será incluído:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
            <li>Dados de autenticação e perfil</li>
            <li>Funcionários cadastrados</li>
            <li>Transações e pagamentos</li>
            <li>Plataformas configuradas</li>
            <li>Resumos diários e relatórios</li>
            <li>Configurações e preferências</li>
            <li>Histórico de alterações de plano</li>
          </ul>
        </div>

        {/* Botões de exportação */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Escolha o formato de exportação:</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="h-auto py-4 flex flex-col items-center gap-2"
              variant="outline"
            >
              {exporting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileJson className="h-6 w-6" />
              )}
              <div className="text-center">
                <div className="font-semibold">Formato JSON</div>
                <div className="text-xs text-muted-foreground">
                  Estruturado e legível por máquinas
                </div>
              </div>
            </Button>

            <Button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="h-auto py-4 flex flex-col items-center gap-2"
              variant="outline"
            >
              {exporting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileText className="h-6 w-6" />
              )}
              <div className="text-center">
                <div className="font-semibold">Formato CSV</div>
                <div className="text-xs text-muted-foreground">
                  Compatível com Excel e Sheets
                </div>
              </div>
            </Button>
          </div>
        </div>

        {/* Estado de carregamento */}
        {exporting && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Preparando seus dados... Isso pode levar alguns segundos.
            </AlertDescription>
          </Alert>
        )}

        {/* Resultado da exportação */}
        {exportResult && exportResult.downloadUrl && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <Download className="h-4 w-4 text-green-600" />
            <AlertDescription className="space-y-4">
              <div>
                <p className="font-semibold text-green-600">Exportação concluída!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Seus dados foram exportados com sucesso no formato{' '}
                  <Badge variant="secondary">{exportResult.format?.toUpperCase()}</Badge>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => handleDownload(exportResult.downloadUrl!, exportResult.exportId!)}
                  className="flex-1"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Baixar Dados
                </Button>
              </div>

              {exportResult.expiresAt && (
                <p className="text-xs text-muted-foreground">
                  ⏰ O link de download expira em{' '}
                  {new Date(exportResult.expiresAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Aviso sobre privacidade */}
        <Alert>
          <AlertDescription className="text-xs">
            <strong>Importante:</strong> O arquivo exportado contém dados sensíveis. 
            Mantenha-o em local seguro e não compartilhe com terceiros. 
            O link de download expira automaticamente após 24 horas.
          </AlertDescription>
        </Alert>

        {/* Informações adicionais */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• A exportação inclui todos os dados até o momento da solicitação</p>
          <p>• Dados exportados anteriormente não são incluídos</p>
          <p>• Você pode solicitar uma nova exportação a qualquer momento</p>
          <p>• Os arquivos de exportação são armazenados por 30 dias</p>
        </div>
      </CardContent>
    </Card>
  );
};
