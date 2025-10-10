import { UserSubcollectionsService, USER_SUBCOLLECTIONS } from './user-subcollections.service';

export interface UserConfig {
  monthlyGoal: number;
  selectedPlatforms: string[];
  setupCompleted: boolean;
  currentPlan: 'free' | 'standard' | 'medium' | 'ultimate';
  createdAt: Date;
  updatedAt: Date;
}

export class UserConfigService {
  private static docId = 'initial';

  static async saveInitialSetup(userId: string, config: Omit<UserConfig, 'createdAt' | 'updatedAt'>): Promise<void> {
    return UserSubcollectionsService.saveToUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.CONFIG, 
      this.docId, 
      config
    );
  }

  static async getUserConfig(userId: string): Promise<UserConfig | null> {
    return UserSubcollectionsService.getFromUserSubcollection<UserConfig>(
      userId, 
      USER_SUBCOLLECTIONS.CONFIG, 
      this.docId
    );
  }

  static async updateUserPlan(userId: string, newPlan: 'free' | 'standard' | 'medium' | 'ultimate'): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.CONFIG, 
      this.docId, 
      { currentPlan: newPlan }
    );
  }

  static async updateMonthlyGoal(userId: string, monthlyGoal: number): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.CONFIG, 
      this.docId, 
      { monthlyGoal }
    );
  }

  static async updateSelectedPlatforms(userId: string, selectedPlatforms: string[]): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.CONFIG, 
      this.docId, 
      { selectedPlatforms }
    );
  }
}
