import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { usePlanLimitations } from '@/hooks/usePlanLimitations';
import { usePlatforms, useTransactions, useCreateTransaction, useDeleteTransaction, useEmployees } from '@/hooks/useFirestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { shouldDisplayAsPositive } from '@/utils/financial-calculations';

interface DayTransactionsModalProps {
  date: Date;
}

const DayTransactionsModal = ({ date }: DayTransactionsModalProps) => {
  const { user } = useFirebaseAuth();
  const { getAllowedEmployees } = usePlanLimitations();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositPlatform, setDepositPlatform] = useState('none');
  const [withdrawPlatform, setWithdrawPlatform] = useState('none');
  const [depositEmployee, setDepositEmployee] = useState('none');
  const [withdrawEmployee, setWithdrawEmployee] = useState('none');

  const dateStr = format(date, 'yyyy-MM-dd');

  // Buscar plataformas
  const { data: platforms = [] } = usePlatforms(user?.uid || '');
  
  // Buscar funcionários
  const { data: allEmployees = [] } = useEmployees(user?.uid || '');
  
  // Filtrar funcionários baseado no plano
  const employees = getAllowedEmployees(allEmployees);
  
  // Buscar transações do dia
  const { data: allTransactions = [] } = useTransactions(user?.uid || '');
  
  // Filtrar transações do dia específico
  const dayTransactions = allTransactions.filter((transaction: any) => {
    return transaction.date === dateStr;
  });

  // Hooks para criar e deletar transações
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const handleCreateTransaction = async (type: 'deposit' | 'withdraw', amount: string, platformId?: string, employeeId?: string) => {
    if (!user?.uid || !amount) {
      toast.error('Preencha o valor da transação');
      return;
    }

    try {
      const transactionData = {
        userId: user.uid,
        employeeId: employeeId === 'none' ? '' : (employeeId || ''), // Converter 'none' para string vazia
        platformId: platformId === 'none' ? '' : (platformId || ''), // Converter 'none' para string vazia
        type,
        amount: Number(amount),
        date: dateStr
      };

      const result = await createTransaction.mutateAsync(transactionData);
      
      toast.success(`${type === 'deposit' ? 'Depósito' : 'Saque'} registrado com sucesso!`);
      
      // Limpar campos
      if (type === 'deposit') {
        setDepositAmount('');
        setDepositPlatform('none');
        setDepositEmployee('none');
      } else {
        setWithdrawAmount('');
        setWithdrawPlatform('none');
        setWithdrawEmployee('none');
      }
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      console.error('Error details:', error);
      toast.error('Erro ao registrar transação: ' + (error as Error).message);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteTransaction.mutateAsync(transactionId);
      toast.success('Transação excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      toast.error('Erro ao excluir transação');
    }
  };

  const getPlatformName = (platformId: string) => {
    if (!platformId) return 'N/A';
    const platform = platforms.find((p: any) => p.id === platformId);
    return platform?.name || 'N/A';
  };

  const getPlatformColor = (platformId: string) => {
    const platform = platforms.find((p: any) => p.id === platformId);
    return platform?.color || '#666';
  };

  const getEmployeeName = (employeeId: string) => {
    if (!employeeId) return 'N/A';
    const employee = employees.find((e: any) => e.id === employeeId);
    return employee?.name || 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          Transações - {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
        <p className="text-muted-foreground">
          Gerencie as movimentações deste dia
        </p>
      </div>

      {/* Formulários de Depósito e Saque */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registrar Depósito */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold">Registrar Depósito</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deposit-amount">Valor (R$)</Label>
            <Input
              id="deposit-amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deposit-platform">Plataforma (opcional)</Label>
            <Select value={depositPlatform} onValueChange={setDepositPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma plataforma..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma plataforma</SelectItem>
                {platforms.map((platform: any) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deposit-employee">Funcionário (opcional)</Label>
            <Select value={depositEmployee} onValueChange={setDepositEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um funcionário..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum funcionário</SelectItem>
                {employees.map((employee: any) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={() => handleCreateTransaction('deposit', depositAmount, depositPlatform, depositEmployee)}
            className="w-full gap-2"
            disabled={!depositAmount || createTransaction.isPending}
          >
            <TrendingDown className="h-4 w-4" />
            Registrar Depósito
          </Button>
        </div>

        {/* Registrar Saque */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            <h3 className="text-lg font-semibold">Registrar Saque</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Valor (R$)</Label>
            <Input
              id="withdraw-amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="withdraw-platform">Plataforma (opcional)</Label>
            <Select value={withdrawPlatform} onValueChange={setWithdrawPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma plataforma..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma plataforma</SelectItem>
                {platforms.map((platform: any) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="withdraw-employee">Funcionário (opcional)</Label>
            <Select value={withdrawEmployee} onValueChange={setWithdrawEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um funcionário..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum funcionário</SelectItem>
                {employees.map((employee: any) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={() => handleCreateTransaction('withdraw', withdrawAmount, withdrawPlatform, withdrawEmployee)}
            className="w-full gap-2"
            disabled={!withdrawAmount || createTransaction.isPending}
          >
            <TrendingUp className="h-4 w-4" />
            Registrar Saque
          </Button>
        </div>
      </div>

      {/* Lista de Transações do Dia */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Transações do Dia</h3>
        
        {dayTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma transação registrada para este dia
          </div>
        ) : (
          <div className="space-y-2">
            {dayTransactions.map((transaction: any) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={transaction.type === 'withdraw' ? 'default' : 'destructive'}
                    style={{ 
                      backgroundColor: transaction.description 
                        ? (transaction.description.startsWith('Surebet') 
                            ? '#86efac' // Verde claro para Surebet
                            : transaction.type === 'withdraw' 
                              ? '#10b981' 
                              : '#ef4444')
                        : getPlatformColor(transaction.platformId) 
                    }}
                  >
                    {transaction.description && transaction.description.startsWith('FreeBet')
                      ? transaction.description.split(' ')[0]
                      : transaction.description && transaction.description.startsWith('Surebet')
                        ? 'Surebet'
                        : (transaction.type === 'deposit' ? 'Depósito' : 'Saque')}
                  </Badge>
                  
                  <div>
                    <div className="font-medium">
                      {transaction.description || getPlatformName(transaction.platformId)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getEmployeeName(transaction.employeeId) !== 'N/A' && (
                        <span className="block">Funcionário: {getEmployeeName(transaction.employeeId)}</span>
                      )}
                      <span>{format(new Date(transaction.createdAt?.toDate?.() || transaction.date), 'HH:mm')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${shouldDisplayAsPositive(transaction) ? 'text-success' : 'text-destructive'}`}>
                    {shouldDisplayAsPositive(transaction) ? '+' : '-'}R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTransaction(transaction.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumo do Dia */}
      {dayTransactions.length > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">Resumo do Dia</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Depósitos</div>
              <div className="font-bold text-foreground">
                R$ {dayTransactions
                  .filter((t: any) => t.type === 'deposit')
                  .reduce((acc: number, t: any) => acc + Number(t.amount), 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Saques</div>
              <div className="font-bold text-foreground">
                R$ {dayTransactions
                  .filter((t: any) => t.type === 'withdraw')
                  .reduce((acc: number, t: any) => acc + Number(t.amount), 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Lucro</div>
              <div className={`font-bold ${
                dayTransactions.reduce((acc: number, t: any) => 
                  acc + (t.type === 'withdraw' ? t.amount : -t.amount), 0
                ) >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                R$ {dayTransactions
                  .reduce((acc: number, t: any) => 
                    acc + (t.type === 'withdraw' ? t.amount : -t.amount), 0
                  )
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayTransactionsModal;