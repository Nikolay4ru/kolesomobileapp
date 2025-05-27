// stores/AuthStore.ts
import { makeAutoObservable } from "mobx";
import { MMKV } from "react-native-mmkv";
import { createApi, ApiInstance } from "../api";
import { OneSignal }  from 'react-native-onesignal';

const storage = new MMKV();

type UserProfile = {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  birthDate?: string; // Формат YYYY-MM-DD
  gender?: 'male' | 'female' | 'other';
};

class AuthStore {
  phoneNumber = "";
  isLoggedIn = false;
  isLoading = false;
  error = "";
  token = "";
  user: UserProfile | null = null;
  api: ApiInstance;
  oneSignalId: string | null = null;
  _hasNotificationPermission: boolean = false;
  isNotificationPermissionRequested: boolean = false;
oneSignalInitialized = false;

  constructor() {
    makeAutoObservable(this);
    this.api = createApi(this);
    this.loadAuthState();
   
  }





  async initializeOneSignal() {
    if (this.oneSignalInitialized) return;

    try {
      // Инициализация OneSignal
      OneSignal.setAppId("77c64a7c-678f-4de8-811f-9cac6c1b58e1");
      this.oneSignalInitialized = true;

      // Запрос разрешений на уведомления
      await this.setupNotificationPermissions();
      
      // Установка слушателей
      this.setupOneSignalListeners();
      
      // Получение OneSignal ID
      await this.fetchOneSignalId();
    } catch (error) {
      console.error('OneSignal initialization error:', error);
    }
  }

   async setupNotificationPermissions() {
    const savedPermission = storage.getBoolean("hasNotificationPermission");
    if (savedPermission !== undefined) {
      this._hasNotificationPermission = savedPermission;
    }

    if (!this.isNotificationPermissionRequested) {
      await this.requestNotificationPermission();
    }

    const currentPermission = await this.checkNotificationPermission();
    if (savedPermission !== undefined && savedPermission !== currentPermission) {
      this._hasNotificationPermission = currentPermission;
    }
  }

  async setupOneSignalListeners() {
    OneSignal.Notifications.addEventListener('permissionChange', (event) => {
      this._hasNotificationPermission = event.hasPermission;
      storage.set("hasNotificationPermission", event.hasPermission);
      this.syncNotificationStatus();
    });

    OneSignal.User.addEventListener('stateChange', async (changes) => {
      if (changes.onesignalId?.current) {
        this.oneSignalId = changes.onesignalId.current;
        await this.syncOneSignalIdWithServer();
      }
    });
  }

