import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Download, Eye, Trash2, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Historico = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: historyData = [] } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: monthlySummary } = useQuery({
    queryKey: ['monthly-summary'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { revenue: 0, expense: 0, profit: 0 };
      
      const startOfCurrentMonth = startOfMonth(new Date());
      const endOfCurrentMonth = endOfMonth(new Date());
      
      const { data } = await supabase
        .from('daily_summaries')
        .select('total_deposits, total_withdraws')
        .eq('user_id', user.id)
        .gte('date', format(startOfCurrentMonth, 'yyyy-MM-dd'))
        .lte('date', format(endOfCurrentMonth, 'yyyy-MM-dd'));
      
      const revenue = data?.reduce((sum, item) => sum + Number(item.total_deposits), 0) || 0;
      const expense = data?.reduce((sum, item) => sum + Number(item.total_withdraws), 0) || 0;
      
      return { revenue, expense, profit: expense - revenue };
    }
  });

  const deleteSummary = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_summaries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      toast.success('Fechamento excluído!');
    }
  });

  const exportSummary = (summary: any) => {
    const data = {
      date: format(new Date(summary.date), 'dd/MM/yyyy'),
      receitas: summary.total_deposits,
      despesas: summary.total_withdraws,
      lucro: summary.profit,
      margem: summary.total_deposits > 0 ? ((summary.profit / summary.total_deposits) * 100).toFixed(1) + '%' : '0%',
      transacoes: summary.transaction_count
    };
    
    const csv = Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumo-${format(new Date(summary.date), 'dd-MM-yyyy')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredHistory = selectedDate 
    ? historyData.filter(item => {
        const itemDate = new Date(item.date);
        const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      })
    : historyData;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Histórico</h1>
            <p className="text-muted-foreground">Consulte dias e períodos anteriores</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setSelectedDate(undefined)}
            >
              <X className="h-4 w-4" />
              Limpar Filtro
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
              }}
            >
              <Calendar className="h-4 w-4" />
              {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Selecionar Período'}
            </Button>
          </div>
        </div>

        {selectedDate && (
          <Card className="p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Filtrando por: <span className="font-medium">{format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedDate(undefined)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Summary List */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <Card className="p-8 text-center shadow-card">
              <p className="text-muted-foreground">
                {selectedDate 
                  ? `Nenhuma movimentação encontrada para ${format(selectedDate, 'dd/MM/yyyy')}.`
                  : 'Nenhuma movimentação encontrada.'
                }
              </p>
            </Card>
          ) : (
            filteredHistory.map((summary: any) => (
              <Card key={summary.id} className="p-6 shadow-card hover:shadow-glow transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="text-lg font-semibold">
                        {format(new Date(summary.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </h3>
                      <Badge variant="default">
                        {summary.transaction_count} transações
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Receitas</p>
                        <p className="text-xl font-bold text-success">
                          R$ {Number(summary.total_deposits).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Despesas</p>
                        <p className="text-xl font-bold text-destructive">
                          R$ {Number(summary.total_withdraws).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Lucro</p>
                        <p className="text-xl font-bold">
                          R$ {summary.profit.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Margem</p>
                        <p className="text-xl font-bold text-primary">
                          {summary.total_deposits > 0 
                            ? `${((summary.profit / summary.total_deposits) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => setSelectedSummary(summary)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>
                            Detalhes - {format(new Date(summary.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {summary.by_employee?.map((emp: any, idx: number) => (
                            <Card key={idx} className="p-4">
                              <h4 className="font-semibold mb-2">{emp.name}</h4>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Receitas</p>
                                  <p className="font-bold text-success">
                                    R$ {Number(emp.deposits).toLocaleString('pt-BR')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Despesas</p>
                                  <p className="font-bold text-destructive">
                                    R$ {Number(emp.withdraws).toLocaleString('pt-BR')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Saldo</p>
                                  <p className={`font-bold ${(emp.deposits - emp.withdraws) >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    R$ {(emp.deposits - emp.withdraws).toLocaleString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => exportSummary(summary)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir fechamento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O fechamento do dia será removido permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteSummary.mutate(summary.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Monthly Summary */}
        <Card className="p-6 shadow-card gradient-primary">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4">Resumo Mensal</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-primary-foreground/80 mb-2">Receitas do Mês</p>
              <p className="text-3xl font-bold text-primary-foreground">
                R$ {monthlySummary?.revenue?.toLocaleString('pt-BR') || '0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-primary-foreground/80 mb-2">Despesas do Mês</p>
              <p className="text-3xl font-bold text-primary-foreground">
                R$ {monthlySummary?.expense?.toLocaleString('pt-BR') || '0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-primary-foreground/80 mb-2">Lucro do Mês</p>
              <p className="text-3xl font-bold text-primary-foreground">
                R$ {monthlySummary?.profit?.toLocaleString('pt-BR') || '0'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Historico;
