// App.tsx - Версия с отладкой для поиска проблемы
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, SafeAreaView } from "react-native";
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Navigation from "./navigation";
import { authStore } from "./stores/AuthStore";
import { PaperProvider } from 'react-native-paper';
import { favoritesStore } from "./stores/FavoritesStore";
import { cartStore } from "./stores/CartStore";
import { ordersStore } from "./stores/OrdersStore";
import { storagesStore } from "./stores/StoragesStore";
import { productStore } from "./stores/ProductStore";
import { StoreProvider } from "./StoreContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import AppMetrica from '@appmetrica/react-native-analytics';

// Простой компонент для тестирования
const TestComponent = () => {
  const { colors, theme } = useTheme();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 20 }}>
          Тема работает!
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
          Текущая тема: {theme}
        </Text>
      </View>
    </SafeAreaView>
  );
};

// Компонент для проверки StoreProvider
const StoreTestComponent = () => {
  const { authStore: auth } = useStores();
  
  return (
    <View style={{ padding: 20 }}>
      <Text>Store работает!</Text>
      <Text>Auth store доступен: {auth ? 'Да' : 'Нет'}</Text>
    </View>
  );
};

// Импортируем useStores
import { useStores } from "./useStores";

// Основной компонент приложения с полной функциональностью
const FullApp = () => {
  const { colors } = useTheme();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Инициализация AppMetrica
    try {
      AppMetrica.activate({
        apiKey: 'fd80c859-f747-42dd-a512-5ef0b48fd129',
        sessionTimeout: 120,
        logs: true
      });
      
      AppMetrica.reportEvent('Запуск');
      authStore.initializeOneSignal();
      setAppReady(true);
    } catch (error) {
      console.error('Ошибка инициализации:', error);
      setAppReady(true); // Продолжаем даже при ошибке
    }
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.text }}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <PaperProvider>
        <Navigation />
      </PaperProvider>
    </GestureHandlerRootView>
  );
};

// Главный компонент с поэтапной загрузкой для отладки
const App = () => {
  const [debugMode] = useState(false); // Измените на true для отладки
  const [testStep, setTestStep] = useState(0);

  const stores = {
    authStore,
    favoritesStore,
    productStore,
    cartStore,
    ordersStore,
    storagesStore
  };

  // Режим отладки - поэтапная проверка
  if (debugMode) {
    return (
      <StoreProvider value={stores}>
        <ThemeProvider>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 18, marginBottom: 20 }}>
                Тестирование компонентов:
              </Text>
              
              <TouchableOpacity 
                onPress={() => setTestStep(0)}
                style={{ padding: 10, backgroundColor: testStep === 0 ? '#007AFF' : '#ccc', marginBottom: 10 }}
              >
                <Text style={{ color: 'white' }}>1. Тест темы</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setTestStep(1)}
                style={{ padding: 10, backgroundColor: testStep === 1 ? '#007AFF' : '#ccc', marginBottom: 10 }}
              >
                <Text style={{ color: 'white' }}>2. Тест Store</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setTestStep(2)}
                style={{ padding: 10, backgroundColor: testStep === 2 ? '#007AFF' : '#ccc', marginBottom: 10 }}
              >
                <Text style={{ color: 'white' }}>3. Полное приложение</Text>
              </TouchableOpacity>
            </View>
            
            <View style={{ flex: 1 }}>
              {testStep === 0 && <TestComponent />}
              {testStep === 1 && <StoreTestComponent />}
              {testStep === 2 && <FullApp />}
            </View>
          </SafeAreaView>
        </ThemeProvider>
      </StoreProvider>
    );
  }

  // Обычный режим
  return (
    <StoreProvider value={stores}>
      <ThemeProvider>
        <FullApp />
      </ThemeProvider>
    </StoreProvider>
  );
};

export default App;