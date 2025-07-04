import React, { useEffect, useState } from "react";
import { View, Platform } from "react-native";
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
import CustomLoader from './components/CustomLoader';
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import AppMetrica from '@appmetrica/react-native-analytics';
import { OneSignal } from 'react-native-onesignal';
import { navigationRef } from './services/NavigationService';
import NavigationService from './services/NavigationService';
import { UpdateChecker } from './services/UpdateService';
import { useAppVersionTracker } from './services/AppVersionTracker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DeviceInfo from 'react-native-device-info';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useStores } from "./useStores";

// Создаем UpdateStore для управления обновлениями
class UpdateStore {
  updateInfo = null;
  showModal = false;

  constructor() {
    makeAutoObservable(this);
  }

  setUpdateInfo(info) {
    this.updateInfo = info;
    this.showModal = true;
  }

  hideModal() {
    this.showModal = false;
  }

  clearUpdateInfo() {
    this.updateInfo = null;
    this.showModal = false;
  }
}

const updateStore = new UpdateStore();

// Делаем updateStore глобально доступным
if (typeof global !== 'undefined') {
  global.updateStore = updateStore;
  global.showUpdateModal = () => updateStore.setUpdateInfo(updateStore.updateInfo);
}

// Компонент для отслеживания версии (оставляем только OneSignal ID)
const VersionTracker = observer(() => {
  const { updateDeviceVersion, saveDeviceId } = useAppVersionTracker();
  const { authStore } = useStores();

  useEffect(() => {
    // Обработчик изменения OneSignal ID
    const handleOneSignalChange = async (event) => {
      if (event.current.onesignalId && authStore.isLoggedIn) {
        const deviceId = await authStore.getDeviceId();
        if (deviceId) {
          saveDeviceId(deviceId);
          await updateDeviceVersion(parseInt(deviceId, 10));
        }
      }
    };

    OneSignal.User.addEventListener('change', handleOneSignalChange);
    return () => {
      OneSignal.User.removeEventListener('change', handleOneSignalChange);
    };
  }, [authStore.isLoggedIn, updateDeviceVersion, saveDeviceId]);

  return null;
});

// Основной компонент приложения с полной функциональностью
const FullApp = observer(() => {
  const { colors } = useTheme();
  const { authStore } = useStores();
  const [appReady, setAppReady] = useState(false);
  const { sendVersionInfo, updateDeviceVersion } = useAppVersionTracker();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Инициализируем AppMetrica
        AppMetrica.activate({
          apiKey: 'fd80c859-f747-42dd-a512-5ef0b48fd129',
          sessionTimeout: 120,
          logs: true
        });
        AppMetrica.reportEvent('Запуск');

        // 2. ВАЖНО: Инициализируем OneSignal ДО загрузки состояния авторизации
        console.log('Initializing OneSignal...');
        await authStore.initializeOneSignal();

        // 3. Обработчик кликов по уведомлениям
        const handleNotificationClick = (event) => {
          console.log('OneSignal: notification clicked:', event);

          const data = event.notification.additionalData || {};
          if (data.type === 'app_update' || data.type === 'system') {
            if (Platform.OS === 'android' && data.download_url) {
              updateStore.setUpdateInfo({
                // ... код обработки обновления
              });
            }
          }
          // ... остальной код обработки
        };

        OneSignal.Notifications.addEventListener('click', handleNotificationClick);

        global.oneSignalNotificationClickCleanup = () => {
          OneSignal.Notifications.removeEventListener('click', handleNotificationClick);
        };

        // 4. Загружаем состояние авторизации ПОСЛЕ инициализации OneSignal
        await authStore.loadAuthState();

        // 5. Обновляем версию устройства если пользователь авторизован
        if (authStore.isLoggedIn) {
          setTimeout(async () => {
            sendVersionInfo();
            const deviceId = await authStore.getDeviceId();
            if (deviceId) {
              await updateDeviceVersion(parseInt(deviceId, 10));
            }
          }, 2000);
        }

        setAppReady(true);
      } catch (error) {
        console.error('Ошибка инициализации:', error);
        setAppReady(true);
      }
    };

    initializeApp();

    return () => {
      if (global.oneSignalNotificationClickCleanup) {
        global.oneSignalNotificationClickCleanup();
      }
    };
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <CustomLoader color={colors.text} size={50} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <PaperProvider>
          <VersionTracker />
          <Navigation />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
});

const App = () => {
  const stores = {
    authStore,
    favoritesStore,
    productStore,
    cartStore,
    ordersStore,
    storagesStore,
    updateStore
  };

  return (
    <StoreProvider value={stores}>
      <ThemeProvider>
        <UpdateChecker />
        <FullApp />
      </ThemeProvider>
    </StoreProvider>
  );
};

export default App;