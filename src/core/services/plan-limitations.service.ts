export interface PlanLimitations {
  maxEmployees: number;
  features: {
    dashboard: boolean;
    dailySummary: boolean;
    calendar: boolean;
    calendarPrevious: boolean;
    payments: boolean;
    reports: boolean;
    reportsAdvanced: boolean;
    balances: boolean;
    history: boolean;
    chineseCpa: boolean;
    advancedPanel: boolean;
    dutchuingBot: boolean;
    advancedIntegrations: boolean;
    customApi: boolean;
    prioritySupport: boolean;
    dedicatedSupport: boolean;
  };
}

export interface PlanInfo {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  annualDiscount: number;
  maxEmployees: number;
  isPopular?: boolean;
}

export const PLAN_LIMITATIONS: Record<string, PlanLimitations> = {
  free: {
    maxEmployees: 1,
    features: {
      dashboard: true,
      dailySummary: true,
      calendar: true,
      calendarPrevious: false,
      payments: false,
      reports: false,
      reportsAdvanced: false,
      balances: false,
      history: false,
      chineseCpa: false,
      advancedPanel: false,
      dutchuingBot: false,
      advancedIntegrations: false,
      customApi: false,
      prioritySupport: false,
      dedicatedSupport: false,
    }
  },
  standard: {
    maxEmployees: 5,
    features: {
      dashboard: true,
      dailySummary: true,
      calendar: true,
      calendarPrevious: false,
      payments: false,
      reports: true,
      reportsAdvanced: false,
      balances: false,
      history: false,
      chineseCpa: false,
      advancedPanel: false,
      dutchuingBot: false,
      advancedIntegrations: false,
      customApi: false,
      prioritySupport: false,
      dedicatedSupport: false,
    }
  },
  medium: {
    maxEmployees: 10,
    features: {
      dashboard: true,
      dailySummary: true,
      calendar: true,
      calendarPrevious: true,
      payments: true,
      reports: true,
      reportsAdvanced: true,
      balances: true,
      history: true,
      chineseCpa: false,
      advancedPanel: false,
      dutchuingBot: false,
      advancedIntegrations: false,
      customApi: false,
      prioritySupport: false,
      dedicatedSupport: false,
    }
  },
  ultimate: {
    maxEmployees: 50,
    features: {
      dashboard: true,
      dailySummary: true,
      calendar: true,
      calendarPrevious: true,
      payments: true,
      reports: true,
      reportsAdvanced: true,
      balances: true,
      history: true,
      chineseCpa: true,
      advancedPanel: true,
      dutchuingBot: true,
      advancedIntegrations: true,
      customApi: true,
      prioritySupport: true,
      dedicatedSupport: true,
    }
  }
};

export const PLAN_INFO: PlanInfo[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Plano gratuito para testar o sistema',
    monthlyPrice: 0,
    annualPrice: 0,
    annualDiscount: 0,
    maxEmployees: 1
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Ideal para pequenos negócios',
    monthlyPrice: 34.90,
    annualPrice: 356.76,
    annualDiscount: 15,
    maxEmployees: 5
  },
  {
    id: 'medium',
    name: 'Medium',
    description: 'Plano mais popular para médias empresas',
    monthlyPrice: 49.90,
    annualPrice: 509.16,
    annualDiscount: 15,
    maxEmployees: 10,
    isPopular: true
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    description: 'Acesso total com recursos avançados',
    monthlyPrice: 74.90,
    annualPrice: 764.76,
    annualDiscount: 15,
    maxEmployees: 50
  }
];

/**
 * Verifica se o usuário tem acesso a uma funcionalidade específica
 */
export const hasFeatureAccess = (userPlan: string, feature: keyof PlanLimitations['features']): boolean => {
  const limitations = PLAN_LIMITATIONS[userPlan];
  if (!limitations) return false;
  return limitations.features[feature];
};

/**
 * Verifica se o usuário pode adicionar mais funcionários
 */
export const canAddEmployee = (userPlan: string, currentEmployeeCount: number): boolean => {
  const limitations = PLAN_LIMITATIONS[userPlan];
  if (!limitations) return false;
  return currentEmployeeCount < limitations.maxEmployees;
};

