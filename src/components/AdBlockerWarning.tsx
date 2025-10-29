import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdBlockerWarningProps {
  onClose?: () => void;
}

export const AdBlockerWarning = ({ onClose }: AdBlockerWarningProps) => {
  const [isAdBlockerActive, setIsAdBlockerActive] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Detectar ad blocker
    const detectAdBlocker = async () => {
      try {
        // Tentar carregar um arquivo conhecido por ser bloqueado por ad blockers
        const googleAdUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        const response = await fetch(googleAdUrl, { method: 'HEAD', mode: 'no-cors' });
        setIsAdBlockerActive(false);
      } catch (error) {
        // Ad blocker pode estar ativo, mas não é 100% confiável
        setIsAdBlockerActive(true);
      }
    };

    detectAdBlocker();
  }, []);

  // Verificar se já foi fechado antes
  useEffect(() => {
    const dismissed = localStorage.getItem('adBlockerWarningDismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('adBlockerWarningDismissed', 'true');
    onClose?.();
  };

  if (isDismissed || !isAdBlockerActive) {
    return null;
  }

  return (
    <Alert className="border-amber-500 bg-amber-500/10 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-500 font-semibold">
        Aviso: Bloqueador de Anúncios Detectado
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p className="text-sm">
          Seu bloqueador de anúncios pode interferir com o processo de pagamento do Mercado Pago.
        </p>
        <div className="text-sm space-y-1">
          <p className="font-semibold">Para resolver:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Desabilite temporariamente o bloqueador de anúncios</li>
            <li>Ou adicione o Mercado Pago à lista de exceções</li>
            <li>Ou use o modo de navegação anônima</li>
          </ol>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="h-8"
          >
            Entendi
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default AdBlockerWarning;




