// App.tsx
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


const App = () => {

  const stores = {
    authStore,
    favoritesStore,
    productStore,
    cartStore,
    ordersStore,
    storagesStore
  };

  return (
    <StoreProvider value={stores}>
      <ThemeProvider>
        <FullApp />
      </ThemeProvider>
    </StoreProvider>
  );
};

export default App;