import { useCallback } from 'react';

/**
 * Hook para preload de rotas e componentes
 * Melhora a experiência do usuário carregando componentes antes de serem necessários
 */
export const usePreload = () => {
  const preloadRoute = useCallback((routePath: string) => {
    // Preload baseado na rota
    switch (routePath) {
      case '/admin':
        import('../pages/Admin');
        import('../components/admin');
        break;
      case '/relatorios':
        import('../pages/Relatorios');
        break;
      case '/historico':
        import('../pages/Historico');
        break;
      case '/pagamentos':
        import('../pages/Pagamentos');
        break;
      case '/saldos':
        import('../pages/Saldos');
        break;
      case '/gestao-funcionarios':
        import('../pages/GestaoFuncionarios');
        import('../pages/EmployeeProfile');
        break;
      case '/dashboard':
        import('../pages/Dashboard');
        import('../components/dashboard');
        break;
      default:
        break;
    }
  }, []);

  const preloadOnHover = useCallback((routePath: string) => {
    // Preload quando o usuário hover sobre um link
    preloadRoute(routePath);
  }, [preloadRoute]);

  const preloadOnIdle = useCallback(() => {
    // Preload de rotas críticas quando o browser está idle
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        // Preload das rotas mais comuns
        preloadRoute('/dashboard');
        preloadRoute('/gestao-funcionarios');
        preloadRoute('/pagamentos');
      });
    } else {
      // Fallback para browsers sem requestIdleCallback
      setTimeout(() => {
        preloadRoute('/dashboard');
        preloadRoute('/gestao-funcionarios');
        preloadRoute('/pagamentos');
      }, 2000);
    }
  }, [preloadRoute]);

  return {
    preloadRoute,
    preloadOnHover,
    preloadOnIdle,
  };
};
