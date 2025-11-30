import { UserSubcollectionsService, USER_SUBCOLLECTIONS } from './user-subcollections.service';
import { orderBy } from 'firebase/firestore';
import { FreeBetOperation, FreeBetEmployee, FreeBetHistoryEntry } from '@/types/freebet';

// Adicionar FREE_BET_OPERATIONS à constante USER_SUBCOLLECTIONS
const FREE_BET_OPERATIONS = 'freeBetOperations';
const FREE_BET_HISTORY = 'freeBetHistory';

export class FreeBetService {
  static async createOperation(
    userId: string,
    platformName: string,
    platformColor: string,
    valorFreeBet: number = 0
  ): Promise<string> {
    const operationData: Omit<FreeBetOperation, 'id' | 'createdAt' | 'updatedAt'> = {
      platformName,
      platformColor,
      funcionarios: [],
      valorFreeBet,
    };

    return UserSubcollectionsService.addToUserSubcollection<FreeBetOperation>(
      userId,
      FREE_BET_OPERATIONS,
      operationData
    );
  }

  static async getOperations(userId: string): Promise<FreeBetOperation[]> {
    return UserSubcollectionsService.getAllFromUserSubcollection<FreeBetOperation>(
      userId,
      FREE_BET_OPERATIONS,
      [orderBy('createdAt', 'desc')]
    );
  }

  static async getOperation(userId: string, operationId: string): Promise<FreeBetOperation | null> {
    return UserSubcollectionsService.getFromUserSubcollection<FreeBetOperation>(
      userId,
      FREE_BET_OPERATIONS,
      operationId
    );
  }

  static async updateOperation(
    userId: string,
    operationId: string,
    data: Partial<FreeBetOperation>
  ): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection<FreeBetOperation>(
      userId,
      FREE_BET_OPERATIONS,
      operationId,
      data
    );
  }

  static async deleteOperation(userId: string, operationId: string): Promise<void> {
    return UserSubcollectionsService.deleteFromUserSubcollection(
      userId,
      FREE_BET_OPERATIONS,
      operationId
    );
  }

  // Histórico
  static async addHistoryEntry(
    userId: string,
    historyData: Omit<FreeBetHistoryEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    return UserSubcollectionsService.addToUserSubcollection<FreeBetHistoryEntry>(
      userId,
      FREE_BET_HISTORY,
      historyData
    );
  }

  static async getHistory(userId: string): Promise<FreeBetHistoryEntry[]> {
    return UserSubcollectionsService.getAllFromUserSubcollection<FreeBetHistoryEntry>(
      userId,
      FREE_BET_HISTORY,
      [orderBy('closedAt', 'desc')]
    );
  }

  static async updateHistoryEntry(
    userId: string,
    historyId: string,
    data: Partial<FreeBetHistoryEntry>
  ): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection<FreeBetHistoryEntry>(
      userId,
      FREE_BET_HISTORY,
      historyId,
      data
    );
  }

  static async deleteHistoryEntry(userId: string, historyId: string): Promise<void> {
    return UserSubcollectionsService.deleteFromUserSubcollection(
      userId,
      FREE_BET_HISTORY,
      historyId
    );
  }

  static async addEmployee(
    userId: string,
    operationId: string,
    employee: FreeBetEmployee
  ): Promise<void> {
    const operation = await this.getOperation(userId, operationId);
    if (!operation) {
      throw new Error('Operação não encontrada');
    }

    const updatedEmployees = [...operation.funcionarios, employee];
    return this.updateOperation(userId, operationId, { funcionarios: updatedEmployees });
  }

  static async updateEmployee(
    userId: string,
    operationId: string,
    employeeId: string,
    employeeData: Partial<FreeBetEmployee>
  ): Promise<void> {
    const operation = await this.getOperation(userId, operationId);
    if (!operation) {
      throw new Error('Operação não encontrada');
    }

    const updatedEmployees = operation.funcionarios.map(emp =>
      emp.id === employeeId ? { ...emp, ...employeeData } : emp
    );

    return this.updateOperation(userId, operationId, { funcionarios: updatedEmployees });
  }

  static async removeEmployee(
    userId: string,
    operationId: string,
    employeeId: string
  ): Promise<void> {
    const operation = await this.getOperation(userId, operationId);
    if (!operation) {
      throw new Error('Operação não encontrada');
    }

    const updatedEmployees = operation.funcionarios.filter(emp => emp.id !== employeeId);
    return this.updateOperation(userId, operationId, { funcionarios: updatedEmployees });
  }
}

