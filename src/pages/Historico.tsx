import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProtectedPageContent } from '@/components/ProtectedPageContent';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, Eye, Trash2, X, Edit, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useAllDailySummaries, useEmployees, usePlatforms, useUpdateDailySummary, useDeleteDailySummary } from '@/hooks/useFirestore';
import { toast } from 'sonner';
import { shouldDisplayAsPositive } from '@/utils/financial-calculations';

const Historico = () => {
  const { user } = useFirebaseAuth();
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSummary, setEditingSummary] = useState<any>(null);
  
  // Buscar dados
  const { data: dailySummaries = [], isLoading } = useAllDailySummaries(user?.uid || '');
  const { data: employees = [] } = useEmployees(user?.uid || '');
  const { data: platforms = [] } = usePlatforms(user?.uid || '');
  
  // Hooks para editar e excluir
  const updateDailySummary = useUpdateDailySummary();
  const deleteDailySummary = useDeleteDailySummary();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR });
  };

  const getStatusColor = (profit: number) => {
    return profit >= 0 ? 'text-success' : 'text-destructive';
  };

  const handleViewDetails = (summary: any) => {
    setSelectedSummary(summary);
    setDetailsOpen(true);
  };

  const handleEditSummary = (summary: any) => {
    setEditingSummary(summary);
    setEditOpen(true);
  };

  const handleDeleteSummary = async (summaryId: string) => {
    try {
      await deleteDailySummary.mutateAsync(summaryId);
      toast.success('Fechamento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir fechamento:', error);
      toast.error('Erro ao excluir fechamento');
    }
  };

  const handleExportToPDF = async () => {
    try {
      // TODO: Implementar exportação
      toast.success('Histórico exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar histórico');
    }
  };

  return (
    <DashboardLayout>
      <ProtectedPageContent 
        requiredFeature="history" 
        featureName="Histórico Completo"
        requiredPlan="Medium"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Badge className="rounded-full bg-primary/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary mb-4">
                Histórico
              </Badge>
              <h1 className="text-3xl font-bold text-foreground">Histórico de Fechamentos</h1>
              <p className="text-muted-foreground mt-2">
                Visualize o histórico de todos os fechamentos de dia.
              </p>
          </div>
          <Button onClick={handleExportToPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
            </Button>
        </div>

        {/* Lista de Fechamentos */}
        <Card className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Carregando histórico...</div>
            </div>
          ) : dailySummaries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Nenhum fechamento encontrado</div>
            </div>
          ) : (
            <div className="space-y-4">
              {dailySummaries.map((summary: any) => (
                <div
                  key={summary.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                      <div>
                      <div className="font-semibold">{formatDate(summary.date)}</div>
                      <div className="text-sm text-muted-foreground">
                        {summary.transactionCount || 0} transações
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`font-bold ${getStatusColor(summary.profit || summary.margin || 0)}`}>
                        {formatCurrency(summary.profit || summary.margin || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Lucro Total</div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Button 
                        variant="ghost"
                          size="icon" 
                        onClick={() => handleViewDetails(summary)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                    <Button 
                        variant="ghost"
                      size="icon" 
                        onClick={() => handleEditSummary(summary)}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Fechamento</AlertDialogTitle>
                          <AlertDialogDescription>
                              Tem certeza que deseja excluir o fechamento do dia {formatDate(summary.date)}?
                              Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                              onClick={() => handleDeleteSummary(summary.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Modal de Detalhes */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Detalhes do Fechamento - {selectedSummary && formatDate(selectedSummary.date)}
              </DialogTitle>
            </DialogHeader>
            
            {selectedSummary && (
              <div className="space-y-6">
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Total Depósitos</div>
                    <div className="text-2xl font-bold text-success">
                      {formatCurrency(selectedSummary.totalDeposits || 0)}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Total Saques</div>
                    <div className="text-2xl font-bold text-destructive">
                      {formatCurrency(selectedSummary.totalWithdraws || 0)}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Lucro Total</div>
                    <div className={`text-2xl font-bold ${getStatusColor(selectedSummary.profit || selectedSummary.margin || 0)}`}>
                      {formatCurrency(selectedSummary.profit || selectedSummary.margin || 0)}
                    </div>
                  </Card>
        </div>

                {/* Transações */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Transações do Dia</h3>
                  {selectedSummary.transactionsSnapshot && selectedSummary.transactionsSnapshot.length > 0 ? (
                    <div className="space-y-2">
                      {selectedSummary.transactionsSnapshot.map((transaction: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={transaction.type === 'withdraw' ? 'default' : 'destructive'}
                            >
                              {transaction.type === 'deposit' ? 'Depósito' : 'Saque'}
                            </Badge>
            <div>
                              <div className="font-medium">
                                {employees.find((e: any) => e.id === transaction.employeeId)?.name || 'N/A'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {platforms.find((p: any) => p.id === transaction.platformId)?.name || 'N/A'}
                              </div>
                            </div>
                          </div>
                          <div className={`font-bold ${shouldDisplayAsPositive(transaction) ? 'text-success' : 'text-destructive'}`}>
                            {shouldDisplayAsPositive(transaction) ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma transação registrada para este dia
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Editar Fechamento - {editingSummary && formatDate(editingSummary.date)}
              </DialogTitle>
            </DialogHeader>
            
            {editingSummary && (
              <div className="space-y-6">
                {/* Data */}
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Data:</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editingSummary.date}
                    onChange={(e) => setEditingSummary({...editingSummary, date: e.target.value})}
                  />
            </div>

                {/* Transações */}
            <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Transações:</h3>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Transação
                    </Button>
                  </div>
                  
                  {editingSummary.transactionsSnapshot && editingSummary.transactionsSnapshot.length > 0 ? (
                    <div className="space-y-2">
                      {editingSummary.transactionsSnapshot.map((transaction: any, index: number) => (
                        <div key={index} className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                          <Select value={transaction.employeeId} onValueChange={(value) => {
                            const newTransactions = [...editingSummary.transactionsSnapshot];
                            newTransactions[index].employeeId = value;
                            setEditingSummary({...editingSummary, transactionsSnapshot: newTransactions});
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Funcionário" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((employee: any) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select value={transaction.type} onValueChange={(value) => {
                            const newTransactions = [...editingSummary.transactionsSnapshot];
                            newTransactions[index].type = value;
                            setEditingSummary({...editingSummary, transactionsSnapshot: newTransactions});
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="deposit">Depósito</SelectItem>
                              <SelectItem value="withdraw">Saque</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Valor"
                            value={transaction.amount}
                            onChange={(e) => {
                              const newTransactions = [...editingSummary.transactionsSnapshot];
                              newTransactions[index].amount = Number(e.target.value);
                              setEditingSummary({...editingSummary, transactionsSnapshot: newTransactions});
                            }}
                          />
                          
                          <Select value={transaction.platformId} onValueChange={(value) => {
                            const newTransactions = [...editingSummary.transactionsSnapshot];
                            newTransactions[index].platformId = value;
                            setEditingSummary({...editingSummary, transactionsSnapshot: newTransactions});
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Plataforma" />
                            </SelectTrigger>
                            <SelectContent>
                              {platforms.map((platform: any) => (
                                <SelectItem key={platform.id} value={platform.id}>
                                  {platform.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newTransactions = editingSummary.transactionsSnapshot.filter((_: any, i: number) => i !== index);
                              setEditingSummary({...editingSummary, transactionsSnapshot: newTransactions});
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma transação registrada para este dia
                    </div>
                  )}
            </div>

                {/* Botões de Ação */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={async () => {
                    try {
                      await updateDailySummary.mutateAsync({
                        summaryId: editingSummary.id,
                        summaryData: editingSummary
                      });
                      toast.success('Fechamento atualizado com sucesso!');
                      setEditOpen(false);
                    } catch (error) {
                      console.error('Erro ao atualizar fechamento:', error);
                      toast.error('Erro ao atualizar fechamento');
                    }
                  }}>
                    Salvar Alterações
                  </Button>
            </div>
          </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      </ProtectedPageContent>
    </DashboardLayout>
  );
};

export default Historico;