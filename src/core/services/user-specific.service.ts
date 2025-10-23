import { UserSubcollectionsService, USER_SUBCOLLECTIONS } from './user-subcollections.service';
import { where, orderBy, limit } from 'firebase/firestore';

// Interfaces para os dados específicos do usuário
export interface UserEmployee {
  id: string;
  name: string;
  cpf: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  payDay?: number;
  salary: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPlatform {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTransaction {
  id: string;
  employeeId: string;
  platformId?: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  description?: string;
  date: string; // YYYY-MM-DD format
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDailySummary {
  id: string;
  date: string;
  totalDeposits: number;
  totalWithdraws: number;
  profit: number;
  margin?: number;
  transactionCount: number;
  transactionsSnapshot: any;
  byEmployee: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAccount {
  id: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  currentBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

// Serviços específicos para cada tipo de dado
export class UserEmployeeService {
  static async createEmployee(userId: string, employeeData: Omit<UserEmployee, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    console.log('UserEmployeeService.createEmployee - dados recebidos:', { userId, employeeData });
    return UserSubcollectionsService.addToUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.EMPLOYEES, 
      employeeData
    );
  }

  static async getEmployees(userId: string): Promise<UserEmployee[]> {
    console.log('UserEmployeeService.getEmployees - buscando funcionários para userId:', userId);
    const employees = await UserSubcollectionsService.getAllFromUserSubcollection<UserEmployee>(
      userId, 
      USER_SUBCOLLECTIONS.EMPLOYEES,
      [orderBy('createdAt', 'desc')]
    );
    console.log('Funcionários encontrados:', employees);
    return employees;
  }

  static async getActiveEmployees(userId: string): Promise<UserEmployee[]> {
    return UserSubcollectionsService.getAllFromUserSubcollection<UserEmployee>(
      userId, 
      USER_SUBCOLLECTIONS.EMPLOYEES,
      [where('status', '==', 'active'), orderBy('createdAt', 'desc')]
    );
  }

  static async updateEmployee(userId: string, employeeId: string, data: Partial<UserEmployee>): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.EMPLOYEES, 
      employeeId, 
      data
    );
  }

  static async deleteEmployee(userId: string, employeeId: string): Promise<void> {
    return UserSubcollectionsService.deleteFromUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.EMPLOYEES, 
      employeeId
    );
  }
}

export class UserPlatformService {
  static async createPlatform(userId: string, platformData: Omit<UserPlatform, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return UserSubcollectionsService.addToUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.PLATFORMS, 
      platformData
    );
  }

  static async getPlatforms(userId: string): Promise<UserPlatform[]> {
    return UserSubcollectionsService.getAllFromUserSubcollection<UserPlatform>(
      userId, 
      USER_SUBCOLLECTIONS.PLATFORMS,
      [orderBy('name', 'asc')]
    );
  }

  static async getActivePlatforms(userId: string): Promise<UserPlatform[]> {
    return UserSubcollectionsService.getAllFromUserSubcollection<UserPlatform>(
      userId, 
      USER_SUBCOLLECTIONS.PLATFORMS,
      [where('isActive', '==', true), orderBy('name', 'asc')]
    );
  }

  static async updatePlatform(userId: string, platformId: string, data: Partial<UserPlatform>): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.PLATFORMS, 
      platformId, 
      data
    );
  }

  static async deletePlatform(userId: string, platformId: string): Promise<void> {
    return UserSubcollectionsService.deleteFromUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.PLATFORMS, 
      platformId
    );
  }
}

