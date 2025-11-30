import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SurebetRecord } from '@/types/surebet';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { SurebetService } from '@/core/services/surebet.service';
import { UserTransactionService, UserDailySummaryService } from '@/core/services/user-specific.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getCurrentDateStringInSaoPaulo } from '@/utils/timezone';

interface SurebetSpreadsheetProps {
  calculatorData?: {
    house1: { name: string; odd: number; stake: number; profit: number };
    house2: { name: string; odd: number; stake: number; profit: number };
    total: number;
    margin: number;
    isSurebet: boolean;
  };
}

export const SurebetSpreadsheet = ({ calculatorData }: SurebetSpreadsheetProps) => {
  const { user } = useFirebaseAuth();
  const queryClient = useQueryClient();

  // Buscar registros
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['surebet-records', user?.uid],
    queryFn: () => SurebetService.getRecords(user?.uid || ''),
    enabled: !!user?.uid
  });

  // Mutation para atualizar registro
  const updateRecord = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SurebetRecord> }) =>
      SurebetService.updateRecord(user?.uid || '', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surebet-records', user?.uid] });
    }
  });

  // Mutation para deletar registro e transação associada
  const deleteRecord = useMutation({
    mutationFn: async (recordId: string) => {
      if (!user?.uid) return;

      // Buscar o registro antes de excluir
      const record = records.find(r => r.id === recordId);
      if (!record) {
        throw new Error('Registro não encontrado');
      }

      // Buscar todos os registros da mesma operação
      const operationRecords = records.filter(r => r.operationId === record.operationId);
      
      // Encontrar o registro com transactionId (primeiro registro da operação)
      const recordWithTransaction = operationRecords.find(r => r.transactionId);
      
      // Se houver transactionId, excluir a transação e atualizar o resumo diário
      if (recordWithTransaction?.transactionId) {
        // O lucro total da surebet é o mesmo valor em ambos os registros (profit)
        // profit1 = profit2 = totalProfit = returnAmount - totalInvested
        // Usamos o profit do primeiro registro que já representa o lucro total da operação
        const firstRecord = operationRecords[0];
        const totalProfit = firstRecord?.profit || 0;

        // Excluir a transação
        await UserTransactionService.deleteTransaction(user.uid, recordWithTransaction.transactionId);

        // Atualizar resumo diário
        const registrationDate = record.registrationDate instanceof Date 
          ? record.registrationDate 
          : (record.registrationDate as any)?.toDate 
            ? (record.registrationDate as any).toDate() 
            : new Date(record.registrationDate);
        const recordDate = format(registrationDate, 'yyyy-MM-dd');
        const existingSummary = await UserDailySummaryService.getDailySummaryByDate(user.uid, recordDate);
        
        if (existingSummary) {
          const newProfit = Math.max(0, (existingSummary.profit || existingSummary.margin || 0) - totalProfit);
          const newDeposits = Math.max(0, (existingSummary.totalDeposits || 0) - totalProfit);
          
          await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, {
            totalDeposits: newDeposits,
            profit: newProfit,
            margin: newProfit,
            transactionCount: Math.max(0, (existingSummary.transactionCount || 0) - 1),
            updatedAt: new Date(),
          });
        }

        // Invalidar queries de transações e resumos
        queryClient.invalidateQueries({ queryKey: ['transactions', user.uid] });
        queryClient.invalidateQueries({ queryKey: ['daily-summaries', user.uid] });
      }

      // Excluir todos os registros da operação
      for (const opRecord of operationRecords) {
        await SurebetService.deleteRecord(user.uid, opRecord.id!);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surebet-records', user?.uid] });
      toast.success('Operação removida!');
    },
    onError: (error) => {
      console.error('Erro ao excluir registro:', error);
      toast.error('Erro ao excluir operação');
    }
  });

  // Agrupar registros por operação
  const groupedRecords = records.reduce((acc, record) => {
    if (!acc[record.operationId]) {
      acc[record.operationId] = [];
    }
    acc[record.operationId].push(record);
    return acc;
  }, {} as Record<string, SurebetRecord[]>);

  // Ordenar operações (mais recentes primeiro)
  const sortedOperations = Object.values(groupedRecords).sort((a, b) => {
    const dateA = a[0]?.registrationDate instanceof Date 
      ? a[0].registrationDate.getTime() 
      : new Date(a[0]?.registrationDate || 0).getTime();
    const dateB = b[0]?.registrationDate instanceof Date 
      ? b[0].registrationDate.getTime() 
      : new Date(b[0]?.registrationDate || 0).getTime();
    return dateB - dateA;
  });

  const handleUpdateField = (recordId: string, field: keyof SurebetRecord, value: any) => {
    updateRecord.mutate({
      id: recordId,
      data: { [field]: value }
    });
  };

  const handleDelete = (recordId: string) => {
    if (!confirm('Deseja realmente excluir esta operação? O lucro será removido do dashboard.')) {
      return;
    }

    // A mutation deleteRecord já trata de excluir todos os registros da operação e a transação
    deleteRecord.mutate(recordId);
  };

  const sports = ['Futebol', 'Basquete', 'Tênis', 'Vôlei', 'Futebol Americano', 'Baseball', 'Hóquei', 'Outro'];
  const markets = ['ML', 'AH', 'OU', '1X2', 'BTTS', 'Outro'];

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-semibold border-r">Data/Hora Registro</th>
              <th className="p-3 text-left text-sm font-semibold border-r">Data/Hora Jogo</th>
              <th className="p-3 text-left text-sm font-semibold border-r">Esporte</th>
              <th className="p-3 text-left text-sm font-semibold border-r">Evento</th>
              <th className="p-3 text-left text-sm font-semibold border-r">Casa + Mercado</th>
              <th className="p-3 text-left text-sm font-semibold border-r">Odd</th>
              <th className="p-3 text-left text-sm font-semibold border-r">Aposta (Stake)</th>
              <th className="p-3 text-left text-sm font-semibold border-r">EV%</th>
              <th className="p-3 text-left text-sm font-semibold border-r">Lucro</th>
              <th className="p-3 text-left text-sm font-semibold border-r">Status</th>
              <th className="p-3 text-left text-sm font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedOperations.map((operationRecords) =>
              operationRecords.map((record, index) => {
                const isFirstInOperation = index === 0;
                // Converter datas do Firestore
                let registrationDate: Date;
                if (record.registrationDate instanceof Date) {
                  registrationDate = record.registrationDate;
                } else if (record.registrationDate && typeof record.registrationDate === 'object' && 'toDate' in record.registrationDate) {
                  registrationDate = (record.registrationDate as any).toDate();
                } else if (typeof record.registrationDate === 'string' || typeof record.registrationDate === 'number') {
                  registrationDate = new Date(record.registrationDate);
                } else {
                  registrationDate = new Date();
                }

                let gameDate: Date | undefined;
                if (record.gameDate instanceof Date) {
                  gameDate = record.gameDate;
                } else if (record.gameDate && typeof record.gameDate === 'object' && 'toDate' in record.gameDate) {
                  gameDate = (record.gameDate as any).toDate();
                } else if (typeof record.gameDate === 'string' || typeof record.gameDate === 'number') {
                  gameDate = new Date(record.gameDate);
                } else {
                  gameDate = undefined;
                }

                const isPositiveEV = (record.evPercent || 0) > 0;
                const isGreen = record.status === 'green';
                const isRed = record.status === 'red';

                return (
                  <tr
                    key={record.id}
                    className={`border-b hover:bg-muted/30 ${
                      isGreen
                        ? 'bg-green-50 dark:bg-green-950/20'
                        : isRed
                        ? 'bg-red-50 dark:bg-red-950/20'
                        : isPositiveEV
                        ? 'bg-success/5'
                        : 'bg-destructive/5'
                    }`}
                  >
                    {/* Data/Hora Registro */}
                    <td className="p-3 text-sm border-r">
                      {format(registrationDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </td>

                    {/* Data/Hora Jogo */}
                    <td className="p-3 border-r">
                      <Input
                        type="datetime-local"
                        value={gameDate ? format(gameDate, "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : undefined;
                          handleUpdateField(record.id!, 'gameDate', date);
                        }}
                        className="w-full text-sm"
                      />
                    </td>

                    {/* Esporte */}
                    <td className="p-3 border-r">
                      <Select
                        value={record.sport || ''}
                        onValueChange={(value) => handleUpdateField(record.id!, 'sport', value)}
                      >
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {sports.map((sport) => (
                            <SelectItem key={sport} value={sport}>
                              {sport}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Evento */}
                    <td className="p-3 border-r">
                      <Input
                        type="text"
                        value={record.event || ''}
                        onChange={(e) => handleUpdateField(record.id!, 'event', e.target.value)}
                        placeholder="Nome do evento"
                        className="w-full text-sm"
                      />
                    </td>

                    {/* Casa + Mercado */}
                    <td className="p-3 border-r">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{record.house}</div>
                        <Select
                          value={record.market || ''}
                          onValueChange={(value) => handleUpdateField(record.id!, 'market', value)}
                        >
                          <SelectTrigger className="w-full text-xs h-8">
                            <SelectValue placeholder="Mercado" />
                          </SelectTrigger>
                          <SelectContent>
                            {markets.map((market) => (
                              <SelectItem key={market} value={market}>
                                {market}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>

                    {/* Odd */}
                    <td className="p-3 text-sm border-r text-center">
                      {record.odd.toFixed(3)}
                    </td>

                    {/* Aposta (Stake) */}
                    <td className="p-3 text-sm border-r text-right">
                      R$ {record.stake.toFixed(2)}
                    </td>

                    {/* EV% */}
                    <td className={`p-3 text-sm border-r text-center font-bold ${
                      isPositiveEV ? 'text-success' : 'text-destructive'
                    }`}>
                      {record.evPercent >= 0 ? '+' : ''}{record.evPercent.toFixed(2)}%
                    </td>

                    {/* Lucro */}
                    <td className="p-3 text-sm border-r text-right font-bold text-success">
                      R$ {record.profit.toFixed(2)}
                    </td>

                    {/* Status */}
                    <td className="p-3 border-r">
                      <Select
                        value={record.status || ''}
                        onValueChange={(value: 'green' | 'red' | '') =>
                          handleUpdateField(record.id!, 'status', value || undefined)
                        }
                      >
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="green">Green</SelectItem>
                          <SelectItem value="red">Red</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Ações */}
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(record.id!)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}

            {sortedOperations.length === 0 && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-muted-foreground">
                  Nenhum registro ainda. Use a calculadora acima e clique em "Planilhar" para adicionar operações.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

