// stores/AuthStore.js
import { makeAutoObservable } from "mobx";
import { MMKV } from "react-native-mmkv";
import { createApi, ApiInstance } from "../api";
import { OneSignal } from 'react-native-onesignal';

const storage = new MMKV();
const ONESIGNAL_APP_ID = "77c64a7c-678f-4de8-811f-9cac6c1b58e1";

// Константы для ключей хранилища
const STORAGE_KEYS = {
  TOKEN: "token",
  USER: "user",
  NOTIFICATION_PERMISSION: "hasNotificationPermission",
  STARTUP_SCREEN: "startupScreen", // новый ключ для настройки стартового экрана
  SHOW_EMPLOYEE_DASHBOARD: "showEmployeeDashboard" // показывать ли панель сотрудника при запуске
};

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

type AdminProfile = {
  id: string;
  userId: string;
  storeId: number | null;
  role: 'admin' | 'manager' | 'director'; // добавлена роль директора
};

class AuthStore {
  // Основные поля
  phoneNumber = "";
  isLoggedIn = false;
  isLoading = false;
  error = "";
  token = "";
  user: UserProfile | null = null;
  
  // Админ поля
  isAdmin = false;
  admin: AdminProfile | null = null;
  
  // Настройки стартового экрана
  showEmployeeDashboard = false;
  
  // OneSignal поля
  oneSignalId: string | null = null;
  pushSubscriptionId: string | null = null;
  oneSignalInitialized = false;
  isNotificationPermissionRequested = false;
  
  // Приватные поля
  _hasNotificationPermission = false;
  api;

  constructor() {
    makeAutoObservable(this);
    this.api = createApi(this);
    this.loadAuthState();
  }

  // Геттеры для ролей
  get isManager() {
    return this.isAdmin && this.admin?.role === 'manager';
  }

  get isDirector() {
    return this.isAdmin && this.admin?.role === 'director';
  }

  get canAccessEmployeeDashboard() {
    return this.isAdmin || this.isManager || this.isDirector;
  }

  // Геттер и сеттер для настройки панели сотрудника
  setShowEmployeeDashboard(value: boolean) {
    this.showEmployeeDashboard = value;
    try {
      storage.set(STORAGE_KEYS.SHOW_EMPLOYEE_DASHBOARD, value);
    } catch (error) {
      console.error('Error saving employee dashboard preference:', error);
    }
  }

  // Геттер и сеттер для уведомлений
  get hasNotificationPermission() {
    return this._hasNotificationPermission;
  }

  set hasNotificationPermission(value) {
    // Приводим к boolean и проверяем валидность
    const boolValue = Boolean(value);
    
    this._hasNotificationPermission = boolValue;
    
    try {
      storage.set(STORAGE_KEYS.NOTIFICATION_PERMISSION, boolValue);
    } catch (error) {
      console.error('Error saving notification permission to storage:', error);
      console.log('Attempted to save value:', value, 'Type:', typeof value);
    }
    
    this.syncNotificationStatus();
  }

  get isNotificationDenied() {
    return this.isNotificationPermissionRequested && !this.hasNotificationPermission;
  }