export class UserTransactionService {
  static async createTransaction(userId: string, transactionData: Omit<UserTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return UserSubcollectionsService.addToUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.TRANSACTIONS, 
      transactionData
    );
  }

  static async getTransactions(userId: string, limitCount: number = 100): Promise<UserTransaction[]> {
    return UserSubcollectionsService.getAllFromUserSubcollection<UserTransaction>(
      userId, 
      USER_SUBCOLLECTIONS.TRANSACTIONS,
      [limit(limitCount)]
    );
  }

  static async getTransactionsByDateRange(userId: string, startDate: string, endDate: string): Promise<UserTransaction[]> {
    console.log('UserTransactionService.getTransactionsByDateRange - userId:', userId);
    console.log('UserTransactionService.getTransactionsByDateRange - startDate:', startDate);
    console.log('UserTransactionService.getTransactionsByDateRange - endDate:', endDate);
    
    const transactions = await UserSubcollectionsService.getAllFromUserSubcollection<UserTransaction>(
      userId, 
      USER_SUBCOLLECTIONS.TRANSACTIONS,
      [
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      ]
    );
    
    console.log('UserTransactionService.getTransactionsByDateRange - transactions found:', transactions);
    return transactions;
  }

  static async getTransactionsByEmployee(userId: string, employeeId: string): Promise<UserTransaction[]> {
    return UserSubcollectionsService.getAllFromUserSubcollection<UserTransaction>(
      userId, 
      USER_SUBCOLLECTIONS.TRANSACTIONS,
      [where('employeeId', '==', employeeId)]
    );
  }

  static async updateTransaction(userId: string, transactionId: string, data: Partial<UserTransaction>): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.TRANSACTIONS, 
      transactionId, 
      data
    );
  }

  static async deleteTransaction(userId: string, transactionId: string): Promise<void> {
    return UserSubcollectionsService.deleteFromUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.TRANSACTIONS, 
      transactionId
    );
  }
}

export class UserDailySummaryService {
  static async createDailySummary(userId: string, summaryData: Omit<UserDailySummary, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return UserSubcollectionsService.addToUserSubcollection(
      userId,
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      summaryData
    );
  }

  static async getAllDailySummaries(userId: string): Promise<UserDailySummary[]> {
    console.log('UserDailySummaryService.getAllDailySummaries - userId:', userId);
    const summaries = await UserSubcollectionsService.getAllFromUserSubcollection<UserDailySummary>(
      userId,
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      []
    );
    console.log('UserDailySummaryService.getAllDailySummaries - summaries found:', summaries);
    return summaries;
  }

  static async updateDailySummary(userId: string, summaryId: string, summaryData: Partial<UserDailySummary>): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection(
      userId,
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      summaryId,
      summaryData
    );
  }

  static async deleteDailySummary(userId: string, summaryId: string): Promise<void> {
    return UserSubcollectionsService.deleteFromUserSubcollection(
      userId,
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      summaryId
    );
  }

  static async getDailySummaries(userId: string, limitCount: number = 30): Promise<UserDailySummary[]> {
    return UserSubcollectionsService.getAllFromUserSubcollection<UserDailySummary>(
      userId, 
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      [orderBy('date', 'desc'), limit(limitCount)]
    );
  }

  static async getDailySummaryByDate(userId: string, date: string): Promise<UserDailySummary | null> {
    const summaries = await UserSubcollectionsService.getAllFromUserSubcollection<UserDailySummary>(
      userId, 
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      [where('date', '==', date), limit(1)]
    );
    
    return summaries.length > 0 ? summaries[0] : null;
  }

}

export class UserAccountService {
  static async createAccount(userId: string, accountData: Omit<UserAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return UserSubcollectionsService.addToUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.ACCOUNTS, 
      accountData
    );
  }

  static async getAccounts(userId: string): Promise<UserAccount[]> {
    return UserSubcollectionsService.getAllFromUserSubcollection<UserAccount>(
      userId, 
      USER_SUBCOLLECTIONS.ACCOUNTS,
      [orderBy('name', 'asc')]
    );
  }

  static async updateAccount(userId: string, accountId: string, data: Partial<UserAccount>): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.ACCOUNTS, 
      accountId, 
      data
    );
  }

  static async deleteAccount(userId: string, accountId: string): Promise<void> {
    return UserSubcollectionsService.deleteFromUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.ACCOUNTS, 
      accountId
    );
  }
}
