import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useDailySummaries, useDailyClosure } from '@/hooks/useFirestore';
import { useDailyClosure as useDailyClosureHook } from '@/hooks/useDailyClosure';
import { CalendarIcon, Clock, TrendingUp, TrendingDown, DollarSign, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const HistoricoDiario = () => {
  const { user } = useFirebaseAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Buscar resumos diários
  const { data: dailySummaries = [], isLoading } = useDailySummaries(user?.uid || '');
  
  // Hook do fechamento diário
  const { isServiceActive, nextClosure, processManualClosure } = useDailyClosureHook();

  // Filtrar resumos por data selecionada
  const filteredSummaries = selectedDate 
    ? dailySummaries.filter(summary => summary.date === format(selectedDate, 'yyyy-MM-dd'))
    : dailySummaries;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: pt });
  };

  const getStatusColor = (profit: number) => {
    return profit >= 0 ? 'text-success' : 'text-destructive';
  };

  const getStatusBadge = (profit: number) => {
    return profit >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Histórico Diário</h1>
            <p className="text-muted-foreground">
              Resumos automáticos dos fechamentos diários
            </p>
          </div>
          
          {/* Status do Serviço */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isServiceActive ? 'bg-success' : 'bg-destructive'}`} />
                <span className="text-sm font-medium">
                  {isServiceActive ? 'Serviço Ativo' : 'Serviço Inativo'}
                </span>
              </div>
              {nextClosure && (
                <p className="text-xs text-muted-foreground">
                  Próximo fechamento: {format(nextClosure, 'dd/MM HH:mm')}
                </p>
              )}
            </div>
            
            <Button
              onClick={() => processManualClosure()}
              disabled={!user?.uid}
              size="sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              Fechar Hoje
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar por data:</span>
            </div>
            
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Todas as datas'}
                  <CalendarIcon className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(undefined)}
              >
                Limpar filtro
              </Button>
            )}
          </div>
        </Card>

        {/* Estatísticas Gerais */}
        {!selectedDate && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Dias</p>
                  <p className="text-2xl font-bold">{dailySummaries.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Total</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(dailySummaries.reduce((sum, s) => sum + s.totalWithdraws, 0))}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Despesa Total</p>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(dailySummaries.reduce((sum, s) => sum + s.totalDeposits, 0))}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-destructive" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lucro Total</p>
                  <p className={`text-2xl font-bold ${getStatusColor(dailySummaries.reduce((sum, s) => sum + s.profit, 0))}`}>
                    {formatCurrency(dailySummaries.reduce((sum, s) => sum + s.profit, 0))}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </Card>
          </div>
        )}

        {/* Lista de Resumos */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando histórico...</p>
              </div>
            </Card>
          ) : filteredSummaries.length === 0 ? (
            <Card className="p-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {selectedDate 
                    ? `Nenhum resumo encontrado para ${format(selectedDate, 'dd/MM/yyyy')}`
                    : 'Nenhum resumo diário encontrado'
                  }
                </p>
              </div>
            </Card>
          ) : (
            filteredSummaries.map((summary) => (
              <Card key={summary.id} className="p-6 hover:shadow-glow transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{formatDate(summary.date)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {summary.transactionCount} transações
                      </p>
                    </div>
                  </div>
                  
                  <Badge className={getStatusBadge(summary.profit)}>
                    {summary.profit >= 0 ? 'Lucro' : 'Prejuízo'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Receitas</p>
                    <p className="text-lg font-semibold text-success">
                      {formatCurrency(summary.totalWithdraws)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Despesas</p>
                    <p className="text-lg font-semibold text-destructive">
                      {formatCurrency(summary.totalDeposits)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Lucro</p>
                    <p className={`text-lg font-semibold ${getStatusColor(summary.profit)}`}>
                      {formatCurrency(summary.profit)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Transações</p>
                    <p className="text-lg font-semibold">{summary.transactionCount}</p>
                  </div>
                </div>

                {/* Resumo por Funcionário */}
                {summary.byEmployee && summary.byEmployee.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Por Funcionário</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {summary.byEmployee.map((emp: any, index: number) => (
                        <div key={index} className="p-2 bg-muted/30 rounded text-sm">
                          <div className="font-medium">{emp.employeeName}</div>
                          <div className="text-xs text-muted-foreground">
                            {emp.transactionCount} transações • 
                            <span className={getStatusColor(emp.profit)}>
                              {formatCurrency(emp.profit)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HistoricoDiario;