/**
 * Retorna o limite de funcionários do plano
 */
export const getEmployeeLimit = (userPlan: string): number => {
  const limitations = PLAN_LIMITATIONS[userPlan];
  return limitations?.maxEmployees || 0;
};

/**
 * Retorna informações do plano
 */
export const getPlanInfo = (planId: string): PlanInfo | null => {
  return PLAN_INFO.find(plan => plan.id === planId) || null;
};

/**
 * Retorna todas as informações dos planos
 */
export const getAllPlanInfo = (): PlanInfo[] => {
  return PLAN_INFO;
};

/**
 * Verifica se o usuário pode acessar uma página específica
 */
export const canAccessPage = (userPlan: string, page: string): boolean => {
  const pageFeatureMap: Record<string, keyof PlanLimitations['features']> = {
    'pagamentos': 'payments',
    'relatorios': 'reports',
    'saldos': 'balances',
    'historico': 'history',
    'admin': 'advancedPanel'
  };

  const feature = pageFeatureMap[page.toLowerCase()];
  if (!feature) return true; // Se não há mapeamento, permite acesso

  return hasFeatureAccess(userPlan, feature);
};

/**
 * Retorna a mensagem de limitação para uma funcionalidade
 */
export const getLimitationMessage = (feature: keyof PlanLimitations['features'], userPlan: string): string => {
  const planNames: Record<string, string> = {
    free: 'Free',
    standard: 'Standard',
    medium: 'Medium',
    ultimate: 'Ultimate'
  };

  const featureMessages: Record<keyof PlanLimitations['features'], string> = {
    dashboard: 'Dashboard básico',
    dailySummary: 'Resumo do dia',
    calendar: 'Calendário',
    calendarPrevious: 'Calendário Anterior',
    payments: 'Pagamentos',
    reports: 'Relatórios básicos',
    reportsAdvanced: 'Relatórios avançados',
    balances: 'Saldo de Contas',
    history: 'Histórico',
    chineseCpa: 'CPA Chinesa',
    advancedPanel: 'Painel Avançado',
    dutchuingBot: 'Dutchuing Bot',
    advancedIntegrations: 'Integrações avançadas',
    customApi: 'API personalizada',
    prioritySupport: 'Suporte prioritário',
    dedicatedSupport: 'Suporte dedicado'
  };

  const requiredPlans: Record<keyof PlanLimitations['features'], string[]> = {
    calendarPrevious: ['medium', 'ultimate'],
    payments: ['medium', 'ultimate'],
    reports: ['standard', 'medium', 'ultimate'],
    reportsAdvanced: ['medium', 'ultimate'],
    balances: ['medium', 'ultimate'],
    history: ['medium', 'ultimate'],
    chineseCpa: ['ultimate'],
    advancedPanel: ['ultimate'],
    dutchuingBot: ['ultimate'],
    advancedIntegrations: ['ultimate'],
    customApi: ['ultimate'],
    prioritySupport: ['ultimate'],
    dedicatedSupport: ['ultimate'],
    dashboard: [],
    dailySummary: [],
    calendar: []
  };

  const requiredPlanIds = requiredPlans[feature];
  if (requiredPlanIds.length === 0) return '';

  const minRequiredPlan = requiredPlanIds[0];
  const minPlanName = planNames[minRequiredPlan];

  return `${featureMessages[feature]} disponível apenas no plano ${minPlanName} ou superior.`;
};

/**
 * Verifica se o usuário pode editar dias passados no calendário
 */
export const canEditPreviousDays = (userPlan: string): boolean => {
  return hasFeatureAccess(userPlan, 'calendarPrevious');
};

/**
 * Retorna o plano mínimo necessário para uma funcionalidade
 */
export const getMinimumPlanForFeature = (feature: keyof PlanLimitations['features']): string | null => {
  const planOrder = ['free', 'standard', 'medium', 'ultimate'];
  
  for (const plan of planOrder) {
    if (hasFeatureAccess(plan, feature)) {
      return plan;
    }
  }
  
  return null;
};

