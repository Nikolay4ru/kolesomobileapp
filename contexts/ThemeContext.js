// contexts/ThemeContext.js - Безопасная версия без зависимостей от Store
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance, useColorScheme, Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import { MMKV } from 'react-native-mmkv';

// Создаем отдельный экземпляр MMKV для темы
const themeStorage = new MMKV({ id: 'theme-storage' });

// --- Новый код: Функция для управления нативной темой на Android через NativeModule
export function setNativeNightMode(mode) {
  // mode: 'light' | 'dark' | 'system'
  if (Platform.OS !== 'android') return;
  
  try {
    // Для MIUI используем более мягкий подход
    const isMIUI = NativeModules.ThemeModule?.isMIUIDevice;
    
    if (isMIUI) {
      // На MIUI не меняем системную тему, только сохраняем настройку
      return;
    }
    
    // Мапим значения для Android
    let androidMode;
    switch (mode) {
      case 'light':
        androidMode = 'MODE_NIGHT_NO';
        break;
      case 'dark':
        androidMode = 'MODE_NIGHT_YES';
        break;
      case 'system':
      default:
        androidMode = 'MODE_NIGHT_FOLLOW_SYSTEM';
        break;
    }
    
    NativeModules.ThemeModule?.setNightMode(androidMode);
  } catch (e) {
    // Безопасный fallback, если модуль не подключён
    console.warn('ThemeModule.setNightMode unavailable:', e?.message);
  }
}

// Функция для проверки, является ли устройство Xiaomi/MIUI
async function checkIfMIUIDevice() {
  try {
    if (Platform.OS !== 'android') return false;
    
    // Проверяем через нативный модуль
    if (NativeModules.ThemeModule?.isMIUIDevice) {
      return await NativeModules.ThemeModule.isMIUIDevice();
    }
    
    // Fallback проверка через DeviceInfo
    if (NativeModules.DeviceInfo) {
      const manufacturer = await NativeModules.DeviceInfo.getManufacturer();
      return manufacturer?.toLowerCase().includes('xiaomi');
    }
    
    return false;
  } catch (e) {
    console.warn('Failed to check MIUI device:', e);
    return false;
  }
}

// Создаем контекст
const ThemeContext = createContext(undefined);