  // === ONESIGNAL МЕТОДЫ ===
  
async initializeOneSignal() {
  if (this.oneSignalInitialized) return;

  try {
    console.log('Starting OneSignal initialization...');
    
    // ВАЖНО: Сбрасываем флаг запроса разрешений при каждой инициализации
    this.isNotificationPermissionRequested = false;
    
    OneSignal.initialize(ONESIGNAL_APP_ID);
    this.oneSignalInitialized = true;
    console.log('OneSignal initialized successfully');

    // Сначала устанавливаем слушатели
    this.setupOneSignalListeners();
    
    // Добавляем небольшую задержку для iOS
    if (Platform.OS === 'ios') {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Затем настраиваем разрешения
    await this.setupNotificationPermissions();
    
    // Пытаемся получить ID сразу после инициализации
    await this.fetchOneSignalIds();
    
    // Если OneSignal ID все еще null, пытаемся через некоторое время
    if (!this.oneSignalId) {
      console.log('OneSignal ID not available immediately, retrying...');
      setTimeout(() => this.retryFetchOneSignalId(), 2000);
      setTimeout(() => this.retryFetchOneSignalId(), 5000);
      setTimeout(() => this.retryFetchOneSignalId(), 10000);
    }
  } catch (error) {
    console.error('OneSignal initialization error:', error);
    this.oneSignalInitialized = false;
  }
}

async setupNotificationPermissions() {
  // Загружаем сохраненное значение
  const savedPermission = storage.getBoolean(STORAGE_KEYS.NOTIFICATION_PERMISSION);
  if (savedPermission !== undefined) {
    this._hasNotificationPermission = Boolean(savedPermission);
  }

  // Проверяем текущее разрешение из системы
  const currentPermission = await this.getSystemNotificationPermission();
  console.log('Current notification permission:', currentPermission);
  
  if (currentPermission === 'notDetermined') {
    // Для iOS всегда запрашиваем разрешение при первом запуске
    if (Platform.OS === 'ios' && !this.isNotificationPermissionRequested) {
      console.log('iOS: Requesting notification permission for the first time');
      await this.requestNotificationPermission();
    } else if (!this.isNotificationPermissionRequested) {
      console.log('Requesting notification permission');
      await this.requestNotificationPermission();
    }
  } else if (currentPermission === 'granted') {
    this._hasNotificationPermission = true;
    this.isNotificationPermissionRequested = true; // Помечаем что уже спрашивали
  } else if (currentPermission === 'denied') {
    this._hasNotificationPermission = false;
    this.isNotificationPermissionRequested = true;
  }
}

async requestNotificationPermission() {
  if (!this.oneSignalInitialized) {
    console.log('OneSignal not initialized, cannot request permission');
    return false;
  }

  // Проверяем текущий статус
  const currentPermission = await this.getSystemNotificationPermission();
  console.log('Current permission before request:', currentPermission);
  
  if (currentPermission === 'denied') {
    console.log('Permission already denied by user');
    this.isNotificationPermissionRequested = true;
    this._hasNotificationPermission = false;
    return false;
  }

  try {
    console.log('Requesting notification permission...');
    
    // Используем промпт iOS стиля
    const result = await OneSignal.Notifications.requestPermission(true);
    
    console.log('Permission request result:', result);
    
    // Обновляем состояние
    this.isNotificationPermissionRequested = true;
    const boolResult = Boolean(result);
    this.hasNotificationPermission = boolResult;
    
    if (boolResult) {
      // Даем время системе обработать разрешение
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.fetchOneSignalIds();
    }
    
    return boolResult;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    this.isNotificationPermissionRequested = true;
    return false;
  }
}

async setupNotificationPermissions() {
  const savedPermission = storage.getBoolean(STORAGE_KEYS.NOTIFICATION_PERMISSION);
  if (savedPermission !== undefined) {
    this._hasNotificationPermission = Boolean(savedPermission);
  }

  const currentPermission = await this.getSystemNotificationPermission();
  console.log('Current notification permission:', currentPermission);
  
  // Для iOS всегда запрашиваем при первом запуске
  if (Platform.OS === 'ios' && currentPermission === 'notDetermined') {
    // Сбрасываем флаг для iOS
    this.isNotificationPermissionRequested = false;
    await this.requestNotificationPermission();
  } else if (currentPermission === 'notDetermined' && !this.isNotificationPermissionRequested) {
    await this.requestNotificationPermission();
  } else if (currentPermission === 'granted') {
    this._hasNotificationPermission = true;
  } else if (currentPermission === 'denied') {
    this._hasNotificationPermission = false;
    this.isNotificationPermissionRequested = true;
  }
}

  // хелпер для получения статуса разрешения
  async getSystemNotificationPermission() {
    if (!this.oneSignalInitialized) return 'notDetermined';

    try {
      const permission = await OneSignal.Notifications.getPermissionAsync();
      // по OneSignal: 1 — granted, 0 — denied, null/undefined — notDetermined
      if (permission === 1 || permission === true) return 'granted';
      if (permission === 0 || permission === false) return 'denied';
      return 'notDetermined';
    } catch (e) {
      return 'notDetermined';
    }
  }

  setupOneSignalListeners() {
    console.log('Setting up OneSignal listeners...');
    
    OneSignal.Notifications.addEventListener('permissionChange', (event) => {
      console.log('Permission changed:', event.hasPermission, 'Type:', typeof event.hasPermission);
      this.hasNotificationPermission = Boolean(event.hasPermission);
      
      // Если разрешение получено, пытаемся получить OneSignal ID
      if (event.hasPermission && !this.oneSignalId) {
        console.log('Permission granted, attempting to fetch OneSignal ID...');
        setTimeout(() => this.retryFetchOneSignalId(), 1000);
      }
    });

    OneSignal.User.addEventListener('stateChange', async (changes) => {
      console.log('OneSignal state changed:', JSON.stringify(changes, null, 2));
      let shouldSync = false;

      if (changes.onesignalId?.current) {
        console.log('OneSignal ID received from listener:', changes.onesignalId.current);
        this.oneSignalId = changes.onesignalId.current;
        shouldSync = true;
      }
      
      if (changes.pushSubscriptionId?.current) {
        console.log('Push Subscription ID received from listener:', changes.pushSubscriptionId.current);
        this.pushSubscriptionId = changes.pushSubscriptionId.current;
        shouldSync = true;
      }

      if (shouldSync) {
        await this.syncOneSignalIdWithServer();
      }
    });

    // Добавляем дополнительный слушатель для отслеживания изменений пользователя
    OneSignal.User.addEventListener('change', (event) => {
      console.log('OneSignal user changed:', JSON.stringify(event, null, 2));
    });
  }

  async checkNotificationPermission() {
    if (!this.oneSignalInitialized) return false;
    
    try {
      const permission = await OneSignal.Notifications.getPermissionAsync();
      const boolPermission = Boolean(permission);
      this._hasNotificationPermission = boolPermission;
      return boolPermission;
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  async requestNotificationPermission() {
    if (!this.oneSignalInitialized) return false;

    // Проверяем, не заблокировано ли в системе
    const currentPermission = await this.getSystemNotificationPermission();
    if (currentPermission === 'denied') {
      this.isNotificationPermissionRequested = true; // Не запрашиваем повторно
      this._hasNotificationPermission = false;
      return false;
    }

    try {
      console.log('Requesting notification permission...');
      this.isNotificationPermissionRequested = true;
      const result = await OneSignal.Notifications.requestPermission(true);
      const boolResult = Boolean(result);
      this.hasNotificationPermission = boolResult;
      if (boolResult) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.fetchOneSignalIds();
      }
      return boolResult;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async fetchOneSignalIds() {
    if (!this.oneSignalInitialized) return;
    
    console.log('Attempting to fetch OneSignal IDs...');
    
    try {
      // Получаем оба ID параллельно
      const [oneSignalId, pushSubscriptionId] = await Promise.all([
        OneSignal.User.getOnesignalId().catch(error => {
          console.warn('OneSignal ID not available yet:', error.message);
          return null;
        }),
        OneSignal.User.pushSubscription.getIdAsync().catch(error => {
          console.warn('Push Subscription ID not available yet:', error.message);
          return null;
        })
      ]);

      console.log('Fetched OneSignal IDs:', { oneSignalId, pushSubscriptionId });

      let shouldSync = false;

      if (oneSignalId && oneSignalId !== this.oneSignalId) {
        console.log('OneSignal ID updated:', oneSignalId);
        this.oneSignalId = oneSignalId;
        shouldSync = true;
      }

      if (pushSubscriptionId && pushSubscriptionId !== this.pushSubscriptionId) {
        console.log('Push Subscription ID updated:', pushSubscriptionId);
        this.pushSubscriptionId = pushSubscriptionId;
        shouldSync = true;
      }

      // Синхронизируем с сервером если есть хотя бы один ID или если есть изменения
      if (shouldSync || (this.oneSignalId || this.pushSubscriptionId)) {
        await this.syncOneSignalIdWithServer();
      }

      return { oneSignalId, pushSubscriptionId };
    } catch (error) {
      console.error('Error fetching OneSignal IDs:', error);
      return { oneSignalId: null, pushSubscriptionId: null };
    }
  }

  async retryFetchOneSignalId() {
    if (this.oneSignalId) return; // Уже получили
    
    console.log('Retrying to fetch OneSignal ID...');
    
    try {
      // Проверяем состояние разрешений
      const hasPermission = await this.checkNotificationPermission();
      console.log('Current notification permission:', hasPermission);
      
      // Пытаемся получить OneSignal ID разными способами
      const oneSignalId = await OneSignal.User.getOnesignalId();
      
      if (oneSignalId) {
        console.log('OneSignal ID finally obtained:', oneSignalId);
        this.oneSignalId = oneSignalId;
        await this.syncOneSignalIdWithServer();
      } else {
        console.log('OneSignal ID still not available');
        
        // Попробуем через альтернативный способ
        try {
          const deviceState = await OneSignal.User.getUser();
          console.log('OneSignal device state:', deviceState);
        } catch (e) {
          console.log('Could not get device state:', e.message);
        }
      }
    } catch (error) {
      console.error('Error in retry fetch OneSignal ID:', error);
    }
  }

  async syncOneSignalIdWithServer() {
    // Изменили условие - отправляем если есть хотя бы один из ID
    if ((!this.oneSignalId && !this.pushSubscriptionId) || !this.user?.id) return;

    try {
      await Promise.all([
        this.api.post('/update_user_devices.php', {
          userId: this.user.id,
          oneSignalId: this.oneSignalId,
          pushSubscriptionId: this.pushSubscriptionId,
          pushEnabled: this.hasNotificationPermission ? 1 : 0
        }),
        this.setOneSignalTags()
      ]);
    } catch (error) {
      console.error('Error syncing OneSignal ID:', error);
    }
  }

  async setOneSignalTags() {
    if (!this.user?.phone) return;

    try {
      await Promise.all([
        OneSignal.User.addAlias("PHONE", this.user.phone),
        OneSignal.User.addTag('phone', this.user.phone),
        OneSignal.User.addTag('userId', this.user.id),
        OneSignal.User.addTag('pushEnabled', this.hasNotificationPermission ? 'true' : 'false')
      ]);
    } catch (error) {
      console.error('Error setting OneSignal tags:', error);
    }
  }

  async syncNotificationStatus() {
    if (!this.user?.id || !this.oneSignalInitialized) return;
    
    try {
      // Устанавливаем теги если есть телефон
      if (this.user.phone) {
        await this.setOneSignalTags();
      }
      
      // Получаем ID если они отсутствуют
      if (!this.oneSignalId || !this.pushSubscriptionId) {
        await this.fetchOneSignalIds();
      }

      // Синхронизируем с сервером если есть хотя бы один ID
      if (this.oneSignalId || this.pushSubscriptionId) {
        await this.api.post('/update_user_devices.php', {
          userId: this.user.id,
          oneSignalId: this.oneSignalId,
          pushSubscriptionId: this.pushSubscriptionId,
          pushEnabled: this.hasNotificationPermission ? 1 : 0
        });
      }
    } catch (error) {
      console.error('Error syncing notification status:', error);
    }
  }

  // === АВТОРИЗАЦИЯ ===

  async loadAuthState() {
    try {
      const token = storage.getString(STORAGE_KEYS.TOKEN);
      const userJson = storage.getString(STORAGE_KEYS.USER);
      const notificationPermission = storage.getBoolean(STORAGE_KEYS.NOTIFICATION_PERMISSION);
      const showEmployeeDashboard = storage.getBoolean(STORAGE_KEYS.SHOW_EMPLOYEE_DASHBOARD);
      
      if (token && userJson) {
        this.token = token;
        this.user = JSON.parse(userJson);
        this.phoneNumber = this.user.phone;
        this.isLoggedIn = true;
        
        if (notificationPermission !== undefined) {
          this._hasNotificationPermission = Boolean(notificationPermission);
        }
        
        if (showEmployeeDashboard !== undefined) {
          this.showEmployeeDashboard = showEmployeeDashboard;
        }
        
        // Login в OneSignal если пользователь уже авторизован
        if (this.oneSignalInitialized && this.user?.id) {
          try {
            await OneSignal.login(this.user.id.toString());
            console.log('OneSignal login restored for user:', this.user.id);
          } catch (error) {
            console.error('Error restoring OneSignal login:', error);
          }
        }
        
        await Promise.all([
          this.checkAdminStatus(),
          this.checkAuth(),
          this.fetchProfile(),
        ]);
      }
    } catch (error) {
      console.error("Failed to load auth state:", error);
    //  this.logout();
    }
  }

  async sendVerificationCode(phoneNumber: string) {
    this.setLoadingState(true);
    this.phoneNumber = phoneNumber;
    
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
      this.setLoadingState(false);
    }
  }

  async verifyCode(code: string) {
    this.setLoadingState(true);

    try {
      const response = await this.api.post("/auth.php", {
        action: "verify_code",
        phone: this.phoneNumber,
        code: code,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Invalid verification code");
      }

      // Устанавливаем базовые данные
      this.token = response.data.token;
      this.user = {
        id: response.data.user_id,
        phone: this.phoneNumber
      };
      this.isLoggedIn = true;

      // Login в OneSignal с ID пользователя
      if (this.oneSignalInitialized && this.user.id) {
        try {
          await OneSignal.login(this.user.id.toString());
          console.log('OneSignal login successful for user:', this.user.id);
        } catch (error) {
          console.error('Error logging in to OneSignal:', error);
        }
      }

      // Выполняем дополнительные операции параллельно
      await Promise.all([
        this.fetchProfile(),
        this.checkAdminStatus(),
        this.syncOneSignalIdWithServer(),
        this.syncNotificationStatus()
      ]);

      this.persistAuthState();
      
      return response.data;
    } catch (error) {
      this.error = error.message || "Failed to verify code";
      throw error;
    } finally {
      this.setLoadingState(false);
    }
  }

  // Альтернативный метод login для обратной совместимости
  async login(phone: string, code: string) {
    this.phoneNumber = phone;
    return await this.verifyCode(code);
  }

  async fetchProfile() {
    console.log(this.user);
    if (!this.user) return;
    
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
        console.log(this.user);
        
        this.persistAuthState();
      }

      return response.data;
    } catch (error) {
      this.error = error.message;
      throw error;
    }
  }

  async checkAdminStatus() {
    if (!this.user) return;

    try {
      const response = await this.api.get("/check_admin.php");
      
      if (response.data.isAdmin) {
        this.isAdmin = true;
        this.admin = {
          id: response.data.id,
          userId: this.user.id,
          storeId: response.data.storeId,
          role: response.data.role || 'admin' // Поддержка старого API
        };
      } else {
        this.isAdmin = false;
        this.admin = null;
      }
    } catch (error) {
      console.error("Failed to check admin status:", error);
      this.isAdmin = false;
      this.admin = null;
    }
  }

  async updateProfile(profileData) {
    if (!this.user) return;

    this.setLoadingState(true);
    
    try {
      const response = await this.api.patch("/update_profile.php", profileData);
      
      if (response.data.success) {
        this.user = { ...this.user, ...profileData };
        this.persistAuthState();
      }

      return response.data;
    } catch (error) {
      this.error = error.message;
      throw error;
    } finally {
      this.setLoadingState(false);
    }
  }

  async updateAdminProfile(storeId: number | null, role: 'admin' | 'manager' | 'director') {
    if (!this.isAdmin || !this.admin) return;

    this.setLoadingState(true);
    
    try {
      const response = await this.api.patch("/update_admin.php", {
        storeId,
        role
      });
      
      if (response.data.success) {
        this.admin = { ...this.admin, storeId, role };
      }

      return response.data;
    } catch (error) {
      this.error = error.message;
      throw error;
    } finally {
      this.setLoadingState(false);
    }
  }

  // Метод для обновления OneSignal ID на сервере (для совместимости с App.js)
  async updateOneSignalId(oneSignalId) {
    if (!oneSignalId) return;
    
    // Если это новый ID, сохраняем его
    if (oneSignalId !== this.oneSignalId) {
      console.log('Updating OneSignal ID from external source:', oneSignalId);
      this.oneSignalId = oneSignalId;
      
      // Синхронизируем с сервером
      await this.syncOneSignalIdWithServer();
    }
  }


  async getDeviceId() {
    try {
      // Сначала пытаемся получить device_id из локального хранилища MMKV
      const storedDeviceId = storage.getString('device_id');
      if (storedDeviceId) {
        return storedDeviceId;
      }

      // Если нет в локальном хранилище и пользователь авторизован,
      // получаем с сервера
      if (!this.isLoggedIn || !this.token) {
        console.log('User not logged in, cannot fetch device ID');
        return null;
      }

      // Запрос к серверу для получения активного устройства
      const response = await this.api.get('/get_user_device.php', {
        headers: { 
          Authorization: `Bearer ${this.token}` 
        }
      });

      if (response.data.success && response.data.device) {
        const deviceId = response.data.device.id;
        
        // Сохраняем в локальное хранилище для последующего использования
        storage.set('device_id', deviceId.toString());
        
        return deviceId.toString();
      }

      // Если устройство не найдено на сервере, пытаемся создать новое
      if (this.oneSignalId) {
        const createResponse = await this.api.post('/update_user_devices.php', {
          userId: this.user.id,
          oneSignalId: this.oneSignalId,
          pushSubscriptionId: this.pushSubscriptionId,
          pushEnabled: this.hasNotificationPermission ? 1 : 0,
          deviceType: Platform.OS
        });

        if (createResponse.data.success && createResponse.data.deviceId) {
          const newDeviceId = createResponse.data.deviceId;
          storage.set('device_id', newDeviceId.toString());
          return newDeviceId.toString();
        }
      }

      console.log('No device found for user');
      return null;

    } catch (error) {
      console.error('Error getting device ID:', error);
      
      // В случае ошибки сети, возвращаем ID из локального хранилища
      const fallbackDeviceId = storage.getString('device_id');
      if (fallbackDeviceId) {
        return fallbackDeviceId;
      }
      
      return null;
    }
  }

  // Вспомогательная функция для сохранения device_id
  saveDeviceId(deviceId) {
    if (deviceId) {
      storage.set('device_id', deviceId.toString());
    }
  }

  // Функция для очистки device_id (при logout)
  clearDeviceId() {
    storage.delete('device_id');
  }

  logout() {
    // Logout из OneSignal
    if (this.oneSignalInitialized && this.user?.id) {
      try {
        OneSignal.logout();
      } catch (error) {
        console.error('Error logging out from OneSignal:', error);
      }
    }

    // Сбрасываем состояние
    this.token = "";
    this.phoneNumber = "";
    this.user = null;
    this.admin = null;
    this.isAdmin = false;
    this.isLoggedIn = false;
    this.error = "";
    this.oneSignalId = null;
    this.pushSubscriptionId = null;

    // Очищаем хранилище
    storage.delete(STORAGE_KEYS.TOKEN);
    storage.delete(STORAGE_KEYS.USER);
    // Очищаем device_id
    this.clearDeviceId();
    // Сохраняем настройки уведомлений и панели
    // storage.delete(STORAGE_KEYS.NOTIFICATION_PERMISSION);
    // storage.delete(STORAGE_KEYS.SHOW_EMPLOYEE_DASHBOARD);
  }

async checkAuth() {
  if (!this.token) return false;

  try {
    // Сначала проверяем наличие интернета
    const isConnected = await this.checkInternetConnection();
    if (!isConnected) {
      console.log('No internet connection, keeping user logged in');
      return true; // Считаем токен валидным при отсутствии соединения
    }

    const response = await this.api.get("/validate_token.php", {
      headers: { Authorization: `Bearer ${this.token}` },
      timeout: 10000 // 10 секунд таймаут
    });

    if (!response.data.valid) {
    //  this.logout();
    //  return false;
    }

    return true;
  } catch (error) {
    console.log('CheckAuth error:', error.message);
    
    // При ЛЮБОЙ ошибке сети не разлогиниваем
    if (this.isNetworkError(error) || !navigator.onLine) {
      console.log('Network error detected, keeping user logged in');
      return true;
    }
    
    // Только при явной ошибке авторизации (401, 403) разлогиниваем
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('Authentication failed, logging out');
     // this.logout();
      return false;
    }
    
    // Во всех остальных случаях сохраняем авторизацию
    console.log('Unknown error, keeping user logged in');
    return true;
  }
}

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

  setLoadingState(loading) {
    this.isLoading = loading;
    if (loading) {
      this.error = "";
    }
  }

  setPhoneNumber(phone: string) {
    this.phoneNumber = phone;
  }

async checkInternetConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут
    
    const response = await fetch('https://www.google.com/generate_204', { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true; // Если запрос прошел, значит есть интернет
  } catch (error) {
    console.log('Internet check failed:', error.message);
    return false;
  }
}

isNetworkError(error) {
  // Проверяем различные типы сетевых ошибок
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('offline') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connect') ||
    errorMessage.includes('internet') ||
    errorMessage.includes('timeout') ||
    errorCode === 'network_error' ||
    errorCode === 'econnaborted' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ETIMEDOUT' ||
    error.response?.status === 0 ||
    !navigator.onLine
  );
}

  persistAuthState() {
    if (this.token && this.user) {
      storage.set(STORAGE_KEYS.TOKEN, this.token);
      storage.set(STORAGE_KEYS.USER, JSON.stringify(this.user));
    }
  }

  // Обработчик успешного логина (для обратной совместимости)
  async handleLoginSuccess(userData) {
    await Promise.all([
      this.syncNotificationStatus(),
      this.syncOneSignalIdWithServer()
    ]);
  }
}

export const authStore = new AuthStore();