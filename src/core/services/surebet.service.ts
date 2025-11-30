import { UserSubcollectionsService, USER_SUBCOLLECTIONS } from './user-subcollections.service';
import { orderBy } from 'firebase/firestore';
import { SurebetRecord } from '@/types/surebet';

export class SurebetService {
  static async createRecord(
    userId: string,
    recordData: Omit<SurebetRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    return UserSubcollectionsService.addToUserSubcollection<SurebetRecord>(
      userId,
      USER_SUBCOLLECTIONS.SUREBET_RECORDS,
      recordData
    );
  }

  static async getRecords(userId: string): Promise<SurebetRecord[]> {
    return UserSubcollectionsService.getAllFromUserSubcollection<SurebetRecord>(
      userId,
      USER_SUBCOLLECTIONS.SUREBET_RECORDS,
      [orderBy('createdAt', 'desc')]
    );
  }

  static async updateRecord(
    userId: string,
    recordId: string,
    data: Partial<SurebetRecord>
  ): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection<SurebetRecord>(
      userId,
      USER_SUBCOLLECTIONS.SUREBET_RECORDS,
      recordId,
      data
    );
  }

  static async deleteRecord(userId: string, recordId: string): Promise<void> {
    return UserSubcollectionsService.deleteFromUserSubcollection(
      userId,
      USER_SUBCOLLECTIONS.SUREBET_RECORDS,
      recordId
    );
  }

  static async deleteOperation(userId: string, operationId: string): Promise<void> {
    // Deletar todas as linhas de uma operação (2 linhas normalmente)
    const records = await this.getRecords(userId);
    const operationRecords = records.filter(r => r.operationId === operationId);
    
    await Promise.all(
      operationRecords.map(record => 
        this.deleteRecord(userId, record.id!)
      )
    );
  }
}







