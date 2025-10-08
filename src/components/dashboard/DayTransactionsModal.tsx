import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DayTransactionsModalProps {
  date: Date;
}

const DayTransactionsModal = ({ date }: DayTransactionsModalProps) => {
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositPlatform, setDepositPlatform] = useState('');
  const [withdrawPlatform, setWithdrawPlatform] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const dateStr = date.toISOString().split('T')[0];

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['day-transactions', dateStr],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          employees(name),
          platforms(name, color)
        `)
        .eq('user_id', user.id)
        .eq('transaction_date', dateStr)
        .order('transaction_time', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const createTransaction = useMutation({
    mutationFn: async ({ type, amount, platformId }: { type: string; amount: number; platformId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        employee_id: employees?.[0]?.id,
        type,
        amount,
        platform_id: platformId,
        transaction_date: dateStr,
        transaction_time: new Date().toISOString()
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summaries'] });
      toast.success('Transação registrada!');
      setDepositAmount('');
      setWithdrawAmount('');
      setDepositPlatform('');
      setWithdrawPlatform('');
    },
    onError: () => toast.error('Erro ao registrar transação')
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summaries'] });
      toast.success('Transação excluída!');
    },
    onError: () => toast.error('Erro ao excluir transação')
  });

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Registrar Depósito */}
        <div className="space-y-4 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold text-lg">Registrar Depósito</h3>
          <div className="space-y-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Plataforma</Label>
              <Select value={depositPlatform} onValueChange={setDepositPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (depositAmount) {
                  const transactionData: any = {
                    type: 'deposit',
                    amount: parseFloat(depositAmount)
                  };

                  // Só adiciona platformId se não for vazio
                  if (depositPlatform && depositPlatform.trim() !== '') {
                    transactionData.platformId = depositPlatform;
                  }

                  createTransaction.mutate(transactionData);
                }
              }}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Registrar Depósito
            </Button>
          </div>
        </div>

        {/* Registrar Saque */}
        <div className="space-y-4 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold text-lg">Registrar Saque</h3>
          <div className="space-y-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Plataforma</Label>
              <Select value={withdrawPlatform} onValueChange={setWithdrawPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => {
                if (withdrawAmount) {
                  const transactionData: any = {
                    type: 'withdraw',
                    amount: parseFloat(withdrawAmount)
                  };

                  // Só adiciona platformId se não for vazio
                  if (withdrawPlatform && withdrawPlatform.trim() !== '') {
                    transactionData.platformId = withdrawPlatform;
                  }

                  createTransaction.mutate(transactionData);
                }
              }}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Registrar Saque
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Transações do Dia</h3>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma transação neste dia.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
                <div className="flex items-center gap-3">
                  <Badge variant={t.type === 'deposit' ? 'destructive' : 'default'}>
                    {t.type === 'deposit' ? 'Despesa' : 'Receita'}
                  </Badge>
                  <span className="font-medium">{t.platforms?.name || 'N/A'}</span>
                  <span className={t.type === 'deposit' ? 'text-destructive' : 'text-success'}>
                    {t.type === 'deposit' ? '-' : '+'}R$ {Number(t.amount).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(t.transaction_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => deleteTransaction.mutate(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DayTransactionsModal;
