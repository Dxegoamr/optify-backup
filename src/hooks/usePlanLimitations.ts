import { useState, useEffect } from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { UserProfileService } from '@/core/services/user-profile.service';
import { 
  PlanLimitations, 
  hasFeatureAccess, 
  canAddEmployee, 
  getEmployeeLimit,
  getPlanInfo,
  canAccessPage,
  canEditPreviousDays
} from '@/core/services/plan-limitations.service';
import { isAdminEmail } from '@/core/services/admin.service';

// Cache de plano em memória para evitar "flicker" ao trocar de abas
const planCache = new Map<string, string>();

export const usePlanLimitations = () => {
  const { user } = useFirebaseAuth();
  
  // Inicializar com o valor do cache se existir
  const getCachedPlan = () => {
    if (user?.uid) {
      return planCache.get(user.uid) || 'free';
    }
    return 'free';
  };
  
  const [currentPlan, setCurrentPlan] = useState<string>(getCachedPlan);
  const [limitations, setLimitations] = useState<PlanLimitations | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Não mostrar loading se já temos o plano em cache
        const hasCachedPlan = planCache.has(user.uid);
        if (!hasCachedPlan) {
          setLoading(true);
        }
        
        // Buscar perfil do usuário para obter o plano atual direto do documento users/{uid}
        const profile = await UserProfileService.getUserProfile(user.uid);
        const userPlan = profile?.plano || 'free';
        
        // Atualizar cache
        planCache.set(user.uid, userPlan);
        
        setCurrentPlan(userPlan);

        // Buscar contagem de funcionários
        // TODO: Implementar busca real de funcionários
        // const employees = await UserEmployeeService.getDocuments(user.uid);
        // setEmployeeCount(employees.length);

        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar plano do usuário:', error);
        // Manter plano em cache se houver erro
        if (!planCache.has(user.uid)) {
          setCurrentPlan('free');
        }
        setLoading(false);
      }
    };

    fetchUserPlan();
  }, [user, refreshKey]);

  // Escutar evento global de mudança de plano
  useEffect(() => {
    const handlePlanChange = (event: CustomEvent) => {
      const { userId, newPlan } = event.detail;
      
      // Se a mudança foi para o usuário atual, atualizar cache e recarregar
      if (user && userId === user.uid) {
        // Atualizar cache imediatamente
        planCache.set(userId, newPlan);
        setCurrentPlan(newPlan);
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('planChanged', handlePlanChange as EventListener);
    
    return () => {
      window.removeEventListener('planChanged', handlePlanChange as EventListener);
    };
  }, [user]);

  // Atualizar limitações quando o plano mudar
  useEffect(() => {
    const planInfo = getPlanInfo(currentPlan);
    if (planInfo) {
      // Buscar limitações do plano atual
      const planLimitations = {
        maxEmployees: planInfo.maxEmployees,
        features: {
          dashboard: hasFeatureAccess(currentPlan, 'dashboard'),
          dailySummary: hasFeatureAccess(currentPlan, 'dailySummary'),
          calendar: hasFeatureAccess(currentPlan, 'calendar'),
          calendarPrevious: hasFeatureAccess(currentPlan, 'calendarPrevious'),
          payments: hasFeatureAccess(currentPlan, 'payments'),
          reports: hasFeatureAccess(currentPlan, 'reports'),
          reportsAdvanced: hasFeatureAccess(currentPlan, 'reportsAdvanced'),
          balances: hasFeatureAccess(currentPlan, 'balances'),
          history: hasFeatureAccess(currentPlan, 'history'),
          chineseCpa: hasFeatureAccess(currentPlan, 'chineseCpa'),
          advancedPanel: hasFeatureAccess(currentPlan, 'advancedPanel'),
          dutchuingBot: hasFeatureAccess(currentPlan, 'dutchuingBot'),
          advancedIntegrations: hasFeatureAccess(currentPlan, 'advancedIntegrations'),
          customApi: hasFeatureAccess(currentPlan, 'customApi'),
          prioritySupport: hasFeatureAccess(currentPlan, 'prioritySupport'),
          dedicatedSupport: hasFeatureAccess(currentPlan, 'dedicatedSupport'),
        }
      };
      setLimitations(planLimitations);
    }
  }, [currentPlan]);

  const canAccess = (feature: keyof PlanLimitations['features']) => {
    // Se for painel avançado e o usuário for admin hardcoded, sempre permitir
    if (feature === 'advancedPanel' && isAdminEmail(user?.email)) {
      return true;
    }
    
    return hasFeatureAccess(currentPlan, feature);
  };

  const canAddMoreEmployees = () => {
    return canAddEmployee(currentPlan, employeeCount);
  };

  const getEmployeeLimitForPlan = () => {
    return getEmployeeLimit(currentPlan);
  };

  const canAccessPageRoute = (page: string) => {
    // Se for página de admin e o usuário for admin hardcoded, sempre permitir
    if (page.toLowerCase() === 'admin' && isAdminEmail(user?.email)) {
      return true;
    }
    
    return canAccessPage(currentPlan, page);
  };

  const canEditPreviousCalendarDays = () => {
    return canEditPreviousDays(currentPlan);
  };

  const planInfo = getPlanInfo(currentPlan);

  const refreshPlan = () => {
    setRefreshKey(prev => prev + 1);
  };

  return {
    currentPlan,
    limitations,
    loading,
    employeeCount,
    setEmployeeCount,
    planInfo,
    canAccess,
    canAddMoreEmployees,
    getEmployeeLimitForPlan,
    canAccessPageRoute,
    canEditPreviousCalendarDays,
    refreshPlan
  };
};
