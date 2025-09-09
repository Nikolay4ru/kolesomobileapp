// utils/ForegroundService.js
import { NativeModules, AppState, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

class ForegroundService {
  constructor() {
    this.watchId = null;
    this.isRunning = false;
    this.updateCallback = null;
    this.appStateSubscription = null;
  }

  start(onLocationUpdate) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.updateCallback = onLocationUpdate;

    // Слушаем изменения состояния приложения
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // Запускаем отслеживание
    this.startTracking();

    // На Android используем Headless JS
    if (Platform.OS === 'android') {
      this.startAndroidForegroundService();
    }
  }

  startTracking = () => {
    // Высокоточное отслеживание
    this.watchId = Geolocation.watchPosition(
      (position) => {
        if (this.updateCallback) {
          this.updateCallback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed,
            heading: position.coords.heading,
            accuracy: position.coords.accuracy,
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        // Переключаемся на менее точный режим при ошибке
        this.fallbackTracking();
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 30,
        interval: 10000,
        fastestInterval: 5000,
        showLocationDialog: false,
        forceRequestLocation: true,
      }
    );
  };

  fallbackTracking = () => {
    // Запасной вариант с меньшей точностью
    if (this.watchId) {
      Geolocation.clearWatch(this.watchId);
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        if (this.updateCallback) {
          this.updateCallback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: 0,
            heading: 0,
            accuracy: position.coords.accuracy,
          });
        }
      },
      (error) => console.warn('Fallback location error:', error),
      {
        enableHighAccuracy: false,
        distanceFilter: 100,
        interval: 30000,
        maximumAge: 30000,
      }
    );
  };

  handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'background' && Platform.OS === 'ios') {
      // На iOS переключаемся на значительные изменения местоположения
      this.switchToSignificantChanges();
    } else if (nextAppState === 'active') {
      // Возвращаемся к обычному отслеживанию
      this.startTracking();
    }
  };

  switchToSignificantChanges = () => {
    if (this.watchId) {
      Geolocation.clearWatch(this.watchId);
    }

    // Используем периодические обновления вместо постоянного отслеживания
    this.backgroundInterval = setInterval(() => {
      Geolocation.getCurrentPosition(
        (position) => {
          if (this.updateCallback) {
            this.updateCallback({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              speed: 0,
              heading: 0,
              accuracy: position.coords.accuracy,
            });
          }
        },
        (error) => console.warn('Background location error:', error),
        {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 60000,
        }
      );
    }, 60000); // Каждую минуту
  };

  startAndroidForegroundService = async () => {
    try {
      // Используем нативный модуль если доступен
      if (NativeModules.LocationForegroundService) {
        await NativeModules.LocationForegroundService.startService();
      }
    } catch (error) {
      console.warn('Native foreground service not available:', error);
    }
  };

  stop() {
    this.isRunning = false;

    if (this.watchId) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (Platform.OS === 'android' && NativeModules.LocationForegroundService) {
      NativeModules.LocationForegroundService.stopService();
    }
  }
}

export default new ForegroundService();