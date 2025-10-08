export interface Employee {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  position: string;
  salary: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Transaction {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  description?: string;
}

export interface Payment {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  status: 'paid' | 'pending';
  dueDate: string;
  paidDate?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  balance: number;
}

export interface DaySummary {
  date: string;
  totalIncome: number;
  totalExpense: number;
  profit: number;
  transactions: Transaction[];
}

export interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
}

export interface PlanFeatures {
  maxEmployees: number;
  maxTransactions: number;
  advancedReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  multipleAccounts: boolean;
}

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  free: {
    maxEmployees: 5,
    maxTransactions: 50,
    advancedReports: false,
    apiAccess: false,
    prioritySupport: false,
    customBranding: false,
    multipleAccounts: false
  },
  standard: {
    maxEmployees: 20,
    maxTransactions: 200,
    advancedReports: true,
    apiAccess: false,
    prioritySupport: false,
    customBranding: false,
    multipleAccounts: true
  },
  medium: {
    maxEmployees: 50,
    maxTransactions: 500,
    advancedReports: true,
    apiAccess: true,
    prioritySupport: true,
    customBranding: false,
    multipleAccounts: true
  },
  ultimate: {
    maxEmployees: -1, // unlimited
    maxTransactions: -1,
    advancedReports: true,
    apiAccess: true,
    prioritySupport: true,
    customBranding: true,
    multipleAccounts: true
  }
};
