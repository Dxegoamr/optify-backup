import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, ArrowUp, ArrowDown, Target, Trophy, Lock, Filter, X } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees, useTransactions, usePlatforms, useDeleteTransaction } from '@/hooks/useFirestore';
import { shouldDisplayAsPositive } from '@/utils/financial-calculations';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentDateInSaoPaulo, formatDateInSaoPaulo, getCurrentDateStringInSaoPaulo } from '@/utils/timezone';
import { UserDailySummaryService } from '@/core/services/user-specific.service';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ReferenceLine } from 'recharts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGlobalFinancialState, getDailyProfit, getEmployeeState, getPlatformState } from '@/hooks/useGlobalFinancialState';

const ResumoDia = () => {
  const { user } = useFirebaseAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(getCurrentDateInSaoPaulo());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [saveToAnotherDateDialogOpen, setSaveToAnotherDateDialogOpen] = useState(false);
  const [originalDayTransactions, setOriginalDayTransactions] = useState<any[]>([]);
  const [originalDayDate, setOriginalDayDate] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  
  const selectedDateString = selectedDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
  
  // Processar filtro da URL
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      setActiveFilter(filter);
    } else {
      setActiveFilter('');
    }
  }, [searchParams]);
  
  // Buscar estado financeiro global
  const { data: financialState, isLoading: financialStateLoading } = useGlobalFinancialState(user?.uid);
  
  // Buscar dados auxiliares
  const { data: employees = [] } = useEmployees(user?.uid || '');
  const { data: platforms = [] } = usePlatforms(user?.uid || '');
  const { data: allTransactions = [] } = useTransactions(user?.uid || '');
  const deleteTransactionMutation = useDeleteTransaction();
  
  // Filtrar transações do dia selecionado
  const todayTransactions = allTransactions.filter((transaction: any) => {
    return transaction.date === selectedDateString;
  });
  
  // Capturar transações do dia original quando a página carrega
  useEffect(() => {
    if (allTransactions.length > 0 && originalDayTransactions.length === 0) {
      const originalDate = getCurrentDateStringInSaoPaulo();
      const originalTransactions = allTransactions.filter((transaction: any) => {
        return transaction.date === originalDate;
      });
      
      if (originalTransactions.length > 0) {
        setOriginalDayTransactions(originalTransactions);
        setOriginalDayDate(originalDate);
      }
    }
  }, [allTransactions, originalDayTransactions.length]);

  // Filtrar transações baseado nos filtros ativos
  const getFilteredTransactions = () => {
    let filtered = todayTransactions;
    
    // Filtro por tipo de transação
    switch (activeFilter) {
      case 'deposits':
        filtered = filtered.filter((t: any) => t.type === 'deposit');
        break;
      case 'withdraws':
        filtered = filtered.filter((t: any) => t.type === 'withdraw');
        break;
      case 'profit':
        // Para lucro, mostrar todas as transações
        break;
      default:
        break;
    }
    
    // Filtro por plataforma
    if (platformFilter) {
      filtered = filtered.filter((t: any) => t.platformId === platformFilter);
    }
    
    // Filtro por funcionário
    if (employeeFilter) {
      filtered = filtered.filter((t: any) => t.employeeId === employeeFilter);
    }
    
    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();

  // Obter estatísticas do dia usando estado global
  const dayState = financialState?.daily[selectedDateString] || { profit: 0, deposits: 0, withdraws: 0 };
  const profit = dayState.profit;
  const totalDeposits = dayState.deposits;
  const totalWithdraws = dayState.withdraws;
  const transactionCount = filteredTransactions.length;
  
  // Deposits e withdraws para exibição
  const deposits = todayTransactions.filter((t: any) => 
    t.type === 'deposit' || (t.description && t.description.startsWith('Surebet'))
  );
  const withdraws = todayTransactions.filter((t: any) => t.type === 'withdraw');

  // Calcular estatísticas por plataforma (para o dia específico)
  const platformStats = platforms.map((platform: any) => {
    const platformTransactions = todayTransactions.filter((t: any) => t.platformId === platform.id);
    const platformSurebet = platformTransactions
      .filter((t: any) => t.description && t.description.startsWith('Surebet'))
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const platformDeposits = platformTransactions
      .filter((t: any) => t.type === 'deposit' && (!t.description || !t.description.startsWith('Surebet')))
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const platformWithdraws = platformTransactions
      .filter((t: any) => t.type === 'withdraw')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const platformProfit = platformWithdraws - platformDeposits + platformSurebet;
    
    return {
      id: platform.id,
      name: platform.name,
      color: platform.color,
      deposits: platformDeposits,
      withdraws: platformWithdraws,
      profit: platformProfit,
      transactions: platformTransactions.length
    };
  }).filter(stat => stat.transactions > 0 || stat.profit !== 0).sort((a, b) => b.profit - a.profit);

  // Calcular estatísticas por funcionário (para o dia específico)
  const employeeStats = employees.map((employee: any) => {
    const employeeTransactions = todayTransactions.filter((t: any) => t.employeeId === employee.id);
    const employeeSurebet = employeeTransactions
      .filter((t: any) => t.description && t.description.startsWith('Surebet'))
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const employeeDeposits = employeeTransactions
      .filter((t: any) => t.type === 'deposit' && (!t.description || !t.description.startsWith('Surebet')))
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const employeeWithdraws = employeeTransactions
      .filter((t: any) => t.type === 'withdraw')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const employeeProfit = employeeWithdraws - employeeDeposits + employeeSurebet;
    
    return {
      id: employee.id,
      name: employee.name,
      deposits: employeeDeposits,
      withdraws: employeeWithdraws,
      profit: employeeProfit,
      transactions: employeeTransactions.length
    };
  }).filter(stat => stat.transactions > 0 || stat.profit !== 0).sort((a, b) => b.profit - a.profit);

  // Encontrar melhor plataforma e funcionário do dia
  const bestPlatform = platformStats[0];
  const bestEmployee = employeeStats[0];

  // Função para fechar o dia - REFATORADA COMPLETAMENTE
  const handleCloseDay = async () => {
    try {
      if (!user?.uid) {
        toast.error('Usuário não autenticado');
        return;
      }

      // CORREÇÃO: Usar transações do dia original se disponíveis
      const transactionsToClose = originalDayTransactions.length > 0 ? originalDayTransactions : todayTransactions;
      const dateToClose = originalDayDate || selectedDateString;
      
      if (transactionsToClose.length === 0) {
        toast.error('Não há transações para fechar');
        return;
      }

      // ========== NOVA ORDEM CORRETA ==========
      
      // 1. CAPTURAR SNAPSHOT DAS TRANSAÇÕES (antes de deletar)
      const transactionsSnapshot = [...transactionsToClose];
      
      // 2. DELETAR TODAS AS TRANSAÇÕES SEM RECALCULAR RESUMO
      // Usar skipDailySummaryUpdate: true para evitar recálculos parciais
      for (const transaction of transactionsToClose) {
        await deleteTransactionMutation.mutateAsync({
          id: transaction.id,
          skipDailySummaryUpdate: true
        });
      }
      
      // 3. AGORA QUE TODAS AS TRANSAÇÕES FORAM DELETADAS, CRIAR/ATUALIZAR O RESUMO
      // Usar função reutilizável para calcular lucro
      const { calculateProfit, calculateTotalDeposits, calculateTotalWithdraws } = await import('@/utils/financial-calculations');
      
      const profitToClose = calculateProfit(transactionsSnapshot);
      const totalDepositsToClose = calculateTotalDeposits(transactionsSnapshot);
      const totalWithdrawsToClose = calculateTotalWithdraws(transactionsSnapshot);
      
      // Verificar se já existe um resumo para este dia
      const existingSummaries = await UserDailySummaryService.getAllDailySummaries(user.uid);
      const existingSummary = existingSummaries.find((s: any) => s.date === dateToClose);
      
      const summaryData = {
        date: dateToClose,
        totalDeposits: totalDepositsToClose,
        totalWithdraws: totalWithdrawsToClose,
        profit: profitToClose,
        margin: profitToClose,
        transactionCount: transactionsSnapshot.length,
        transactionsSnapshot: transactionsSnapshot, // Snapshot imutável do fechamento
        byEmployee: [],
        createdAt: existingSummary?.createdAt || new Date(),
        updatedAt: new Date(),
      };
      
      if (existingSummary) {
        // Atualizar resumo existente
        await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, summaryData);
      } else {
        // Criar novo resumo
        await UserDailySummaryService.createDailySummary(user.uid, summaryData as any);
      }
      
      toast.success('Dia fechado com sucesso!');
      setCloseDialogOpen(false);
      
      // Invalidar queries para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ['firebase-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-daily-summaries'] });
      
      // Redirecionar para o dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      console.error('Erro ao fechar o dia:', error);
      toast.error('Erro ao fechar o dia. Tente novamente.');
    }
  };

  // Função para salvar em outra data
  const handleSaveToAnotherDate = async (targetDate: Date) => {
    try {
      console.log('=== INICIANDO SALVAMENTO EM OUTRA DATA ===');
      console.log('Target Date recebida:', targetDate);
      console.log('Transações do dia original:', originalDayTransactions);
      console.log('Data original:', originalDayDate);
      console.log('Transações do dia atual (selectedDate):', todayTransactions);
      console.log('Total Deposits:', totalDeposits);
      console.log('Total Withdraws:', totalWithdraws);
      console.log('Profit calculado:', profit);
      
      if (!user?.uid) {
        toast.error('Usuário não autenticado');
        return;
      }

      const targetDateString = targetDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
      console.log('Salvando em outra data - Target Date String:', targetDateString);
      
      // CORREÇÃO: Usar as transações do dia original, não do dia selecionado
      const transactionsToSave = originalDayTransactions.length > 0 ? originalDayTransactions : todayTransactions;
      const depositsToSave = transactionsToSave.filter((t: any) => t.type === 'deposit');
      const withdrawsToSave = transactionsToSave.filter((t: any) => t.type === 'withdraw');
  const totalDepositsToSave = depositsToSave.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const totalWithdrawsToSave = withdrawsToSave.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const profitToSave = totalWithdrawsToSave - totalDepositsToSave;
      
      console.log('Dados a serem salvos:');
      console.log('- transactionsToSave:', transactionsToSave);
      console.log('- totalDepositsToSave:', totalDepositsToSave);
      console.log('- totalWithdrawsToSave:', totalWithdrawsToSave);
      console.log('- profitToSave:', profitToSave);
      
      // Verificar se já existe um fechamento para esta data
      const existingSummaries = await UserDailySummaryService.getAllDailySummaries(user.uid);
      const existingSummary = existingSummaries.find((s: any) => s.date === targetDateString);
      
      let summaryDataForDate;
      
      if (existingSummary) {
        // Se já existe, somar aos valores existentes
        summaryDataForDate = {
          date: targetDateString,
          totalDeposits: (existingSummary.totalDeposits || 0) + totalDepositsToSave,
          totalWithdraws: (existingSummary.totalWithdraws || 0) + totalWithdrawsToSave,
          profit: (existingSummary.profit || existingSummary.margin || 0) + profitToSave,
          transactionCount: (existingSummary.transactionCount || 0) + transactionsToSave.length,
          transactionsSnapshot: [...(existingSummary.transactionsSnapshot || []), ...transactionsToSave],
          byEmployee: [],
          margin: (existingSummary.profit || existingSummary.margin || 0) + profitToSave,
          createdAt: existingSummary.createdAt,
          updatedAt: new Date(),
        };
        
        console.log('Atualizando fechamento existente para data:', summaryDataForDate);
        // CORREÇÃO: Usar update em vez de create para evitar duplicação
        await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, summaryDataForDate);
      } else {
        // Se não existe, criar novo
        summaryDataForDate = {
        date: targetDateString,
        totalDeposits: totalDepositsToSave,
        totalWithdraws: totalWithdrawsToSave,
        profit: profitToSave,
        transactionCount: transactionsToSave.length,
        transactionsSnapshot: transactionsToSave,
        byEmployee: [],
          margin: profitToSave,
        createdAt: new Date(),
        updatedAt: new Date(),
        };
        
        console.log('Criando novo fechamento para data:', summaryDataForDate);
        await UserDailySummaryService.createDailySummary(user.uid, summaryDataForDate as any);
      }
      console.log('Resumo salvo com sucesso na data:', targetDateString);
      
      // Deletar todas as transações do dia atual após salvar em outra data
      console.log('Deletando transações do dia selecionado:', transactionsToSave);
      const deletePromises = transactionsToSave.map((transaction: any) => {
        console.log('Deletando transação:', transaction.id);
        return deleteTransactionMutation.mutateAsync(transaction.id);
      });
      await Promise.all(deletePromises);
      console.log('Todas as transações foram deletadas com sucesso');
      
      // Invalidar queries para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ['firebase-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-all-daily-summaries'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-daily-summaries'] });
      
      toast.success(`Resumo salvo para ${format(targetDate, "dd/MM/yyyy", { locale: pt })}! Transações do dia atual foram apagadas.`);
      setCalendarOpen(false);
    } catch (error) {
      console.error('Erro ao salvar em outra data:', error);
      toast.error('Erro ao salvar em outra data. Tente novamente.');
    }
  };

  // Dados para gráfico de pizza das plataformas
  const pieData = platformStats.map(stat => ({
    name: stat.name,
    value: stat.profit,
    color: stat.color
  }));

  // Dados para gráfico de barras dos funcionários
  const barData = employeeStats.map(stat => ({
    name: stat.name,
    receita: stat.profit,
    depositos: stat.deposits,
    saques: stat.withdraws
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Badge className="rounded-full bg-primary/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary mb-4">
              Resumo
            </Badge>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">Resumo do Dia</h1>
              {activeFilter && (
                <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                  <Filter className="h-3 w-3" />
                  {activeFilter === 'deposits' && 'Depósitos'}
                  {activeFilter === 'withdraws' && 'Saques'}
                  {activeFilter === 'profit' && 'Lucro'}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: pt })}</p>
          </div>
          
          <div className="flex gap-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 bg-orange-500 hover:bg-orange-600 text-white border-orange-500">
                  <CalendarIcon className="h-4 w-4" />
                  Salvar em outra data
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                      setSaveToAnotherDateDialogOpen(true);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <AlertDialog open={saveToAnotherDateDialogOpen} onOpenChange={setSaveToAnotherDateDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Salvar em Outra Data</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja salvar o resumo do dia atual para {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: pt })}?
                    <br /><br />
                    <strong>Esta ação irá:</strong>
                    <br />• Salvar todas as transações atuais para a data selecionada
                    <br />• Apagar todas as transações do dia atual
                    <br />• Permitir que você comece um novo dia
                    <br /><br />
                    <strong>Esta ação não pode ser desfeita.</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    if (selectedDate) {
                      console.log('Executando saveToAnotherDate com data:', selectedDate);
                      await handleSaveToAnotherDate(selectedDate);
                      setSaveToAnotherDateDialogOpen(false);
                    }
                  }}>
                    Salvar e Apagar Transações
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
              <Lock className="h-4 w-4" />
              Fechar o Dia
            </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Fechar o Dia</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja fechar o dia? Esta ação salvará todas as movimentações do dia e resetará as transações para um novo dia.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCloseDay}>
                    Fechar o Dia
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 shadow-card hover:shadow-glow transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Receita do Dia</p>
                <p className={`text-3xl font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {profit.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card hover:shadow-glow transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total de Depósitos</p>
                <p className="text-3xl font-bold text-success">R$ {totalDeposits.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <ArrowDown className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card hover:shadow-glow transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total de Saques</p>
                <p className="text-3xl font-bold text-destructive">R$ {totalWithdraws.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <ArrowUp className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card hover:shadow-glow transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Transações</p>
                <p className="text-3xl font-bold">{transactionCount}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </Card>
        </div>

        {/* Melhor Plataforma e Funcionário */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bestPlatform && (
            <Card className="p-6 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <h3 className="text-lg font-semibold">Melhor Plataforma do Dia</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: bestPlatform.color }}
                  />
                  <span className="font-medium">{bestPlatform.name}</span>
                </div>
                <p className="text-2xl font-bold text-success">
                  R$ {bestPlatform.profit.toLocaleString('pt-BR')}
                </p>
                <div className="text-sm text-muted-foreground">
                  {bestPlatform.transactions} transações • 
                  R$ {bestPlatform.deposits.toLocaleString('pt-BR')} depósitos • 
                  R$ {bestPlatform.withdraws.toLocaleString('pt-BR')} saques
                </div>
              </div>
            </Card>
          )}

          {bestEmployee && (
            <Card className="p-6 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <h3 className="text-lg font-semibold">Melhor Funcionário do Dia</h3>
              </div>
              <div className="space-y-3">
                <p className="font-medium">{bestEmployee.name}</p>
                <p className="text-2xl font-bold text-success">
                  R$ {bestEmployee.profit.toLocaleString('pt-BR')}
                </p>
                <div className="text-sm text-muted-foreground">
                  {bestEmployee.transactions} transações • 
                  R$ {bestEmployee.deposits.toLocaleString('pt-BR')} depósitos • 
                  R$ {bestEmployee.withdraws.toLocaleString('pt-BR')} saques
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Pizza - Plataformas */}
          {pieData.length > 0 && (
            <Card className="p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-6">Receita por Plataforma</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: R$ ${value.toLocaleString('pt-BR')}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Gráfico de Barras - Funcionários */}
          {barData.length > 0 && (
            <Card className="p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-6">Performance por Funcionário</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* Seções Adicionais para preencher espaço */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resumo de Horários */}
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <CalendarIcon className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Atividade por Horário</h3>
            </div>
            <div className="space-y-3">
              {(() => {
                const hourlyStats = todayTransactions.reduce((acc: any, transaction: any) => {
                  const hour = new Date(transaction.createdAt?.toDate?.() || transaction.createdAt).getHours();
                  if (!acc[hour]) {
                    acc[hour] = { transactions: 0, amount: 0 };
                  }
                  acc[hour].transactions++;
                  acc[hour].amount += Number(transaction.amount || 0);
                  return acc;
                }, {});

                const sortedHours = Object.entries(hourlyStats)
                  .sort(([,a], [,b]: any) => (b as any).transactions - (a as any).transactions)
                  .slice(0, 3);

                return sortedHours.length > 0 ? (
                  sortedHours.map(([hour, stats]: any) => (
                    <div key={hour} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{hour}:00h</p>
                        <p className="text-sm text-muted-foreground">{stats.transactions} transação(ões)</p>
                      </div>
                      <p className="font-bold text-primary">
                        R$ {stats.amount.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">Nenhuma transação registrada hoje</p>
                );
              })()}
            </div>
          </Card>

          {/* Estatísticas Rápidas */}
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Estatísticas Rápidas</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-lg font-bold text-success">
                    R$ {transactionCount > 0 ? (totalWithdraws / transactionCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-success/60" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div>
                  <p className="text-sm text-muted-foreground">Maior Transação</p>
                  <p className="text-lg font-bold text-primary">
                    R$ {todayTransactions.length > 0 ? Math.max(...todayTransactions.map((t: any) => Number(t.amount || 0))).toLocaleString('pt-BR') : '0,00'}
                  </p>
                </div>
                <ArrowUp className="h-8 w-8 text-primary/60" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Funcionários Ativos</p>
                  <p className="text-lg font-bold">
                    {employees.filter((e: any) => e.status === 'active').length}
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-muted-foreground/60" />
              </div>
            </div>
          </Card>

          {/* Próximas Ações */}
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Ações do Dia</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                <p className="text-sm font-medium text-warning">Fechamento do Dia</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {transactionCount > 0 
                    ? `Você tem ${transactionCount} transação(ões) para fechar`
                    : 'Nenhuma transação registrada hoje'
                  }
                </p>
              </div>
              
              <div className="p-3 bg-info/10 rounded-lg border border-info/20">
                <p className="text-sm font-medium text-info">Meta Diária</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {profit >= 1000 
                    ? '✅ Meta de R$ 1.000 atingida!'
                    : `Faltam R$ ${(1000 - profit).toLocaleString('pt-BR')} para a meta`
                  }
                </p>
              </div>

              <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                <p className="text-sm font-medium text-success">Status do Dia</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {profit > 0 
                    ? `✅ Dia lucrativo: +R$ ${profit.toLocaleString('pt-BR')}`
                    : profit < 0 
                    ? `⚠️ Prejuízo: R$ ${profit.toLocaleString('pt-BR')}`
                    : '📊 Dia neutro: R$ 0,00'
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Gráficos de Evolução e Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Evolução do Saldo */}
          <Card className="p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-6">Evolução do Saldo ao Longo do Dia</h3>
            {todayTransactions.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={(() => {
                  // Ordenar transações por horário
                  const sortedTransactions = [...todayTransactions].sort((a: any, b: any) => {
                    const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt);
                    const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt);
                    return dateA.getTime() - dateB.getTime();
                  });

                  // Calcular saldo acumulado
                  let runningBalance = 0;
                  return sortedTransactions.map((transaction: any, index: number) => {
                    const amount = Number(transaction.amount || 0);
                    const balanceChange = transaction.type === 'withdraw' ? amount : -amount;
                    runningBalance += balanceChange;
                    
                    const date = new Date(transaction.createdAt?.toDate?.() || transaction.createdAt);
                    const timeString = date.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });

                    // Encontrar funcionário e plataforma
                    const employee = employees.find((e: any) => e.id === transaction.employeeId);
                    const platform = platforms.find((p: any) => p.id === transaction.platformId);

                    return {
                      time: timeString,
                      saldo: runningBalance,
                      transacao: balanceChange,
                      tipo: transaction.type === 'withdraw' ? 'Saque' : 'Depósito',
                      funcionario: employee?.name || 'N/A',
                      plataforma: platform?.name || 'N/A',
                      valor: amount,
                      index: index + 1
                    };
                  });
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                    fontSize={11}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      if (name === 'saldo') {
                        return [
                          `R$ ${value.toLocaleString('pt-BR')}`, 
                          'Saldo Acumulado'
                        ];
                      }
                      return [
                        `R$ ${value.toLocaleString('pt-BR')}`, 
                        'Valor da Transação'
                      ];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload;
                        return `${data.tipo} - ${data.funcionario} (${data.plataforma})`;
                      }
                      return label;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saldo" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhuma transação registrada hoje</p>
                  <p className="text-sm">Os dados aparecerão aqui quando você registrar transações</p>
                </div>
              </div>
            )}
          </Card>

          {/* Gráfico de Performance por Plataforma */}
          <Card className="p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-6">Performance por Plataforma</h3>
            {platforms.length > 0 && platforms.some((p: any) => 
              todayTransactions.some((t: any) => t.platformId === p.id)
            ) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(() => {
                  return platforms.map((platform: any) => {
                    const platformTransactions = todayTransactions.filter((t: any) => t.platformId === platform.id);
                    const platformDeposits = platformTransactions
                      .filter((t: any) => t.type === 'deposit')
                      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
                    const platformWithdraws = platformTransactions
                      .filter((t: any) => t.type === 'withdraw')
                      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
                    const platformProfit = platformWithdraws - platformDeposits;

                    return {
                      name: platform.name.length > 8 ? platform.name.substring(0, 8) + '...' : platform.name,
                      lucro: platformProfit,
                      depositos: platformDeposits,
                      saques: platformWithdraws,
                      transacoes: platformTransactions.length,
                      color: platform.color,
                      barColor: platformProfit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'
                    };
                  }).filter(p => p.transacoes > 0);
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                    fontSize={11}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      const data = props.payload;
                      if (name === 'lucro') {
                        return [
                          `R$ ${value.toLocaleString('pt-BR')}`, 
                          'Lucro/Prejuízo'
                        ];
                      }
                      return [
                        `R$ ${value.toLocaleString('pt-BR')}`, 
                        name === 'depositos' ? 'Depósitos' : 'Saques'
                      ];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload;
                        return `${data.name} (${data.transacoes} transações)`;
                      }
                      return label;
                    }}
                  />
                  <Bar dataKey="lucro" radius={[4, 4, 0, 0]}>
                    {platforms.filter((p: any) => todayTransactions.some((t: any) => t.platformId === p.id)).map((platform: any, index: number) => {
                      const platformTransactions = todayTransactions.filter((t: any) => t.platformId === platform.id);
                      const platformDeposits = platformTransactions
                        .filter((t: any) => t.type === 'deposit')
                        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
                      const platformWithdraws = platformTransactions
                        .filter((t: any) => t.type === 'withdraw')
                        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
                      const platformProfit = platformWithdraws - platformDeposits;
                      const color = platformProfit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhuma plataforma com transações hoje</p>
                  <p className="text-sm">Os dados aparecerão aqui quando você registrar transações</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Resumo Detalhado por Plataforma */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-6">Performance por Plataforma</h3>
            {platforms.length > 0 ? (
              <div className="space-y-4">
                {platforms.map((platform: any) => {
                  const platformTransactions = todayTransactions.filter((t: any) => t.platformId === platform.id);
                  const platformDeposits = platformTransactions
                    .filter((t: any) => t.type === 'deposit')
                    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
                  const platformWithdraws = platformTransactions
                    .filter((t: any) => t.type === 'withdraw')
                    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
                  const platformProfit = platformWithdraws - platformDeposits;

                  return (
                    <div key={platform.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: platform.color }}
                        />
                        <div>
                          <p className="font-medium">{platform.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {platformTransactions.length} transação(ões)
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${platformProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          R$ {platformProfit.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {platformWithdraws > 0 && `R$ ${platformWithdraws.toLocaleString('pt-BR')} saques`}
                          {platformDeposits > 0 && platformWithdraws > 0 && ' • '}
                          {platformDeposits > 0 && `R$ ${platformDeposits.toLocaleString('pt-BR')} depósitos`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma plataforma configurada</p>
              </div>
            )}
          </Card>

          {/* Resumo Detalhado por Funcionário */}
          <Card className="p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-6">Performance por Funcionário</h3>
            {employees.length > 0 ? (
              <div className="space-y-4">
                {employees.map((employee: any) => {
                  const employeeTransactions = todayTransactions.filter((t: any) => t.employeeId === employee.id);
                  const employeeDeposits = employeeTransactions
                    .filter((t: any) => t.type === 'deposit')
                    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
                  const employeeWithdraws = employeeTransactions
                    .filter((t: any) => t.type === 'withdraw')
                    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
                  const employeeProfit = employeeWithdraws - employeeDeposits;

                  if (employeeTransactions.length === 0) return null;

                  return (
                    <div key={employee.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {employeeTransactions.length} transação(ões)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${employeeProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          R$ {employeeProfit.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {employeeWithdraws > 0 && `R$ ${employeeWithdraws.toLocaleString('pt-BR')} saques`}
                          {employeeDeposits > 0 && employeeWithdraws > 0 && ' • '}
                          {employeeDeposits > 0 && `R$ ${employeeDeposits.toLocaleString('pt-BR')} depósitos`}
                        </p>
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
                {employees.filter((e: any) => 
                  todayTransactions.some((t: any) => t.employeeId === e.id)
                ).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum funcionário com transações hoje</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum funcionário cadastrado</p>
              </div>
            )}
          </Card>
        </div>

        {/* Lista de Transações do Dia */}
        <Card className="shadow-card overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  Transações do Dia
                  {(activeFilter || platformFilter || employeeFilter) && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({filteredTransactions.length} transação(ões) encontrada(s))
                    </span>
                  )}
                </h3>
              </div>
              
              {/* Filtros de Plataforma e Funcionário no canto superior direito */}
              <div className="flex items-center gap-4 ml-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Plataforma:</span>
                  <Select value={platformFilter || "all"} onValueChange={(value) => setPlatformFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as plataformas</SelectItem>
                      {platforms.map((platform: any) => (
                        <SelectItem key={platform.id} value={platform.id}>
                          {platform.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Funcionário:</span>
                  <Select value={employeeFilter || "all"} onValueChange={(value) => setEmployeeFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os funcionários</SelectItem>
                      {employees.map((employee: any) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(activeFilter || platformFilter || employeeFilter) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setActiveFilter('');
                      setPlatformFilter('');
                      setEmployeeFilter('');
                      navigate('/resumo-dia');
                    }}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
            
            {/* Filtros de Transações */}
            <div className="space-y-4 mt-4">
              {/* Indicador de Filtros Ativos */}
              {(activeFilter || platformFilter || employeeFilter) && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">Filtros ativos:</span>
                  <div className="flex gap-2">
                    {activeFilter && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                        {activeFilter === 'deposits' && 'Depósitos'}
                        {activeFilter === 'withdraws' && 'Saques'}
                        {activeFilter === 'profit' && 'Lucro'}
                      </Badge>
                    )}
                    {platformFilter && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                        Plataforma: {platforms.find((p: any) => p.id === platformFilter)?.name || 'N/A'}
                      </Badge>
                    )}
                    {employeeFilter && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                        Funcionário: {employees.find((e: any) => e.id === employeeFilter)?.name || 'N/A'}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Filtros por Tipo */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeFilter === '' ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigate('/resumo-dia')}
                  className="gap-2"
                >
                  <Filter className="h-3 w-3" />
                  Todas
                  <Badge variant="secondary" className="ml-1">
                    {todayTransactions.length}
                  </Badge>
                </Button>
                
                <Button
                  variant={activeFilter === 'deposits' ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigate('/resumo-dia?filter=deposits')}
                  className="gap-2"
                >
                  <ArrowDown className="h-3 w-3" />
                  Depósitos
                  <Badge variant="secondary" className="ml-1">
                    {deposits.length}
                  </Badge>
                </Button>
                
                <Button
                  variant={activeFilter === 'withdraws' ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigate('/resumo-dia?filter=withdraws')}
                  className="gap-2"
                >
                  <ArrowUp className="h-3 w-3" />
                  Saques
                  <Badge variant="secondary" className="ml-1">
                    {withdraws.length}
                  </Badge>
                </Button>
                
                <Button
                  variant={activeFilter === 'profit' ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigate('/resumo-dia?filter=profit')}
                  className="gap-2"
                >
                  <TrendingUp className="h-3 w-3" />
                  Lucro
                  <Badge variant="secondary" className="ml-1">
                    {todayTransactions.length}
                  </Badge>
                </Button>
              </div>

            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-4 font-semibold">Funcionário</th>
                  <th className="text-left p-4 font-semibold">Plataforma</th>
                  <th className="text-center p-4 font-semibold">Tipo</th>
                  <th className="text-right p-4 font-semibold">Valor</th>
                  <th className="text-center p-4 font-semibold">Horário</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction: any) => {
                  const employee = employees.find((e: any) => e.id === transaction.employeeId);
                  const platform = platforms.find((p: any) => p.id === transaction.platformId);
                  
                  return (
                    <tr key={transaction.id} className="border-t hover:bg-muted/30">
                      <td className="p-4 font-medium">{(employee as any)?.name || 'N/A'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {platform && (
                            <div 
                              className="w-3 h-3 rounded" 
                              style={{ backgroundColor: (platform as any).color }}
                            />
                          )}
                          {transaction.description || (platform as any)?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Badge 
                          variant={transaction.type === 'withdraw' ? 'default' : 'destructive'}
                          style={{ 
                            backgroundColor: transaction.description && transaction.description.startsWith('Surebet')
                              ? '#86efac' // Verde claro para Surebet
                              : undefined
                          }}
                        >
                          {transaction.description && transaction.description.startsWith('FreeBet')
                            ? transaction.description.split(' ')[0]
                            : transaction.description && transaction.description.startsWith('Surebet')
                              ? 'Surebet'
                              : (transaction.type === 'deposit' ? 'Depósito' : 'Saque')}
                        </Badge>
                      </td>
                      <td className={`p-4 text-right font-semibold ${
                        shouldDisplayAsPositive(transaction) ? 'text-success' : 'text-destructive'
                      }`}>
                        {shouldDisplayAsPositive(transaction) ? '+' : '-'}R$ {Number(transaction.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center text-sm text-muted-foreground">
                        {new Date(transaction.createdAt?.toDate?.() || transaction.createdAt).toLocaleTimeString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      {activeFilter ? (
                        <div className="space-y-2">
                          <p>Nenhuma transação encontrada para o filtro selecionado.</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/resumo-dia')}
                          >
                            Ver todas as transações
                          </Button>
                        </div>
                      ) : (
                        'Nenhuma transação registrada para este dia.'
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ResumoDia;