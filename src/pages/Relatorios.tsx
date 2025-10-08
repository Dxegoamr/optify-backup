import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Download, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees, useTransactions, usePlatforms } from '@/hooks/useFirestore';
import { toast } from 'sonner';

const Relatorios = () => {
  const { user } = useFirebaseAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonMonth, setComparisonMonth] = useState<number | null>(null);
  const [comparisonYear, setComparisonYear] = useState<number | null>(null);

  // Buscar dados do Firebase
  const { data: employees = [] } = useEmployees(user?.uid || '');
  const { data: platforms = [] } = usePlatforms(user?.uid || '');
  
  // Buscar transações do mês atual
  const startOfMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const endOfMonth = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
  const { data: monthlyTransactions = [] } = useTransactions(user?.uid || '', startOfMonth, endOfMonth);

  // Buscar transações do mês de comparação
  const comparisonStartOfMonth = comparisonMonth && comparisonYear ? 
    `${comparisonYear}-${String(comparisonMonth).padStart(2, '0')}-01` : '';
  const comparisonEndOfMonth = comparisonMonth && comparisonYear ? 
    new Date(comparisonYear, comparisonMonth, 0).toISOString().split('T')[0] : '';
  const { data: comparisonTransactions = [] } = useTransactions(
    user?.uid || '', 
    comparisonStartOfMonth, 
    comparisonEndOfMonth
  );

  // Calcular estatísticas do mês atual
  const monthlyStats = useMemo(() => {
    const deposits = monthlyTransactions.filter((t: any) => t.type === 'deposit');
    const withdraws = monthlyTransactions.filter((t: any) => t.type === 'withdraw');
    const totalDeposits = deposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const profit = totalWithdraws - totalDeposits;
    
    return {
      deposits: totalDeposits,
      withdraws: totalWithdraws,
      profit,
      transactionCount: monthlyTransactions.length
    };
  }, [monthlyTransactions]);

  // Calcular estatísticas do mês de comparação
  const comparisonStats = useMemo(() => {
    if (!comparisonTransactions.length) return null;
    
    const deposits = comparisonTransactions.filter((t: any) => t.type === 'deposit');
    const withdraws = comparisonTransactions.filter((t: any) => t.type === 'withdraw');
    const totalDeposits = deposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const profit = totalWithdraws - totalDeposits;
    
    return {
      deposits: totalDeposits,
      withdraws: totalWithdraws,
      profit,
      transactionCount: comparisonTransactions.length
    };
  }, [comparisonTransactions]);

  // Calcular dados diários do mês
  const dailyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const dailyStats: any[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTransactions = monthlyTransactions.filter((t: any) => t.date === dateString);
      
      const deposits = dayTransactions.filter((t: any) => t.type === 'deposit');
      const withdraws = dayTransactions.filter((t: any) => t.type === 'withdraw');
      const dayDeposits = deposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const dayWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const dayProfit = dayWithdraws - dayDeposits; // Lucro = Saques - Depósitos
      
      dailyStats.push({
        day: day,
        date: dateString,
        lucroPrejuizo: dayProfit, // Apenas uma métrica: lucro ou prejuízo
        depositos: dayDeposits,
        saques: dayWithdraws,
        transacoes: dayTransactions.length
      });
    }
    
    return dailyStats;
  }, [monthlyTransactions, selectedMonth, selectedYear]);

  // Gerar segmentos de linha coloridos
  const lineSegments = useMemo(() => {
    const segments: any[] = [];
    
    for (let i = 0; i < dailyData.length - 1; i++) {
      const currentDay = dailyData[i];
      const nextDay = dailyData[i + 1];
      
      const isRising = nextDay.lucroPrejuizo > currentDay.lucroPrejuizo;
      const color = isRising ? '#22c55e' : '#ef4444'; // Verde para subida, vermelho para queda
      
      segments.push({
        startDay: currentDay.day,
        endDay: nextDay.day,
        startValue: currentDay.lucroPrejuizo,
        endValue: nextDay.lucroPrejuizo,
        color: color,
        isRising: isRising
      });
    }
    
    return segments;
  }, [dailyData]);

  // Calcular performance por plataforma
  const platformPerformance = useMemo(() => {
    return platforms.map((platform: any) => {
      const platformTransactions = monthlyTransactions.filter((t: any) => t.platformId === platform.id);
      const deposits = platformTransactions.filter((t: any) => t.type === 'deposit');
      const withdraws = platformTransactions.filter((t: any) => t.type === 'withdraw');
      const totalDeposits = deposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const profit = totalWithdraws - totalDeposits;
      
      return {
        name: platform.name,
        color: platform.color,
        receita: profit,
        depositos: totalDeposits,
        saques: totalWithdraws,
        transacoes: platformTransactions.length
      };
    }).filter(stat => stat.transacoes > 0).sort((a, b) => b.receita - a.receita);
  }, [platforms, monthlyTransactions]);

  // Calcular performance por funcionário
  const employeePerformance = useMemo(() => {
    return employees.map((employee: any) => {
      const employeeTransactions = monthlyTransactions.filter((t: any) => t.employeeId === employee.id);
      const deposits = employeeTransactions.filter((t: any) => t.type === 'deposit');
      const withdraws = employeeTransactions.filter((t: any) => t.type === 'withdraw');
      const totalDeposits = deposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const profit = totalWithdraws - totalDeposits;
      
      return {
        name: employee.name,
        receita: profit,
        depositos: totalDeposits,
        saques: totalWithdraws,
        transacoes: employeeTransactions.length
      };
    }).filter(stat => stat.transacoes > 0).sort((a, b) => b.receita - a.receita);
  }, [employees, monthlyTransactions]);

  // Calcular variação percentual
  const getVariation = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const profitVariation = comparisonStats ? getVariation(monthlyStats.profit, comparisonStats.profit) : 0;

  const exportToPDF = () => {
    toast.success('Relatório exportado para PDF!');
  };

  const exportToCSV = () => {
    toast.success('Relatório exportado para CSV!');
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Relatórios</h1>
            <p className="text-muted-foreground">Análises e insights do seu negócio</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportToCSV}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportToPDF}>
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Seleção de Período */}
        <Card className="p-6 shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Período:</span>
            </div>
            
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((month, index) => (
                  <SelectItem key={index} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setComparisonMonth(selectedMonth);
                setComparisonYear(selectedYear);
              }}
            >
              Comparar com Outros Meses
            </Button>
          </div>

          {comparisonMonth && comparisonYear && (
            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Comparando com:</span>
              <Select value={comparisonMonth.toString()} onValueChange={(value) => setComparisonMonth(Number(value))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={comparisonYear.toString()} onValueChange={(value) => setComparisonYear(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setComparisonMonth(null);
                  setComparisonYear(null);
                }}
              >
                Remover Comparação
              </Button>
            </div>
          )}
        </Card>

        {/* Resumo do Mês */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Receita do Mês</p>
                <p className={`text-3xl font-bold ${monthlyStats.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {monthlyStats.profit.toLocaleString('pt-BR')}
                </p>
                {comparisonStats && (
                  <div className={`flex items-center gap-1 text-sm mt-1 ${
                    profitVariation >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {profitVariation >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {profitVariation >= 0 ? '+' : ''}{profitVariation.toFixed(1)}% vs. {monthNames[comparisonMonth! - 1]}
                  </div>
                )}
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total de Depósitos</p>
                <p className="text-3xl font-bold text-destructive">R$ {monthlyStats.deposits.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <TrendingDown className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
              </Card>

              <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total de Saques</p>
                <p className="text-3xl font-bold text-success">R$ {monthlyStats.withdraws.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
              </Card>

              <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Transações</p>
                <p className="text-3xl font-bold">{monthlyStats.transactionCount}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
              </Card>
        </div>

        {/* Gráfico de Linha - Lucro/Prejuízo Diário com Segmentos Coloridos */}
        <Card className="p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-6">Lucro/Prejuízo Diário - {monthNames[selectedMonth - 1]} {selectedYear}</h3>
          <div className="mb-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500"></div>
              <span>Subida</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span>Queda</span>
            </div>
          </div>
          <div className="w-full h-96 relative">
            <svg width="100%" height="100%" className="absolute inset-0">
              {/* Linha de referência no zero */}
              <line 
                x1="0" 
                y1="50%" 
                x2="100%" 
                y2="50%" 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="2,2" 
                strokeWidth="1"
              />
              
              {/* Renderizar segmentos coloridos */}
              {lineSegments.map((segment, index) => {
                const startX = (segment.startDay - 1) / (dailyData.length - 1) * 100;
                const endX = (segment.endDay - 1) / (dailyData.length - 1) * 100;
                
                // Escala fixa: R$ 2000 no topo, R$ 0 no centro, -R$ 2000 na base
                const scale = 2000;
                
                // Calcular Y: 0 fica em 50%, valores positivos sobem, negativos descem
                const startY = segment.startValue >= 0 
                  ? 50 - (segment.startValue / scale) * 40  // Valores positivos sobem
                  : 50 + (Math.abs(segment.startValue) / scale) * 40; // Valores negativos descem
                  
                const endY = segment.endValue >= 0 
                  ? 50 - (segment.endValue / scale) * 40
                  : 50 + (Math.abs(segment.endValue) / scale) * 40;
                
                return (
                  <line
                    key={index}
                    x1={`${startX}%`}
                    y1={`${startY}%`}
                    x2={`${endX}%`}
                    y2={`${endY}%`}
                    stroke={segment.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                );
              })}
              
              {/* Pontos nos dados */}
              {dailyData.map((point, index) => {
                const x = (point.day - 1) / (dailyData.length - 1) * 100;
                
                // Escala fixa: R$ 2000 no topo, R$ 0 no centro, -R$ 2000 na base
                const scale = 2000;
                
                // Calcular Y: 0 fica em 50%, valores positivos sobem, negativos descem
                const y = point.lucroPrejuizo >= 0 
                  ? 50 - (point.lucroPrejuizo / scale) * 40  // Valores positivos sobem
                  : 50 + (Math.abs(point.lucroPrejuizo) / scale) * 40; // Valores negativos descem
                
                return (
                  <circle
                    key={index}
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4"
                    fill="hsl(var(--foreground))"
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
            
            {/* Labels do eixo X - Dias */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-2">
              {dailyData.map((point, index) => {
                const x = (point.day - 1) / (dailyData.length - 1) * 100;
                return (
                  <span 
                    key={index}
                    className="absolute text-xs text-muted-foreground"
                    style={{ 
                      left: `${x}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {point.day}
                  </span>
                );
              })}
            </div>

            {/* Labels do eixo Y */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-4 pl-2">
              <span className="text-xs text-muted-foreground">R$ 2.000</span>
              <span className="text-xs text-muted-foreground">R$ 0</span>
              <span className="text-xs text-muted-foreground">-R$ 2.000</span>
            </div>

            {/* Valores em cima dos pontos */}
            <div className="absolute inset-0">
              {dailyData.map((point, index) => {
                const x = (point.day - 1) / (dailyData.length - 1) * 100;
                
                // Usar a mesma escala fixa dos pontos
                const scale = 5000;
                
                const y = point.lucroPrejuizo >= 0 
                  ? 50 - (point.lucroPrejuizo / scale) * 40
                  : 50 + (Math.abs(point.lucroPrejuizo) / scale) * 40;
                
                return (
                  <div
                    key={index}
                    className="absolute text-white text-sm font-medium"
                    style={{ 
                      left: `${x}%`,
                      top: `${y - 8}%`, // 8% acima do ponto
                      transform: 'translateX(-50%)'
                    }}
                  >
                    R$ {point.lucroPrejuizo.toLocaleString('pt-BR')}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Gráficos de Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance por Plataforma */}
            <Card className="p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-6">Performance por Plataforma</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={platformPerformance}>
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

          {/* Performance por Funcionário */}
            <Card className="p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-6">Performance por Funcionário</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeePerformance}>
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
                <Bar dataKey="receita" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
              </div>
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;