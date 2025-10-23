import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, ArrowUp, ArrowDown, Target, Trophy, Lock, Filter, X } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { usePlanLimitations } from '@/hooks/usePlanLimitations';
import { useEmployees, useTransactions, usePlatforms, useDeleteTransaction } from '@/hooks/useFirestore';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { getCurrentDateInSaoPaulo, formatDateInSaoPaulo, getCurrentDateStringInSaoPaulo } from '@/utils/timezone';
import { UserDailySummaryService } from '@/core/services/user-specific.service';
import { UserConfigService } from '@/core/services/user-config.service';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ResumoDia = () => {
  const { user } = useFirebaseAuth();
  const { getAllowedEmployees } = usePlanLimitations();
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
  
  // Buscar dados do Firebase
  const { data: allEmployees = [] } = useEmployees(user?.uid || '');
  const { data: platforms = [] } = usePlatforms(user?.uid || '');
  const { data: allTransactions = [] } = useTransactions(user?.uid || '');
  const deleteTransactionMutation = useDeleteTransaction();
  
  // Filtrar funcionários baseado no plano
  const employees = getAllowedEmployees(allEmployees);
  
  // Buscar configuração do usuário (meta mensal)
  const { data: userConfig } = useQuery({
    queryKey: ['user-config', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      return UserConfigService.getUserConfig(user.uid);
    },
    enabled: !!user?.uid
  });
  
  // Filtrar transações do dia selecionado
  const todayTransactions = allTransactions.filter((transaction: any) => {
    console.log('Comparando:', transaction.date, '===', selectedDateString, '?', transaction.date === selectedDateString);
    return transaction.date === selectedDateString;
  });
  
  console.log('ResumoDia - selectedDateString:', selectedDateString);
  console.log('ResumoDia - allTransactions:', allTransactions);
  console.log('ResumoDia - allTransactions dates:', allTransactions.map((t: any) => ({ id: t.id, date: t.date, type: t.type, amount: t.amount })));
  console.log('ResumoDia - todayTransactions (filtradas):', todayTransactions);
  
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
        console.log('ResumoDia - Transações do dia original capturadas:', originalTransactions);
        console.log('ResumoDia - Data original:', originalDate);
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

  // Calcular estatísticas do dia
  const deposits = todayTransactions.filter((t: any) => t.type === 'deposit');
  const withdraws = todayTransactions.filter((t: any) => t.type === 'withdraw');
  const totalDeposits = deposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const profit = totalWithdraws - totalDeposits;
  const transactionCount = filteredTransactions.length;
  
  console.log('ResumoDia - Cálculos:');
  console.log('- deposits:', deposits);
  console.log('- withdraws:', withdraws);
  console.log('- totalDeposits:', totalDeposits);
  console.log('- totalWithdraws:', totalWithdraws);
  console.log('- profit:', profit);
  console.log('- transactionCount:', transactionCount);

  // Calcular metas diárias baseadas na meta mensal
  const monthlyGoal = userConfig?.monthlyGoal || 10000; // Meta padrão de R$ 10.000
  const currentDate = new Date();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const dayOfMonth = currentDate.getDate();
  const remainingDays = daysInMonth - dayOfMonth + 1; // +1 para incluir o dia atual
  
  // Calcular meta diária (arredondar para cima se necessário)
  const dailyRevenueGoal = Math.ceil(monthlyGoal / daysInMonth);
  const dailyTransactionGoal = Math.ceil(5); // Meta padrão de 5 transações por dia
  
  // Calcular quanto falta para atingir as metas
  const remainingRevenueGoal = Math.max(0, dailyRevenueGoal - profit);
  const remainingTransactionGoal = Math.max(0, dailyTransactionGoal - transactionCount);
  
  // Calcular progresso mensal
  const monthlyProgress = Math.min(100, Math.max(0, (profit / monthlyGoal) * 100));

  // Calcular estatísticas por plataforma
  const platformStats = platforms.map((platform: any) => {
    const platformTransactions = todayTransactions.filter((t: any) => t.platformId === platform.id);
    const platformDeposits = platformTransactions
      .filter((t: any) => t.type === 'deposit')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const platformWithdraws = platformTransactions
      .filter((t: any) => t.type === 'withdraw')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const platformProfit = platformWithdraws - platformDeposits;
    
    return {
      name: platform.name,
      color: platform.color,
      deposits: platformDeposits,
      withdraws: platformWithdraws,
      profit: platformProfit,
      transactions: platformTransactions.length
    };
  }).filter(stat => stat.transactions > 0).sort((a, b) => b.profit - a.profit);

  // Calcular estatísticas por funcionário
  const employeeStats = employees.map((employee: any) => {
    const employeeTransactions = todayTransactions.filter((t: any) => t.employeeId === employee.id);
    const employeeDeposits = employeeTransactions
      .filter((t: any) => t.type === 'deposit')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const employeeWithdraws = employeeTransactions
      .filter((t: any) => t.type === 'withdraw')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const employeeProfit = employeeWithdraws - employeeDeposits;
    
    return {
      name: employee.name,
      deposits: employeeDeposits,
      withdraws: employeeWithdraws,
      profit: employeeProfit,
      transactions: employeeTransactions.length
    };
  }).filter(stat => stat.transactions > 0).sort((a, b) => b.profit - a.profit);

  // Encontrar melhor plataforma e funcionário do dia
  const bestPlatform = platformStats[0];
  const bestEmployee = employeeStats[0];

  // Função para fechar o dia
  const handleCloseDay = async () => {
    try {
      // CORREÇÃO: Usar transações do dia original se disponíveis
      const transactionsToClose = originalDayTransactions.length > 0 ? originalDayTransactions : todayTransactions;
      const dateToClose = originalDayDate || selectedDateString;
      
      const depositsToClose = transactionsToClose.filter((t: any) => t.type === 'deposit');
      const withdrawsToClose = transactionsToClose.filter((t: any) => t.type === 'withdraw');
      const totalDepositsToClose = depositsToClose.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalWithdrawsToClose = withdrawsToClose.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const profitToClose = totalWithdrawsToClose - totalDepositsToClose;
      
      console.log('Fechando dia - Data:', dateToClose);
      console.log('Fechando dia - Transações originais:', originalDayTransactions);
      console.log('Fechando dia - Transações selecionadas:', transactionsToClose);
      console.log('Fechando dia - Total Deposits:', totalDepositsToClose);
      console.log('Fechando dia - Total Withdraws:', totalWithdrawsToClose);
      console.log('Fechando dia - Profit:', profitToClose);
      
      if (!user?.uid) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Verificar se já existe um fechamento para este dia
      const existingSummaries = await UserDailySummaryService.getAllDailySummaries(user.uid);
      const existingSummary = existingSummaries.find((s: any) => s.date === dateToClose);
      
      let summaryData;
      
      if (existingSummary) {
        // Se já existe, somar aos valores existentes
        summaryData = {
          date: dateToClose,
          totalDeposits: (existingSummary.totalDeposits || 0) + totalDepositsToClose,
          totalWithdraws: (existingSummary.totalWithdraws || 0) + totalWithdrawsToClose,
          profit: (existingSummary.profit || existingSummary.margin || 0) + profitToClose,
          transactionCount: (existingSummary.transactionCount || 0) + transactionsToClose.length,
          transactionsSnapshot: [...(existingSummary.transactionsSnapshot || []), ...transactionsToClose],
          byEmployee: [],
          margin: (existingSummary.profit || existingSummary.margin || 0) + profitToClose,
          createdAt: existingSummary.createdAt,
          updatedAt: new Date(),
        };
        
        console.log('Atualizando fechamento existente:', summaryData);
        // CORREÇÃO: Usar update em vez de create para evitar duplicação
        await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, summaryData);
      } else {
        // Se não existe, criar novo
        summaryData = {
        date: dateToClose,
        totalDeposits: totalDepositsToClose,
        totalWithdraws: totalWithdrawsToClose,
        profit: profitToClose,
        transactionCount: transactionsToClose.length,
        transactionsSnapshot: transactionsToClose,
        byEmployee: [],
          margin: profitToClose,
        createdAt: new Date(),
        updatedAt: new Date(),
        };
        
        console.log('Criando novo fechamento:', summaryData);
        await UserDailySummaryService.createDailySummary(user.uid, summaryData as any);
      }
      
      // Deletar todas as transações do dia
      const deletePromises = transactionsToClose.map((transaction: any) => 
        deleteTransactionMutation.mutateAsync(transaction.id)
      );
      await Promise.all(deletePromises);
      
      toast.success('Dia fechado com sucesso!');
      setCloseDialogOpen(false);
      
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
                <p className="text-3xl font-bold text-destructive">R$ {totalDeposits.toLocaleString('pt-BR')}</p>
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
                <p className="text-3xl font-bold text-success">R$ {totalWithdraws.toLocaleString('pt-BR')}</p>
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

        {/* Layout principal: 2 colunas esquerda + 1 coluna direita */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna esquerda - 2 colunas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Melhor Plataforma */}
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

            {/* Melhor Funcionário */}
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

            {/* Performance por Funcionário */}
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

          {/* Coluna direita - 1 coluna */}
          <div className="space-y-6">
            {/* Metas do Dia */}
            <Card className="p-6 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <h3 className="text-lg font-semibold">Metas do Dia</h3>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Meta Diária de Receita</span>
                    <span className="text-xs text-muted-foreground">R$ {dailyRevenueGoal.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Hoje: R$ {profit.toLocaleString('pt-BR')}</span>
                      <span className={remainingRevenueGoal > 0 ? 'text-destructive' : 'text-success'}>
                        {remainingRevenueGoal > 0 ? `Faltam R$ ${remainingRevenueGoal.toLocaleString('pt-BR')}` : '🎯 Meta atingida!'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Meta mensal: R$ {monthlyGoal.toLocaleString('pt-BR')} • Progresso: {monthlyProgress.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Status do Dia</span>
                    <span className="text-xs text-muted-foreground">Resumo</span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Depósitos: </span>
                      <span className="text-destructive">R$ {totalDeposits.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Saques: </span>
                      <span className="text-success">R$ {totalWithdraws.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="text-sm font-semibold">
                      <span className="text-muted-foreground">Lucro: </span>
                      <span className={profit >= 0 ? 'text-success' : 'text-destructive'}>
                        R$ {profit.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

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
          </div>
        </div>

        {/* Seções Adicionais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Estatísticas Comparativas */}
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Comparativo Semanal</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Média de transações/dia</span>
                <span className="font-semibold">{Math.round(transactionCount / 7)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Ticket médio</span>
                <span className="font-semibold">
                  R$ {transactionCount > 0 ? Math.round((totalDeposits + totalWithdraws) / transactionCount).toLocaleString('pt-BR') : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Taxa de conversão</span>
                <span className="font-semibold">
                  {totalDeposits > 0 ? Math.round((totalWithdraws / totalDeposits) * 100) : 0}%
                </span>
              </div>
            </div>
          </Card>

          {/* Insights e Recomendações */}
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Insights do Dia</h3>
            </div>
            <div className="space-y-3">
              {profit > 0 ? (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm text-success font-medium">
                    🎉 Excelente! Você teve lucro hoje de R$ {profit.toLocaleString('pt-BR')}
                  </p>
                </div>
              ) : profit < 0 ? (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Atenção: Prejuízo de R$ {Math.abs(profit).toLocaleString('pt-BR')} hoje
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-muted/30 border border-muted rounded-lg">
                  <p className="text-sm text-muted-foreground font-medium">
                    📊 Resultado neutro hoje - R$ 0,00
                  </p>
                </div>
              )}
              
              {transactionCount === 0 && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-primary font-medium">
                    💡 Nenhuma transação hoje. Que tal registrar algumas movimentações?
                  </p>
                </div>
              )}
              
              {transactionCount > 0 && totalDeposits > totalWithdraws && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-primary font-medium">
                    📈 Você depositou mais do que sacou hoje. Mantenha essa estratégia!
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
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
                          {(platform as any)?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant={transaction.type === 'deposit' ? 'destructive' : 'default'}>
                          {transaction.type === 'deposit' ? 'Depósito' : 'Saque'}
                        </Badge>
                      </td>
                      <td className={`p-4 text-right font-semibold ${
                        transaction.type === 'deposit' ? 'text-success' : 'text-destructive'
                      }`}>
                        {transaction.type === 'deposit' ? '-' : '+'}R$ {Number(transaction.amount || 0).toLocaleString('pt-BR')}
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