import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useTransactions, useAllDailySummaries } from '@/hooks/useFirestore';
import { getCurrentDateInSaoPaulo, formatDateInSaoPaulo } from '@/utils/timezone';
import { usePlanLimitations } from '@/hooks/usePlanLimitations';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DayTransactionsModal from './DayTransactionsModal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MonthlyCalendar = () => {
  const [currentDate, setCurrentDate] = useState(getCurrentDateInSaoPaulo());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { user } = useFirebaseAuth();
  const { canEditPreviousCalendarDays } = usePlanLimitations();

  // Buscar histórico de dias fechados (como no Optify original)
  const { data: historicalSummaries = [] } = useAllDailySummaries(user?.uid || '');
  
  // Buscar todas as transações (não fechadas ainda)
  const { data: allTransactions = [] } = useTransactions(user?.uid || '');
  
  // Debug logs
  console.log('MonthlyCalendar - Historical Summaries:', historicalSummaries);
  console.log('MonthlyCalendar - Historical Summaries length:', historicalSummaries?.length || 0);
  console.log('MonthlyCalendar - All Transactions:', allTransactions);
  console.log('MonthlyCalendar - All Transactions length:', allTransactions?.length || 0);
  console.log('MonthlyCalendar - Current Date:', currentDate);
  console.log('MonthlyCalendar - User ID:', user?.uid);
  
  // Calcular lucros diários usando Map (como no Optify original)
  const dailyProfits = useMemo(() => {
    const profits = new Map<string, number>();
    
    console.log('Calculating daily profits...');
    
    // 1️⃣ PROCESSAR HISTÓRICO (dias fechados)
    historicalSummaries.forEach((summary: any) => {
      // Converter data para string "YYYY-MM-DD"
      let dateKey: string;
      
      if (typeof summary.date === 'string') {
        dateKey = summary.date;
      } else if (summary.date && summary.date.toDate) {
        // Firebase Timestamp
        dateKey = format(summary.date.toDate(), 'yyyy-MM-dd');
      } else {
        // Date object
        dateKey = format(new Date(summary.date), 'yyyy-MM-dd');
      }
      
      console.log(`Adding historical profit for ${dateKey}: ${summary.profit || summary.margin}`);
      profits.set(dateKey, summary.profit || summary.margin || 0);
    });
    
    // 2️⃣ PROCESSAR TODAS AS TRANSAÇÕES POR DIA (não fechadas ainda)
    allTransactions.forEach((transaction: any) => {
      const transactionDate = transaction.date;
      console.log(`Processing transaction for date ${transactionDate}:`, transaction);
      
      // Calcular lucro desta transação
      const transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
      
      // Se já existe lucro para este dia, somar
      if (profits.has(transactionDate)) {
        const currentProfit = profits.get(transactionDate) || 0;
        const newProfit = currentProfit + transactionProfit;
        console.log(`Adding to existing profit for ${transactionDate}: ${currentProfit} + ${transactionProfit} = ${newProfit}`);
        profits.set(transactionDate, newProfit);
      } else {
        // Se não existe, criar novo
        console.log(`Creating new profit for ${transactionDate}: ${transactionProfit}`);
        profits.set(transactionDate, transactionProfit);
      }
    });
    
    console.log('Final daily profits Map:', Array.from(profits.entries()));
    return profits;
  }, [historicalSummaries, allTransactions]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getProfitForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    console.log(`Looking for profit for day ${day}, date string: ${dateStr}`);
    
    const profit = dailyProfits.get(dateStr);
    console.log(`Profit found for day ${day}:`, profit);
    
    return profit;
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Para planos Free e Standard, permitir apenas o dia atual
    if (!canEditPreviousCalendarDays()) {
      if (clickedDate.getTime() !== today.getTime()) {
        const message = clickedDate < today
          ? 'Edição de dias passados disponível apenas no plano Medium ou superior. Faça upgrade para acessar esta funcionalidade.'
          : 'Edição de dias futuros disponível apenas no plano Medium ou superior. Faça upgrade para acessar esta funcionalidade.';
        toast.error(message);
        return;
      }
    }
    
    setSelectedDate(clickedDate);
  };

  return (
    <>
      <Card className="p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-muted-foreground p-2">
              {day}
            </div>
          ))}

          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const profit = getProfitForDay(day);
            const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const isToday = dayDate.getTime() === today.getTime();
            const isPast = dayDate < today;
            const isFuture = dayDate > today;
            const isBlocked = !canEditPreviousCalendarDays() && (isPast || isFuture);

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[80px] p-3 rounded-lg border transition-all hover:shadow-md relative group
                  ${isToday ? 'border-primary border-2' : 'border-border'}
                  ${isPast && profit !== undefined ? 'bg-muted/50' : 'bg-card'}
                  hover:bg-accent
                `}
              >
                {/* Número do dia no canto superior direito */}
                <div className="absolute top-2 right-2 text-lg font-bold text-primary group-hover:text-black transition-colors duration-200">{day}</div>
                
                {/* Ícone de bloqueio apenas para dias passados bloqueados */}
                {isBlocked && (
                  <div className="absolute top-2 left-2">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                
                {/* Conteúdo do lucro/prejuízo no centro */}
                {profit !== undefined && (
                  <div className="flex flex-col items-center justify-center h-full pt-4">
                    <div className="text-xs text-muted-foreground">BRL</div>
                    <div className={`text-sm font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {profit >= 0 ? '+' : ''}R$ {profit.toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Transações - {selectedDate?.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </DialogTitle>
          </DialogHeader>
          {selectedDate && <DayTransactionsModal date={selectedDate} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MonthlyCalendar;
