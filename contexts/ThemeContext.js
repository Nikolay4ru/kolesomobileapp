// contexts/ThemeContext.js - Безопасная версия без зависимостей от Store
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { MMKV } from 'react-native-mmkv';

// Создаем отдельный экземпляр MMKV для темы
const themeStorage = new MMKV({ id: 'theme-storage' });

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

  // Определяем текущую тему
  const currentTheme = themeMode === 'system' ? systemColorScheme : themeMode;

  // Загружаем сохраненную тему при запуске
  useEffect(() => {
    try {
      const savedTheme = themeStorage.getString('themeMode');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Изменяем тему
  const changeTheme = (mode) => {
    if (!['light', 'dark', 'system'].includes(mode)) {
      console.error('Invalid theme mode:', mode);
      return;
    }
    
    try {
      setThemeMode(mode);
      themeStorage.set('themeMode', mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Значение контекста
  const value = {
    theme: currentTheme || 'light',
    themeMode,
    changeTheme,
    isLoading,
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

// Светлая тема
export const lightColors = {
  // Основные цвета
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  
  // Цвета бренда
  primary: '#007AFF',
  primaryLight: '#4DA2FF',
  primaryDark: '#0051D5',
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
  warning: '#FF9500',
  success: '#34C759',
  info: '#007AFF',
  
  // Компоненты
  tabBar: '#FFFFFF',
  tabBarBorder: '#E0E0E0',
  headerBackground: '#FFFFFF',
  inputBackground: '#F5F5F5',
  buttonDisabled: '#E0E0E0',
  placeholder: '#999999',
  
  // Градиенты
  gradientStart: '#007AFF',
  gradientEnd: '#0051D5',
};

// Темная тема
export const darkColors = {
  // Основные цвета
  background: '#000000',
  surface: '#1C1C1E',
  card: '#1C1C1E',
  
  // Цвета бренда
  primary: '#0A84FF',
  primaryLight: '#4DA2FF',
  primaryDark: '#0051D5',
  secondary: '#32D74B',
  
  // Текст
  text: '#FFFFFF',
  textSecondary: '#999999',
  textTertiary: '#666666',
  textInverse: '#000000',
  
  // Вспомогательные
  border: '#38383A',
  divider: '#2C2C2E',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  // Состояния
  error: '#FF453A',
  warning: '#FF9F0A',
  success: '#32D74B',
  info: '#0A84FF',
  
  // Компоненты
  tabBar: '#1C1C1E',
  tabBarBorder: '#38383A',
  headerBackground: '#1C1C1E',
  inputBackground: '#2C2C2E',
  buttonDisabled: '#38383A',
  placeholder: '#666666',
  
  // Градиенты
  gradientStart: '#0A84FF',
  gradientEnd: '#0051D5',
};

// Функция для получения цветов без использования контекста
export const getColors = (theme) => {
  return theme === 'dark' ? darkColors : lightColors;
};