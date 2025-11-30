import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, Calendar } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { FreeBetService } from '@/core/services/freebet.service';
import { UserTransactionService } from '@/core/services/user-specific.service';
import { FreeBetHistoryEntry } from '@/types/freebet';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FreeBetHistory = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<FreeBetHistoryEntry | null>(null);

  // Buscar histórico de operações
  const { data: historyEntries = [], isLoading } = useQuery({
    queryKey: ['freebet-history', user?.uid],
    queryFn: () => FreeBetService.getHistory(user?.uid || ''),
    enabled: !!user?.uid,
  });

  // Ordenar histórico do mais recente para o mais antigo
  const sortedHistory = historyEntries
    .map(entry => {
      const closedAtDate =
        entry.closedAt instanceof Date
          ? entry.closedAt
          : (entry.closedAt as any)?.toDate
          ? (entry.closedAt as any).toDate()
          : new Date(entry.closedAt);
      return { ...entry, closedAtDate } as FreeBetHistoryEntry & { closedAtDate: Date };
    })
    .sort((a, b) => {
      const timeA = a.closedAtDate instanceof Date && !isNaN(a.closedAtDate.getTime()) ? a.closedAtDate.getTime() : 0;
      const timeB = b.closedAtDate instanceof Date && !isNaN(b.closedAtDate.getTime()) ? b.closedAtDate.getTime() : 0;
      return timeB - timeA;
    });

  // Calcular totais para cada entrada
  const calculateTotals = (entry: FreeBetHistoryEntry) => ({
    totalApostado: entry.totalApostado || 0,
    retorno: entry.retorno || 0,
    totalConversaoSaldo: entry.totalConversaoSaldo || 0,
    lucroGeral: entry.lucro || 0,
    funcionariosCount: entry.funcionarios?.length || 0,
  });

  // Abrir diálogo de exclusão
  const handleDeleteClick = (entry: FreeBetHistoryEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  // Excluir histórico
  const handleDeleteHistoryEntry = async () => {
    if (!user?.uid || !entryToDelete) return;

    try {
      // Buscar a transação antes de excluir para obter os dados
      let transactionData = null;
      if (entryToDelete.transactionId) {
        try {
          // Buscar transação para obter data e valor
          const allTransactions = await UserTransactionService.getTransactions(user.uid, 1000);
          transactionData = allTransactions.find(t => t.id === entryToDelete.transactionId);
        } catch (error) {
          console.error('Erro ao buscar transação:', error);
        }
      }

      // Obter data da transação ou do fechamento para atualizar o resumo diário
      const { UserDailySummaryService } = await import('@/core/services/user-specific.service');
      const { getCurrentDateStringInSaoPaulo } = await import('@/utils/timezone');
      
      const transactionDate = transactionData?.date || 
        (entryToDelete.closedAt instanceof Date 
          ? entryToDelete.closedAt.toISOString().split('T')[0]
          : (entryToDelete.closedAt as any)?.toDate 
            ? (entryToDelete.closedAt as any).toDate().toISOString().split('T')[0]
            : getCurrentDateStringInSaoPaulo());
      
      // Atualizar resumo diário ANTES de excluir a transação
      // O lucro da FreeBet foi adicionado diretamente ao resumo diário quando foi fechada
      if (entryToDelete.lucro !== undefined) {
        try {
          const existingSummary = await UserDailySummaryService.getDailySummaryByDate(user.uid, transactionDate);
          
          if (existingSummary) {
            // Calcular valores a subtrair (lucro da FreeBet que foi adicionado diretamente)
            const lucroToRemove = entryToDelete.lucro || 0;
            const depositContribution = lucroToRemove > 0 ? lucroToRemove : 0;
            const withdrawContribution = lucroToRemove < 0 ? Math.abs(lucroToRemove) : 0;
            
            // Subtrair o lucro da FreeBet do resumo diário
            await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, {
              totalDeposits: Math.max(0, (existingSummary.totalDeposits || 0) - depositContribution),
              totalWithdraws: Math.max(0, (existingSummary.totalWithdraws || 0) - withdrawContribution),
              profit: (existingSummary.profit || existingSummary.margin || 0) - lucroToRemove,
              margin: (existingSummary.profit || existingSummary.margin || 0) - lucroToRemove,
              transactionCount: Math.max(0, (existingSummary.transactionCount || 0) - 1),
              updatedAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Erro ao atualizar resumo diário:', error);
          // Não falhar a exclusão se a atualização do resumo falhar
        }
      }

      // Excluir transação vinculada (isso também vai atualizar o resumo diário, mas já subtraímos o lucro acima)
      if (entryToDelete.transactionId) {
        try {
          await UserTransactionService.deleteTransaction(user.uid, entryToDelete.transactionId);
        } catch (error) {
          console.error('Erro ao excluir transação vinculada:', error);
        }
      }

      await FreeBetService.deleteHistoryEntry(user.uid, entryToDelete.id);
      queryClient.invalidateQueries({ queryKey: ['freebet-history', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['firebase-transactions', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['firebase-all-daily-summaries', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['firebase-daily-summaries', user.uid] });

      toast.success('Registro removido do histórico!');
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir histórico:', error);
      toast.error('Erro ao excluir histórico. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/freebet')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Histórico de Operações FreeBet</h1>
              <p className="text-muted-foreground">
                Visualize ou exclua suas operações anteriores
              </p>
            </div>
          </div>
        </div>

        {/* Operações Fechadas */}
        {sortedHistory.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Histórico de Operações</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedHistory.map(entry => {
                const totals = calculateTotals(entry);
                const lucro = totals.lucroGeral;
                
                return (
                  <Card key={entry.id} className="relative opacity-90">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: entry.platformColor }}
                            />
                            {entry.platformName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Fechada em{' '}
                            {entry.closedAtDate instanceof Date && !isNaN(entry.closedAtDate.getTime())
                              ? format(entry.closedAtDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                              : 'Data desconhecida'}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          Fechada
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Funcionários:</span>
                          <span className="font-medium">{totals.funcionariosCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Apostado:</span>
                          <span className="font-medium">R$ {totals.totalApostado.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Retorno Conta Vencedora:</span>
                          <span className="font-medium">R$ {totals.retorno.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Conversão Saldo:</span>
                          <span className="font-medium">R$ {totals.totalConversaoSaldo.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-muted-foreground">Lucro Fechado:</span>
                          <span
                            className={`font-bold ${
                              lucro >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {lucro >= 0 ? '+' : ''}R$ {lucro.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(entry)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Mensagem quando não há operações fechadas */}
        {sortedHistory.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhuma operação fechada encontrada
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Feche uma operação para que ela apareça no histórico
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate('/freebet')}
              >
                Voltar para FreeBet
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro do Histórico</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntryToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHistoryEntry}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default FreeBetHistory;

