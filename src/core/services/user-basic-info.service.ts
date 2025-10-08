import { UserSubcollectionsService, USER_SUBCOLLECTIONS } from './user-subcollections.service';

export interface UserBasicInfo {
  name: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserBasicInfoService {
  private static docId = 'basic';

  static async saveBasicInfo(userId: string, info: Omit<UserBasicInfo, 'createdAt' | 'updatedAt'>): Promise<void> {
    return UserSubcollectionsService.saveToUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.PROFILE, 
      this.docId, 
      info
    );
  }

  static async getUserBasicInfo(userId: string): Promise<UserBasicInfo | null> {
    return UserSubcollectionsService.getFromUserSubcollection<UserBasicInfo>(
      userId, 
      USER_SUBCOLLECTIONS.PROFILE, 
      this.docId
    );
  }

  static async updateBasicInfo(userId: string, info: Partial<Omit<UserBasicInfo, 'createdAt' | 'updatedAt'>>): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection(
      userId, 
      USER_SUBCOLLECTIONS.PROFILE, 
      this.docId, 
      info
    );
  }
}
