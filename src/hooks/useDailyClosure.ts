import { useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { DailyClosureService } from '@/core/services/daily-closure.service';
import { toast } from 'sonner';

export const useDailyClosure = () => {
  const { user } = useFirebaseAuth();
  const [isServiceActive, setIsServiceActive] = useState(false);
  const [nextClosure, setNextClosure] = useState<Date | null>(null);

  // Iniciar serviço quando o usuário estiver logado
  useEffect(() => {
    if (user?.uid) {
      console.log('🚀 Iniciando serviço de fechamento diário para usuário:', user.uid);
      DailyClosureService.startDailyClosureService(user.uid);
      
      setIsServiceActive(DailyClosureService.isServiceActive());
      const { nextClosure: next } = DailyClosureService.getNextClosureInfo();
      setNextClosure(next);

      // Atualizar informações a cada minuto
      const interval = setInterval(() => {
        setIsServiceActive(DailyClosureService.isServiceActive());
        const { nextClosure: next } = DailyClosureService.getNextClosureInfo();
        setNextClosure(next);
      }, 60000); // 1 minuto

      return () => {
        clearInterval(interval);
        DailyClosureService.stopDailyClosureService();
        console.log('🛑 Serviço de fechamento diário parado');
      };
    }
  }, [user?.uid]);

  // Processar fechamento manual
  const processManualClosure = async (date?: string) => {
    if (!user?.uid) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      toast.loading('Processando fechamento diário...', { id: 'daily-closure' });
      await DailyClosureService.processManualClosure(user.uid, date);
      toast.success('Fechamento diário processado com sucesso!', { id: 'daily-closure' });
    } catch (error) {
      console.error('Erro no fechamento manual:', error);
      toast.error('Erro ao processar fechamento diário', { id: 'daily-closure' });
    }
  };

  // Parar serviço
  const stopService = () => {
    DailyClosureService.stopDailyClosureService();
    setIsServiceActive(false);
    setNextClosure(null);
    toast.info('Serviço de fechamento diário parado');
  };

  // Reiniciar serviço
  const restartService = () => {
    if (user?.uid) {
      DailyClosureService.startDailyClosureService(user.uid);
      setIsServiceActive(DailyClosureService.isServiceActive());
      const { nextClosure: next } = DailyClosureService.getNextClosureInfo();
      setNextClosure(next);
      toast.success('Serviço de fechamento diário reiniciado');
    }
  };

  return {
    isServiceActive,
    nextClosure,
    processManualClosure,
    stopService,
    restartService
  };
};