  async checkNotificationPermission(): Promise<boolean> {
    if (!this.oneSignalInitialized) return false;
    
    try {
      const permission = await OneSignal.Notifications.getPermissionAsync();
      this._hasNotificationPermission = permission;
      return permission;
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!this.oneSignalInitialized) return false;
    
    try {
      this.isNotificationPermissionRequested = true;
      const result = await OneSignal.Notifications.requestPermission(true);
      this._hasNotificationPermission = result;
      storage.set("hasNotificationPermission", result);
      
      if (result) {
        await this.fetchOneSignalId();
      }
      
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async fetchOneSignalId(): Promise<void> {
    if (!this.oneSignalInitialized) return;
    
    try {
      const id = await OneSignal.User.getOnesignalId();
      if (id) {
        this.oneSignalId = id;
        await this.syncOneSignalIdWithServer();
      }
    } catch (error) {
      console.error('Error fetching OneSignal ID:', error);
    }
  }

  async syncOneSignalIdWithServer(): Promise<void> {
    if (!this.oneSignalId || !this.user?.id) return;

    try {
      await this.api.post('/update_user_devices.php', {
        userId: this.user.id,
        oneSignalId: this.oneSignalId,
        pushEnabled: this.hasNotificationPermission ? 1 : 0
      });
      
      if (this.user.phone) {
        await OneSignal.User.addTag('phone', this.user.phone);
        await OneSignal.User.addTag('userId', this.user.id);
        await OneSignal.User.addTag('pushEnabled', this.hasNotificationPermission ? 'true' : 'false');
      }
    } catch (error) {
      console.error('Error syncing OneSignal ID:', error);
    }
  }

  async syncNotificationStatus(): Promise<void> {
    if (!this.user?.id || !this.oneSignalInitialized) return;
    
    try {
      if (this.user.phone) {
        await OneSignal.User.addTag('phone', this.user.phone);
        await OneSignal.User.addTag('userId', this.user.id);
        await OneSignal.User.addTag('pushEnabled', this.hasNotificationPermission ? 'true' : 'false');
      }
      
      if (!this.oneSignalId) {
        await this.fetchOneSignalId();
      }

      await this.api.post('/update_user_devices.php', {
        userId: this.user.id,
        oneSignalId: this.oneSignalId,
        pushEnabled: this.hasNotificationPermission ? 1 : 0
      });
    } catch (error) {
      console.error('Error syncing notification status:', error);
    }
  }



  // Вызывать после успешной авторизации
  async handleLoginSuccess(userData: any) {
    //this.user = userData;
    await this.syncNotificationStatus();
    await this.syncOneSignalIdWithServer();
  }



  // Загрузка сохраненного состояния при инициализации
  async loadAuthState() {
    try {
      const token = storage.getString("token");
      const userJson = storage.getString("user");
      const notificationPermission = storage.getBoolean("hasNotificationPermission");
      
      //this.handleLoginSuccess();
      
      if (token && userJson) {
        this.token = token;
        this.user = JSON.parse(userJson);
        this.phoneNumber = this.user.phone;
        this.isLoggedIn = true;

        if (notificationPermission !== undefined) {
          this.hasNotificationPermission = notificationPermission;
        }
        
        // Проверяем валидность токена
        await this.checkAuth();
      }
    } catch (error) {
      console.error("Failed to load auth state:", error);
    }
  }

  // Отправка кода подтверждения
  async sendVerificationCode(phoneNumber: string) {
    this.isLoading = true;
    this.error = "";
    this.phoneNumber = phoneNumber;
    console.log(this.phoneNumber);
    try {
      const response = await this.api.post("/auth.php", {
        action: "request_code",
        phone: phoneNumber,
      });

      if (!response.data.success) {
        
        throw new Error(response.data.message || "Failed to send verification code");
        
      }

      return response.data;
    } catch (error) {
      this.error = error.message;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // Проверка кода подтверждения
  async verifyCode(code) {
    this.isLoading = true;
    this.error = "";
   

    try {
      const response = await this.api.post("/auth.php", {
        action: "verify_code",
        phone: this.phoneNumber,
        code: code,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Invalid verification code");
      }

      // Сохраняем данные авторизации
      this.token = response.data.token;
      this.user = {
        id: response.data.user_id,
        phone: this.phoneNumber
      };
      this.isLoggedIn = true;

      // Загружаем полный профиль
      await this.fetchProfile();

      // Сохраняем в хранилище
      this.persistAuthState();
      await this.syncOneSignalIdWithServer();
      await this.syncNotificationStatus();
      
      return response.data;
    } catch (error) {
      this.error = error.message || "Failed to verify code";
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // Получение профиля пользователя
  async fetchProfile() {
    if (!this.user) return;

    this.isLoading = true;
    this.error = "";

    try {
      const response = await this.api.get("/get_profile.php");
      
      if (response.data.success) {
        this.user = {
          ...this.user,
          firstName: response.data.first_name,
          lastName: response.data.last_name,
          middleName: response.data.middle_name,
          email: response.data.email,
          birthDate: response.data.birth_date,
          gender: response.data.gender
        };
        
        this.persistAuthState();
      }

      return response.data;
    } catch (error) {
      this.error = error.message;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }


  set hasNotificationPermission(value: boolean) {
   
    this._hasNotificationPermission = value;
    storage.set("hasNotificationPermission", value);
    this.syncNotificationStatus();
  }

  get hasNotificationPermission() {
    return this._hasNotificationPermission;
  }

  

  // Обновление профиля пользователя
  async updateProfile(profileData: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    email?: string;
    birthDate?: string;
    gender?: 'male' | 'female' | 'other';
  })
  {
    
    if (!this.user) return;

    this.isLoading = true;
    this.error = "";
    
    try {
      const response = await this.api.patch("/update_profile.php", profileData);
      
      if (response.data.success) {
        this.user = {
          ...this.user,
          ...profileData
        };
        
        this.persistAuthState();
      }

      return response.data;
    } catch (error) {
      this.error = error.message;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }


  // Выход из системы
  logout() {
    this.token = "";
    this.phoneNumber = "";
    this.user = null;
    this.isLoggedIn = false;
    this.error = "";

    // Очищаем хранилище
    storage.delete("token");
    storage.delete("user");
  }

  // Проверка авторизации
  async checkAuth() {
    if (!this.token) return false;

    try {
      const response = await this.api.get("/validate_token.php", {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!response.data.valid) {
        this.logout();
        return false;
      }

      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  // Сохранение состояния в хранилище
 persistAuthState() {
    if (this.token && this.user) {
      storage.set("token", this.token);
      storage.set("user", JSON.stringify(this.user));
    }
  }
}

export const authStore = new AuthStore();