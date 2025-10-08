import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, ArrowUp, ArrowDown, Target, Trophy, Lock, Filter, X } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees, useTransactions, usePlatforms, useDeleteTransaction } from '@/hooks/useFirestore';
import { UserDailySummaryService } from '@/core/services/user-specific.service';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  
  const selectedDateString = selectedDate.toISOString().split('T')[0];
  
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
  const { data: employees = [] } = useEmployees(user?.uid || '');
  const { data: platforms = [] } = usePlatforms(user?.uid || '');
  const { data: todayTransactions = [] } = useTransactions(user?.uid || '', selectedDateString, selectedDateString);
  const deleteTransactionMutation = useDeleteTransaction();

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
      if (!user?.uid) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Salvar resumo no Firestore (subcoleção do usuário)
      await UserDailySummaryService.createDailySummary(user.uid, {
        date: selectedDateString,
        totalDeposits,
        totalWithdraws,
        profit,
        transactionCount,
        transactionsSnapshot: todayTransactions,
        byEmployee: [],
        margin: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      
      // Deletar todas as transações do dia
      const deletePromises = todayTransactions.map((transaction: any) => 
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
      if (!user?.uid) {
        toast.error('Usuário não autenticado');
        return;
      }

      const targetDateString = targetDate.toISOString().split('T')[0];
      
      // Criar resumo do dia para a data selecionada
      // Salvar resumo no Firestore para outra data (subcoleção do usuário)
      await UserDailySummaryService.createDailySummary(user.uid, {
        date: targetDateString,
        totalDeposits,
        totalWithdraws,
        profit,
        transactionCount,
        transactionsSnapshot: todayTransactions,
        byEmployee: [],
        margin: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      
      toast.success(`Resumo salvo para ${format(targetDate, "dd/MM/yyyy", { locale: pt })}!`);
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
                      handleSaveToAnotherDate(date);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
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
                          {(platform as any)?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant={transaction.type === 'deposit' ? 'destructive' : 'default'}>
                          {transaction.type === 'deposit' ? 'Depósito' : 'Saque'}
                        </Badge>
                      </td>
                      <td className={`p-4 text-right font-semibold ${
                        transaction.type === 'deposit' ? 'text-destructive' : 'text-success'
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