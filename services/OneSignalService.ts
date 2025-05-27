// services/OneSignalService.ts
import OneSignal from 'react-native-onesignal';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

class OneSignalService {
  private static instance: OneSignalService;
  private initialized = false;

  private constructor() {}

  public static getInstance(): OneSignalService {
    if (!OneSignalService.instance) {
      OneSignalService.instance = new OneSignalService();
    }
    return OneSignalService.instance;
  }

  async initialize(appId: string) {
    if (this.initialized) return;
    
    try {
      OneSignal.setAppId(appId);
      this.initialized = true;
      
      // Настройка обработчиков
      this.setupListeners();
    } catch (error) {
      console.error('OneSignal initialization failed:', error);
      throw error;
    }
  }

  private setupListeners() {
    OneSignal.Notifications.addEventListener('permissionChange', (event) => {
      storage.set('hasNotificationPermission', event.hasPermission);
    });
  }

  async getOneSignalId(): Promise<string | null> {
    if (!this.initialized) {
      console.warn('OneSignal not initialized');
      return null;
    }
    return OneSignal.User.getOnesignalId();
  }

}

export const oneSignalService = OneSignalService.getInstance();