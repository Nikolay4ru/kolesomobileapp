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
import { OneSignal } from 'react-native-onesignal';
import { navigationRef } from './services/NavigationService';
import NavigationService from './services/NavigationService';
// Импортируем useStores
import { useStores } from "./useStores";

// Основной компонент приложения с полной функциональностью
const FullApp = () => {
  const { colors } = useTheme();
  const [appReady, setAppReady] = useState(false);
  
  useEffect(() => {
    // Инициализация приложения
    const initializeApp = async () => {
      try {
        // Инициализация AppMetrica
        AppMetrica.activate({
          apiKey: 'fd80c859-f747-42dd-a512-5ef0b48fd129',
          sessionTimeout: 120,
          logs: true
        });
        AppMetrica.reportEvent('Запуск');
        
        // Инициализация OneSignal через AuthStore
        await authStore.initializeOneSignal();
        
        // Обработчик клика по уведомлению
        const handleNotificationClick = (event) => {
          console.log('OneSignal: notification clicked:', event);
          
          const { type, notification_id, order_id, booking_id, storage_id, promo_code } = 
            event.notification.additionalData || {};
          
          // Навигация в зависимости от типа уведомления
          // Используем setTimeout для гарантии, что навигация готова
          setTimeout(() => {
            if (!navigationRef.isReady()) {
              console.log('Navigation not ready, waiting...');
              return;
            }
            
            switch (type) {
              case 'order':
                if (order_id) {
                  NavigationService.navigate('OrderDetail', { orderId: order_id });
                } else {
                  NavigationService.navigate('Orders');
                }
                break;
              case 'service':
                if (booking_id) {
                  NavigationService.navigate('BookingDetail', { bookingId: booking_id });
                } else {
                  NavigationService.navigate('Booking');
                }
                break;
              case 'storage':
                if (storage_id) {
                  NavigationService.navigate('StorageDetail', { storageId: storage_id });
                } else {
                  NavigationService.navigate('Storages');
                }
                break;
              case 'promo':
                NavigationService.navigate('ProductList', { promoCode: promo_code });
                break;
              case 'admin':
                if (authStore.isAdmin) {
                  NavigationService.navigateToAdmin('AdminOrders');
                }
                break;
              default:
                NavigationService.navigate('Notifications');
            }
          }, 500);
        };
        
        // Добавляем слушатель клика по уведомлению
        OneSignal.Notifications.addEventListener('click', handleNotificationClick);
        
        // Сохраняем функцию очистки для cleanup
        global.oneSignalNotificationClickCleanup = () => {
          OneSignal.Notifications.removeEventListener('click', handleNotificationClick);
        };
        
        setAppReady(true);
      } catch (error) {
        console.error('Ошибка инициализации:', error);
        setAppReady(true); // Продолжаем даже при ошибке
      }
    };
    
    initializeApp();
    
    // Cleanup при размонтировании
    return () => {
      if (global.oneSignalNotificationClickCleanup) {
        global.oneSignalNotificationClickCleanup();
      }
    };
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