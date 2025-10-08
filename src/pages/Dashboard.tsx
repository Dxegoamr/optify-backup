import { DollarSign, TrendingUp, Users, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MonthlyGoalCard from '@/components/dashboard/MonthlyGoalCard';
import MonthlyCalendar from '@/components/dashboard/MonthlyCalendar';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees, useTransactions } from '@/hooks/useFirestore';

const Dashboard = () => {
  const { user } = useFirebaseAuth();
  const navigate = useNavigate();
  
  // Buscar dados do Firebase
  const { data: employees = [], isLoading: employeesLoading, error: employeesError } = useEmployees(user?.uid || '');
  const today = new Date().toISOString().split('T')[0];
  const { data: todayTransactions = [], isLoading: transactionsLoading, error: transactionsError } = useTransactions(user?.uid || '', today, today);
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
      value: 'R$ 184.200,00', 
      icon: TrendingUp,
      valueColor: 'default' as const,
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
      title: 'Meta Mensal', 
      value: `R$ ${monthlyGoal.toLocaleString('pt-BR')}`, 
      icon: Target,
      valueColor: 'default' as const,
      clickable: true,
      onClick: () => navigate('/relatorios')
    },
  ];

  const chartData = [
    { name: 'Seg', receita: 4000, despesa: 2400 },
    { name: 'Ter', receita: 3000, despesa: 1398 },
    { name: 'Qua', receita: 2000, despesa: 9800 },
    { name: 'Qui', receita: 2780, despesa: 3908 },
    { name: 'Sex', receita: 1890, despesa: 4800 },
    { name: 'Sáb', receita: 2390, despesa: 3800 },
    { name: 'Dom', receita: 3490, despesa: 4300 },
  ];

  const currentRevenue = 184200;
  const goalProgress = (currentRevenue / monthlyGoal) * 100;

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

        {/* Gráfico Semanal */}
        <Card className="p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-6">Resumo Semanal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
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
              <Bar dataKey="despesa" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Atividades Recentes */}
        <Card className="p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
          <div className="space-y-4">
            {[
              { action: 'Pagamento recebido', employee: 'João Silva', value: 'R$ 5.000', time: '2 min atrás' },
              { action: 'Novo funcionário', employee: 'Ana Costa', value: '', time: '15 min atrás' },
              { action: 'Pagamento pendente', employee: 'Pedro Souza', value: 'R$ 3.500', time: '1 hora atrás' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.employee}</p>
                </div>
                <div className="text-right">
                  {activity.value && <p className="font-semibold text-success">{activity.value}</p>}
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
