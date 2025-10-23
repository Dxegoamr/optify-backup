import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook para gerenciar Service Worker
 */
export const useServiceWorker = () => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Registrar Service Worker apenas em produção
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });

      setRegistration(registration);
      console.log('✅ Service Worker registrado:', registration.scope);

      // Verificar atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão disponível
              setUpdateAvailable(true);
              
              toast.info('Nova versão disponível!', {
                description: 'Clique para atualizar o aplicativo',
                action: {
                  label: 'Atualizar',
                  onClick: () => activateUpdate(),
                },
                duration: 10000,
              });
            }
          });
        }
      });

      // Verificar atualizações periodicamente
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // A cada 1 hora
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    }
  };

  const activateUpdate = () => {
    if (registration && registration.waiting) {
      // Enviar mensagem para ativar o novo Service Worker
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Recarregar página após ativação
      window.location.reload();
    }
  };

  const clearCache = async () => {
    if (registration) {
      registration.active?.postMessage({ type: 'CLEAR_CACHE' });
      
      // Também limpar cache do navegador
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      toast.success('Cache limpo com sucesso!');
      
      // Recarregar página
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return {
    registration,
    updateAvailable,
    activateUpdate,
    clearCache,
  };
};
