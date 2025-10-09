import { DollarSign, TrendingUp, TrendingDown, Users, Target, Clock, UserPlus, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MonthlyGoalCard from '@/components/dashboard/MonthlyGoalCard';
import MonthlyCalendar from '@/components/dashboard/MonthlyCalendar';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees, useTransactions, useAllDailySummaries } from '@/hooks/useFirestore';
import { getCurrentDateStringInSaoPaulo, getCurrentDateInSaoPaulo } from '@/utils/timezone';
import { useDailyClosure } from '@/hooks/useDailyClosure';

const Dashboard = () => {
  const { user } = useFirebaseAuth();
  const navigate = useNavigate();
  
  // Inicializar serviço de fechamento diário
  const { isServiceActive, nextClosure } = useDailyClosure();
  
  // Buscar dados do Firebase
  const { data: employees = [], isLoading: employeesLoading, error: employeesError } = useEmployees(user?.uid || '');
  const today = getCurrentDateStringInSaoPaulo();
  const sevenDaysAgo = new Date(getCurrentDateInSaoPaulo().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const firstDayOfMonth = new Date(getCurrentDateInSaoPaulo().getFullYear(), getCurrentDateInSaoPaulo().getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(getCurrentDateInSaoPaulo().getFullYear(), getCurrentDateInSaoPaulo().getMonth() + 1, 0).toISOString().split('T')[0];
  const { data: todayTransactions = [], isLoading: transactionsLoading, error: transactionsError } = useTransactions(user?.uid || '', today, today);
  const { data: recentTransactions = [], isLoading: recentTransactionsLoading } = useTransactions(user?.uid || '', sevenDaysAgo, today);
  const { data: monthlyTransactions = [], isLoading: monthlyTransactionsLoading } = useTransactions(user?.uid || '', firstDayOfMonth, lastDayOfMonth);
  const { data: dailySummaries = [] } = useAllDailySummaries(user?.uid || '');
  // Onboarding notification removida conforme solicitado
  
  // Debug temporário
  console.log('Dashboard Debug:', { 
    user: user?.uid, 
    employees: employees.length, 
    todayTransactions: todayTransactions.length,
    today,
    employeesLoading,
    transactionsLoading,
    employeesError,
    transactionsError
  });
  
  // Calcular estatísticas
  const todayDeposits = todayTransactions
    ?.filter(t => t.type === 'deposit')
    ?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    
  const todayWithdraws = todayTransactions
    ?.filter(t => t.type === 'withdraw')
    ?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    
  const todayRevenue = todayWithdraws - todayDeposits;
  const activeEmployees = employees?.filter(e => e.status === 'active') || [];
  const transactionCount = todayTransactions?.length || 0;
  
  // Calcular receita mensal
  const currentYear = getCurrentDateInSaoPaulo().getFullYear();
  const currentMonth = getCurrentDateInSaoPaulo().getMonth();
  
  // Filtrar fechamentos diários do mês atual
  const monthlySummaries = dailySummaries.filter((summary: any) => {
    const summaryDate = new Date(summary.date);
    return summaryDate.getFullYear() === currentYear && summaryDate.getMonth() === currentMonth;
  });
  
  // Somar lucros dos fechamentos diários
  const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
    return total + (summary.profit || summary.margin || 0);
  }, 0);
  
  // Somar lucros das transações não fechadas do mês atual
  // Filtrar apenas transações que NÃO estão em fechamentos diários
  const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));
  const openTransactions = monthlyTransactions.filter((transaction: any) => {
    return !closedDates.has(transaction.date);
  });
  
  const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
    const transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
    return total + transactionProfit;
  }, 0);
  
  console.log('Dashboard - Transações Abertas (não fechadas):', {
    totalMonthlyTransactions: monthlyTransactions.length,
    closedDates: Array.from(closedDates),
    openTransactions: openTransactions.length,
    monthlyRevenueFromTransactions
  });
  
  const monthlyRevenue = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
  
  console.log('Dashboard - Cálculo Receita Mensal:', {
    currentYear,
    currentMonth,
    monthlySummaries: monthlySummaries.length,
    monthlyRevenueFromSummaries,
    monthlyTransactions: monthlyTransactions.length,
    monthlyRevenueFromTransactions,
    monthlyRevenue
  });
  
  // Debug detalhado dos fechamentos diários
  console.log('Dashboard - Fechamentos Diários Detalhados:');
  monthlySummaries.forEach((summary: any, index: number) => {
    console.log(`  ${index + 1}. Data: ${summary.date}, Profit: ${summary.profit || summary.margin || 0}`);
  });
  
  // Debug detalhado das transações abertas
  console.log('Dashboard - Transações Abertas Detalhadas:');
  openTransactions.forEach((transaction: any, index: number) => {
    const profit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
    console.log(`  ${index + 1}. Data: ${transaction.date}, Tipo: ${transaction.type}, Valor: ${transaction.amount}, Profit: ${profit}`);
  });
  
  // Calcular meta mensal (exemplo: 10% dos funcionários ativos)
  const monthlyGoal = activeEmployees.length * 10000; // R$ 10k por funcionário ativo

  const stats = [
    { 
      title: 'Receita Hoje', 
      value: `R$ ${todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      icon: DollarSign,
      valueColor: todayRevenue >= 0 ? 'positive' : 'negative' as 'positive' | 'negative',
      clickable: true,
      onClick: () => navigate('/resumo-dia')
    },
    { 
      title: 'Receita do Mês', 
      value: `R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      icon: monthlyRevenue >= 0 ? TrendingUp : TrendingDown,
      valueColor: monthlyRevenue >= 0 ? 'positive' : 'negative' as 'positive' | 'negative',
      clickable: true,
      onClick: () => navigate('/relatorios')
    },
    { 
      title: 'Funcionários Ativos', 
      value: activeEmployees.length.toString(), 
      icon: Users,
      valueColor: 'default' as const,
      clickable: true,
      onClick: () => navigate('/gestao-funcionarios')
    },
    { 
      title: 'Transações do Mês', 
      value: monthlyTransactions.length.toString(), 
      icon: FileText,
      valueColor: 'default' as const,
      clickable: true,
      onClick: () => {
        navigate('/relatorios');
        // Aguardar a navegação e depois rolar até o gráfico semanal
        setTimeout(() => {
          const weeklyChartSection = document.getElementById('weekly-chart-section');
          if (weeklyChartSection) {
            weeklyChartSection.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
          }
        }, 500);
      }
    },
  ];

  // Função para gerar dados reais do gráfico semanal
  const generateWeeklyChartData = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const chartData = [];
    
    // Gerar dados para os últimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Filtrar transações do dia específico
      const dayTransactions = recentTransactions.filter(t => {
        const transactionDate = new Date(t.createdAt?.toDate?.() || t.createdAt).toISOString().split('T')[0];
        return transactionDate === dateString;
      });
      
      // Calcular receitas (withdraws) e despesas (deposits) do dia
      const receita = dayTransactions
        .filter(t => t.type === 'withdraw')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        
      const despesa = dayTransactions
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      // Calcular lucro acumulado (começando de 0 e somando conforme os saques)
      const lucroAcumulado = chartData.length > 0 
        ? chartData[chartData.length - 1].lucroAcumulado + receita - despesa
        : receita - despesa;
      
      chartData.push({
        name: days[date.getDay()],
        receita,
        despesa,
        lucro: receita - despesa, // Lucro do dia
        lucroAcumulado, // Lucro acumulado da semana
        date: dateString,
        // Adicionar indicador se é hoje
        isToday: i === 0
      });
    }
    
    return chartData;
  };

  const chartData = generateWeeklyChartData();


  const currentRevenue = 184200;
  const goalProgress = (currentRevenue / monthlyGoal) * 100;

  // Função para gerar atividades recentes baseadas em dados reais
  const generateRecentActivities = () => {
    const activities = [];

    // Atividades baseadas em transações recentes
    recentTransactions
      .sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt).getTime() - new Date(a.createdAt?.toDate?.() || a.createdAt).getTime())
      .slice(0, 5)
      .forEach((transaction) => {
        const employee = employees.find(emp => emp.id === transaction.employeeId);
        const timeAgo = getTimeAgo(new Date(transaction.createdAt?.toDate?.() || transaction.createdAt));
        
        if (transaction.type === 'withdraw') {
          activities.push({
            id: `transaction-${transaction.id}`,
            action: 'Pagamento recebido',
            employee: employee?.name || 'Funcionário não encontrado',
            value: `R$ ${Number(transaction.amount || 0).toLocaleString('pt-BR')}`,
            time: timeAgo,
            type: 'payment',
            icon: DollarSign
          });
        } else if (transaction.type === 'deposit') {
          activities.push({
            id: `transaction-${transaction.id}`,
            action: 'Pagamento pendente',
            employee: employee?.name || 'Funcionário não encontrado',
            value: `R$ ${Number(transaction.amount || 0).toLocaleString('pt-BR')}`,
            time: timeAgo,
            type: 'pending',
            icon: Clock
          });
        }
      });

    // Atividades baseadas em funcionários recentes
    employees
      .sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt).getTime() - new Date(a.createdAt?.toDate?.() || a.createdAt).getTime())
      .slice(0, 2)
      .forEach((employee) => {
        const timeAgo = getTimeAgo(new Date(employee.createdAt?.toDate?.() || employee.createdAt));
        activities.push({
          id: `employee-${employee.id}`,
          action: 'Novo funcionário',
          employee: employee.name,
          value: '',
          time: timeAgo,
          type: 'employee',
          icon: UserPlus
        });
      });

    // Ordenar por tempo e retornar as 5 mais recentes
    return activities
      .sort((a, b) => {
        const timeA = getTimeInMinutes(a.time);
        const timeB = getTimeInMinutes(b.time);
        return timeA - timeB;
      })
      .slice(0, 5);
  };

  // Função para calcular tempo relativo
  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`;
  };

  // Função para converter tempo em minutos para ordenação
  const getTimeInMinutes = (timeString) => {
    if (timeString === 'Agora mesmo') return 0;
    if (timeString.includes('min')) return parseInt(timeString);
    if (timeString.includes('hora')) return parseInt(timeString) * 60;
    if (timeString.includes('dia')) return parseInt(timeString) * 24 * 60;
    return 999999; // Para casos não previstos
  };

  const recentActivities = generateRecentActivities();

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <StatCard 
              key={stat.title} 
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              valueColor={stat.valueColor}
              clickable={stat.clickable}
              onClick={stat.onClick}
            />
          ))}
        </div>


        {/* Meta Mensal */}
        <MonthlyGoalCard />

        {/* Calendário */}
        <MonthlyCalendar />


        {/* Atividades Recentes */}
        <Card className="p-6 shadow-card hover:shadow-glow transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => {
                const IconComponent = activity.icon;
                return (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'payment' ? 'bg-success/10' :
                        activity.type === 'pending' ? 'bg-warning/10' :
                        'bg-primary/10'
                      }`}>
                        <IconComponent className={`h-4 w-4 ${
                          activity.type === 'payment' ? 'text-success' :
                          activity.type === 'pending' ? 'text-warning' :
                          'text-primary'
                        }`} />
                      </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.employee}</p>
                      </div>
                </div>
                <div className="text-right">
                      {activity.value && (
                        <p className={`font-semibold ${
                          activity.type === 'payment' ? 'text-success' :
                          activity.type === 'pending' ? 'text-warning' :
                          'text-foreground'
                        }`}>
                          {activity.value}
                        </p>
                      )}
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma atividade recente</p>
                <p className="text-sm">As atividades aparecerão aqui conforme você usa o sistema</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