// Хук для использования темы
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Провайдер темы
export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');
  const [isLoading, setIsLoading] = useState(true);
  const [isMIUI, setIsMIUI] = useState(false);
  const [forcedTheme, setForcedTheme] = useState(null);

  // Определяем текущую тему с учетом принудительной темы для MIUI
  const currentTheme = forcedTheme || (themeMode === 'system' ? systemColorScheme : themeMode);

  // Проверяем MIUI при запуске
  useEffect(() => {
    checkIfMIUIDevice().then(setIsMIUI);
  }, []);

  // Загружаем сохраненную тему при запуске
  useEffect(() => {
    try {
      const savedTheme = themeStorage.getString('themeMode');
      const savedForcedTheme = themeStorage.getString('forcedTheme');
      
      if (savedForcedTheme && isMIUI) {
        setForcedTheme(savedForcedTheme);
      }
      
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isMIUI]);

  // --- Новый код: Синхронизация выбора темы с нативным Android-уровнем
  useEffect(() => {
    if (isLoading) return;
    
    // Для MIUI используем принудительную установку
    if (isMIUI && themeMode !== 'system') {
      setForcedTheme(themeMode);
      themeStorage.set('forcedTheme', themeMode);
    } else {
      setForcedTheme(null);
      themeStorage.delete('forcedTheme');
    }
    
    setNativeNightMode(themeMode);
  }, [themeMode, isLoading, isMIUI]);

  // Слушаем изменения темы от системы
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Если установлен режим "system" и нет принудительной темы
      if (themeMode === 'system' && !forcedTheme) {
        // Для MIUI может потребоваться дополнительная синхронизация
        if (isMIUI && Platform.OS === 'android') {
          setNativeNightMode('system');
        }
      }
    });

    return () => subscription?.remove();
  }, [themeMode, forcedTheme, isMIUI]);

  // Слушаем события от нативного модуля (для MIUI)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const themeChangeListener = DeviceEventEmitter.addListener(
      'onThemeChanged',
      (event) => {
        console.log('Native theme changed:', event);
        // Обрабатываем принудительное изменение темы от системы
        if (isMIUI && event.theme) {
          setForcedTheme(event.theme);
        }
      }
    );

    return () => themeChangeListener.remove();
  }, [isMIUI]);

  // Изменяем тему
  const changeTheme = (mode) => {
    if (!['light', 'dark', 'system'].includes(mode)) {
      console.error('Invalid theme mode:', mode);
      return;
    }

    try {
      setThemeMode(mode);
      themeStorage.set('themeMode', mode);
      
      // Для MIUI сохраняем принудительную тему
      if (isMIUI && mode !== 'system') {
        setForcedTheme(mode);
        themeStorage.set('forcedTheme', mode);
      } else {
        setForcedTheme(null);
        themeStorage.delete('forcedTheme');
      }
      
      // --- Новый код: При смене темы сразу дергаем нативный слой
      setNativeNightMode(mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Специальная функция для MIUI устройств
  const forceThemeForMIUI = (theme) => {
    if (!isMIUI) return;
    
    try {
      setForcedTheme(theme);
      themeStorage.set('forcedTheme', theme);
      
      if (NativeModules.ThemeModule?.forceTheme) {
        NativeModules.ThemeModule.forceTheme(theme);
      }
    } catch (error) {
      console.error('Error forcing theme for MIUI:', error);
    }
  };

  // Сброс к системной теме
  const resetToSystemTheme = () => {
    changeTheme('system');
    setForcedTheme(null);
    themeStorage.delete('forcedTheme');
  };

  // Значение контекста
  const value = {
    theme: currentTheme || 'light',
    themeMode,
    changeTheme,
    isLoading,
    isMIUI,
    forcedTheme,
    forceThemeForMIUI,
    resetToSystemTheme,
    colors: currentTheme === 'dark' ? darkColors : lightColors,
  };

  // Не рендерим детей пока не загрузили тему
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Светлая тема - обновленные цвета для лучшей совместимости с MIUI
export const lightColors = {
  // Основные цвета
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',

  // Цвета бренда (адаптированы для Koleso.app)
  primary: '#006363',
  primaryLight: '#E6F4F4',
  primaryDark: '#004545',
  secondary: '#34C759',

  // Текст
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',

  // Вспомогательные
  border: '#E0E0E0',
  divider: '#F0F0F0',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Состояния
  error: '#FF3B30',
  errorLight: '#FEE2E2',
  warning: '#FF9500',
  warningLight: '#FEF3C7',
  success: '#34C759',
  successLight: '#D1FAE5',
  info: '#007AFF',
  infoLight: '#DBEAFE',

  // Компоненты
  tabBar: '#FFFFFF',
  tabBarBorder: '#E0E0E0',
  headerBackground: '#F5F5F5',
  inputBackground: '#F5F5F5',
  buttonDisabled: '#E0E0E0',
  placeholder: '#999999',

  // Градиенты
  gradientStart: '#006363',
  gradientEnd: '#004545',
};

// Темная тема - оптимизирована для MIUI Dark Mode
export const darkColors = {
  // Основные цвета
  background: '#000000',
  surface: '#1C1C1E',
  card: '#1C1C1E',

  // Цвета бренда (адаптированы для темной темы)
  primary: '#00A3A3',
  primaryLight: '#004545',
  primaryDark: '#00D4D4',
  secondary: '#32D74B',

  // Текст
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  textInverse: '#000000',

  // Вспомогательные
  border: '#2C2C2E',
  divider: '#2C2C2E',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Состояния
  error: '#FF453A',
  errorLight: '#4D1F1F',
  warning: '#FF9F0A',
  warningLight: '#4D3F1F',
  success: '#32D74B',
  successLight: '#1F4D2F',
  info: '#0A84FF',
  infoLight: '#1F3F4D',

  // Компоненты
  tabBar: '#1C1C1E',
  tabBarBorder: '#2C2C2E',
  headerBackground: '#1C1C1E',
  inputBackground: '#2C2C2E',
  buttonDisabled: '#38383A',
  placeholder: '#48484A',

  // Градиенты
  gradientStart: '#00A3A3',
  gradientEnd: '#006363',
};

// Функция для получения цветов без использования контекста
export const getColors = (theme) => {
  return theme === 'dark' ? darkColors : lightColors;
};

// Экспорт дополнительных утилит для работы с MIUI
export const MIUIThemeUtils = {
  checkIfMIUIDevice,
  setNativeNightMode,
  
  // Получить рекомендуемую тему для MIUI
  getRecommendedTheme: async () => {
    const isMIUI = await checkIfMIUIDevice();
    if (isMIUI) {
      // Для MIUI рекомендуем использовать явную установку темы
      const savedTheme = themeStorage.getString('forcedTheme');
      return savedTheme || 'light';
    }
    return 'system';
  },
  
  // Проверить поддержку нативного модуля
  isNativeModuleAvailable: () => {
    return Platform.OS === 'android' && !!NativeModules.ThemeModule;
  },
};