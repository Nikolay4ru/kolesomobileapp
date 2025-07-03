// utils/storage.ts
import { MMKV } from 'react-native-mmkv';

// Основное хранилище для общих данных
export const storage = new MMKV({
  id: 'koleso-app-storage',
});

// Защищенное хранилище для чувствительных данных
export const secureStorage = new MMKV({
  id: 'koleso-app-secure-storage',
  encryptionKey: 'koleso-app-encryption-key-2024' // В реальном приложении используйте более сложный ключ
});

// Хранилище для данных версий
export const versionStorage = new MMKV({
  id: 'app-version-storage',
});

// Хранилище для настроек
export const settingsStorage = new MMKV({
  id: 'app-settings-storage',
});

// Утилиты для работы с MMKV

export const StorageKeys = {
  // Версии
  LAST_VERSION_CHECK: 'last_version_check',
  DEVICE_ID: 'device_id',
  APP_VERSION: 'app_version',
  
  // Авторизация
  AUTH_TOKEN: 'auth_token',
  USER_ID: 'user_id',
  USER_PHONE: 'user_phone',
  
  // Настройки
  THEME_MODE: 'theme_mode',
  NOTIFICATIONS_ENABLED: 'notifications',
  ADMIN_NOTIFICATIONS_ENABLED: 'adminNotifications',
  SHOW_EMPLOYEE_DASHBOARD: 'showEmployeeDashboard',
  
  // OneSignal
  ONESIGNAL_USER_ID: 'onesignal_user_id',
  ONESIGNAL_PLAYER_ID: 'onesignal_player_id',
} as const;

// Класс-обертка для удобной работы с MMKV
export class MMKVStorage {
  private storage: MMKV;
  
  constructor(storage: MMKV) {
    this.storage = storage;
  }
  
  // Строки
  getString(key: string): string | undefined {
    return this.storage.getString(key);
  }
  
  setString(key: string, value: string): void {
    this.storage.set(key, value);
  }
  
  // Числа
  getNumber(key: string): number | undefined {
    return this.storage.getNumber(key);
  }
  
  setNumber(key: string, value: number): void {
    this.storage.set(key, value);
  }
  
  // Булевы значения
  getBoolean(key: string): boolean | undefined {
    return this.storage.getBoolean(key);
  }
  
  setBoolean(key: string, value: boolean): void {
    this.storage.set(key, value);
  }
  
  // JSON объекты
  getObject<T>(key: string): T | undefined {
    const jsonString = this.storage.getString(key);
    if (!jsonString) return undefined;
    
    try {
      return JSON.parse(jsonString) as T;
    } catch {
      return undefined;
    }
  }
  
  setObject<T>(key: string, value: T): void {
    this.storage.set(key, JSON.stringify(value));
  }
  
  // Удаление
  delete(key: string): void {
    this.storage.delete(key);
  }
  
  // Проверка существования
  contains(key: string): boolean {
    return this.storage.contains(key);
  }
  
  // Очистка всего хранилища
  clearAll(): void {
    this.storage.clearAll();
  }
  
  // Получение всех ключей
  getAllKeys(): string[] {
    return this.storage.getAllKeys();
  }
  
  // Множественное удаление
  multiDelete(keys: string[]): void {
    keys.forEach(key => this.storage.delete(key));
  }
}

// Экспортируем готовые к использованию экземпляры
export const appStorage = new MMKVStorage(storage);
export const appSecureStorage = new MMKVStorage(secureStorage);
export const appVersionStorage = new MMKVStorage(versionStorage);
export const appSettingsStorage = new MMKVStorage(settingsStorage);

// Функция миграции из AsyncStorage в MMKV
export const migrateFromAsyncStorage = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Список ключей для миграции
    const keysToMigrate = [
      'auth_token',
      'user_id',
      'user_phone',
      'theme_mode',
      'notifications',
      'adminNotifications',
      'showEmployeeDashboard',
      'device_id',
      'last_version_check',
    ];
    
    for (const key of keysToMigrate) {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        // Определяем тип значения и сохраняем в соответствующее хранилище
        if (key.includes('token') || key.includes('user')) {
          appSecureStorage.setString(key, value);
        } else if (key.includes('version') || key.includes('device')) {
          appVersionStorage.setString(key, value);
        } else if (key.includes('notifications') || key.includes('theme')) {
          appSettingsStorage.setString(key, value);
        } else {
          appStorage.setString(key, value);
        }
        
        // Удаляем из AsyncStorage
        await AsyncStorage.removeItem(key);
      }
    }
    
    console.log('Migration from AsyncStorage to MMKV completed');
  } catch (error) {
    console.error('Error during migration:', error);
  }
};

// Функция для отладки - выводит все сохраненные данные
export const debugStorage = () => {
  console.log('=== MMKV Storage Debug ===');
  
  console.log('Main Storage:', storage.getAllKeys());
  storage.getAllKeys().forEach(key => {
    console.log(`  ${key}:`, storage.getString(key));
  });
  
  console.log('\nVersion Storage:', versionStorage.getAllKeys());
  versionStorage.getAllKeys().forEach(key => {
    console.log(`  ${key}:`, versionStorage.getString(key));
  });
  
  console.log('\nSettings Storage:', settingsStorage.getAllKeys());
  settingsStorage.getAllKeys().forEach(key => {
    console.log(`  ${key}:`, settingsStorage.getString(key));
  });
  
  console.log('========================');
};