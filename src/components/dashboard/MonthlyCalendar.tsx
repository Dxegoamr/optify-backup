import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useTransactions } from '@/hooks/useFirestore';
import { getCurrentDateInSaoPaulo, formatDateInSaoPaulo } from '@/utils/timezone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DayTransactionsModal from './DayTransactionsModal';

const MonthlyCalendar = () => {
  const [currentDate, setCurrentDate] = useState(getCurrentDateInSaoPaulo());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { user } = useFirebaseAuth();

  // Buscar transações do mês atual
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = firstDay.toISOString().split('T')[0];
  const endDate = lastDay.toISOString().split('T')[0];
  
  const { data: monthlyTransactions = [] } = useTransactions(user?.uid || '', startDate, endDate);
  
  // Processar dados para o calendário
  const dailySummaries = monthlyTransactions.reduce((acc: any[], transaction) => {
    const date = transaction.date;
    const existing = acc.find(item => item.summary_date === date);
    
    if (existing) {
      if (transaction.type === 'deposit') {
        existing.total_deposits += transaction.amount;
      } else {
        existing.total_withdraws += transaction.amount;
      }
      existing.profit = existing.total_withdraws - existing.total_deposits;
    } else {
      acc.push({
        summary_date: date,
        total_deposits: transaction.type === 'deposit' ? transaction.amount : 0,
        total_withdraws: transaction.type === 'withdraw' ? transaction.amount : 0,
        profit: transaction.type === 'deposit' ? -transaction.amount : transaction.amount
      });
    }
    
    return acc;
  }, []);

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

  const getSummaryForDay = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0];
    return dailySummaries.find(s => s.summary_date === dateStr);
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
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
            const summary = getSummaryForDay(day);
            const isToday = new Date().getDate() === day &&
              new Date().getMonth() === currentDate.getMonth() &&
              new Date().getFullYear() === currentDate.getFullYear();
            const isPast = new Date(currentDate.getFullYear(), currentDate.getMonth(), day) < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[80px] p-3 rounded-lg border transition-all hover:shadow-md relative group
                  ${isToday ? 'border-primary border-2' : 'border-border'}
                  ${isPast && summary ? 'bg-muted/50' : 'bg-card'}
                  hover:bg-accent
                `}
              >
                {/* Número do dia no canto superior direito */}
                <div className="absolute top-2 right-2 text-lg font-bold text-primary group-hover:text-black transition-colors duration-200">{day}</div>
                
                {/* Conteúdo do lucro/prejuízo no centro */}
                {summary && (
                  <div className="flex flex-col items-center justify-center h-full pt-4">
                    <div className="text-xs text-muted-foreground">BRL</div>
                    <div className={`text-sm font-bold ${summary.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {summary.profit >= 0 ? '+' : '-'}R$ {Math.abs(Number(summary.profit)).toLocaleString('pt-BR', { 
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
