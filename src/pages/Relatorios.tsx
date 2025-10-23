import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProtectedPageContent } from '@/components/ProtectedPageContent';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Download, TrendingUp, TrendingDown, Calendar, FileText, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees, useTransactions, usePlatforms, useAllDailySummaries } from '@/hooks/useFirestore';
import { toast } from 'sonner';
import { getCurrentDateStringInSaoPaulo, getCurrentDateInSaoPaulo } from '@/utils/timezone';

const Relatorios = () => {
  const { user } = useFirebaseAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonMonth, setComparisonMonth] = useState<number | null>(null);
  const [comparisonYear, setComparisonYear] = useState<number | null>(null);
  const [activeTransactionFilter, setActiveTransactionFilter] = useState<'all' | 'deposits' | 'withdraws' | 'profit'>('all');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');

  // Buscar dados do Firebase
  const { data: employees = [] } = useEmployees(user?.uid || '');
  const { data: platforms = [] } = usePlatforms(user?.uid || '');
  const { data: dailySummaries = [] } = useAllDailySummaries(user?.uid || '');
  
  // Buscar transações do mês atual
  const startOfMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const endOfMonth = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
  const { data: monthlyTransactions = [] } = useTransactions(user?.uid || '', startOfMonth, endOfMonth);


  // Função para filtrar transações
  const getFilteredTransactions = () => {
    let filtered = monthlyTransactions;

    // Filtro por tipo de transação
    if (activeTransactionFilter === 'deposits') {
      filtered = filtered.filter(t => t.type === 'deposit');
    } else if (activeTransactionFilter === 'withdraws') {
      filtered = filtered.filter(t => t.type === 'withdraw');
    }

    // Filtro por funcionário
    if (selectedEmployeeFilter !== 'all') {
      filtered = filtered.filter(t => t.employeeId === selectedEmployeeFilter);
    }

    // Filtro por plataforma
    if (selectedPlatformFilter !== 'all') {
      filtered = filtered.filter(t => t.platformId === selectedPlatformFilter);
    }

    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setActiveTransactionFilter('all');
    setSelectedEmployeeFilter('all');
    setSelectedPlatformFilter('all');
  };

  // Buscar transações para o gráfico semanal
  const today = getCurrentDateStringInSaoPaulo();
  const sevenDaysAgo = new Date(getCurrentDateInSaoPaulo().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: recentTransactions = [], isLoading: recentTransactionsLoading } = useTransactions(user?.uid || '', sevenDaysAgo, today);

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

  // Função para calcular lucro/prejuízo do dia de um funcionário
  const getDayProfitLoss = (employee: any) => {
    const employeeTodayTransactions = monthlyTransactions.filter(
      (t: any) => t.employeeId === employee.id
    );

    const deposits = employeeTodayTransactions
      .filter((t: any) => t.type === 'deposit')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    
    const withdraws = employeeTodayTransactions
      .filter((t: any) => t.type === 'withdraw')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

    return withdraws - deposits;
  };

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

  // Calcular estatísticas do mês atual - CORREÇÃO: Usar mesma lógica do Dashboard
  const monthlyStats = useMemo(() => {
    // Filtrar fechamentos diários do mês atual
    const monthlySummaries = dailySummaries.filter((summary: any) => {
      const summaryDate = new Date(summary.date);
      return summaryDate.getFullYear() === selectedYear && summaryDate.getMonth() === selectedMonth - 1;
    });
    
    // Somar lucros dos fechamentos diários
    const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
      return total + (summary.profit || summary.margin || 0);
    }, 0);
    
    // Filtrar apenas transações que NÃO estão em fechamentos diários
    const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));
    const openTransactions = monthlyTransactions.filter((transaction: any) => {
      return !closedDates.has(transaction.date);
    });
    
    const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
      const transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
      return total + transactionProfit;
    }, 0);
    
    const profit = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
    
    // Calcular depósitos e saques totais para exibição
    const deposits = monthlyTransactions.filter((t: any) => t.type === 'deposit');
    const withdraws = monthlyTransactions.filter((t: any) => t.type === 'withdraw');
    const totalDeposits = deposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    
    console.log('Relatórios - Cálculo Receita Mensal:', {
      selectedYear,
      selectedMonth,
      monthlySummaries: monthlySummaries.length,
      monthlyRevenueFromSummaries,
      monthlyTransactions: monthlyTransactions.length,
      openTransactions: openTransactions.length,
      monthlyRevenueFromTransactions,
      profit
    });
    
    return {
      deposits: totalDeposits,
      withdraws: totalWithdraws,
      profit,
      transactionCount: monthlyTransactions.length
    };
  }, [monthlyTransactions, dailySummaries, selectedYear, selectedMonth]);

  // Calcular estatísticas do mês de comparação - CORREÇÃO: Usar mesma lógica
  const comparisonStats = useMemo(() => {
    if (!comparisonTransactions.length) return null;
    
    // Filtrar fechamentos diários do mês de comparação
    const comparisonSummaries = dailySummaries.filter((summary: any) => {
      const summaryDate = new Date(summary.date);
      return summaryDate.getFullYear() === comparisonYear && summaryDate.getMonth() === (comparisonMonth || 0) - 1;
    });
    
    // Somar lucros dos fechamentos diários
    const comparisonRevenueFromSummaries = comparisonSummaries.reduce((total: number, summary: any) => {
      return total + (summary.profit || summary.margin || 0);
    }, 0);
    
    // Filtrar apenas transações que NÃO estão em fechamentos diários
    const closedDates = new Set(comparisonSummaries.map((summary: any) => summary.date));
    const openComparisonTransactions = comparisonTransactions.filter((transaction: any) => {
      return !closedDates.has(transaction.date);
    });
    
    const comparisonRevenueFromTransactions = openComparisonTransactions.reduce((total: number, transaction: any) => {
      const transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
      return total + transactionProfit;
    }, 0);
    
    const profit = comparisonRevenueFromSummaries + comparisonRevenueFromTransactions;
    
    // Calcular depósitos e saques totais para exibição
    const deposits = comparisonTransactions.filter((t: any) => t.type === 'deposit');
    const withdraws = comparisonTransactions.filter((t: any) => t.type === 'withdraw');
    const totalDeposits = deposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    
    return {
      deposits: totalDeposits,
      withdraws: totalWithdraws,
      profit,
      transactionCount: comparisonTransactions.length
    };
  }, [comparisonTransactions, dailySummaries, comparisonYear, comparisonMonth]);

  // Calcular dados diários do mês - CORREÇÃO: Usar mesma lógica do Dashboard
  const dailyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const dailyStats: any[] = [];
    
    // Filtrar fechamentos diários do mês atual
    const monthlySummaries = dailySummaries.filter((summary: any) => {
      const summaryDate = new Date(summary.date);
      const matches = summaryDate.getFullYear() === selectedYear && summaryDate.getMonth() === selectedMonth - 1;
      console.log(`Fechamento ${summary.date}:`, {
        summaryDate: summaryDate.toISOString(),
        year: summaryDate.getFullYear(),
        month: summaryDate.getMonth(),
        selectedYear,
        selectedMonth: selectedMonth - 1,
        matches
      });
      return matches;
    });
    
    // Criar mapa de fechamentos por data
    const summariesByDate = new Map<string, any>();
    monthlySummaries.forEach((summary: any) => {
      summariesByDate.set(summary.date, summary);
    });
    
    // Criar mapa de transações abertas por data (não fechadas)
    const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));
    const openTransactionsByDate = new Map<string, any[]>();
    
    monthlyTransactions.forEach((transaction: any) => {
      if (!closedDates.has(transaction.date)) {
        if (!openTransactionsByDate.has(transaction.date)) {
          openTransactionsByDate.set(transaction.date, []);
        }
        openTransactionsByDate.get(transaction.date)!.push(transaction);
      }
    });
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let dayProfit = 0;
      let dayDeposits = 0;
      let dayWithdraws = 0;
      let dayTransactions = 0;
      
      // Verificar se há fechamento para este dia
      const summary = summariesByDate.get(dateString);
      if (summary) {
        // Usar dados do fechamento
        dayProfit = summary.profit || summary.margin || 0;
        dayDeposits = summary.totalDeposits || 0;
        dayWithdraws = summary.totalWithdraws || 0;
        dayTransactions = summary.transactionCount || 0;
        console.log(`Dia ${day} (${dateString}): Usando fechamento - Profit: ${dayProfit}`);
      } else {
        // Usar transações abertas
        const dayTransactionsOpen = openTransactionsByDate.get(dateString) || [];
        const deposits = dayTransactionsOpen.filter((t: any) => t.type === 'deposit');
        const withdraws = dayTransactionsOpen.filter((t: any) => t.type === 'withdraw');
        dayDeposits = deposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        dayWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        dayProfit = dayWithdraws - dayDeposits;
        dayTransactions = dayTransactionsOpen.length;
        if (dayProfit !== 0) {
          console.log(`Dia ${day} (${dateString}): Usando transações abertas - Profit: ${dayProfit}`);
        }
      }
      
      dailyStats.push({
        day: day,
        date: dateString,
        lucroPrejuizo: dayProfit,
        depositos: dayDeposits,
        saques: dayWithdraws,
        transacoes: dayTransactions
      });
    }
    
    console.log('Relatórios - DailyData calculado:', {
      selectedYear,
      selectedMonth,
      monthlySummaries: monthlySummaries.length,
      monthlyTransactions: monthlyTransactions.length,
      dailyStats: dailyStats.filter(d => d.lucroPrejuizo !== 0).length
    });
    
    console.log('Relatórios - Fechamentos diários detalhados:', monthlySummaries.map((s: any) => ({
      date: s.date,
      profit: s.profit || s.margin || 0,
      totalDeposits: s.totalDeposits || 0,
      totalWithdraws: s.totalWithdraws || 0
    })));
    
    console.log('Relatórios - Dias com lucro no gráfico:', dailyStats.filter(d => d.lucroPrejuizo !== 0).map(d => ({
      day: d.day,
      date: d.date,
      lucroPrejuizo: d.lucroPrejuizo
    })));
    
    return dailyStats;
  }, [monthlyTransactions, dailySummaries, selectedMonth, selectedYear]);

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

  // Função para exportar dados para CSV
  const exportToCSV = () => {
    try {
      const BOM = '\uFEFF'; // BOM para UTF-8
      let csvContent = BOM;
      
      // Cabeçalho do relatório
      csvContent += '=== Optify - Sistema de Gestão Financeira ===\n';
      csvContent += `Relatório de ${monthNames[selectedMonth - 1]} de ${selectedYear}\n`;
      csvContent += `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n`;
      csvContent += '\n';
      
      // Resumo Executivo
      csvContent += '=== RESUMO EXECUTIVO ===\n';
      csvContent += `Total de Receitas,R$ ${monthlyStats.withdraws.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      csvContent += `Total de Despesas,R$ ${monthlyStats.deposits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      csvContent += `Lucro Líquido,R$ ${monthlyStats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      csvContent += `Total de Transações,${monthlyTransactions.length}\n`;
      csvContent += `Funcionários Ativos,${employees.filter((e: any) => e.status === 'active').length}\n`;
      csvContent += `Plataformas Utilizadas,${platforms.length}\n`;
      csvContent += '\n';
      
      // Análise por Funcionário
      csvContent += '=== ANÁLISE POR FUNCIONÁRIO ===\n';
      csvContent += 'Funcionário,Depósitos,Saques,Lucro,Transações\n';
      
      employees.forEach((emp: any) => {
        const empTransactions = monthlyTransactions.filter((t: any) => t.employeeId === emp.id);
        const deposits = empTransactions.filter((t: any) => t.type === 'deposit').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const withdraws = empTransactions.filter((t: any) => t.type === 'withdraw').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const profit = withdraws - deposits;
        
        csvContent += `"${emp.name}",R$ ${deposits.toLocaleString('pt-BR')},R$ ${withdraws.toLocaleString('pt-BR')},R$ ${profit.toLocaleString('pt-BR')},${empTransactions.length}\n`;
      });
      
      csvContent += '\n';
      
      // Análise por Plataforma
      csvContent += '=== ANÁLISE POR PLATAFORMA ===\n';
      csvContent += 'Plataforma,Depósitos,Saques,Transações\n';
      
      platforms.forEach((plat: any) => {
        const platTransactions = monthlyTransactions.filter((t: any) => t.platformId === plat.id);
        const deposits = platTransactions.filter((t: any) => t.type === 'deposit').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const withdraws = platTransactions.filter((t: any) => t.type === 'withdraw').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        
        csvContent += `"${plat.name}",R$ ${deposits.toLocaleString('pt-BR')},R$ ${withdraws.toLocaleString('pt-BR')},${platTransactions.length}\n`;
      });
      
      csvContent += '\n';
      
      // Transações Detalhadas
      csvContent += '=== TRANSAÇÕES DETALHADAS ===\n';
      csvContent += 'Data,Hora,Tipo,Funcionário,Plataforma,Valor,Saldo Diário\n';
      
      let accumulatedBalance = 0;
      monthlyTransactions.forEach((transaction: any) => {
        const employee = employees.find(emp => emp.id === transaction.employeeId);
        const platform = platforms.find(plat => plat.id === transaction.platformId);
        const amount = Number(transaction.amount || 0);
        
        if (transaction.type === 'withdraw') {
          accumulatedBalance += amount;
        } else {
          accumulatedBalance -= amount;
        }
        
        const date = new Date(transaction.createdAt?.toDate?.() || transaction.createdAt);
        csvContent += `"${date.toLocaleDateString('pt-BR')}","${date.toLocaleTimeString('pt-BR')}","${transaction.type === 'withdraw' ? 'Saque' : 'Depósito'}","${employee?.name || 'N/A'}","${platform?.name || 'N/A'}","R$ ${amount.toLocaleString('pt-BR')}","R$ ${accumulatedBalance.toLocaleString('pt-BR')}"\n`;
      });

      // Criar e baixar arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_optify_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Relatório CSV exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar relatório CSV');
    }
  };

  // Função para exportar dados para PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      
      // Cores personalizadas
      const primaryOrange = [255, 165, 0];
      const darkOrange = [255, 140, 0];
      const darkGray = [45, 45, 45];
      const lightGray = [245, 245, 245];
      const mediumGray = [150, 150, 150];
      const white = [255, 255, 255];
      const green = [34, 197, 94];
      const red = [239, 68, 68];
      
      // ==================== PÁGINA 1: CAPA ====================
      // Fundo gradiente (simulado com retângulos)
      for (let i = 0; i < 40; i++) {
        const opacity = 255 - (i * 6);
        doc.setFillColor(opacity, Math.floor(opacity * 0.65), 0);
        doc.rect(0, i * 7, pageWidth, 7, 'F');
      }
      
      // Logo do diamante (igual ao do site)
      const centerX = pageWidth / 2;
      const centerY = 65;
      const size = 18;
      
      // Cores
      const orange = [255, 140, 0]; // Laranja principal
      const lightOrange = [255, 200, 100]; // Laranja claro para detalhes
      
      // Desenhar o diamante exatamente como no site
      // Estrutura: coroa (trapézio superior) + pavilhão (cone inferior)
      
      // COROA - Parte superior (trapézio)
      const topWidth = size * 2.4;
      const bottomWidth = size * 1.2;
      const crownHeight = size * 1.2;
      const pavilionHeight = size * 2.8;
      
      const topY = centerY - crownHeight - pavilionHeight / 2;
      const crownBottomY = centerY - pavilionHeight / 2;
      const bottomY = centerY + pavilionHeight / 2;
      
      // Preencher coroa com laranja
      doc.setFillColor(...orange);
      doc.setDrawColor(...orange);
      
      // Trapézio da coroa
      const crownPoints = [
        [centerX - topWidth/2, topY],           // Topo esquerdo
        [centerX + topWidth/2, topY],           // Topo direito
        [centerX + bottomWidth/2, crownBottomY], // Base direita
        [centerX - bottomWidth/2, crownBottomY]  // Base esquerda
      ];
      
      // Desenhar coroa usando triângulos
      doc.triangle(
        centerX - topWidth/2, topY,
        centerX + topWidth/2, topY,
        centerX, crownBottomY,
        'F'
      );
      
      // PAVILHÃO - Parte inferior (cone)
      // Faceta esquerda do pavilhão
      doc.triangle(
        centerX - bottomWidth/2, crownBottomY,
        centerX, crownBottomY,
        centerX, bottomY,
        'F'
      );
      
      // Faceta direita do pavilhão
      doc.triangle(
        centerX + bottomWidth/2, crownBottomY,
        centerX, crownBottomY,
        centerX, bottomY,
        'F'
      );
      
      // LINHAS DE CONTORNO BRANCAS
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1.2);
      
      // Contorno da coroa
      doc.line(centerX - topWidth/2, topY, centerX + topWidth/2, topY);
      doc.line(centerX - topWidth/2, topY, centerX - bottomWidth/2, crownBottomY);
      doc.line(centerX + topWidth/2, topY, centerX + bottomWidth/2, crownBottomY);
      
      // Linha horizontal central da coroa
      doc.line(centerX - topWidth/2, topY, centerX + topWidth/2, topY);
      
      // Linha vertical central
      doc.line(centerX, topY, centerX, bottomY);
      
      // Contorno do pavilhão
      doc.line(centerX - bottomWidth/2, crownBottomY, centerX, bottomY);
      doc.line(centerX + bottomWidth/2, crownBottomY, centerX, bottomY);
      doc.line(centerX - bottomWidth/2, crownBottomY, centerX + bottomWidth/2, crownBottomY);
      
      // Título Optify
      doc.setTextColor(...white);
      doc.setFontSize(52);
      doc.setFont('helvetica', 'bold');
      doc.text('Optify', centerX, 120, { align: 'center' });
      
      // Subtítulo
      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      doc.text('Sistema de Gestão de Operações', centerX, 140, { align: 'center' });
      
      // Título do relatório
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(`Relatório Mensal`, centerX, 170, { align: 'center' });
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      doc.text(`${monthNames[selectedMonth - 1]} de ${selectedYear}`, centerX, 185, { align: 'center' });
      
      // Informações adicionais
      doc.setFontSize(10);
      doc.setTextColor(...mediumGray);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, centerX, 250, { align: 'center' });
      doc.text(`Total de Transações: ${monthlyTransactions.length}`, centerX, 260, { align: 'center' });
      
      // Rodapé da capa
      doc.setFontSize(8);
      doc.text('Relatório Confidencial', centerX, pageHeight - 10, { align: 'center' });
      
      // ==================== PÁGINA 2: RESUMO EXECUTIVO ====================
      doc.addPage();
      let yPos = 20;
      
      // Header da página
      doc.setFillColor(...primaryOrange);
      doc.rect(0, 0, pageWidth, 15, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Optify', margin, 10);
      doc.text(`Relatório de ${monthNames[selectedMonth - 1]} ${selectedYear}`, pageWidth - margin, 10, { align: 'right' });
      
      yPos = 35;
      
      // Título da seção
      doc.setTextColor(...darkGray);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Executivo', margin, yPos);
      
      yPos += 15;
      
      // Cards de resumo
      const cardWidth = (pageWidth - 3 * margin) / 2;
      const cardHeight = 35;
      
      // Card 1: Receitas
      doc.setFillColor(...lightGray);
      doc.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, 'F');
      doc.setDrawColor(...green);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, 'S');
      
      doc.setTextColor(...mediumGray);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Total de Receitas', margin + 5, yPos + 10);
      
      doc.setTextColor(...green);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${monthlyStats.withdraws.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 5, yPos + 25);
      
      // Card 2: Despesas
      doc.setFillColor(...lightGray);
      doc.roundedRect(margin + cardWidth + margin, yPos, cardWidth, cardHeight, 3, 3, 'F');
      doc.setDrawColor(...red);
      doc.roundedRect(margin + cardWidth + margin, yPos, cardWidth, cardHeight, 3, 3, 'S');
      
      doc.setTextColor(...mediumGray);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Total de Despesas', margin + cardWidth + margin + 5, yPos + 10);
      
      doc.setTextColor(...red);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${monthlyStats.deposits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + cardWidth + margin + 5, yPos + 25);
      
      yPos += cardHeight + 10;
      
      // Card 3: Lucro (largura completa)
      const profitColor = monthlyStats.profit >= 0 ? green : red;
      doc.setFillColor(...lightGray);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, cardHeight, 3, 3, 'F');
      doc.setDrawColor(...profitColor);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, cardHeight, 3, 3, 'S');
      
      doc.setTextColor(...mediumGray);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Lucro Líquido do Período', margin + 5, yPos + 12);
      
      doc.setTextColor(...profitColor);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      const profitText = `${monthlyStats.profit >= 0 ? '+' : ''}R$ ${Math.abs(monthlyStats.profit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      doc.text(profitText, margin + 5, yPos + 28);
      
      yPos += cardHeight + 20;
      
      // Estatísticas adicionais
      doc.setFillColor(...darkGray);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 0.5, 'F');
      yPos += 10;
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Métricas do Período', margin, yPos);
      
      yPos += 12;
      
      const metrics = [
        { label: 'Total de Transações', value: monthlyTransactions.length.toString() },
        { label: 'Funcionários Ativos', value: employees.filter((e: any) => e.status === 'active').length.toString() },
        { label: 'Plataformas Utilizadas', value: platforms.length.toString() },
        { label: 'Ticket Médio', value: `R$ ${(monthlyStats.withdraws / monthlyTransactions.filter((t: any) => t.type === 'withdraw').length || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }
      ];
      
      const metricBoxWidth = (pageWidth - 5 * margin) / 2;
      let metricX = margin;
      let metricY = yPos;
      
      metrics.forEach((metric, index) => {
        if (index === 2) {
          metricX = margin;
          metricY += 25;
        }
        
        doc.setFillColor(...lightGray);
        doc.roundedRect(metricX, metricY, metricBoxWidth, 20, 2, 2, 'F');
        
        doc.setTextColor(...mediumGray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(metric.label, metricX + 5, metricY + 8);
        
        doc.setTextColor(...darkGray);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(metric.value, metricX + 5, metricY + 16);
        
        metricX += metricBoxWidth + margin;
      });
      
      // ==================== PÁGINA 3: ANÁLISE POR FUNCIONÁRIO ====================
      doc.addPage();
      yPos = 20;
      
      // Header da página
      doc.setFillColor(...primaryOrange);
      doc.rect(0, 0, pageWidth, 15, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Optify', margin, 10);
      doc.text(`Relatório de ${monthNames[selectedMonth - 1]} ${selectedYear}`, pageWidth - margin, 10, { align: 'right' });
      
      yPos = 35;
      
      // Título da seção
      doc.setTextColor(...darkGray);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Análise por Funcionário', margin, yPos);
      
      yPos += 15;
      
      // Tabela de análise por funcionário
      employees.forEach((emp: any, index: number) => {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          doc.setFillColor(...primaryOrange);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setTextColor(...white);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Optify', margin, 10);
          doc.text(`Relatório de ${monthNames[selectedMonth - 1]} ${selectedYear}`, pageWidth - margin, 10, { align: 'right' });
          yPos = 30;
        }
        
        const empTransactions = monthlyTransactions.filter((t: any) => t.employeeId === emp.id);
        const deposits = empTransactions.filter((t: any) => t.type === 'deposit').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const withdraws = empTransactions.filter((t: any) => t.type === 'withdraw').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const profit = withdraws - deposits;
        
        // Card do funcionário
        doc.setFillColor(...lightGray);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 40, 3, 3, 'F');
        
        // Nome do funcionário
        doc.setTextColor(...darkGray);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(emp.name || 'N/A', margin + 5, yPos + 10);
        
        // Status
        const statusColor = emp.status === 'active' ? green : red;
        doc.setFillColor(...statusColor);
        doc.circle(margin + 5, yPos + 15, 2, 'F');
        doc.setTextColor(...statusColor);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(emp.status === 'active' ? 'Ativo' : 'Inativo', margin + 10, yPos + 16);
        
        // Métricas
        doc.setTextColor(...mediumGray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Depósitos:', margin + 5, yPos + 25);
        doc.text('Saques:', margin + 55, yPos + 25);
        doc.text('Lucro:', margin + 100, yPos + 25);
        doc.text('Transações:', margin + 140, yPos + 25);
        
        doc.setTextColor(...darkGray);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${deposits.toLocaleString('pt-BR')}`, margin + 5, yPos + 33);
        doc.text(`R$ ${withdraws.toLocaleString('pt-BR')}`, margin + 55, yPos + 33);
        
        const profitColor = profit >= 0 ? green : red;
        doc.setTextColor(...profitColor);
        doc.text(`R$ ${profit.toLocaleString('pt-BR')}`, margin + 100, yPos + 33);
        
        doc.setTextColor(...darkGray);
        doc.text(empTransactions.length.toString(), margin + 140, yPos + 33);
        
        yPos += 45;
      });
      
      // ==================== PÁGINA 4: ANÁLISE POR PLATAFORMA ====================
      doc.addPage();
      yPos = 20;
      
      // Header da página
      doc.setFillColor(...primaryOrange);
      doc.rect(0, 0, pageWidth, 15, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Optify', margin, 10);
      doc.text(`Relatório de ${monthNames[selectedMonth - 1]} ${selectedYear}`, pageWidth - margin, 10, { align: 'right' });
      
      yPos = 35;
      
      // Título da seção
      doc.setTextColor(...darkGray);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Análise por Plataforma', margin, yPos);
      
      yPos += 15;
      
      // Gráfico de barras simplificado
      platforms.forEach((plat: any) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          doc.setFillColor(...primaryOrange);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setTextColor(...white);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Optify', margin, 10);
          doc.text(`Relatório de ${monthNames[selectedMonth - 1]} ${selectedYear}`, pageWidth - margin, 10, { align: 'right' });
          yPos = 30;
        }
        
        const platTransactions = monthlyTransactions.filter((t: any) => t.platformId === plat.id);
        const deposits = platTransactions.filter((t: any) => t.type === 'deposit').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const withdraws = platTransactions.filter((t: any) => t.type === 'withdraw').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const total = deposits + withdraws;
        
        // Nome da plataforma
        doc.setTextColor(...darkGray);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(plat.name || 'N/A', margin, yPos);
        
        // Barra de progresso
        const maxBarWidth = pageWidth - 4 * margin;
        const depositWidth = (deposits / (monthlyStats.deposits || 1)) * maxBarWidth;
        const withdrawWidth = (withdraws / (monthlyStats.withdraws || 1)) * maxBarWidth;
        
        doc.setFillColor(...red);
        doc.rect(margin, yPos + 5, depositWidth, 6, 'F');
        doc.setTextColor(...red);
        doc.setFontSize(8);
        doc.text(`D: R$ ${deposits.toLocaleString('pt-BR')}`, margin, yPos + 15);
        
        doc.setFillColor(...green);
        doc.rect(margin, yPos + 12, withdrawWidth, 6, 'F');
        doc.setTextColor(...green);
        doc.text(`S: R$ ${withdraws.toLocaleString('pt-BR')}`, margin, yPos + 22);
        
        doc.setTextColor(...darkGray);
        doc.setFontSize(8);
        doc.text(`${platTransactions.length} transações`, pageWidth - margin - 30, yPos + 15);
        
        yPos += 30;
      });
      
      // ==================== PÁGINA 5: EVOLUÇÃO DIÁRIA ====================
      doc.addPage();
      yPos = 20;
      
      // Header da página
      doc.setFillColor(...primaryOrange);
      doc.rect(0, 0, pageWidth, 15, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Optify', margin, 10);
      doc.text(`Relatório de ${monthNames[selectedMonth - 1]} ${selectedYear}`, pageWidth - margin, 10, { align: 'right' });
      
      yPos = 35;
      
      // Título da seção
      doc.setTextColor(...darkGray);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Evolução Diária do Lucro', margin, yPos);
      
      yPos += 15;
      
      // Preparar dados diários
      const dailyData: { [key: string]: { deposits: number, withdraws: number, profit: number } } = {};
      
      monthlyTransactions.forEach((t: any) => {
        const date = new Date(t.createdAt?.toDate?.() || t.createdAt).toLocaleDateString('pt-BR');
        if (!dailyData[date]) {
          dailyData[date] = { deposits: 0, withdraws: 0, profit: 0 };
        }
        const amount = Number(t.amount || 0);
        if (t.type === 'deposit') {
          dailyData[date].deposits += amount;
        } else {
          dailyData[date].withdraws += amount;
        }
        dailyData[date].profit = dailyData[date].withdraws - dailyData[date].deposits;
      });
      
      const sortedDates = Object.keys(dailyData).sort((a, b) => {
        const [dA, mA, yA] = a.split('/').map(Number);
        const [dB, mB, yB] = b.split('/').map(Number);
        return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
      });
      
      // Desenhar gráfico de linha simples
      const graphHeight = 80;
      const graphWidth = pageWidth - 2 * margin;
      const graphX = margin;
      const graphY = yPos;
      
      // Fundo do gráfico
      doc.setFillColor(...lightGray);
      doc.rect(graphX, graphY, graphWidth, graphHeight, 'F');
      
      // Eixos
      doc.setDrawColor(...mediumGray);
      doc.setLineWidth(0.3);
      doc.line(graphX, graphY + graphHeight, graphX + graphWidth, graphY + graphHeight); // Eixo X
      doc.line(graphX, graphY, graphX, graphY + graphHeight); // Eixo Y
      
      // Encontrar valores máximo e mínimo
      const profits = sortedDates.map(date => dailyData[date].profit);
      const maxProfit = Math.max(...profits, 0);
      const minProfit = Math.min(...profits, 0);
      const range = maxProfit - minProfit || 1;
      
      // Desenhar linha zero
      const zeroY = graphY + graphHeight - ((0 - minProfit) / range) * graphHeight;
      doc.setDrawColor(...darkGray);
      doc.setLineWidth(0.5);
      doc.setLineDash([2, 2]);
      doc.line(graphX, zeroY, graphX + graphWidth, zeroY);
      doc.setLineDash([]);
      
      // Desenhar pontos e linha
      const pointSpacing = sortedDates.length > 1 ? graphWidth / (sortedDates.length - 1) : 0;
      
      sortedDates.forEach((date, index) => {
        const profit = dailyData[date].profit;
        const x = graphX + (index * pointSpacing);
        const y = graphY + graphHeight - ((profit - minProfit) / range) * graphHeight;
        
        // Linha
        if (index > 0) {
          const prevProfit = dailyData[sortedDates[index - 1]].profit;
          const prevY = graphY + graphHeight - ((prevProfit - minProfit) / range) * graphHeight;
          const prevX = graphX + ((index - 1) * pointSpacing);
          
          doc.setDrawColor(...primaryOrange);
          doc.setLineWidth(1);
          doc.line(prevX, prevY, x, y);
        }
        
        // Ponto
        doc.setFillColor(...primaryOrange);
        doc.circle(x, y, 1.5, 'F');
      });
      
      // Legendas
      doc.setTextColor(...mediumGray);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Máx: R$ ${maxProfit.toLocaleString('pt-BR')}`, graphX, graphY - 2);
      doc.text(`Mín: R$ ${minProfit.toLocaleString('pt-BR')}`, graphX, graphY + graphHeight + 8);
      
      yPos += graphHeight + 20;
      
      // Tabela de resumo diário
      doc.setTextColor(...darkGray);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Diário (últimos 10 dias)', margin, yPos);
      
      yPos += 10;
      
      // Cabeçalho da tabela
      doc.setFillColor(...darkGray);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Data', margin + 3, yPos + 5);
      doc.text('Depósitos', margin + 35, yPos + 5);
      doc.text('Saques', margin + 75, yPos + 5);
      doc.text('Lucro', margin + 115, yPos + 5);
      
      yPos += 8;
      
      // Últimos 10 dias
      sortedDates.slice(-10).forEach((date, index) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          doc.setFillColor(...primaryOrange);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setTextColor(...white);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Optify', margin, 10);
          doc.text(`Relatório de ${monthNames[selectedMonth - 1]} ${selectedYear}`, pageWidth - margin, 10, { align: 'right' });
          yPos = 25;
        }
        
        const data = dailyData[date];
        
        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
        }
        
        doc.setTextColor(...darkGray);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(date, margin + 3, yPos + 5);
        doc.text(`R$ ${data.deposits.toLocaleString('pt-BR')}`, margin + 35, yPos + 5);
        doc.text(`R$ ${data.withdraws.toLocaleString('pt-BR')}`, margin + 75, yPos + 5);
        
        const profitColor = data.profit >= 0 ? green : red;
        doc.setTextColor(...profitColor);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${data.profit.toLocaleString('pt-BR')}`, margin + 115, yPos + 5);
        
        yPos += 7;
      });
      
      // ==================== PÁGINA 6: TRANSAÇÕES DETALHADAS ====================
      doc.addPage();
      yPos = 20;
      
      // Header da página
      doc.setFillColor(...primaryOrange);
      doc.rect(0, 0, pageWidth, 15, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Optify', margin, 10);
      doc.text(`Relatório de ${monthNames[selectedMonth - 1]} ${selectedYear}`, pageWidth - margin, 10, { align: 'right' });
      
      yPos = 35;
      
      // Título da seção
      doc.setTextColor(...darkGray);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Transações Detalhadas', margin, yPos);
      
      yPos += 10;
      
      // Cabeçalho da tabela
      doc.setFillColor(...darkGray);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
      
      doc.setTextColor(...white);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Data', margin + 3, yPos + 7);
      doc.text('Tipo', margin + 25, yPos + 7);
      doc.text('Funcionário', margin + 50, yPos + 7);
      doc.text('Plataforma', margin + 95, yPos + 7);
      doc.text('Valor', margin + 135, yPos + 7, { align: 'right' });
      
      yPos += 10;
      
      // Linhas da tabela
      monthlyTransactions.slice(0, 30).forEach((transaction: any, index: number) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          // Repetir header
          doc.setFillColor(...primaryOrange);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setTextColor(...white);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Optify', margin, 10);
          doc.text(`Relatório de ${monthNames[selectedMonth - 1]} ${selectedYear}`, pageWidth - margin, 10, { align: 'right' });
          
          yPos = 25;
          
          // Repetir cabeçalho da tabela
          doc.setFillColor(...darkGray);
          doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
          doc.setTextColor(...white);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Data', margin + 3, yPos + 7);
          doc.text('Tipo', margin + 25, yPos + 7);
          doc.text('Funcionário', margin + 50, yPos + 7);
          doc.text('Plataforma', margin + 95, yPos + 7);
          doc.text('Valor', margin + 135, yPos + 7, { align: 'right' });
          yPos += 10;
        }
        
        const employee = employees.find((emp: any) => emp.id === transaction.employeeId);
        const platform = platforms.find((plat: any) => plat.id === transaction.platformId);
        
        // Linha alternada
        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
        }
        
        doc.setTextColor(...darkGray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        const date = new Date(transaction.createdAt?.toDate?.() || transaction.createdAt);
        doc.text(date.toLocaleDateString('pt-BR'), margin + 3, yPos + 5);
        
        // Tipo com cor
        const typeColor = transaction.type === 'withdraw' ? green : red;
        doc.setTextColor(...typeColor);
        doc.setFont('helvetica', 'bold');
        doc.text(transaction.type === 'withdraw' ? 'Saque' : 'Depósito', margin + 25, yPos + 5);
        
        doc.setTextColor(...darkGray);
        doc.setFont('helvetica', 'normal');
        doc.text((employee?.name || 'N/A').substring(0, 20), margin + 50, yPos + 5);
        doc.text((platform?.name || 'N/A').substring(0, 18), margin + 95, yPos + 5);
        
        // Valor com cor
        doc.setTextColor(...typeColor);
        doc.setFont('helvetica', 'bold');
        const valueText = `${transaction.type === 'withdraw' ? '+' : '-'}R$ ${Number(transaction.amount || 0).toLocaleString('pt-BR')}`;
        doc.text(valueText, margin + 135, yPos + 5, { align: 'right' });
        
        yPos += 8;
      });
      
      // Rodapé
      doc.setFillColor(...darkGray);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, margin, pageHeight - 8);
      doc.text('Optify - Sistema de Gestão Financeira', pageWidth - margin, pageHeight - 8, { align: 'right' });
      
      // Salvar PDF
      doc.save(`relatorio_optify_${monthNames[selectedMonth - 1]}_${selectedYear}.pdf`);
      
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar relatório PDF');
    }
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <DashboardLayout>
      <ProtectedPageContent 
        requiredFeature="reports" 
        featureName="Relatórios Avançados"
        requiredPlan="Standard"
      >
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Relatórios</h1>
              <p className="text-muted-foreground">Análises e insights do seu negócio</p>
            </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:shadow-lg"
              onClick={exportToCSV}
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:shadow-lg"
              onClick={exportToPDF}
            >
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
              <Card className="p-6 shadow-card hover:shadow-glow transition-all duration-300">
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

          <Card className="p-6 shadow-card hover:shadow-glow transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total de Depósitos</p>
                <p className="text-3xl font-bold text-success">R$ {monthlyStats.deposits.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <TrendingDown className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
              </Card>

              <Card className="p-6 shadow-card hover:shadow-glow transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total de Saques</p>
                <p className="text-3xl font-bold text-destructive">R$ {monthlyStats.withdraws.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
              </Card>

              <Card className="p-6 shadow-card hover:shadow-glow transition-all duration-300">
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
                
                // Escala dinâmica baseada nos valores reais dos dados
                const allValues = dailyData.map(d => d.lucroPrejuizo);
                const maxValue = Math.max(...allValues, 0);
                const minValue = Math.min(...allValues, 0);
                const maxAbs = Math.max(Math.abs(maxValue), Math.abs(minValue));
                const scale = maxAbs > 0 ? maxAbs * 1.2 : 1000; // 20% de margem, mínimo 1000
                
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
                
                // Escala dinâmica baseada nos valores reais dos dados
                const allValues = dailyData.map(d => d.lucroPrejuizo);
                const maxValue = Math.max(...allValues, 0);
                const minValue = Math.min(...allValues, 0);
                const maxAbs = Math.max(Math.abs(maxValue), Math.abs(minValue));
                const scale = maxAbs > 0 ? maxAbs * 1.2 : 1000; // 20% de margem, mínimo 1000
                
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

            {/* Labels do eixo Y - Dinâmicos */}
            {(() => {
              const allValues = dailyData.map(d => d.lucroPrejuizo);
              const maxValue = Math.max(...allValues, 0);
              const minValue = Math.min(...allValues, 0);
              const maxAbs = Math.max(Math.abs(maxValue), Math.abs(minValue));
              const scale = maxAbs > 0 ? maxAbs * 1.2 : 1000;
              
              return (
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-4 pl-2">
                  <span className="text-xs text-muted-foreground">R$ {scale.toLocaleString('pt-BR')}</span>
                  <span className="text-xs text-muted-foreground">R$ 0</span>
                  <span className="text-xs text-muted-foreground">-R$ {scale.toLocaleString('pt-BR')}</span>
                </div>
              );
            })()}

            {/* Valores em cima dos pontos */}
            <div className="absolute inset-0">
              {dailyData.map((point, index) => {
                const x = (point.day - 1) / (dailyData.length - 1) * 100;
                
                // Usar a mesma escala dinâmica dos pontos
                const allValues = dailyData.map(d => d.lucroPrejuizo);
                const maxValue = Math.max(...allValues, 0);
                const minValue = Math.min(...allValues, 0);
                const maxAbs = Math.max(Math.abs(maxValue), Math.abs(minValue));
                const scale = maxAbs > 0 ? maxAbs * 1.2 : 1000; // 20% de margem, mínimo 1000
                
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


      {/* Gráfico Semanal */}
      <Card className="p-6 shadow-card hover:shadow-glow transition-all duration-300 mt-8" id="weekly-chart-section">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Resumo Semanal</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <span>Receitas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
              <span>Despesas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span>Lucro Acumulado</span>
            </div>
          </div>
        </div>
        {recentTransactionsLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        ) : chartData.some(day => day.receita > 0 || day.despesa > 0) ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: any, name: string) => [
                `R$ ${Number(value).toLocaleString('pt-BR')}`, 
                name === 'receita' ? 'Receitas' : 
                name === 'despesa' ? 'Despesas' : 
                'Lucro Acumulado'
              ]}
              labelFormatter={(label, payload) => {
                const data = payload?.[0]?.payload;
                return data ? `${label} - ${data.date}` : label;
              }}
            />
            <Bar 
              dataKey="receita" 
              fill="hsl(var(--success))" 
              radius={[4, 4, 0, 0]} 
              name="receita"
            />
            <Bar 
              dataKey="despesa" 
              fill="hsl(var(--destructive))" 
              radius={[4, 4, 0, 0]} 
              name="despesa"
            />
            <Bar 
              dataKey="lucroAcumulado" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]} 
              name="lucroAcumulado"
            />
          </BarChart>
        </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma transação esta semana</p>
              <p className="text-sm">Os dados aparecerão aqui quando você registrar transações</p>
            </div>
          </div>
        )}
        
        {/* Estatísticas do período */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Receitas</p>
              <p className="text-lg font-semibold text-destructive">
                R$ {chartData.reduce((sum, day) => sum + day.receita, 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Despesas</p>
              <p className="text-lg font-semibold text-success">
                R$ {chartData.reduce((sum, day) => sum + day.despesa, 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Lucro Acumulado</p>
              <p className={`text-lg font-semibold ${
                chartData.length > 0 && chartData[chartData.length - 1].lucroAcumulado >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                R$ {chartData.length > 0 ? chartData[chartData.length - 1].lucroAcumulado.toLocaleString('pt-BR') : '0'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Transações do Mês */}
      <Card className="p-6 shadow-card hover:shadow-glow transition-all duration-300 mt-8" id="transactions-section">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Transações do Mês</h3>
          <div className="flex items-center gap-2">
            <Badge 
              variant={activeTransactionFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveTransactionFilter('all')}
            >
              Todas ({monthlyTransactions.length})
            </Badge>
            <Badge 
              variant={activeTransactionFilter === 'deposits' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveTransactionFilter('deposits')}
            >
              Depósitos ({monthlyTransactions.filter(t => t.type === 'deposit').length})
            </Badge>
            <Badge 
              variant={activeTransactionFilter === 'withdraws' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveTransactionFilter('withdraws')}
            >
              Saques ({monthlyTransactions.filter(t => t.type === 'withdraw').length})
            </Badge>
          </div>
        </div>

        {/* Filtros por Funcionário e Plataforma */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Funcionário:</label>
            <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos os funcionários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os funcionários</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Plataforma:</label>
            <Select value={selectedPlatformFilter} onValueChange={setSelectedPlatformFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas as plataformas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as plataformas</SelectItem>
                {platforms.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(selectedEmployeeFilter !== 'all' || selectedPlatformFilter !== 'all' || activeTransactionFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="ml-auto"
            >
              Limpar Filtros
            </Button>
          )}
        </div>

        {/* Indicador de filtros ativos */}
        {(selectedEmployeeFilter !== 'all' || selectedPlatformFilter !== 'all' || activeTransactionFilter !== 'all') && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-primary">Filtros ativos:</span>
              {activeTransactionFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {activeTransactionFilter === 'deposits' ? 'Depósitos' : 
                   activeTransactionFilter === 'withdraws' ? 'Saques' : activeTransactionFilter}
                </Badge>
              )}
              {selectedEmployeeFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Funcionário: {employees.find(e => e.id === selectedEmployeeFilter)?.name}
                </Badge>
              )}
              {selectedPlatformFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Plataforma: {platforms.find(p => p.id === selectedPlatformFilter)?.name}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {(() => {
            return filteredTransactions.length > 0 ? (
              filteredTransactions
                .sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt).getTime() - new Date(a.createdAt?.toDate?.() || a.createdAt).getTime())
                .map((transaction) => {
                  const employee = employees.find(emp => emp.id === transaction.employeeId);
                  
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          transaction.type === 'withdraw' ? 'bg-success/10' : 'bg-destructive/10'
                        }`}>
                          {transaction.type === 'withdraw' ? (
                            <ArrowDownCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <ArrowUpCircle className="h-5 w-5 text-success" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{employee?.name || 'Funcionário não encontrado'}</p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.type === 'withdraw' ? 'Saque' : 'Depósito'} • {(() => {
                              const platform = platforms.find(p => p.id === transaction.platformId);
                              return platform?.name || 'Plataforma não especificada';
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.type === 'withdraw' ? 'text-destructive' : 'text-success'
                        }`}>
                          {transaction.type === 'withdraw' ? '+' : '-'}R$ {Number(transaction.amount || 0).toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.createdAt?.toDate?.() || transaction.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma transação encontrada</p>
                <p className="text-sm">
                  {(() => {
                    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    
                    if (activeTransactionFilter === 'all' && selectedEmployeeFilter === 'all' && selectedPlatformFilter === 'all') {
                      return `Não há transações em ${monthName}`;
                    }
                    
                    const filters = [];
                    if (activeTransactionFilter !== 'all') {
                      filters.push(`tipo "${activeTransactionFilter === 'deposits' ? 'Depósitos' : 'Saques'}"`);
                    }
                    if (selectedEmployeeFilter !== 'all') {
                      const employeeName = employees.find(e => e.id === selectedEmployeeFilter)?.name;
                      filters.push(`funcionário "${employeeName}"`);
                    }
                    if (selectedPlatformFilter !== 'all') {
                      const platformName = platforms.find(p => p.id === selectedPlatformFilter)?.name;
                      filters.push(`plataforma "${platformName}"`);
                    }
                    
                    return `Não há transações com ${filters.join(' e ')} em ${monthName}`;
                  })()}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="mt-4"
                >
                  Limpar Filtros
                </Button>
              </div>
            );
          })()}
        </div>
      </Card>
      </div>
      </ProtectedPageContent>
    </DashboardLayout>
  );
};

export default Relatorios;