import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
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
import AppMetrica from '@appmetrica/react-native-analytics';
import { BottomSheet } from 'react-native-btr';
import { Linking } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';

interface VersionResponse {
  android: {
    version: string;
    versionCode: number;
    mandatory: boolean;
    apkUrl: string;
  };
}

const App = () => {
  const [visible, setVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({
    isNeeded: false,
    latestVersion: '',
    latestVersionCode: '',
    currentVersion: '',
    currentVersionCode: '',
    apkUrl: '',
    mandatory: false
  });
  const [loading, setLoading] = useState(false);

  const stores = {
    authStore,
    favoritesStore,
    productStore,
    cartStore,
    ordersStore,
    storagesStore
  };

  useEffect(() => {
    // Инициализация AppMetrica
    AppMetrica.activate({
      apiKey: 'fd80c859-f747-42dd-a512-5ef0b48fd129',
      sessionTimeout: 120,
      logs: true
    });
    
    AppMetrica.reportEvent('Запуск');
    authStore.initializeOneSignal();

    // Проверка версии только на Android
    if (Platform.OS === 'android') {
      checkAppVersion();
    }
  }, []);

  const checkAppVersion = async () => {
    try {
      setLoading(true);
      const currentVersion = DeviceInfo.getVersion();
      const versionCode = await DeviceInfo.getBuildNumber();
      
      const response = await axios.get<VersionResponse>('https://api.koleso.app/version.json');
      const androidVersion = response.data.android;
      const isNeeded = compareVersions(
        `${currentVersion}.${versionCode}`,
        `${androidVersion.version}.${androidVersion.versionCode}`
      );

      if (isNeeded) {
        setUpdateInfo({
          isNeeded: true,
          latestVersion: androidVersion.version,
          latestVersionCode: androidVersion.versionCode,
          currentVersion: currentVersion,
          currentVersionCode: versionCode,
          apkUrl: androidVersion.apkUrl,
          mandatory: androidVersion.mandatory
        });
        setVisible(true);
      }
    } catch (error) {
      console.error('Ошибка при проверке версии:', error);
    } finally {
      setLoading(false);
    }
  };

  // Функция для сравнения версий (формат "1.2.3.456")
  const compareVersions = (current: string, latest: string): boolean => {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;
      
      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    
    return false;
  };

  const handleUpdate = () => {
    if (updateInfo.apkUrl) {
      Linking.openURL(updateInfo.apkUrl);
    }
    if (!updateInfo.mandatory) {
      setVisible(false);
    }
  };

  const toggleBottomSheet = () => {
    if (!updateInfo.mandatory) {
      setVisible(!visible);
    }
  };

  return (
    <PaperProvider>
      <StoreProvider stores={stores}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Navigation />
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}

          <BottomSheet
            visible={visible}
            onBackButtonPress={toggleBottomSheet}
            onBackdropPress={toggleBottomSheet}
          >
            <View style={styles.bottomSheet}>
              <Text style={styles.title}>
                {updateInfo.mandatory ? 'Требуется обновление' : 'Доступно обновление'}
              </Text>
              <Text style={styles.versionText}>
                Текущая версия: {updateInfo.currentVersion+' build '+ updateInfo.currentVersionCode}
              </Text>
              <Text style={styles.versionText}>
                Новая версия: {updateInfo.latestVersion+' build '+updateInfo.latestVersionCode} 
              </Text>
              
              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={handleUpdate}
              >
                <Text style={styles.buttonText}>Обновить</Text>
              </TouchableOpacity>
              
              {!updateInfo.mandatory && (
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={toggleBottomSheet}
                >
                  <Text style={styles.buttonText}>Позже</Text>
                </TouchableOpacity>
              )}
            </View>
          </BottomSheet>
        </GestureHandlerRootView>
      </StoreProvider>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  bottomSheet: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  versionText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666'
  },
  updateButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1000
  }
});

export default App;